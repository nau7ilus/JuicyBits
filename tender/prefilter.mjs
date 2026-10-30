import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
// Deterministic prefilter (T8): open call, published in lookback window, CPV stage (T6), region, open deadline, value range, bid lead time.
export const MAX_CANDIDATES=25;
const DAY=24*60*60*1000;
const clip=(s,n)=>typeof s==='string'&&s.length>n?s.slice(0,n)+' […]':s??null;
export function loadNotices(dir='data/bayern'){
 return readdirSync(dir).filter(f=>f.endsWith('.json')&&f!=='index.json').sort().map(f=>JSON.parse(readFileSync(join(dir,f),'utf8')));
}
// A procedure (OCDS ocid) can appear in several notices and versions, e.g. a corrigendum or <noticeId>-02.
// Only the newest publication counts: later publication day first, then higher version.
export function latestVersions(records){
 const newest=new Map(),version=r=>Number(/-(\d+)$/.exec(r.id)?.[1]??0);
 const newer=(a,b)=>String(a.source.pubDay).localeCompare(String(b.source.pubDay))||version(a)-version(b);
 for(const r of records){
  const key=r.ocds?.ocid??r.source.noticeId??r.id.replace(/-\d+$/,''),seen=newest.get(key);
  if(!seen||newer(r,seen)>0)newest.set(key,r);
 }
 return [...newest.values()];
}
const isOpen=(date,now)=>Boolean(date)&&Date.parse(date)>now;
// "45260000-3" -> "4526": the meaningful part of a hierarchical CPV code.
export const cpvStem=code=>String(code).split('-')[0].replace(/0+$/,'')||'0';
// CPV fit stages from T6: A specific main code, B coarse main code, C trade only as additional code,
// D collective main code, E neighbour code in the same group, F no fit. Points per stage come from T6.
export const CPV_STAGES={A:{points:5,label:'Haupt-CPV ist ein spezifischer Branchencode'},B:{points:4,label:'Haupt-CPV passt nur grob, Leistungstext muss es bestätigen'},
 C:{points:2,label:'Branchencode nur als Zusatz-CPV, Hauptgewerk ist fremd'},D:{points:2,label:'nur Sammelcode, Leistungstext muss die Branchenleistung beschreiben'},
 E:{points:1,label:'Nachbarcode derselben Gruppe, zählt nur, wenn der Text es trägt'},F:{points:0,label:'kein Branchencode'}};
const RANK={A:5,B:4,C:3,D:2,E:1,F:0};
export function cpvStage(main,additional,prefixes){
 const exact=codes=>codes.some(c=>prefixes.some(p=>c.startsWith(p)));
 const ancestor=codes=>codes.map(cpvStem).filter(s=>prefixes.some(p=>p.startsWith(s)&&s.length<p.length));
 if(exact(main))return 'A';
 const coarse=ancestor(main);
 if(coarse.some(s=>s.length>=4))return 'B';
 if(exact(additional))return 'C';
 if(coarse.length)return 'D';
 if([...main,...additional].some(c=>prefixes.some(p=>p.length>=5&&c.startsWith(p.slice(0,4)))))return 'E';
 return 'F';
}
export function noticeStage(record,prefixes){
 const lots=record.eforms?.lots??[];
 const main=[...new Set(lots.map(l=>l.cpv[0]).filter(Boolean))];
 const all=record.summary.cpv;
 return cpvStage(main.length?main:all.slice(0,1),all.filter(c=>!main.includes(c)),prefixes);
}
// Tie-breaker within a stage: how close the nearest code comes to the trade (45260000 beats 45000000 for 45261).
export function cpvDepth(codes,prefixes){
 return Math.max(0,...codes.flatMap(c=>prefixes.map(p=>c.startsWith(p)?p.length+10:p.startsWith(cpvStem(c))?cpvStem(c).length:0)));
}
export function noticeValue(record){
 const lots=record.eforms?.lots??[];
 const v=record.eforms?.estimatedValue??(lots.some(l=>l.estimatedValue)?{amount:lots.reduce((s,l)=>s+(l.estimatedValue?.amount??0),0),currency:lots.find(l=>l.estimatedValue).estimatedValue.currency}:null)??record.ocds?.tender?.value;
 return v?.amount!=null?{amount:Number(v.amount),currency:v.currency??null}:null;
}
// Facts handed to the model and the report. Everything here comes from the source data, never from the model.
export function toFacts(record,now,stage=null){
 const lots=(record.eforms?.lots??[]).filter(l=>isOpen(l.deadline,now)||isOpen(l.participationDeadline,now));
 const deadline=lots.map(l=>l.deadline).filter(Boolean).sort((a,b)=>Date.parse(a)-Date.parse(b))[0]??null;
 const due=deadline??lots.map(l=>l.participationDeadline).filter(Boolean).sort((a,b)=>Date.parse(a)-Date.parse(b))[0]??null;
 return {id:record.id,link:record.source.link,pubDay:record.source.pubDay,title:record.summary.title,buyer:record.summary.buyer,
  procedureType:record.eforms?.procedureType??null,cpv:record.summary.cpv,cpvStage:stage,nuts:record.summary.nuts,value:noticeValue(record),
  deadline,daysLeft:due?Math.floor((Date.parse(due)-now)/DAY):null,
  description:clip(record.ocds?.tender?.description??record.eforms?.description,1500),
  lots:lots.map(l=>({id:l.id,title:l.title,description:clip(l.description,800),cpv:l.cpv,deadline:l.deadline,participationDeadline:l.participationDeadline,
   plannedStart:l.plannedStart,plannedEnd:l.plannedEnd,duration:l.duration,value:l.estimatedValue,smeSuitable:l.smeSuitable,
   selectionCriteria:l.selectionCriteria.map(c=>clip(c.description,600)),awardCriteria:l.awardCriteria,guarantee:l.guarantee}))};
}
export function prefilter(pass,records,now=Date.now()){
 const since=now-pass.lookback_days*DAY,excluded={},count=r=>excluded[r]=(excluded[r]??0)+1;
 const days=records.map(r=>r.source.pubDay).filter(Boolean).sort();
 const kept=[];
 for(const r of latestVersions(records)){
  if(!r.summary.tag.includes('tender')){count('keine offene Ausschreibung (Vorinformation, Vergabe oder Änderung)');continue;}
  if(!r.source.pubDay||Date.parse(r.source.pubDay)<since-DAY){count(`älter als ${pass.lookback_days} Tage`);continue;}
  if(!r.summary.nuts.some(n=>pass.nuts_prefixes.some(p=>n.startsWith(p)))){count('Region passt nicht');continue;}
  const stage=noticeStage(r,pass.cpv_prefixes);
  if(stage==='F'){count('Leistung (CPV) passt nicht');continue;}
  if(!r.eforms){count('Frist unbekannt (keine eForms-Daten)');continue;}
  const facts=toFacts(r,now,stage);
  if(!facts.lots.length){count('Frist abgelaufen oder nicht angegeben');continue;}
  if(pass.bid_lead_days!=null&&facts.daysLeft<pass.bid_lead_days){count(`Frist kürzer als der Angebotsvorlauf (${pass.bid_lead_days} Tage)`);continue;}
  const v=facts.value?.amount;
  if(v!=null&&v>pass.max_value_eur){count('Auftragswert über dem Höchstwert');continue;}
  if(v!=null&&v<pass.min_value_eur){count('Auftragswert unter dem Mindestwert');continue;}
  kept.push(facts);
 }
 // Better CPV stage first, then the code closest to the trade, then the nearest deadline.
 const due=f=>Date.parse(f.deadline??f.lots[0].participationDeadline),depth=f=>cpvDepth(f.cpv,pass.cpv_prefixes);
 kept.sort((a,b)=>RANK[b.cpvStage]-RANK[a.cpvStage]||depth(b)-depth(a)||due(a)-due(b));
 const dropped=Math.max(0,kept.length-MAX_CANDIDATES);
 if(dropped)excluded[`über dem Limit von ${MAX_CANDIDATES} Kandidaten (schwächere CPV-Passung oder spätere Frist)`]=dropped;
 return {candidates:kept.slice(0,MAX_CANDIDATES),excluded,coverage:{notices:records.length,firstDay:days[0]??null,lastDay:days.at(-1)??null}};
}
