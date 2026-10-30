import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {client} from './client.mjs';
import {loadSokosumiRuntime} from './sokosumi-runtime.mjs';
import {taskTarget,assertTaskTarget,verifyRuntimeTask} from './task-target.mjs';
const target=taskTarget();
const {readRuntimeCredential,createCoworkerHttpClient,fetchTaskEvents,createTaskEvent}=await loadSokosumiRuntime();
const runtime=createCoworkerHttpClient({apiKey:readRuntimeCredential(target.coworkerId)});
const LIMIT=16000,REPORT_LIMIT=12000;
// Without a model session (zero candidates or invalid Firmenpass) a fresh session is seeded with the saved report on the first comment.
async function openSession(sessionFile,resultFile){
 if(existsSync(sessionFile))return {sessionId:JSON.parse(readFileSync(sessionFile,'utf8')).sessionId,context:''};
 if(!existsSync(resultFile))return null;
 const {session}=await client.sessions.create();
 writeFileSync(sessionFile,JSON.stringify({sessionId:session.state.sessionId,phase:'comments'}),{mode:0o600});
 const report=readFileSync(resultFile,'utf8').slice(0,REPORT_LIMIT);
 return {sessionId:session.state.sessionId,context:`Dies ist der TenderScout-Bericht zu diesem Auftrag. Der Nutzer stellt dazu jetzt eine Rückfrage. Antworte auf Deutsch in kurzem Fließtext und stütze dich nur auf diesen Bericht.\n\n${report}\n\nRückfrage: `};
}
export async function reply(task){
 assertTaskTarget(task,target);
 const taskId=task.id;
 await verifyRuntimeTask(runtime,taskId,target);
 const p=`.local/${taskId}-comments.json`;
 const state=existsSync(p)?JSON.parse(readFileSync(p,'utf8')):{};
 const {events}=await fetchTaskEvents(runtime,taskId,AbortSignal.timeout(30000));
 const pending=events.filter(e=>e.actor?.type==='user'&&typeof e.comment==='string'&&e.comment.trim()&&!state[e.id]);
 if(!pending.length)return;
 const opened=await openSession(`.local/${taskId}-session.json`,`.local/${taskId}.txt`);
 if(!opened)return;
 let {sessionId,context}=opened;
 for(const event of pending){
 state[event.id]='model-pending';writeFileSync(p,JSON.stringify(state),{mode:0o600});
 const text=(context+event.comment).slice(0,LIMIT);context='';
 const response=await(await client.sessions.attach(sessionId).send(text)).result();
 if(response.status==='failed'||response.inputRequests.length||!response.message?.trim())continue;
 state[event.id]='post-pending';writeFileSync(p,JSON.stringify(state),{mode:0o600});
 await verifyRuntimeTask(runtime,taskId,target);
 await createTaskEvent(runtime,taskId,{comment:response.message},AbortSignal.timeout(30000));
 state[event.id]='posted';writeFileSync(p,JSON.stringify(state),{mode:0o600});
 }
}
