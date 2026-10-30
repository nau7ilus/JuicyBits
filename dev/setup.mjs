import {chmodSync,copyFileSync,existsSync,readFileSync} from 'node:fs';
import {eveAddress} from '../start.mjs';
import {ask,closePrompt,color,confirm,interactive,readEnv,reachable,run} from './common.mjs';
// Developer setup: checks tools, login, .env and data, offers the safe local steps and lists what the participant must provide.
// npm run setup            interactive (offers npm ci, .env, login, npm test)
// npm run setup -- --check report only, changes nothing
const checkOnly=process.argv.includes('--check')||!interactive;
const todos=[];
const line=(state,label,detail='')=>console.log(`${{ok:color.ok('✔'),bad:color.bad('✖'),todo:color.todo('•'),info:color.dim('·')}[state]} ${label}${detail?color.dim(`  ${detail}`):''}`);
const need=(label,how)=>{todos.push({label,how});line('todo',label,how)};
const section=title=>console.log(`\n${color.bold(title)}`);
const offer=async(question,yes=true)=>!checkOnly&&await confirm(question,yes);

// Where each value comes from. Only names from .env.example and the setup skill.
const HELP={
 OPENAI_API_KEY:'API-Key aus eurem OpenAI-Konto (API keys)',
 OPENAI_MODEL:'Modell-ID, die euer OpenAI-Key nutzen darf',
 OPENAI_CONTEXT_WINDOW_TOKENS:'optional, nur wenn Eve das Modell nicht kennt: Kontextlimit laut Anbieter',
 OPENAI_BASE_URL:'wird vom Agenten nicht genutzt (Eve-OpenAI-Anbindung, Standard-Endpunkt); leer lassen',
 EVE_PORT:'lokaler Port, Vorgabe 21949',EVE_URL:'http://127.0.0.1:<EVE_PORT>',
 COWORKER_ID:'Coworker-ID aus `sokosumi --preprod coworkers register …` (Skill tum-hackathon-agent, Schritt 2)',
 SOKOSUMI_ORGANIZATION_ID:'leer = Personal Workspace; TUM Workspace: aus `sokosumi --preprod workspaces list --json`',
 SOKOSUMI_ORGANIZATION_SLUG:'leer = Personal Workspace; sonst Slug passend zur Organization-ID',
 BLOCKFROST_API_KEY_PREPROD:'Blockfrost-Projekt-Key für Cardano Preprod (nur bezahlte Jobs)',
 AGENT_AUTHOR:'euer Autorname, Pflicht vor der Agent-Registrierung (nur bezahlte Jobs)',
 PAID_TASKS_ENABLED:'false bis der unbezahlte Task läuft',
};
const STAGES=[
 ['Offline-Test (npm run try, Modus offline)',[]],
 ['Live-Bewertung mit Modell (npm start + npm run try)',['OPENAI_API_KEY','OPENAI_MODEL','EVE_PORT','EVE_URL']],
 ['Sokosumi-Task (npm start + npm run worker)',['COWORKER_ID']],
 ['Bezahlte Preprod-Jobs (T13, npm run api)',['BLOCKFROST_API_KEY_PREPROD','AGENT_AUTHOR']],
];

console.log(color.bold('TenderScout – Entwicklungs-Setup')+(checkOnly?color.dim('  (nur Prüfung, keine Änderungen)'):''));

section('1. Werkzeuge');
const major=Number(process.versions.node.split('.')[0]);
major>=24?line('ok',`Node.js ${process.versions.node}`):need(`Node.js 24 statt ${process.versions.node}`,'in WSL: nvm install 24 && nvm use 24');
if(process.platform==='win32')line('info','Windows erkannt','AGENTS.md: Entwicklung in WSL (Ubuntu); node_modules nicht zwischen Windows und WSL teilen');
if(existsSync('node_modules/eve/package.json'))line('ok','Abhängigkeiten installiert');
else if(await offer('node_modules fehlt. Jetzt `npm ci` ausführen?')){run('npm',['ci'],{inherit:true}).ok?line('ok','npm ci'):line('bad','npm ci fehlgeschlagen');}
else need('Abhängigkeiten installieren','npm ci');
const cli=run('sokosumi',['--version']);
const cliVersion=cli.out.match(/\d+\.\d+\.\d+/)?.[0];
if(!cli.ok)need('Sokosumi CLI fehlt','npm install --global @masumi_network/sokosumi@1.1.0');
else cliVersion==='1.1.0'?line('ok','Sokosumi CLI 1.1.0'):need(`Sokosumi CLI ${cliVersion} statt 1.1.0`,'npm install --global @masumi_network/sokosumi@1.1.0 (1.0.4 scheitert an tasks create --personal, Core-Route entfernt, siehe docs/tickets/T12)');

section('2. Private Konfiguration (.env)');
let env=readEnv();
if(!env&&await offer('.env fehlt. Aus .env.example anlegen (chmod 600)?')){
 copyFileSync('.env.example','.env');
 try{chmodSync('.env',0o600)}catch{}
 env=readEnv();line('ok','.env angelegt','jetzt die Werte unten eintragen');
}
if(!env){need('.env anlegen','cp .env.example .env && chmod 600 .env');env={};}
const known=[...readFileSync('.env.example','utf8').matchAll(/^([A-Z0-9_]+)=/gm)].map(m=>m[1]);
for(const key of Object.keys(env).filter(k=>!known.includes(k)&&!(k in HELP)))line('info',`${key} gesetzt, steht nicht in .env.example`);
const set=key=>Boolean(env[key]?.trim());
try{eveAddress({EVE_PORT:env.EVE_PORT,EVE_URL:env.EVE_URL});line('ok','EVE_PORT und EVE_URL passen zusammen');}
catch(e){need(e.message,HELP.EVE_URL);}
if(set('OPENAI_CONTEXT_WINDOW_TOKENS')&&!(Number.isSafeInteger(Number(env.OPENAI_CONTEXT_WINDOW_TOKENS))&&Number(env.OPENAI_CONTEXT_WINDOW_TOKENS)>0))need('OPENAI_CONTEXT_WINDOW_TOKENS muss eine positive ganze Zahl sein');
if(env.PAID_TASKS_ENABLED&&!['true','false'].includes(env.PAID_TASKS_ENABLED))need('PAID_TASKS_ENABLED muss true oder false sein');
if(set('SOKOSUMI_ORGANIZATION_ID')!==set('SOKOSUMI_ORGANIZATION_SLUG'))need('SOKOSUMI_ORGANIZATION_ID und _SLUG nur gemeinsam setzen',HELP.SOKOSUMI_ORGANIZATION_ID);
for(const [stage,keys] of STAGES){
 const missing=keys.filter(k=>!set(k));
 if(stage.startsWith('Bezahlte')&&env.PAID_TASKS_ENABLED==='true'&&!existsSync('.local/mps-runtime.env'))missing.push('.local/mps-runtime.env');
 if(!missing.length){line('ok',stage);continue;}
 line(stage.startsWith('Bezahlte')?'info':'todo',stage,`fehlt: ${missing.join(', ')}`);
 if(!stage.startsWith('Bezahlte'))for(const k of missing)todos.push({label:`${k} in .env`,how:HELP[k]});
}
line('info',`OPENAI_BASE_URL ${set('OPENAI_BASE_URL')?'gesetzt, wird vom Agenten nicht genutzt':'leer (Standard-Endpunkt)'}`);
line('info',set('SOKOSUMI_ORGANIZATION_ID')?'Tasks laufen im Organization-Workspace':'Tasks laufen im Personal Workspace');

section('3. Daten (data/bayern)');
if(existsSync('data/bayern/index.json')){
 const index=JSON.parse(readFileSync('data/bayern/index.json','utf8'));
 const days=index.map(n=>n.pubDay).filter(Boolean).sort();
 const open=index.filter(n=>n.deadline&&Date.parse(n.deadline)>Date.now()).length;
 line('ok',`${index.length} Bekanntmachungen`,`${days[0]} bis ${days.at(-1)}, ${open} mit offener Angebotsfrist`);
 const age=Math.floor((Date.now()-Date.parse(days.at(-1)))/864e5);
 if(age>3)line('todo',`Neueste Bekanntmachung ist ${age} Tage alt`,'neue Exporte von Hand nach data/inbox laden, dann npm run data:import (Skill tender-data-import)');
}else need('Keine Daten','Exporte von Hand nach data/inbox laden, dann npm run data:import (Skill tender-data-import)');

section('4. Sokosumi (Preprod)');
if(cli.ok){
 let status=JSON.parse(run('sokosumi',['--preprod','auth','status','--json']).out||'{}');
 if(!status.authenticated&&await offer('Nicht angemeldet. Jetzt `sokosumi --preprod auth login` starten?')){
  run('sokosumi',['--preprod','auth','login'],{inherit:true});
  status=JSON.parse(run('sokosumi',['--preprod','auth','status','--json']).out||'{}');
 }
 status.authenticated?line('ok','Angemeldet bei Preprod',`Methode ${status.authMethod}; Konto prüfen: sokosumi --preprod auth whoami --json`)
  :need('Bei Sokosumi Preprod anmelden','sokosumi --preprod auth login (Konto: https://preprod.sokosumi.com/signup)');
 if(status.authenticated&&set('COWORKER_ID')){
  const owned=run('sokosumi',['--preprod','coworkers','list','--scope','owned','--json']);
  owned.ok&&owned.out.includes(env.COWORKER_ID)?line('ok','COWORKER_ID gehört zu deinem Konto'):need('COWORKER_ID nicht unter deinen Coworkern gefunden','sokosumi --preprod coworkers list --scope owned --json');
  line('info','Worker-Credential kann hier nicht geprüft werden (Vault wird nicht gelesen)','einmalig importieren: Skill tum-hackathon-agent, Schritt 2 „Import the worker credential once“');
 }
}

section('5. Lokale Dienste');
const eve=set('EVE_URL')&&await reachable(env.EVE_URL);
line('info',eve?`Eve läuft auf ${env.EVE_URL}`:'Eve läuft nicht','npm start (npm run try kann Eve selbst starten)');
if(await offer('Tests jetzt ausführen (npm test)?',false))run('npm',['test'],{inherit:true}).ok?line('ok','npm test'):line('bad','npm test fehlgeschlagen');

section('Von dir gebraucht');
if(!todos.length)console.log(color.ok('Nichts. Weiter mit: npm run try'));
else for(const t of todos)console.log(`${color.todo('•')} ${t.label}${t.how?`\n    ${color.dim(t.how)}`:''}`);
console.log(color.dim('\nWerte nur in .env eintragen, nie in Chat, Git oder Screenshots. Danach erneut: npm run setup'));
closePrompt();
