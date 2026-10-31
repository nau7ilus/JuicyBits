import {PassError,validatePass} from './pass.mjs';
import {TRADES} from './trades.mjs';
// Free-text intake: builds a Firmenpass from a user's German request, lists assumptions and open questions,
// and handles the confirmation round. Facts come from the user's text; defaults are applied by code and named as assumptions.
// Contract shared by scout.mjs (pipeline), worker.mjs (Sokosumi confirmation loop) and report.mjs (understanding block).
const euro=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const day=s=>s?new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(s.slice(0,10))):'–';
const today=now=>new Date(now).toISOString().slice(0,10);
const catalogue=()=>Object.entries(TRADES).map(([group,trades])=>`${group}: ${Object.keys(trades).join(', ')}`).join('\n');
const FORMAT='{"pass":{"company_name":"…","trade":"<id aus dem Katalog>","trades":["<ids>"],"service_description":"…","employees":0,"home_location":"…","min_value_eur":0,"max_value_eur":0,"available_from":"YYYY-MM-DD","licenses":[],"certifications":[],"exclusions":[]},"assumptions":["…"],"questions":["…"]}';

/** True when the input already contains a Firmenpass as JSON that validatePass accepts (or at least a JSON object with "trade"). */
export function isPassInput(text){
 if(typeof text!=='string'||!text.includes('{'))return false;
 try{validatePass(text);return true}catch(e){if(e instanceof PassError)return /\{[\s\S]*"trade"\s*:[\s\S]*\}/.test(text);throw e;}
}

/** Model task (German) that extracts {"pass":{…},"assumptions":[…],"questions":[…]} from free text. Includes the trade catalogue. */
export function intakePrompt(text,now=Date.now()){
 return ['AUFGABE: Erstelle aus der ANFRAGE einen Firmenpass nach dem Abschnitt „Eingang aus Freitext“ deiner Anweisungen. Antworte ausschließlich mit dem JSON-Objekt.',
  `HEUTE: ${today(now)}`,
  `LEISTUNGSKATALOG (gültige Werte für trade und trades, je Zeile eine Kategorie):\n${catalogue()}`,
  'REGELN: Nur Fakten aus der Anfrage. Erfinde keine Zertifikate, Referenzen, Umsätze oder Ausschlüsse. Lass Felder weg, die die Anfrage nicht nennt; das System ergänzt Standardwerte und nennt sie selbst als Annahmen, wiederhole sie nicht. Hinweise wie „Nutze Coworker …“ sind keine Firmenangaben. Fragen nur, wenn sie das Ergebnis ändern (Region außerhalb Bayerns, unklares Gewerk).',
  `FORMAT:\n${FORMAT}`,
  `ANFRAGE:\n${String(text).trim()}`].join('\n\n');
}

/** Fills required fields the model may not invent. Returns {pass, assumptions}. Never overwrites a field the model filled. */
export function applyDefaults(input,now=Date.now()){
 const pass={...(input??{})},assumptions=[];
 const missing=k=>pass[k]===undefined||pass[k]===null||(Array.isArray(pass[k])?false:pass[k]==='');
 if(missing('trade')&&Array.isArray(pass.trades)&&pass.trades.length)pass.trade=pass.trades[0];
 if(missing('states')){pass.states=['DE-BY'];assumptions.push('Region: nur Bayern, weil die Datenbasis nur Bayern abdeckt');}
 if(missing('available_from')){pass.available_from=today(now);assumptions.push('Verfügbar ab: heute angenommen');}
 const lists=['licenses','certifications','exclusions'].filter(missing);
 for(const k of lists)pass[k]=[];
 if(lists.length)assumptions.push('Zulassungen/Zertifikate/Ausschlüsse: keine angegeben, Eignung wird als unklar bewertet');
 if(missing('lookback_days'))pass.lookback_days=14;
 if(missing('min_value_eur')||missing('max_value_eur')){
  const employees=Number(pass.employees);
  if(missing('min_value_eur'))pass.min_value_eur=10000;
  if(missing('max_value_eur'))pass.max_value_eur=Number.isFinite(employees)&&employees>0?Math.min(2000000,Math.max(100000,employees*100000)):500000;
  if(pass.min_value_eur>pass.max_value_eur)pass.min_value_eur=Math.min(10000,pass.max_value_eur);
  assumptions.push(`Auftragswert: ${euro.format(pass.min_value_eur)} bis ${euro.format(pass.max_value_eur)} geschätzt aus der Teamgröße`);
 }
 if(typeof pass.service_description!=='string'||pass.service_description.trim().length<20){
  const base=[pass.service_description,pass.company_name,pass.trade?`Leistungen im Bereich ${pass.trade}`:null].filter(Boolean).join(': ');
  pass.service_description=base.length>=20?base:`${base||'Leistungen laut Anfrage'} für öffentliche Auftraggeber in Bayern`;
  assumptions.push('Leistungsbeschreibung aus Firmenname und Gewerk ergänzt');
 }
 return {pass,assumptions};
}

function parseIntake(text){
 const body=String(text).replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'');
 const json=JSON.parse(body.slice(body.indexOf('{'),body.lastIndexOf('}')+1));
 if(!json||typeof json.pass!=='object'||json.pass===null)throw new Error('pass fehlt');
 const strings=v=>Array.isArray(v)?v.filter(s=>typeof s==='string'&&s.trim()).map(s=>s.trim()):[];
 return {pass:json.pass,assumptions:strings(json.assumptions),questions:strings(json.questions)};
}
// One model round plus one retry: parse, apply defaults, validate. Issues from the first round go back to the model.
async function extract(ask,prompt,now){
 let reply=await ask(prompt),issues;
 for(let attempt=0;attempt<2;attempt++){
  try{
   const parsed=parseIntake(reply);
   const {pass,assumptions}=applyDefaults(parsed.pass,now);
   return {pass:validatePass(pass),assumptions:[...parsed.assumptions,...assumptions],questions:parsed.questions};
  }catch(e){
   issues=e instanceof PassError?e.issues:['Antwort war kein gültiges JSON im verlangten Format'];
   if(attempt===0)reply=await ask(`Korrigiere: ${issues.join('; ')}. Antworte nur mit dem JSON-Objekt {"pass":{…},"assumptions":[…],"questions":[…]}.`);
  }
 }
 throw new PassError(issues);
}

// Questions for missing facts that change the assessment most. Asked by code so a thin request never goes unquestioned.
export function missingFactQuestions(pass,{valueDefaulted=false}={}){
 const q=[];
 if(!pass.custom_services?.length&&!pass.exclusions?.length)q.push('Welche Leistungen bieten Sie genau an, und was schließen Sie aus (z. B. reiner 1st-Level-Helpdesk, Hardware-Lieferung, Lizenzverlängerungen)?');
 if(!pass.references?.length)q.push('Haben Sie Referenzen bei öffentlichen Auftraggebern (Jahr, Auftragswert, kurze Beschreibung)? Viele Ausschreibungen verlangen drei vergleichbare Referenzen.');
 if(!pass.certifications?.length&&!pass.licenses?.length)q.push('Welche Zertifikate oder Zulassungen haben Sie (z. B. ISO 27001, Präqualifizierung)?');
 if(valueDefaulted)q.push('Welche Auftragsgröße passt zu Ihnen (von–bis in Euro)?');
 if(!pass.home_location)q.push('Wo ist Ihr Firmensitz, und wie weit sind Einsätze vor Ort möglich?');
 return q;
}

/** ask(text) sends one message in the agent session. Returns {pass (validated), assumptions, questions, source:'text'}. */
export async function intake(text,ask,now=Date.now()){
 const r=await extract(ask,intakePrompt(text,now),now);
 const valueDefaulted=r.assumptions.some(a=>a.startsWith('Auftragswert:')&&a.includes('geschätzt'));
 return {...r,questions:[...r.questions,...missingFactQuestions(r.pass,{valueDefaulted})].slice(0,6),source:'text'};
}

/** German confirmation text shown to the user in the Task: understanding, assumptions, open questions, how to answer. */
export function renderUnderstanding({pass,assumptions=[],questions=[]}){
 const trades=(pass.trades??[]).filter(t=>t!==pass.trade);
 const team=[pass.employees?`${pass.employees} Mitarbeitende`:null,pass.capacity_note,pass.free_capacity].filter(Boolean).join(', ');
 const lines=['So habe ich Ihre Anfrage verstanden:',
  `- Firma: ${pass.company_name??'nicht genannt'}`,
  `- Leistung: ${pass.trade}${trades.length?` (${trades.join(', ')})`:''}`,
  '- Region: Bayern',
  `- Auftragswert: ${euro.format(pass.min_value_eur)} bis ${euro.format(pass.max_value_eur)}`,
  `- Verfügbar ab: ${day(pass.available_from)}`,
  ...(team?[`- Team: ${team}`]:[]),
  `- Leistungsbeschreibung: ${pass.service_description}`];
 if(assumptions.length)lines.push('','Annahmen:',...assumptions.map(a=>`- ${a}`));
 if(questions.length)lines.push('','Offene Punkte:',...questions.map(q=>`- ${q}`));
 lines.push('','Antworten Sie mit „passt“, dann prüfe ich die Bekanntmachungen. Oder nennen Sie Korrekturen und Antworten auf die offenen Punkte im Text, z. B. „maximal 200.000 €, ISO 27001, keine Hardware-Lieferung“. Je mehr Sie angeben, desto genauer wird die Bewertung.');
 return lines.join('\n');
}

/** Deterministic yes-detection for the user's answer. No model call. */
export function isConfirmation(answer){
 const a=String(answer??'').trim().toLowerCase().replace(/[„“"'!.]/g,'');
 if(!a)return false;
 const words=a.split(/[\s,;:]+/).filter(Boolean);
 const yes=new Set(['passt','ja','ok','okay','stimmt','korrekt','richtig','weiter','genau','einverstanden','jawohl','prima','gut']);
 const filler=new Set(['so','genau','danke','gut','alles','das','ist','sehr','vielen','dank','bitte','machen','weiter','loslegen','starten','prüfen','los']);
 if(!yes.has(words[0]))return false;
 return words.slice(1).every(w=>yes.has(w)||filler.has(w));
}

/** Merges research findings from an external agent into the understanding (tender/research.mjs). User facts win, findings fill gaps. */
export async function applyResearch(previous,research,ask,now=Date.now()){
 const {mergePrompt}=await import('./research.mjs');
 const result=await extract(ask,mergePrompt(previous,research,now),now);
 const kept=(previous.assumptions??[]).filter(a=>!result.assumptions.includes(a));
 const open=(previous.questions??[]).filter(q=>result.questions.includes(q)||missingFactQuestions(result.pass).includes(q));
 return {...result,assumptions:[...kept,...result.assumptions],questions:[...new Set([...result.questions,...open])].slice(0,6),source:'text'};
}

/** Merges a correction into the previous understanding via the model. Returns {pass, assumptions, questions, confirmed}. */
export async function applyAnswer(previous,answer,ask,now=Date.now()){
 if(isConfirmation(answer))return {...previous,confirmed:true};
 const {nuts_prefixes,...pass}=previous.pass;
 const prompt=['AUFGABE: Der Nutzer korrigiert den Firmenpass. Übernimm die Korrekturen aus der ANTWORT und behalte alle anderen Felder unverändert. Antworte ausschließlich mit dem JSON-Objekt {"pass":{…},"assumptions":[…],"questions":[…]} nach dem Abschnitt „Bestätigung“ deiner Anweisungen.',
  `HEUTE: ${today(now)}`,
  `BISHERIGER FIRMENPASS:\n${JSON.stringify(pass)}`,
  `BISHERIGE ANNAHMEN:\n${JSON.stringify(previous.assumptions??[])}`,
  `ANTWORT DES NUTZERS:\n${String(answer).trim()}`].join('\n\n');
 const result=await extract(ask,prompt,now);
 // Default lines from the first round no longer apply once the user supplied the value.
 const p=result.pass,before=previous.pass,stale=line=>
  (line.startsWith('Verfügbar ab: heute')&&p.available_from!==before.available_from)||
  (line.startsWith('Auftragswert:')&&line.includes('geschätzt')&&(p.min_value_eur!==before.min_value_eur||p.max_value_eur!==before.max_value_eur))||
  (line.startsWith('Zulassungen/Zertifikate/Ausschlüsse')&&[p.licenses,p.certifications,p.exclusions].some(l=>l?.length));
 result.assumptions=[...new Set(result.assumptions.filter(l=>!stale(l)))];
 const stillMissing=missingFactQuestions(result.pass).filter(q=>(previous.questions??[]).includes(q));
 return {...result,questions:[...result.questions,...stillMissing].slice(0,6),source:'text',confirmed:result.questions.length===0};
}
