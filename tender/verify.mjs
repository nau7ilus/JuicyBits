import {noticeStage} from './prefilter.mjs';
// Verification (T18): every assessed match is re-checked against the source record before delivery.
export function verifyMatch(facts,record,pass,now=Date.now()){
 const failures=[];
 if(!record||record.id!==facts.id)failures.push('nicht im Export gefunden');
 const lots=record?.eforms?.lots??[];
 const open=lots.some(l=>(l.deadline&&Date.parse(l.deadline)>now)||(l.participationDeadline&&Date.parse(l.participationDeadline)>now));
 if(!open)failures.push('Frist nicht mehr offen');
 if(!record||noticeStage(record,pass.cpv_prefixes)==='F')failures.push('CPV passt nicht');
 if(!(record?.summary.nuts??[]).some(n=>pass.nuts_prefixes.some(p=>n.startsWith(p))))failures.push('Region passt nicht');
 return failures;
}
export function verifyAll(assessed,records,pass,now=Date.now()){
 const byId=new Map(records.map(r=>[r.id,r])),verified=[],rejected=[];
 for(const a of assessed){
  const failures=verifyMatch(a.facts,byId.get(a.facts.id),pass,now);
  if(failures.length){rejected.push({id:a.facts.id,failures});console.error('Match dropped after verification',a.facts.id,failures.join(', '));}
  else verified.push(a);
 }
 return {verified,rejected};
}
