import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePass} from './pass.mjs';
import {EXAMPLE_PASS,NOW,record} from './fixtures.mjs';
import {MAX_CANDIDATES,cpvStage,latestVersions,prefilter} from './prefilter.mjs';
const pass=validatePass(EXAMPLE_PASS);
test('each rule excludes with a German reason and keeps only open Bavarian matches',()=>{
 const result=prefilter(pass,[record('ok'),record('award',{tag:['award']}),record('old',{pubDay:'2026-10-01'}),record('cpv',{cpv:['90911000']}),
  record('hessen',{nuts:['DE724']}),record('closed',{deadline:'2026-10-29T09:00:00+01:00'}),record('noforms',{eforms:false}),
  record('big',{value:900000}),record('small',{value:5000}),record('unknown-value')],NOW);
 assert.deepEqual(result.candidates.map(c=>c.id),['ok','unknown-value']);
 assert.equal(Object.values(result.excluded).reduce((a,b)=>a+b),8);
 assert.equal(result.excluded['Region passt nicht'],1);
 assert.equal(result.coverage.firstDay,'2026-10-01');
});
test('facts carry source data only and the nearest deadline',()=>{
 const [facts]=prefilter(pass,[record('ok',{value:100000})],NOW).candidates;
 assert.equal(facts.deadline,'2026-11-30T09:00:00+01:00');assert.deepEqual(facts.value,{amount:100000,currency:'EUR'});
 assert.deepEqual(facts.lots[0].selectionCriteria,['Meisterbrief']);
});
test(`at most ${MAX_CANDIDATES} candidates, specific CPV and earlier deadline first`,()=>{
 const wide=validatePass({...EXAMPLE_PASS,cpv_prefixes:['45']});
 const many=Array.from({length:30},(_,i)=>record(`n${String(i).padStart(2,'0')}`,{cpv:['45000000'],deadline:`2026-12-${String(i%28+1).padStart(2,'0')}T09:00:00+01:00`}));
 const result=prefilter(wide,many,NOW);
 assert.equal(result.candidates.length,MAX_CANDIDATES);
 assert.equal(result.candidates[0].deadline,'2026-12-01T09:00:00+01:00');
 assert.match(Object.keys(result.excluded).join(),/Limit von 25/);
});
test('T6 CPV stages: specific, coarse, additional, collective, neighbour and none',()=>{
 const p=['45261'];
 assert.equal(cpvStage(['45261410'],[],p),'A');
 assert.equal(cpvStage(['45260000'],[],p),'B');
 assert.equal(cpvStage(['45310000'],['45261000'],p),'C');
 assert.equal(cpvStage(['45000000'],['45260000'],p),'D');
 assert.equal(cpvStage(['45262670'],[],p),'E');
 assert.equal(cpvStage(['90911000'],[],p),'F');
});
test('only the newest version of a notice counts and short deadlines respect the bid lead time',()=>{
 const old=record('n-01',{deadline:'2026-11-30T09:00:00+01:00'}),newer={...record('n-02',{deadline:'2026-11-02T09:00:00+01:00'}),source:{...record('n-02').source,noticeId:'n'}};
 old.source.noticeId='n';
 assert.deepEqual(latestVersions([old,newer]).map(r=>r.id),['n-02']);
 const result=prefilter(validatePass({...EXAMPLE_PASS,bid_lead_days:7}),[old,newer],NOW);
 assert.equal(result.candidates.length,0);assert.equal(result.excluded['Frist kürzer als der Angebotsvorlauf (7 Tage)'],1);
});
test('a corrigendum published as a new notice replaces the earlier notice of the same procedure',()=>{
 const first={...record('a-01'),ocds:{ocid:'ocds-x',tender:{}}},later={...record('b-01'),ocds:{ocid:'ocds-x',tender:{}},source:{...record('b-01').source,pubDay:'2026-10-29'}};
 first.source.pubDay='2026-10-18';
 assert.deepEqual(latestVersions([later,first]).map(r=>r.id),['b-01']);
});
