import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {isPassInput} from '../tender/intake.mjs';
import {PassError,validatePass} from '../tender/pass.mjs';
import {ask,closePrompt,color,interactive,run} from './common.mjs';
// T25: office assistant ("Büro-Assistent") of a contractor who books the external TenderScout agent on Sokosumi Preprod as a paying customer.
// npm run assistant -- <anfrage.txt|firmenpass.json> [--yes] [--max-credits N] [--agent-id ID]
// --agent-id selects one catalog entry by id (e.g. after a re-registration); default is the entry named TenderScout.
// Steps: 1 find the agent in the public catalog, 2 show input and price and confirm, 3 hire once, 4 poll the job and save the report.
// Field names as measured in T13 (31.10.): catalog data[].{id,name,summary,credits,author.name}; hire {job:{id,status}};
// jobs get --details {job:{status,result},events:[{id,createdAt,status,result}] newest first, files, links, inputRequest}.
const args=process.argv.slice(2),VALUE_FLAGS=['--max-credits','--agent-id'],FLAGS=['--yes',...VALUE_FLAGS];
const file=args.find((a,i)=>!a.startsWith('--')&&!VALUE_FLAGS.includes(args[i-1]));
const flag=name=>args.includes(name)?args[args.indexOf(name)+1]??'':null;
const yes=args.includes('--yes'),agentIdArg=flag('--agent-id'),maxArg=flag('--max-credits');
const USAGE='Aufruf: npm run assistant -- <anfrage.txt|firmenpass.json> [--yes] [--max-credits N] [--agent-id ID]';
const CATALOG='https://api.preprod.sokosumi.com/v1/agents?limit=100&kind=cardano'; // public, no login (measured 31.10.)
const AGENT_NAME='TenderScout',OUT='.local',POLL_MS=15000,MAX_MS=30*60*1000,PROMPT_MAX=16000; // PROMPT_MAX: input_schema in agent-api.mjs
const BILLING='https://preprod.sokosumi.com/billing?tab=credits'; // credit balance page (tum-hackathon-agent skill)
// Event and job states seen in T13. Failure state names are not measured: TODO (T25).
const LABEL={INITIATED:'Job angelegt',AWAITING_PAYMENT:'Warte auf Zahlung: Sokosumi sperrt die Credits im Masumi-Escrow (Cardano Preprod)',RUNNING:'Zahlung bestätigt, TenderScout prüft die Ausschreibungen',COMPLETED:'Ergebnis geliefert',payment_pending:'Zahlung ausstehend',completed:'abgeschlossen'};
const FAILED=/fail|cancel|refund|error|dispute|expired/i;
const fail=(msg,code=1)=>{console.error(color.bad(msg));closePrompt();process.exit(code)};
const unknown=args.filter(a=>a.startsWith('--')&&!FLAGS.includes(a));
if(unknown.length)fail(`Unbekannte Option: ${unknown.join(' ')}\n${USAGE}`);
if(!file||!existsSync(file))fail(USAGE);
if(agentIdArg==='')fail('--agent-id braucht eine ID.');
if(maxArg!==null&&!/^[1-9]\d*$/.test(maxArg))fail('--max-credits braucht eine ganze Zahl größer 0.');
const cli=a=>{const r=run('sokosumi',['--preprod',...a,'--json']);if(!r.ok)throw new Error(r.err||r.out||'sokosumi fehlgeschlagen');return JSON.parse(r.out);};
const clock=iso=>new Date(iso??Date.now()).toLocaleTimeString('de-DE');
const tusdm=credits=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(credits/100);
// Reads one answer line. On a terminal via common.mjs; from a pipe (printf 'n\n' | …) via its own reader; end of input means no.
async function answer(question){
 if(interactive)return ask(question,'');
 process.stdout.write(question);
 const rl=createInterface({input:process.stdin});
 const line=await new Promise(done=>{rl.once('line',done);rl.once('close',()=>done(''))});
 rl.close();process.stdout.write(`${line}\n`);
 return line.trim();
}

// 1. Discover the agent in the public catalog (the CLI's agents list shows only the first 20).
console.log(color.bold(`\n1. ${AGENT_NAME} im Sokosumi-Katalog suchen (Preprod)`));
let catalog;
try{const r=await fetch(CATALOG,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);catalog=await r.json();}
catch(e){fail(`Katalog nicht erreichbar (${e.message}): ${CATALOG}`);}
const agents=Array.isArray(catalog?.data)?catalog.data:[];
const matches=agentIdArg?agents.filter(a=>a?.id===agentIdArg):agents.filter(a=>a?.name?.trim().toLowerCase()===AGENT_NAME.toLowerCase());
if(!matches.length)fail(`${agentIdArg?`Agent ${agentIdArg}`:AGENT_NAME} nicht im Katalog (${agents.length} Agenten geprüft${catalog?.meta?.pagination?.nextCursor?'; weitere Seiten nicht geladen, TODO (T25)':''}).`);
if(matches.length>1){for(const a of matches)console.log(`  ${a.name} [${a.id}] ${a.credits} Credits`);fail('Mehrere Treffer. Bitte mit --agent-id ID wählen.');}
const agent=matches[0];
console.log(`${color.ok('Gefunden:')} ${agent.name} (Anbieter: ${agent.author?.name??'–'})`);
console.log(`  ID:           ${agent.id}`);
console.log(`  Leistung:     ${agent.summary??agent.description??'–'}`);
console.log(`  Preis:        ${agent.credits??'unbekannt'} Credits pro Auftrag${Number.isFinite(agent.credits)?` (${tusdm(agent.credits)} tUSDM, Testgeld)`:''}`);
const runs=agent.metrics?.executions?.count;
if(Number.isFinite(runs))console.log(`  Ausgeführt:   ${runs} ${runs===1?'Auftrag':'Aufträge'} bisher`);

// 2. Show what will be sent and what it costs; check limits before asking.
console.log(color.bold('\n2. Auftrag prüfen'));
const prompt=readFileSync(file,'utf8');
if(!prompt.trim())fail('Die Datei ist leer. Nichts gebucht.');
if(prompt.length>PROMPT_MAX)fail(`Die Anfrage hat ${prompt.length} Zeichen, ${AGENT_NAME} nimmt höchstens ${PROMPT_MAX}. Nichts gebucht.`);
const isPass=/\.json$/i.test(file)||isPassInput(prompt);
if(isPass){
 // Free local check with the same validator the agent uses, so an invalid Firmenpass is not paid for.
 try{validatePass(prompt)}catch(e){if(e instanceof PassError)fail(`${e.message}\nLokal geprüft, nichts gebucht. Felder: docs/firmenpass.md`);throw e;}
}
console.log(`Art:     ${isPass?'Firmenpass (JSON), lokal geprüft: gültig':'Freitext (bezahlte Jobs fragen nicht nach; Annahmen stehen im Bericht)'}`);
console.log(`Datei:   ${file} (${prompt.length} Zeichen)`);
if(/[\w.+-]+@[\w-]+\.[\w.-]+/.test(prompt))console.log(color.todo('Hinweis: Die Anfrage enthält eine E-Mail-Adresse. TenderScout braucht keine Kontaktdaten; bitte vor dem Buchen entfernen.'));
const PREVIEW=1200;
console.log(color.dim('Gesendet wird {"prompt": <Dateiinhalt>}:'));
console.log(prompt.trim().slice(0,PREVIEW).split('\n').map(l=>`  │ ${l}`).join('\n')+(prompt.trim().length>PREVIEW?`\n  │ … (${prompt.trim().length-PREVIEW} Zeichen mehr)`:''));
if(!Number.isFinite(agent.credits))fail('Der Katalog nennt keinen Preis. Ohne Preis bucht der Assistent nicht.');
const maxCredits=maxArg===null?agent.credits:Number(maxArg);
if(agent.credits>maxCredits)fail(`Preis ${agent.credits} Credits liegt über dem Limit --max-credits ${maxCredits}. Nichts gebucht.`);
console.log(`Kosten:  ${agent.credits} Credits (${tusdm(agent.credits)} tUSDM), Limit ${maxCredits} Credits. Abgebucht vom angemeldeten Sokosumi-Konto, Guthaben: ${BILLING}`);
const auth=(()=>{const r=run('sokosumi',['--preprod','auth','status','--json']);try{return JSON.parse(r.out)}catch{return null}})();
if(!auth?.authenticated)fail('Nicht bei Sokosumi Preprod angemeldet. Erst: sokosumi --preprod auth login');
console.log(`Konto:   bei Sokosumi Preprod angemeldet (${auth.authMethod??'unbekannt'})`);
if(!yes&&!/^[jy]/i.test(await answer(`\nJetzt ${AGENT_NAME} für ${agent.credits} Credits beauftragen? [j/N] `))){
 console.log('Abgebrochen. Nichts gebucht, nichts bezahlt.');closePrompt();process.exit(0);
}
closePrompt();

// 3. Hire exactly once. Without a job id the outcome is uncertain: never retry automatically.
console.log(color.bold(`\n3. ${AGENT_NAME} beauftragen`));
mkdirSync(OUT,{recursive:true,mode:0o700});
const inputPath=`${OUT}/assistant-${new Date().toISOString().replace(/[:.]/g,'-')}-input.json`;
writeFileSync(inputPath,JSON.stringify({prompt}),{mode:0o600});
const hireArgs=['--preprod','agents','hire',agent.id,'--input-file',inputPath,'--max-credits',String(maxCredits),'--json'];
console.log(color.dim(`sokosumi ${hireArgs.join(' ')}`));
const hired=run('sokosumi',hireArgs);
let response=null;try{response=JSON.parse(hired.out)}catch{}
const jobId=response?.job?.id;
if(!jobId){
 console.error(color.bad(`Buchung nicht bestätigt: ${String(response?.error??(hired.err||hired.out||'keine Antwort')).slice(0,400)}${response?.code?` (${response.code})`:''}`));
 if(response?.code==='AUTH_REQUIRED')console.error('Anmelden: sokosumi --preprod auth login');
 console.error(color.todo(`Nicht einfach neu starten. Erst prüfen, ob trotzdem ein Job angelegt wurde:\n  sokosumi --preprod jobs list --search ${agent.id} --json\n  oder in Sokosumi Web (Preprod) unter den Jobs.`));
 console.error(color.dim(`Eingabe: ${inputPath}`));
 process.exit(3);
}
const journalPath=`${OUT}/assistant-${jobId}.json`;
const journal={jobId,agentId:agent.id,agentName:agent.name,credits:agent.credits,maxCredits,inputFile:file,inputPath,hiredAt:new Date().toISOString(),job:response.job};
const saveJournal=()=>writeFileSync(journalPath,JSON.stringify(journal,null,1),{mode:0o600});
saveJournal();
console.log(`${color.ok('Beauftragt:')} Job ${jobId} (${response.job.status??'Status unbekannt'})`);
console.log(color.dim(`Journal: ${journalPath} · selbst nachsehen: sokosumi --preprod jobs get ${jobId} --details --json`));

// 4. Poll until the job is completed or failed. Each event and input request is reported once.
console.log(color.bold('\n4. Auf das Ergebnis warten'));
console.log(color.dim('Abfrage alle 15 s, höchstens 30 min. Strg+C beendet nur das Warten, nicht den Job.'));
let status=response.job.status,details={},job=response.job;
const started=Date.now(),seen=new Set();
while(!/^completed$/i.test(status??'')){
 if(Date.now()-started>MAX_MS){
  Object.assign(journal,{status,checkedAt:new Date().toISOString()});saveJournal();
  fail(`Nach 30 Minuten noch ${status}. Der Job läuft weiter, nicht neu buchen. Später: sokosumi --preprod jobs get ${jobId} --details --json`,2);
 }
 await new Promise(r=>setTimeout(r,POLL_MS));
 try{details=cli(['jobs','get',jobId,'--details']);job=details.job??job;}
 catch(e){console.log(color.todo(`Abfrage fehlgeschlagen, nächster Versuch in 15 s: ${e.message.slice(0,160)}`));continue;}
 for(const e of [...(details.events??[])].reverse().filter(e=>e?.id&&!seen.has(e.id))){
  seen.add(e.id);
  console.log(`${color.dim(clock(e.createdAt))} ${e.status}${LABEL[e.status]?` – ${LABEL[e.status]}`:''}`);
 }
 if(job.status&&job.status!==status){console.log(color.dim(`${clock()} Job-Status: ${status??'–'} → ${job.status}${LABEL[job.status]?` (${LABEL[job.status]})`:''}`));status=job.status;}
 const request=details.inputRequest;
 if(request?.eventId&&!seen.has(`input:${request.eventId}`)){
  seen.add(`input:${request.eventId}`);
  console.log(color.todo(`Rückfrage des Agenten: ${request.message??'(ohne Text)'}`));
  console.log(color.dim(`Antwort als JSON nach diesem Schema: ${JSON.stringify(request.inputSchema??{})}\nSenden: sokosumi --preprod jobs input ${jobId} --event-id ${request.eventId} --input-file <antwort.json> --json`));
 }
 const latest=details.events?.[0]?.status;
 if(FAILED.test(status??'')||FAILED.test(latest??'')){
  Object.assign(journal,{status,lastEvent:latest,checkedAt:new Date().toISOString()});saveJournal();
  fail(`Job beendet ohne Ergebnis (${status}${latest?`, Ereignis ${latest}`:''}). Details: sokosumi --preprod jobs get ${jobId} --details --json`,2);
 }
}

// Result text lives in job.result; the COMPLETED event carries the same text (both measured in T13).
const result=job.result??(details.events??[]).find(e=>e?.status==='COMPLETED'&&e.result)?.result;
const reportPath=`${OUT}/assistant-${jobId}.md`;
if(result){writeFileSync(reportPath,result,{mode:0o600});console.log(`\n${result}\n`);}
else console.log(color.todo(`Job abgeschlossen, aber ohne Ergebnistext. Bitte prüfen: sokosumi --preprod jobs get ${jobId} --details --json`));
for(const f of details.files??[])console.log(`Datei: ${f.name??f.id??'Datei'} ${f.url??'–'}`);
for(const l of details.links??[])console.log(`Link: ${l.title??l.id??'Link'} ${l.url??'–'}`);
Object.assign(journal,{status,completedAt:new Date().toISOString(),reportPath:result?reportPath:null,resultChars:result?.length??0});saveJournal();

console.log(color.bold('Notiz fürs Büro'));
console.log(`- Auftrag: ${agent.name}, Job ${jobId}, ${agent.credits} Credits (${tusdm(agent.credits)} tUSDM Testgeld).`);
console.log(`- Bericht: ${result?reportPath:'nicht geliefert, siehe oben'}. Fakten (Frist, Wert, Auftraggeber, Link) stammen aus den Bekanntmachungen; vor einer Bewerbung die Vergabeunterlagen über den Link prüfen.`);
console.log('- Bezahlung: über den Masumi-Escrow auf Cardano Preprod (Testnetz, kein echtes Geld). Sokosumi sperrt den Betrag im Smart Contract, TenderScout hinterlegt beim Liefern den Hash des Berichts on-chain, erst dann wird an TenderScout ausgezahlt. Beispielbeleg: docs/tickets/T13/beleg.md');
console.log(`- Nachsehen: sokosumi --preprod jobs get ${jobId} --details --json oder in Sokosumi Web (Preprod) unter den Jobs.`);
