import {readFileSync,writeFileSync} from 'node:fs';
import {assess} from './assess.mjs';
import {PassError,validatePass} from './pass.mjs';
import {loadNotices,prefilter} from './prefilter.mjs';
import {renderReport} from './report.mjs';
import {verifyAll} from './verify.mjs';
// Eve session as in client.mjs answer(): the session id is journaled so comments.mjs can answer follow-ups.
async function sessionAsk(journal,deadline){
 const {client}=await import('../client.mjs');
 const {session}=await client.sessions.create();
 writeFileSync(journal,JSON.stringify({sessionId:session.state.sessionId,phase:'sending'}),{mode:0o600});
 return async text=>{
  if(deadline!==undefined&&Date.now()>=deadline)throw new Error('Result deadline expired before model send');
  const result=await (await session.send(text)).result();
  if(result.status==='failed'||result.inputRequests.length||!result.message?.trim())throw new Error('Turn did not return a final answer');
  return result.message;
 };
}
// Full pipeline with structured output (used by scout() and the T5 evaluation). Throws PassError on an invalid pass.
export async function run(input,journal,deadline,{records,ask,now=Date.now()}={}){
 const pass=validatePass(input);
 const notices=records??loadNotices();
 const {candidates,excluded,coverage}=prefilter(pass,notices,now);
 const send=candidates.length?(ask??await sessionAsk(journal,deadline)):null;
 const {assessed,missing}=await assess(pass,candidates,send,now);
 if(missing.length)excluded['vom Modell nicht bewertet']=missing.length;
 const {verified,rejected}=verifyAll(assessed,notices,pass,now);
 if(journal&&send&&!ask)writeFileSync(journal,JSON.stringify({...JSON.parse(readFileSync(journal,'utf8')),phase:'answered'}),{mode:0o600});
 return {pass,candidates,verified,rejected,excluded,coverage};
}
// Same contract as client.mjs answer(input, journal, deadline): returns the result string for Sokosumi or Masumi.
export async function scout(input,journal,deadline,options={}){
 let result;
 try{result=await run(input,journal,deadline,options)}
 catch(e){if(e instanceof PassError)return `# TenderScout – Firmenpass ungültig\n\n${e.issues.map(i=>`- ${i}`).join('\n')}\n\nBitte senden Sie den Firmenpass als JSON-Objekt erneut.\n`;throw e;}
 const {pass,verified,rejected,excluded,coverage}=result;
 return renderReport({pass,verified,excluded,coverage,dropped:rejected,now:options.now??Date.now()});
}
