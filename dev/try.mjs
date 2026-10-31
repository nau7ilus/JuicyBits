import {spawn} from 'node:child_process';
import {createWriteStream,existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {basename,join} from 'node:path';
import {placeholder} from '../tender/offline.mjs';
import {scout} from '../tender/scout.mjs';
import {ask,closePrompt,color,interactive,reachable} from './common.mjs';
// Interactive test bench: pick a company pass, optionally change fields, run the pipeline offline or with the model, compare with the expected file.
// npm run try
if(!interactive){console.error('npm run try braucht ein interaktives Terminal. Ohne Terminal: npm run scout -- <firmenpass.json> [--offline]');process.exit(1);}
const OUT='.local/try',EXPECTED='examples/t5-expected.json';
mkdirSync(OUT,{recursive:true,mode:0o700});
let eve=null;
const stopEve=()=>{eve?.kill();eve=null};
process.on('exit',stopEve);
process.on('SIGINT',()=>{stopEve();process.exit(130)});

// Live runs need the local Eve agent. Start it as a child process if nobody runs `npm start`.
async function ensureEve(){
 const url=process.env.EVE_URL;
 if(!url)throw new Error('EVE_URL fehlt in .env (npm run setup)');
 if(await reachable(url))return true;
 if(!/^[jy]/i.test(await ask(`Eve läuft nicht auf ${url}. Hier im Hintergrund starten? [J/n] `,'j')))return false;
 const log=createWriteStream(join(OUT,'eve.log'),{flags:'a'});
 eve=spawn(process.execPath,['start.mjs'],{env:process.env,stdio:['ignore','pipe','pipe']});
 eve.stdout.pipe(log);eve.stderr.pipe(log);
 eve.on('exit',code=>{if(eve)console.log(color.bad(`Eve beendet (Code ${code}), Log: ${OUT}/eve.log`));eve=null;});
 process.stdout.write('Starte Eve');
 for(let i=0;i<120&&eve;i++){
  if(await reachable(url)){console.log(color.ok(' bereit'));return true;}
  process.stdout.write('.');await new Promise(r=>setTimeout(r,1000));
 }
 console.log(color.bad(` nicht erreichbar, Log: ${OUT}/eve.log`));stopEve();return false;
}
// "key=value": value is parsed as JSON when possible (numbers, arrays, booleans), else kept as text. "key=" deletes the field.
function applyChange(pass,entry){
 const at=entry.indexOf('=');
 if(at<1)throw new Error('Format: feld=wert, z. B. max_value_eur=800000 oder trades=["dachdecker"]');
 const key=entry.slice(0,at).trim(),raw=entry.slice(at+1).trim();
 if(!raw){delete pass[key];return;}
 try{pass[key]=JSON.parse(raw)}catch{pass[key]=raw}
}
const brief=p=>[`Leistung ${p.trade??'?'}${p.trades?.length?` (${p.trades.join(', ')})`:''}`,`CPV ${p.cpv_prefixes?.join(', ')||'aus trades'}`,
 `Wert ${p.min_value_eur??'?'}–${p.max_value_eur??'?'} €`,`ab ${p.available_from??'?'}`,`Rückblick ${p.lookback_days??14} Tage`].join(' · ');
// Pulls the ranking out of the Markdown report: verdict, score and notice id per section.
function ranking(report){
 return report.split(/^### /m).slice(1).map(s=>({title:s.split('\n')[0].replace(/^\d+\.\s*/,'').replace(/\\(.)/g,'$1'),
  verdict:s.match(/^\*\*([^*]+)\*\*/m)?.[1]??'?',score:s.match(/(\d+)\/100/)?.[1]??'–',id:s.match(/noticeId=([0-9a-f-]{36})/)?.[1]}));
}
// Same matching rules as tender/eval.mjs: NO-GO notices are not listed, so "not listed" counts as an expected NO-GO.
const VERDICT={'GO':'go','GO MIT AUFLAGE':'conditional','NO-GO':'nogo'};
function compare(profile,rows){
 const cases=existsSync(EXPECTED)?JSON.parse(readFileSync(EXPECTED,'utf8')).cases.filter(c=>c.profile===profile):[];
 if(!cases.length){console.log(color.dim(`Keine Erwartung für ${profile} in ${EXPECTED}. Vorlage: Skill tender-test-cases.`));return;}
 console.log(color.bold(`\nAbgleich mit ${EXPECTED}`));
 for(const c of cases){
  const hit=rows.find(r=>r.id===c.notice),actual=hit?VERDICT[hit.verdict]??hit.verdict:'nogo';
  const ok=actual===c.expected?color.ok('ja'):c.expected==='go'&&actual==='conditional'?color.todo('teilweise'):color.bad('nein');
  console.log(`  ${ok.padEnd(18)} erwartet ${c.expected} (${c.score}) · ist ${hit?`${hit.verdict} ${hit.score}/100`:'nicht gelistet'}  ${color.dim(c.title)}`);
 }
 console.log(color.dim('  Gründe im Bericht prüfen. Alle Profile auf einmal: npm run eval. Abweichungen nach docs/tickets/T11/abweichungen.md.'));
}

const live=Boolean(process.env.OPENAI_API_KEY&&process.env.OPENAI_MODEL);
let file=null,pass=null,mode=live?'live':'offline';
console.log(color.bold('JuicyBids – interaktiver Test')+color.dim('  q = Ende'));
if(!live)console.log(color.dim('OPENAI_API_KEY/OPENAI_MODEL fehlen: nur Offline-Modus. Siehe npm run setup.'));
while(true){
 const examples=readdirSync('examples').filter(f=>/\.(pass|profile)\.json$|\.prompt\.txt$/.test(f)).sort();
 console.log(`\n${color.bold('Firmenpass wählen')}`);
 examples.forEach((f,i)=>console.log(`  ${i+1}) ${f}`));
 console.log(`  p) eigener Pfad${file?`\n  Enter) ${basename(file)} erneut (Änderungen bleiben)`:''}`);
 const pick=await ask('> ',file?'':'1');
 if(pick==='q')break;
 if(pick){
  const next=pick==='p'?await ask('Pfad: '):examples[Number(pick)-1]&&join('examples',examples[Number(pick)-1]);
  if(!next||!existsSync(next)){console.log(color.bad('Unbekannte Auswahl.'));continue;}
  // .prompt.txt holds a free-text request: the agent builds the Firmenpass itself (tender/intake.mjs).
  if(next.endsWith('.prompt.txt')){pass=readFileSync(next,'utf8').trim();file=next;}
  else try{pass=JSON.parse(readFileSync(next,'utf8'));file=next;}catch(e){console.log(color.bad(`Kein gültiges JSON: ${e.message}`));continue;}
 }
 if(live){
  const m=await ask(`Modus: l) live mit Modell  o) offline Platzhalter  [${mode==='live'?'l':'o'}] `,mode==='live'?'l':'o');
  if(m==='q')break;
  mode=m.startsWith('o')?'offline':'live';
 }
 const text=typeof pass==='string';
 console.log(color.dim(text?`Freitext: ${pass.slice(0,160)}${pass.length>160?'…':''}`:brief(pass)));
 if(text)console.log(color.dim('Freitext: keine Feldänderung, der Agent leitet den Firmenpass selbst ab (Annahmen im Bericht).'));
 let entry='';
 while(!text&&(entry=await ask('Feld ändern (feld=wert, „zeigen“, Enter = starten): '))){
  if(entry==='q')break;
  if(entry==='zeigen'){console.log(JSON.stringify(pass,null,1));continue;}
  try{applyChange(pass,entry);console.log(color.dim(brief(pass)))}catch(e){console.log(color.bad(e.message))}
 }
 if(entry==='q')break;
 if(mode==='live'&&!await ensureEve())continue;
 const stamp=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19),name=basename(file).replace(/\.(pass|profile)\.json$|\.prompt\.txt$/,'');
 console.log(color.dim(`Läuft (${mode})…`));
 const started=Date.now();
 let report;
 try{report=await scout(text?pass:JSON.stringify(pass),join(OUT,`${name}-${stamp}-session.json`),undefined,mode==='offline'?{ask:placeholder}:{});}
 catch(e){console.log(color.bad(`Fehler: ${e.message}`));if(mode==='live')console.log(color.dim(`Eve-Log: ${OUT}/eve.log oder Terminal von npm start`));continue;}
 const saved=join(OUT,`${name}-${stamp}-${mode}.md`);
 writeFileSync(saved,report,{mode:0o600});
 console.log(`\n${report}`);
 const rows=ranking(report),footer=JSON.parse(report.match(/```json\n(.*)\n```/)?.[1]??'{}');
 console.log(color.bold(`Zusammenfassung (${((Date.now()-started)/1000).toFixed(1)} s)`));
 if(footer.verified!==undefined)console.log(`  ${footer.go+footer.conditional} gelistet · ${footer.go} GO · ${footer.verified-footer.go-footer.conditional} NO-GO (nicht aufgeführt) · ${footer.matches-footer.verified} bei Gegenprüfung verworfen`);
 for(const r of rows)console.log(`  ${r.verdict.padEnd(16)} ${String(r.score).padStart(3)}  ${r.title.slice(0,70)}`);
 console.log(color.dim(`  Bericht: ${saved}`));
 compare(name,rows);
}
stopEve();
closePrompt();
