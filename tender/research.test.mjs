import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hireResearch,mergePrompt,needsResearch,researchConfig,researchInput,researchNote,researchPrompt} from './research.mjs';
const understanding={source:'text',pass:{company_name:'IsarCode Digital Solutions GmbH',trade:'it',home_location:'München',references:[],certifications:[],exclusions:[]},assumptions:['Teamgröße: 4'],questions:['Haben Sie Referenzen?']};
const config={agentId:'agent-1',maxCredits:10,timeoutMs:60000,inputField:'prompt',inputTemplate:null,target:'preprod'};
// Fake Sokosumi CLI: records calls, returns the scripted answers in order.
const fakeCli=answers=>{const calls=[];const cli=args=>{calls.push(args);const next=answers.shift();if(next instanceof Error)throw next;return next;};cli.calls=calls;return cli;};
test('research config comes from the environment and is off without an agent id',()=>{
 assert.equal(researchConfig({}),null);
 assert.deepEqual(researchConfig({RESEARCH_AGENT_ID:' a1 '}),{agentId:'a1',maxCredits:10,timeoutMs:240000,inputField:'prompt',inputTemplate:null,target:'preprod'});
 assert.equal(researchConfig({RESEARCH_AGENT_ID:'a1',RESEARCH_MAX_CREDITS:'25',RESEARCH_TIMEOUT_MINUTES:'2',RESEARCH_INPUT_FIELD:'text'}).maxCredits,25);
 assert.equal(researchConfig({RESEARCH_AGENT_ID:'a1',RESEARCH_TIMEOUT_MINUTES:'2'}).timeoutMs,120000);
});
test('research is needed only for named companies with gaps, never for a JSON Firmenpass',()=>{
 assert.equal(needsResearch(understanding),true);
 assert.equal(needsResearch({...understanding,source:'json'}),false);
 assert.equal(needsResearch({...understanding,pass:{...understanding.pass,company_name:undefined}}),false);
 assert.equal(needsResearch({...understanding,pass:{...understanding.pass,references:[{summary:'x'}],certifications:['ISO 27001'],exclusions:['Hardware']}}),false);
});
test('research brief names the company and forbids contact data',()=>{
 const p=researchPrompt(understanding.pass);
 assert.match(p,/IsarCode Digital Solutions GmbH/);assert.match(p,/München/);assert.match(p,/Referenzprojekte/);assert.match(p,/Keine Namen von Personen/);
});
test('hire polls until completed and returns the delivered text',async()=>{
 const cli=fakeCli([{job:{id:'job-1',status:'payment_pending'}},{job:{id:'job-1',status:'processing'},events:[{status:'RUNNING'}]},{job:{id:'job-1',status:'completed',result:'Firma macht Java.'},events:[{status:'COMPLETED',result:'Firma macht Java.'}]}]);
 const written=[];
 const r=await hireResearch('brief',config,{cli,sleep:async()=>{},writeInput:json=>{written.push(json);return '/tmp/in.json'}});
 assert.deepEqual(r,{jobId:'job-1',agentId:'agent-1',credits:10,status:'completed',result:'Firma macht Java.'});
 assert.deepEqual(JSON.parse(written[0]),{prompt:'brief'});
 assert.deepEqual(cli.calls[0],['--preprod','agents','hire','agent-1','--input-file','/tmp/in.json','--max-credits','10','--json']);
 assert.deepEqual(cli.calls[1],['--preprod','jobs','get','job-1','--details','--json']);
 assert.equal(cli.calls.length,3);
});
test('hire gives up after the timeout or a failed job and never throws once a job exists',async()=>{
 let t=0;const now=()=>t;
 const slow=fakeCli([{job:{id:'job-2',status:'payment_pending'}},...Array(10).fill({job:{id:'job-2',status:'processing'}})]);
 const r=await hireResearch('brief',config,{cli:slow,sleep:async()=>{t+=30000},now,writeInput:()=>'/tmp/in.json'});
 assert.equal(r.result,null);assert.match(r.status,/timeout after 1 min/);
 const failed=fakeCli([{job:{id:'job-3',status:'payment_pending'}},{job:{id:'job-3',status:'processing'},events:[{status:'FAILED'}]}]);
 const f=await hireResearch('brief',config,{cli:failed,sleep:async()=>{},writeInput:()=>'/tmp/in.json'});
 assert.match(f.status,/failed/);assert.equal(f.jobId,'job-3');
 const none=fakeCli([{error:'AUTH_REQUIRED'}]);
 await assert.rejects(hireResearch('brief',config,{cli:none,sleep:async()=>{},writeInput:()=>'/tmp/in.json'}),/no job id/);
});
test('merge prompt keeps user facts first and marks research findings',()=>{
 const p=mergePrompt(understanding,'Referenzen: Landesbehörde 2025, 145.000 €');
 assert.match(p,/Angaben des Nutzers bleiben unverändert/);assert.match(p,/„aus Recherche:“/);assert.match(p,/Landesbehörde 2025/);assert.doesNotMatch(p,/nuts_prefixes/);
 assert.match(researchNote({agentId:'a',jobId:'j',credits:10,status:'completed'},'Researcher'),/„Researcher“ beauftragt und bezahlt \(Job j, bis 10 Credits\)/);
 assert.match(researchNote({agentId:'a',jobId:'j',credits:10,status:'failed (x)'}),/kein Ergebnis \(failed \(x\)\)/);
});
test('enrich hires only when configured, merges findings via the model and names the step',async()=>{
 const {enrich}=await import('./scout.mjs');
 const u={...understanding,pass:{...understanding.pass,trades:['it'],service_description:'Agile Softwareentwicklung für Behörden.',states:['DE-BY'],min_value_eur:10000,max_value_eur:400000,available_from:'2026-11-01',licenses:[],lookback_days:14}};
 assert.equal(await enrich(u,async()=>{throw new Error('no model call')},{config:null}),u);
 const merged={pass:{...u.pass,references:[{public_client:true,year:2025,value_eur:145000,summary:'Fachverfahren Landesbehörde'}]},assumptions:['aus Recherche: Referenz Landesbehörde 2025, 145.000 €'],questions:[]};
 const ask=async()=>JSON.stringify(merged);
 const hire=async(prompt,cfg)=>({jobId:'job-9',agentId:cfg.agentId,credits:cfg.maxCredits,status:'completed',result:'Referenzen: Landesbehörde 2025 (145.000 €)'});
 const r=await enrich(u,ask,{config,hire,agentName:'Researcher'});
 assert.equal(r.pass.references.length,1);assert.equal(r.research.jobId,'job-9');
 assert.match(r.assumptions.join('|'),/aus Recherche: Referenz/);assert.match(r.assumptions.at(-1),/„Researcher“ beauftragt und bezahlt/);
 assert.equal(r.questions.includes('Haben Sie Referenzen?'),false);
 const failed=await enrich(u,ask,{config,hire:async()=>({jobId:'job-10',agentId:'agent-1',credits:10,status:'failed (x)',result:null})});
 assert.deepEqual(failed.pass,u.pass);assert.match(failed.assumptions.at(-1),/kein Ergebnis/);
 const none=await enrich(u,ask,{config,hire:async()=>{throw new Error('AUTH_REQUIRED')}});
 assert.deepEqual(none.pass,u.pass);assert.match(none.assumptions.at(-1),/Firmenrecherche nicht möglich/);
});
test('input follows the agent schema: whole brief in one field, or a template with placeholders',()=>{
 assert.deepEqual(researchInput(config,understanding.pass,'brief'),{prompt:'brief'});
 const chronos={...config,inputTemplate:'{"topic":"{company}","timeframe":"30d","limit":"5"}'};
 assert.deepEqual(researchInput(chronos,understanding.pass,'brief'),{topic:'IsarCode Digital Solutions GmbH',timeframe:'30d',limit:'5'});
 assert.deepEqual(researchInput({...config,inputTemplate:'{"q":"{company} {location} {trade}: {brief}"}'},understanding.pass,'b'),{q:'IsarCode Digital Solutions GmbH München it: b'});
});
