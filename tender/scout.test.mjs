import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assess,mergeJudgements,parseAnswer,score} from './assess.mjs';
import {EXAMPLE_PASS,NOW,record} from './fixtures.mjs';
import {validatePass} from './pass.mjs';
import {prefilter} from './prefilter.mjs';
import {renderReport,sha256} from './report.mjs';
import {scout} from './scout.mjs';
import {verifyAll} from './verify.mjs';
import {placeholder} from './offline.mjs';
const pass=validatePass(EXAMPLE_PASS);
const STRONG={zulassung:10,referenzen:15,leistungsfaehigkeit:10,leistungstext:5,kapazitaet:10,entfernung:5,groesse:10,gewinnchance:5,aufwand:3,risiko_abzug:4};
const judgement=(id,extra={})=>({id,points:STRONG,ko:[],todos:[],reasons:['Fachliche Passung (description): Flachdach.','Eignung (selectionCriteria): Meisterbrief vorhanden.','Zeitraum (plannedStart): passt.'],proofs:['Meisterbrief'],risks:[],...extra});
const reply=items=>'```json\n'+JSON.stringify({assessments:items})+'\n```';
const footer=report=>JSON.parse(report.slice(report.lastIndexOf('```json')+7,report.lastIndexOf('```')));
test('model answers in code fences are parsed',()=>{
 assert.deepEqual(parseAnswer(reply([{id:'a'}])),[{id:'a'}]);
});
test('T6 scoring: blocks, caps and verdicts are computed by code',()=>{
 assert.deepEqual(score(STRONG,'A'),{total:89,blocks:{eignung:35,leistbarkeit:25,wirtschaftlichkeit:18,risiko:11},verdict:'go'});
 assert.equal(score(STRONG,'A',{todos:['Haftpflicht erhöhen']}).verdict,'conditional');
 assert.equal(score(STRONG,'A',{todos:['Haftpflicht erhöhen']}).total,69);
 assert.deepEqual([score(STRONG,'C').total,score(STRONG,'C').verdict],[69,'conditional']);
 assert.deepEqual([score(STRONG,'A',{ko:['Mindestumsatz verfehlt']}).total,score(STRONG,'A',{ko:['x']}).verdict],[39,'nogo']);
 assert.deepEqual(score({...STRONG,leistungstext:0},'D'),{total:0,blocks:{eignung:35,leistbarkeit:17,wirtschaftlichkeit:18,risiko:11},verdict:'nogo'});
 const weak={...STRONG,referenzen:0,leistungsfaehigkeit:0,groesse:0,gewinnchance:0};
 assert.equal(score(weak,'A').verdict,'conditional');assert.equal(score({...weak,kapazitaet:0,zulassung:0},'A').verdict,'nogo');
});
test('unknown ids, duplicates and invalid items are dropped and facts are never taken from the model',()=>{
 const [facts]=prefilter(pass,[record('a')],NOW).candidates;
 const {assessed,missing,dropped}=mergeJudgements([facts,{...facts,id:'b'}],[
  judgement('a',{deadline:'2099-01-01',buyer:'Erfunden'}),judgement('a'),judgement('ghost'),{id:'b',points:{zulassung:'viel'}}]);
 assert.equal(assessed.length,1);assert.deepEqual(missing,['b']);assert.deepEqual(dropped,{unknown:1,invalid:1,duplicate:1});
 assert.equal(assessed[0].facts.buyer,'Stadt Musterstadt');assert.equal(assessed[0].judgement.deadline,undefined);
 assert.equal(assessed[0].judgement.verdict,'go');
});
test('one retry when the first answer is not JSON',async()=>{
 const [facts]=prefilter(pass,[record('a')],NOW).candidates;
 const answers=['Gerne, hier ist meine Einschätzung.',reply([judgement('a')])];const sent=[];
 const result=await assess(pass,[facts],async text=>{sent.push(text);return answers.shift()},NOW);
 assert.equal(result.assessed.length,1);assert.equal(sent.length,2);assert.match(sent[1],/nur mit dem JSON-Objekt/);
});
test('verification drops matches whose source no longer qualifies',()=>{
 const [facts]=prefilter(pass,[record('a')],NOW).candidates;
 const {verified,rejected}=verifyAll([{facts,judgement:judgement('a')}],[record('a',{deadline:'2026-10-01T09:00:00+01:00'})],pass,NOW);
 assert.equal(verified.length,0);assert.deepEqual(rejected[0].failures,['Frist nicht mehr offen']);
});
test('report lists GO before GO MIT AUFLAGE, hides NO-GO and the footer hash covers the Markdown',async()=>{
 const records=[record('a',{value:100000}),record('b',{deadline:'2026-12-15T12:00:00+01:00'}),record('c'),record('hessen',{nuts:['DE724']})];
 const report=await scout(JSON.stringify(EXAMPLE_PASS),null,undefined,{records,now:NOW,ask:async()=>reply([
  judgement('a'),judgement('b',{todos:['Haftpflicht auf 5 Mio. € erhöhen, ca. 3 Tage']}),judgement('c',{ko:['Mindestumsatz verfehlt']})])});
 const f=footer(report),markdown=report.slice(0,report.lastIndexOf('\n\n```json'));
 assert.equal(f.sha256,sha256(markdown));assert.deepEqual([f.matches,f.verified,f.go,f.conditional,f.source_date],[3,3,1,1,'2026-10-29']);
 assert.ok(report.indexOf('Dacharbeiten a')<report.indexOf('Dacharbeiten b'));assert.doesNotMatch(report,/Dacharbeiten c/);
 assert.match(report,/\*\*🟢 GO\*\* · █████████░ 89\/100/);assert.match(report,/\*\*🟡 GO MIT AUFLAGE\*\* · ███████░░░ 69\/100/);
 assert.match(report,/## 2 Ausschreibungen, die Sie realistisch gewinnen können\./);
 assert.match(report,/3 neue Bekanntmachungen passten zu Ihrem Gewerk und Ihrer Region\. Wir haben jede gegen Ihren Firmenpass geprüft und 2 aussortiert\./);
 assert.match(report,/\| GEWERK \| REGION \| AUFTRAGSGRÖSSE \| FREI AB \| NACHWEISE \|\n\|---\|---\|---\|---\|---\|\n\| dachdecker \| Bayern \| 20\.000–500\.000\s€ \| 15\.01\.2027 \| Präqualifikation Bau \(PQ-VOB\), Meisterbetrieb \/ Handwerksrolle \|/);
 assert.match(report,/\| 1 \| \*\*Dacharbeiten a\*\* — Stadt Musterstadt · DE212 · Fachliche Passung \(description\): Flachdach\. — ▸ Keine Auflage \| 30\.11\.2026 \(noch 31 Tage\) \| 100\.000\s€ \| 🟢 GO \| █████████░ 89 % \| \[Öffnen\]\(https:\/\/oeffentlichevergabe\.de\/ui\/de\/search\/details\?noticeId=a\) \|/);
 assert.match(report,/\| 2 \| \*\*Dacharbeiten b\*\* — [^\n]* ▸ Haftpflicht auf 5 Mio\. € erhöhen, ca\. 3 Tage \| [^\n]* \| – \| 🟡 GO MIT AUFLAGE \| ███████░░░ 69 % \|/);
 assert.match(report,/`GO 1 · GO MIT AUFLAGE 1 · NO-GO 1 · 1 im Vorfilter aussortiert`/);
 assert.match(report,/## 1 Ausschreibung ist NO-GO\. Darum\./);assert.match(report,/## So entsteht die Punktzahl\./);
 assert.match(report,/Eignung {12}██████████ 35\/35\nLeistbarkeit {7}██████████ 25\/25\nWirtschaftlichkeit ███████░░░ 18\/25\nRisiko {13}███████░░░ 11\/15/);
 assert.ok(report.indexOf('BEZAHLT AUF CARDANO')<report.indexOf('## Treffer im Detail'));
 assert.match(report,/To-do bis zur Frist\*\*\n- Haftpflicht auf 5 Mio\. € erhöhen, ca\. 3 Tage/);
 assert.match(report,/Stufe A: Haupt-CPV ist ein spezifischer Branchencode/);
 assert.match(report,/Angebotsfrist 30\.11\.2026, 09:00 Uhr \(noch 31 Tage\)/);
 assert.match(report,/100\.000\s€/);assert.match(report,/\| Region passt nicht \| 1 \|/);
 assert.match(report,/\| vom Modell als NO-GO bewertet \(K\.O\.-Kriterium oder unter 40 Punkten\) \| 1 \|/);
});
test('zero matches is a valid result and invalid passes get a readable answer',async()=>{
 const empty=await scout(EXAMPLE_PASS,null,undefined,{records:[record('x',{cpv:['90911000']})],now:NOW,ask:async()=>{throw new Error('model must not be called')}});
 assert.match(empty,/## Keine Ausschreibung, die sich für Sie lohnt\./);assert.equal(footer(empty).matches,0);assert.doesNotMatch(empty,/\| # \| AUSSCHREIBUNG/);
 assert.match(await scout('{"trade":"dachdecker"}',null,undefined,{records:[],now:NOW}),/Firmenpass ungültig/);
});
test('report escapes Markdown in model text',()=>{
 const [facts]=prefilter(pass,[record('a')],NOW).candidates;
 const [m]=mergeJudgements([facts],[judgement('a',{reasons:['**fett** | Tabelle']})]).assessed;
 const report=renderReport({pass,verified:[m],excluded:{},coverage:{firstDay:'2026-10-29',lastDay:'2026-10-29'},now:NOW});
 assert.match(report,/\\\*\\\*fett\\\*\\\* \\\| Tabelle/);
});
test('HTML entities from the source are decoded before Markdown escaping',()=>{
 const [facts]=prefilter(pass,[record('a')],NOW).candidates;
 const [m]=mergeJudgements([{...facts,title:'Unterstützung &quot;Omnissa&quot; &amp; Co'}],[judgement('a')]).assessed;
 assert.match(renderReport({pass,verified:[m],excluded:{},coverage:{firstDay:null,lastDay:null},now:NOW}),/### 1\. Unterstützung "Omnissa" & Co/);
});
test('free-text intake adds the understanding block and the hash still covers it',async()=>{
 const intake={source:'text',assumptions:['A1 Datenbasis nur Bayern'],questions:['Q1 Zertifikate?']};
 const report=await scout(null,null,undefined,{pass:EXAMPLE_PASS,intake,records:[record('a')],now:NOW,ask:async()=>reply([judgement('a')])});
 const f=footer(report),markdown=report.slice(0,report.lastIndexOf('\n\n```json'));
 assert.equal(f.sha256,sha256(markdown));
 assert.match(report,/## So wurde Ihre Anfrage verstanden/);assert.match(report,/\*\*Annahmen\*\*\n- A1 Datenbasis nur Bayern/);assert.match(report,/\*\*Offene Punkte\*\*\n- Q1 Zertifikate\?/);
 assert.ok(report.indexOf('## Treffer im Detail')<report.indexOf('So wurde Ihre Anfrage verstanden'));assert.ok(report.indexOf('So wurde Ihre Anfrage verstanden')<report.indexOf('_Quelle:'));
});
test('JSON passes render no understanding block',async()=>{
 const report=await scout(JSON.stringify(EXAMPLE_PASS),null,undefined,{records:[record('a')],now:NOW,ask:async()=>reply([judgement('a')])});
 assert.doesNotMatch(report,/So wurde Ihre Anfrage verstanden/);
});
test('PDF export writes a PDF whose footer carries the Markdown hash',async()=>{
 const {renderPdf}=await import('./pdf.mjs');
 const {mkdtempSync,readFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const [facts]=prefilter(pass,[record('a')],NOW).candidates;
 const [m]=mergeJudgements([facts],[judgement('a',{reasons:['Größe & Umlaute: äöüß €']})]).assessed;
 const data={pass,verified:[m],excluded:{'Region passt nicht':1},coverage:{firstDay:'2026-10-29',lastDay:'2026-10-29'},intake:{source:'text',assumptions:['A1'],questions:['Q1?']},now:NOW};
 const markdownResult=renderReport(data),dir=mkdtempSync(join(tmpdir(),'juicybids-'));
 try{
  const out=await renderPdf({...data,markdownResult},join(dir,'r.pdf')),pdf=readFileSync(out);
  assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length>2000);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('offline placeholder answers an intake prompt with a valid IT pass',async()=>{
 const answer=JSON.parse(await placeholder('AUFGABE: Firmenpass ableiten.\n\nFREITEXT:\nWir suchen IT-Aufträge.'));
 assert.equal(answer.pass.trade,'it');assert.ok(Array.isArray(answer.assumptions));
});
