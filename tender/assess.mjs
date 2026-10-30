import {z} from 'zod';
import {CPV_STAGES} from './prefilter.mjs';
// Model judgement (T10) scored with the T6 point system. The model rates sub-criteria; the code adds them up,
// applies the caps and decides GO / GO MIT AUFLAGE / NO-GO. Facts stay with the code.
const pts=max=>z.number().min(0).max(max).transform(Math.round);
const Judgement=z.object({
 id:z.string(),
 points:z.object({
  zulassung:pts(10),referenzen:pts(15),leistungsfaehigkeit:pts(10),
  leistungstext:pts(5),kapazitaet:pts(10),entfernung:pts(5),
  groesse:pts(10),gewinnchance:pts(10),aufwand:pts(5),
  risiko_abzug:pts(15),
 }),
 ko:z.array(z.string().trim().min(1)).max(10).default([]),
 todos:z.array(z.string().trim().min(1)).max(15).default([]),
 reasons:z.array(z.string().trim().min(1)).min(1).max(5),
 proofs:z.array(z.string().trim().min(1)).max(15).default([]),
 risks:z.array(z.string().trim().min(1)).max(15).default([]),
 unclear:z.array(z.string().trim().min(1)).max(20).default([]),
});
const Answer=z.object({assessments:z.array(z.unknown())});
export const VERDICTS={go:'GO',conditional:'GO MIT AUFLAGE',nogo:'NO-GO'};
// T6 Teil 2: blocks, caps and thresholds (GO 70-100, GO MIT AUFLAGE 40-69, NO-GO 0-39).
export function score(points,stage,{ko=[],todos=[]}={}){
 const blocks={eignung:points.zulassung+points.referenzen+points.leistungsfaehigkeit,
  leistbarkeit:CPV_STAGES[stage].points+points.leistungstext+points.kapazitaet+points.entfernung,
  wirtschaftlichkeit:points.groesse+points.gewinnchance+points.aufwand,
  risiko:15-points.risiko_abzug};
 let total=blocks.eignung+blocks.leistbarkeit+blocks.wirtschaftlichkeit+blocks.risiko;
 // Collective or neighbour codes only count when the service text carries them; otherwise it is the wrong trade.
 const wrongTrade=stage==='F'||(['D','E'].includes(stage)&&points.leistungstext===0);
 if(wrongTrade)total=0;
 else if(ko.length)total=Math.min(total,39);
 else if(todos.length||stage==='C')total=Math.min(total,69);
 const verdict=wrongTrade||ko.length||total<40?'nogo':total>=70?'go':'conditional';
 return {total,blocks,verdict};
}
// Pass fields the model needs. Contact data never enters the pass.
export function assessmentPrompt(pass,candidates,now=Date.now()){
 const {categories,manual_cpv,nuts_prefixes,...profile}=pass;
 return ['AUFGABE: Bewerte jede Ausschreibung in KANDIDATEN gegen den FIRMENPASS nach deinen Anweisungen. Antworte ausschließlich mit dem JSON-Objekt.',
  `HEUTE: ${new Date(now).toISOString().slice(0,10)}`,
  `FIRMENPASS:\n${JSON.stringify(profile)}`,
  `KANDIDATEN (${candidates.length}, Fakten aus der öffentlichen Bekanntmachung, nicht verändern):\n${JSON.stringify(candidates)}`].join('\n\n');
}
export function parseAnswer(text){
 const body=String(text).replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'');
 const json=JSON.parse(body.slice(body.indexOf('{'),body.lastIndexOf('}')+1));
 return Answer.parse(json).assessments;
}
// Joins judgements to candidates by id. Unknown ids, duplicates and invalid items are dropped and counted.
export function mergeJudgements(candidates,items){
 const byId=new Map(candidates.map(c=>[c.id,c])),seen=new Set(),dropped={unknown:0,invalid:0,duplicate:0};
 const assessed=[];
 for(const item of items){
  const parsed=Judgement.safeParse(item);
  if(!parsed.success){dropped.invalid++;continue;}
  const j=parsed.data;
  if(!byId.has(j.id)){dropped.unknown++;continue;}
  if(seen.has(j.id)){dropped.duplicate++;continue;}
  seen.add(j.id);
  const {id,...judgement}=j,facts=byId.get(id);
  assessed.push({facts,judgement:{...judgement,reasons:judgement.reasons.slice(0,3),...score(judgement.points,facts.cpvStage,judgement)}});
 }
 const missing=candidates.filter(c=>!seen.has(c.id)).map(c=>c.id);
 return {assessed,missing,dropped};
}
// ask(text) sends one message in the agent session and returns the reply text. One retry on unreadable JSON.
export async function assess(pass,candidates,ask,now=Date.now()){
 if(!candidates.length)return {assessed:[],missing:[],dropped:{unknown:0,invalid:0,duplicate:0}};
 let reply=await ask(assessmentPrompt(pass,candidates,now));
 let items;
 try{items=parseAnswer(reply)}
 catch{
  reply=await ask('Deine Antwort war kein gültiges JSON im verlangten Format. Antworte jetzt nur mit dem JSON-Objekt {"assessments":[...]} für alle Kandidaten.');
  items=parseAnswer(reply);
 }
 return mergeJudgements(candidates,items);
}
