import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {VERDICTS} from './assess.mjs';
import {loadNotices} from './prefilter.mjs';
import {run} from './scout.mjs';
// T5/T11 evaluation: runs each test profile with the live model and compares verdicts with examples/t5-expected.json.
// Usage: npm run eval [-- --now 2026-10-30T18:00:00+01:00]
const spec=JSON.parse(readFileSync('examples/t5-expected.json','utf8'));
const nowArg=process.argv.indexOf('--now');
const now=Date.parse(nowArg>0?process.argv[nowArg+1]:spec.now);
const records=loadNotices();
mkdirSync('.local',{recursive:true,mode:0o700});
const rows=[];
for(const profile of [...new Set(spec.cases.map(c=>c.profile))]){
 console.error('Running',profile);
 const result=await run(readFileSync(`examples/${profile}.pass.json`,'utf8'),`.local/eval-${profile}-session.json`,undefined,{records,now});
 for(const c of spec.cases.filter(c=>c.profile===profile)){
  const hit=result.verified.find(m=>m.facts.id.startsWith(c.notice)),rejected=result.rejected.find(r=>r.id.startsWith(c.notice));
  const candidate=result.candidates.some(f=>f.id.startsWith(c.notice));
  const actual=hit?hit.judgement.verdict:rejected?'rejected':candidate?'unassessed':'prefiltered';
  // A GO MIT AUFLAGE where T5 expects GO is a partial match; NO-GO may also come from the deterministic prefilter.
  const ok=actual===c.expected||(c.expected==='nogo'&&actual==='prefiltered')?'ja':c.expected==='go'&&actual==='conditional'?'teilweise':'nein';
  rows.push({...c,actual,total:hit?.judgement.total??null,ok,detail:hit?[...hit.judgement.ko,...hit.judgement.todos].join(' / '):''});
 }
}
const label=v=>VERDICTS[v]??{prefiltered:'vom Vorfilter ausgeschlossen',rejected:'bei Gegenprüfung verworfen',unassessed:'nicht bewertet'}[v];
const table=['| Profil | Bekanntmachung | Erwartet | Ergebnis | Punkte | Passt | K.O. / To-do |','|---|---|---|---|---|---|---|',
 ...rows.map(r=>`| ${r.profile} | ${r.title} | ${label(r.expected)} (${r.score}) | ${label(r.actual)} | ${r.total??'–'} | ${r.ok} | ${r.detail.replace(/\|/g,'/')} |`)].join('\n');
const summary=`${rows.filter(r=>r.ok==='ja').length} von ${rows.length} Fällen wie erwartet, ${rows.filter(r=>r.ok==='teilweise').length} teilweise.`;
writeFileSync('.local/eval.md',`# T5-Auswertung (${new Date(now).toISOString()})\n\n${summary}\n\n${table}\n`);
console.log(`${summary}\n\n${table}`);
