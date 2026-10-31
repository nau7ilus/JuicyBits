import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {acquireWorkerLock} from './worker-lock.mjs';
import {client} from './client.mjs';
import * as pipeline from './tender/scout.mjs';
import {renderReport} from './tender/report.mjs';
import {PassError} from './tender/pass.mjs';
import {applyAnswer,intake,isConfirmation,isPassInput,renderUnderstanding} from './tender/intake.mjs';
import {reply} from './comments.mjs';
import {createPaidAdapter,isPaidReady} from './paid-task.mjs';
import {loadSokosumiRuntime} from './sokosumi-runtime.mjs';
import {taskTarget,isTaskForTarget} from './task-target.mjs';
const target=taskTarget();
const id=target.coworkerId;
const releaseLock=acquireWorkerLock();
process.once('exit',releaseLock);
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{releaseLock();process.exit(0)});
function cli(args){return JSON.parse(execFileSync('sokosumi',['--preprod',...args,'--json'],{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024}));}
await client.health();
const paid=await createPaidAdapter({target,answer:pipeline.scout,save:async(taskId,state)=>writeFileSync(`.local/${taskId}.json`,JSON.stringify(state),{mode:0o600})});
// Coworker runtime client for the confirmation round (question event, reading the user's answer). Same credential as comments.mjs.
const {readRuntimeCredential,createCoworkerHttpClient,fetchTaskEvents,createTaskEvent}=await loadSokosumiRuntime();
const runtime=createCoworkerHttpClient({apiKey:readRuntimeCredential(id)});
const WAIT_MINUTES=Number(process.env.INTAKE_WAIT_MINUTES)>0?Number(process.env.INTAKE_WAIT_MINUTES):30;
const signal=()=>AbortSignal.timeout(30000);
const readJson=(file,fallback)=>existsSync(file)?JSON.parse(readFileSync(file,'utf8')):fallback;
// Free-text intake: the agent explains its understanding, the user confirms or corrects in the Task, then the pipeline runs.
// Phases: started -> intake -> question-pending -> awaiting-answer -> (answer-pending -> question-pending | confirmed) -> running-pending -> model-pending -> result-saved -> complete-pending -> completed.
async function attachSession(sessionFile){
 const {sessionId}=JSON.parse(readFileSync(sessionFile,'utf8'));
 return async text=>{
  const result=await (await client.sessions.attach(sessionId).send(text)).result();
  if(result.status==='failed'||result.inputRequests.length||!result.message?.trim())throw new Error('Turn did not return a final answer');
  return result.message;
 };
}
// Posts the understanding as INPUT_REQUIRED; if Core rejects that status from a Coworker key, posts a plain comment instead.
async function postQuestion(taskId,understanding){
 const comment=renderUnderstanding(understanding);
 let response,statusChanged=true;
 try{response=await createTaskEvent(runtime,taskId,{status:'INPUT_REQUIRED',comment},signal())}
 catch(e){console.error('INPUT_REQUIRED not accepted, posting comment only',taskId,e.message.slice(0,160));statusChanged=false;response=await createTaskEvent(runtime,taskId,{comment},signal());}
 return {eventId:response?.data?.id??response?.id??null,statusChanged};
}
// First user comment after our question that no handler has consumed yet.
function findAnswer(events,state,consumed){
 const qIdx=events.findIndex(e=>e?.id===state.questionEventId);
 return events.find((e,i)=>e?.actor?.type==='user'&&typeof e.comment==='string'&&e.comment.trim()&&!consumed[e.id]
  &&(qIdx>=0?i>qIdx:Date.parse(e.createdAt)>state.askedAt-5000));
}
const invalidText=e=>`# JuicyBids – Anfrage nicht verständlich\n\nAus Ihrer Anfrage ließ sich kein Firmenpass ableiten:\n${e.issues.map(i=>`- ${i}`).join('\n')}\n\nBitte nennen Sie Leistung oder Gewerk, Region (Bayern), Auftragswert von–bis und ab wann Sie verfügbar sind, oder senden Sie einen Firmenpass als JSON (docs/firmenpass.md).\n`;
console.log('Continuous worker running',process.pid);
while(true){
 try{
 const tasks=cli(['tasks','list','--coworker-id',id,...target.taskArgs]).tasks;
 for(const t of tasks.filter(t=>isTaskForTarget(t,target))){
 try{
 const journal=`.local/${t.id}.json`,resultFile=`.local/${t.id}.txt`,sessionFile=`.local/${t.id}-session.json`,commentsFile=`.local/${t.id}-comments.json`;
 let state=readJson(journal,{});
 const save=next=>{state=next;writeFileSync(journal,JSON.stringify(state),{mode:0o600});return state;};
 if(t.status==='READY'&&!state.phase){writeFileSync(journal,JSON.stringify({phase:'starting'}),{mode:0o600});const started=cli(['runtime','start',t.id,...target.runtimeArgs,'--coworker-id',id]);save({phase:'started',input:started.description});}
 if(state.paid&&process.env.PAID_TASKS_ENABLED!=='true')continue;
 if(state.paid||(state.phase==='started'&&process.env.PAID_TASKS_ENABLED==='true'&&isPaidReady())){state=await paid.advance(t,state);if(state.phase==='completed')await reply(t);continue;}
 // Free text: build the Firmenpass and ask for confirmation. The intake phase may be retried; it has no external side effect.
 if(['started','intake'].includes(state.phase)&&!isPassInput(state.input)){
  save({...state,phase:'intake'});
  const ask=await pipeline.openSession(sessionFile);
  try{
   const understanding=await pipeline.enrich(await intake(state.input,ask),ask);
   save({...state,phase:'question-pending',understanding,round:1});
   const q=await postQuestion(t.id,understanding);
   save({...state,phase:'awaiting-answer',questionEventId:q.eventId,askedAt:Date.now(),statusChanged:q.statusChanged});
  }catch(e){
   if(!(e instanceof PassError))throw e;
   writeFileSync(resultFile,invalidText(e),{mode:0o600});save({...state,phase:'result-saved'});
  }
 }
 if(state.phase==='awaiting-answer'){
  const {events=[]}=await fetchTaskEvents(runtime,t.id,signal());
  const consumed=readJson(commentsFile,{});
  const answer=findAnswer(events,state,consumed);
  if(answer){
   consumed[answer.id]='intake';writeFileSync(commentsFile,JSON.stringify(consumed),{mode:0o600});
   save({...state,phase:'answer-pending',pendingAnswer:answer.comment});
  }else if(Date.now()-state.askedAt>WAIT_MINUTES*60000){
   const u=state.understanding;
   save({...state,phase:'confirmed',understanding:{...u,assumptions:[...(u.assumptions??[]),`Ohne Bestätigung nach ${WAIT_MINUTES} Minuten mit diesen Annahmen fortgesetzt`]}});
  }
 }
 if(state.phase==='answer-pending'){
  const {confirmed,...next}=isConfirmation(state.pendingAnswer)?{...state.understanding,confirmed:true}:await applyAnswer(state.understanding,state.pendingAnswer,await attachSession(sessionFile));
  if(confirmed||state.round>=2)save({...state,phase:'confirmed',understanding:next,pendingAnswer:undefined});
  else{
   save({...state,phase:'question-pending',understanding:next,round:state.round+1,pendingAnswer:undefined});
   const q=await postQuestion(t.id,next);
   save({...state,phase:'awaiting-answer',questionEventId:q.eventId,askedAt:Date.now(),statusChanged:state.statusChanged||q.statusChanged});
  }
 }
 if(['confirmed','running-pending'].includes(state.phase)){
  if(state.statusChanged){
   save({...state,phase:'running-pending'});
   try{await createTaskEvent(runtime,t.id,{status:'RUNNING',comment:'Danke, ich prüfe jetzt die Bekanntmachungen.'},signal())}
   catch(e){console.error('RUNNING not re-posted',t.id,e.message.slice(0,160))}
  }
  save({...state,phase:'model-pending'});
  const ask=await attachSession(sessionFile);
  const result=await pipeline.run(null,sessionFile,undefined,{pass:state.understanding.pass,intake:state.understanding,ask});
  writeFileSync(resultFile,renderReport({...result,dropped:result.rejected,intake:state.understanding}),{mode:0o600});
  save({...state,phase:'result-saved'});
 }
 if(state.phase==='started'){
  save({...state,phase:'model-pending'});
  const result=await pipeline.scout(state.input,sessionFile);
  writeFileSync(resultFile,result,{mode:0o600});save({...state,phase:'result-saved'});
 }
 if(state.phase==='result-saved'){
  save({...state,phase:'complete-pending'});
  const completed=cli(['runtime','complete',t.id,...target.runtimeArgs,'--coworker-id',id,'--result-file',resultFile]);
  save({...state,phase:'completed',completion:completed});console.log('Completed',t.id);
 }
 if(state.phase==='completed')await reply(t);
 }catch(e){console.error('Task blocked',t.id,e.message.slice(0,200))}
 }
 }catch(e){console.error('Polling read failed',e.message.slice(0,200))}
 await new Promise(r=>setTimeout(r,5000));
}
