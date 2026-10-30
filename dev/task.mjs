import {copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {basename} from 'node:path';
import {taskTarget} from '../task-target.mjs';
import {color,run} from './common.mjs';
// Creates a Sokosumi Task from a Firmenpass (JSON) or a free-text request and waits for the worker's result (needs npm start + npm run worker).
// npm run task -- examples/p3-isarcode.pass.json [--name "Titel"] [--no-wait] [--answer "passt"]
// --answer posts the given text once as a comment when the Coworker asks for confirmation (free-text intake).
const args=process.argv.slice(2),VALUE_FLAGS=['--name','--answer'];
const file=args.find((a,i)=>!a.startsWith('--')&&!VALUE_FLAGS.includes(args[i-1]));
const flag=name=>args.includes(name)?args[args.indexOf(name)+1]:null;
const nameArg=flag('--name'),answer=flag('--answer'),wait=!args.includes('--no-wait');
const OUT='.local',POLL_MS=10000,MAX_MS=15*60*1000,TERMINAL=['COMPLETED','FAILED','CANCELED','CANCELLED'],WAITING=['INPUT_REQUIRED','AWAITING_EXTERNAL'];
if(!file||!existsSync(file)){console.error('Aufruf: npm run task -- <firmenpass.json|anfrage.txt> [--name "Titel"] [--no-wait] [--answer "passt"]');process.exit(1);}
let target;
try{target=taskTarget()}catch(e){console.error(color.bad(`${e.message}. COWORKER_ID in .env eintragen (npm run setup).`));process.exit(1);}
const createArgs=target.taskArgs.length?target.taskArgs:['--personal'];
const cli=a=>{const r=run('sokosumi',['--preprod',...a,'--json']);if(!r.ok)throw new Error(r.err||r.out||'sokosumi fehlgeschlagen');return JSON.parse(r.out);};
mkdirSync(OUT,{recursive:true,mode:0o700});
const description=readFileSync(file,'utf8');
const name=nameArg??`TenderScout ${basename(file).replace(/\.(pass|profile)\.json$|\.(prompt\.)?txt$/,'')} ${new Date().toISOString().slice(0,10)}`;
console.log(color.dim(`Task anlegen: ${name} (${createArgs.join(' ')})`));
const created=cli(['tasks','create',...createArgs,'--coworker-id',target.coworkerId,'--name',name,'--description',description,'--status','READY']);
const id=created.task?.id;
if(!id){console.error(color.bad('Keine Task-ID in der Antwort.'));console.error(JSON.stringify(created,null,1));process.exit(1);}
writeFileSync(`${OUT}/task-${id}.json`,JSON.stringify(created),{mode:0o600});
console.log(`${color.ok('Task angelegt')} ${id}${created.task.identifier?` (${created.task.identifier})`:''}`);
const answerCommand=`sokosumi --preprod tasks comment ${id} ${target.taskArgs.join(' ')} --comment "passt" --json`.replace(/\s+/g,' ');
console.log(color.dim(`Status: sokosumi --preprod tasks get ${id} ${target.taskArgs.join(' ')} --json · in Sokosumi Web: Workspace öffnen, Tasks`));
if(!wait)process.exit(0);
// Poll until a terminal status. Coworker comments (the confirmation question) are shown once; the worker on this machine writes the result to .local/<id>.txt.
let status=created.task.status,started=Date.now(),answered=false;
const seen=new Set();
const time=()=>color.dim(new Date().toLocaleTimeString('de-DE'));
console.log(color.dim(`Warte auf den Worker (${status})…`));
while(!TERMINAL.includes(status)){
 if(Date.now()-started>MAX_MS){console.log(color.bad(`Nach 15 Minuten noch ${status}. Worker-Terminal und .local/${id}.json prüfen.`));process.exit(2);}
 await new Promise(r=>setTimeout(r,POLL_MS));
 let next,events=[];
 try{next=cli(['tasks','get',id,...target.taskArgs]).task?.status;events=cli(['tasks','events',id,...target.taskArgs]).events??[];}
 catch(e){console.log(color.todo(`Abfrage fehlgeschlagen: ${e.message.slice(0,160)}`));continue;}
 if(next&&next!==status){status=next;console.log(`${time()} ${status}${WAITING.includes(status)?color.todo('  (Rückfrage des Coworkers, Antwort nötig)'):''}`);}
 // Questions and notes from the Coworker; the COMPLETED event carries the report and is printed below instead.
 for(const e of events.filter(e=>e?.actor?.type==='coworker'&&typeof e.comment==='string'&&e.comment.trim()&&e.status!=='COMPLETED'&&!seen.has(e.id))){
  seen.add(e.id);
  console.log(`\n${time()} ${color.bold('Coworker:')}\n${e.comment.slice(0,1500)}${e.comment.length>1500?'…':''}`);
  console.log(color.dim(`Antworten: ${answerCommand}`));
  if(answer&&!answered){
   answered=true;
   try{cli(['tasks','comment',id,...target.taskArgs,'--comment',answer]);console.log(`${time()} ${color.ok('Antwort gesendet:')} ${answer}`);}
   catch(err){console.log(color.bad(`Antwort nicht gesendet: ${err.message.slice(0,160)}`));}
  }
 }
}
if(status!=='COMPLETED'){console.log(color.bad(`Task endete mit ${status}.`));process.exit(2);}
const local=`${OUT}/${id}.txt`;
if(existsSync(local)){
 copyFileSync(local,`${OUT}/task-${id}.md`);
 console.log(`\n${readFileSync(local,'utf8')}`);
 console.log(color.dim(`Bericht: ${OUT}/task-${id}.md`));
}else{
 // Result not on this machine: take it from the Task events (field names as the CLI prints them).
 const {events=[]}=cli(['tasks','events',id,...target.taskArgs]);
 const done=[...events].reverse().find(e=>e?.status==='COMPLETED'||(typeof e?.comment==='string'&&e.comment.trim()&&e.actor?.type!=='user'));
 if(done?.comment){writeFileSync(`${OUT}/task-${id}.md`,done.comment,{mode:0o600});console.log(`\n${done.comment}`);console.log(color.dim(`Bericht: ${OUT}/task-${id}.md`));}
 else{console.log(color.todo('Kein Ergebnis in den Events gefunden. Letzte Events:'));console.log(JSON.stringify(events.slice(-3),null,1));}
}
