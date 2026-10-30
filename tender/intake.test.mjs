import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyAnswer,applyDefaults,intake,intakePrompt,isConfirmation,isPassInput,renderUnderstanding} from './intake.mjs';
import {PassError} from './pass.mjs';
import {NOW} from './fixtures.mjs';
const TEXT='PI Informatik GmbH, Cenit Company. Wir suchen nach neuen staatlichen Aufträgen im IT-Dienstleistungssektor für die nächsten Monate. Uns stehen 5 Vollzeitmitarbeiter zur Verfügung. Gibt es interessante Aufträge? Nutze Coworker "JUICY_BIDS".';
const MODEL={pass:{company_name:'PI Informatik GmbH (Cenit)',trade:'it',trades:['it'],service_description:'IT-Dienstleistungen für öffentliche Auftraggeber mit fünf Vollzeitmitarbeitern.',employees:5},assumptions:[],questions:[]};
const reply=o=>'```json\n'+JSON.stringify(o)+'\n```';
const sequence=answers=>{const sent=[];const ask=async t=>{sent.push(t);return answers.shift()};ask.sent=sent;return ask;};
test('free text is recognised as text, a Firmenpass JSON as pass',()=>{
 assert.equal(isPassInput(readFileSync('examples/p3-isarcode.pass.json','utf8')),true);
 assert.equal(isPassInput(`Bitte prüfen: ${readFileSync('examples/p1-alpendach.pass.json','utf8')} Danke`),true);
 assert.equal(isPassInput(TEXT),false);
 assert.equal(isPassInput('{"foo":1}'),false);
});
test('intake prompt carries the catalogue, the date and the request',()=>{
 const p=intakePrompt(TEXT,NOW);
 assert.match(p,/HEUTE: 2026-10-30/);assert.match(p,/beratung_planung: unternehmensberatung, architektur, ingenieurbuero, it, recht_steuer/);
 assert.match(p,/PI Informatik GmbH/);assert.match(p,/"assumptions"/);
});
test('defaults fill only missing required fields and name each assumption',()=>{
 const {pass,assumptions}=applyDefaults(MODEL.pass,NOW);
 assert.deepEqual(pass.states,['DE-BY']);assert.equal(pass.available_from,'2026-10-30');
 assert.deepEqual([pass.min_value_eur,pass.max_value_eur],[10000,500000]);assert.deepEqual(pass.licenses,[]);assert.equal(pass.lookback_days,14);
 assert.equal(pass.service_description,MODEL.pass.service_description);
 assert.match(assumptions.join('|'),/nur Bayern/);assert.match(assumptions.join('|'),/heute angenommen/);
 assert.match(assumptions.join('|'),/10\.000\s€ bis 500\.000\s€ geschätzt aus der Teamgröße/);assert.match(assumptions.join('|'),/unklar bewertet/);
 assert.equal(applyDefaults({trade:'it',employees:30},NOW).pass.max_value_eur,2000000);
 assert.equal(applyDefaults({trade:'it'},NOW).pass.max_value_eur,500000);
 const given=applyDefaults({trade:'it',states:['DE-BY'],min_value_eur:5000,max_value_eur:90000,available_from:'2027-01-01',licenses:['x'],certifications:[],exclusions:[]},NOW);
 assert.equal(given.assumptions.length,1);assert.match(given.assumptions[0],/Leistungsbeschreibung/);assert.ok(given.pass.service_description.length>=20);
 assert.equal(applyDefaults({trades:['dachdecker']},NOW).pass.trade,'dachdecker');
});
test('intake validates the pass, derives CPV and keeps the model assumptions',async()=>{
 const ask=sequence([reply({...MODEL,assumptions:['Teamgröße: 5 Vollzeitmitarbeiter'],questions:[]})]);
 const r=await intake(TEXT,ask,NOW);
 assert.equal(r.source,'text');assert.equal(r.pass.trade,'it');assert.deepEqual(r.pass.cpv_prefixes,['72']);assert.deepEqual(r.pass.nuts_prefixes,['DE2']);
 assert.equal(r.pass.max_value_eur,500000);assert.equal(r.assumptions[0],'Teamgröße: 5 Vollzeitmitarbeiter');assert.ok(r.assumptions.length>=4);
 assert.equal(ask.sent.length,1);
});
test('one retry when the answer is not JSON or names an unknown trade, then PassError',async()=>{
 const ask=sequence(['Gerne, hier der Firmenpass.',reply(MODEL)]);
 assert.equal((await intake(TEXT,ask,NOW)).pass.trade,'it');assert.equal(ask.sent.length,2);assert.match(ask.sent[1],/Korrigiere:.*JSON/);
 const bad=sequence([reply({pass:{...MODEL.pass,trade:'software',trades:['software']}}),reply({pass:{...MODEL.pass,trade:'software',trades:['software']}})]);
 await assert.rejects(intake(TEXT,bad,NOW),e=>e instanceof PassError&&/trades/.test(e.issues.join()));
 assert.match(bad.sent[1],/unbekannte Leistung/);
});
test('confirmations are detected without the model',()=>{
 for(const yes of ['Passt so, danke!','Ja, passt.','ok','stimmt so','passt','Genau so.'])assert.equal(isConfirmation(yes),true,yes);
 for(const no of ['Nein, maximal 200.000 €','passt nicht','ja aber nur bis 100.000 €','','Bitte ab Januar'])assert.equal(isConfirmation(no),false,no);
});
test('a correction is merged, re-validated and counts as confirmed',async()=>{
 const first=await intake(TEXT,sequence([reply(MODEL)]),NOW);
 const same=await applyAnswer(first,'passt',async()=>{throw new Error('no model call')},NOW);
 assert.equal(same.confirmed,true);assert.equal(same.pass.max_value_eur,500000);
 const ask=sequence([reply({pass:{...first.pass,max_value_eur:200000,available_from:'2027-01-01'},assumptions:[...first.assumptions,'Auftragswert: vom Nutzer korrigiert'],questions:[]})]);
 const fixed=await applyAnswer(first,'maximal 200.000 € und erst ab Januar 2027',ask,NOW);
 assert.equal(fixed.confirmed,true);assert.equal(fixed.pass.max_value_eur,200000);
 assert.ok(!fixed.assumptions.some(l=>/geschätzt aus der Teamgröße|heute angenommen/.test(l)),'stale default lines are dropped');assert.equal(fixed.pass.available_from,'2027-01-01');assert.equal(fixed.pass.trade,'it');
 assert.match(ask.sent[0],/ANTWORT DES NUTZERS:\nmaximal 200\.000 €/);assert.match(ask.sent[0],/"max_value_eur":500000/);
 const open=await applyAnswer(first,'eher Hessen',sequence([reply({pass:first.pass,assumptions:[],questions:['Hessen ist nicht abgedeckt, nur Bayern möglich?']})]),NOW);
 assert.equal(open.confirmed,false);assert.equal(open.questions[0],'Hessen ist nicht abgedeckt, nur Bayern möglich?');
 // Unanswered fact questions stay open after a correction, but do not block it.
 const partial=await applyAnswer(first,'ISO 27001',sequence([reply({pass:{...first.pass,certifications:['ISO 27001']},assumptions:[],questions:[]})]),NOW);
 assert.equal(partial.confirmed,true);assert.ok(partial.questions.some(q=>/Referenzen/.test(q)));assert.ok(!partial.questions.some(q=>/Zertifikate/.test(q)));
});
test('understanding text shows the range, defaults and how to answer',async()=>{
 const r=await intake(TEXT,sequence([reply({...MODEL,questions:['Nur Bayern gewünscht?']})]),NOW);
 const text=renderUnderstanding(r);
 assert.match(text,/^So habe ich Ihre Anfrage verstanden:/);assert.match(text,/Firma: PI Informatik GmbH \(Cenit\)/);assert.match(text,/Leistung: it/);
 assert.match(text,/Auftragswert: 10\.000\s€ bis 500\.000\s€/);assert.match(text,/Verfügbar ab: 30\.10\.2026/);assert.match(text,/Team: 5 Mitarbeitende/);
 assert.match(text,/Annahmen:\n- /);assert.match(text,/Offene Punkte:\n- Nur Bayern gewünscht\?/);
 assert.match(text,/Antworten Sie mit „passt“, dann prüfe ich die Bekanntmachungen\. Oder nennen Sie Korrekturen und Antworten auf die offenen Punkte im Text/);
});
test('a thin request gets code questions for missing core facts, without duplicates of model defaults',async()=>{
 const r=await intake(TEXT,sequence([reply(MODEL)]),NOW);
 const q=r.questions.join('|');
 for(const topic of [/Leistungen bieten Sie genau/,/Referenzen/,/Zertifikate/,/Auftragsgröße/,/Firmensitz/])assert.match(q,topic);
 const rich=await intake(TEXT,sequence([reply({pass:{...MODEL.pass,min_value_eur:50000,max_value_eur:300000,home_location:'München',certifications:['ISO 27001'],exclusions:['Hardware'],references:[{year:2025,summary:'Portal'}]},assumptions:[],questions:[]})]),NOW);
 assert.deepEqual(rich.questions,[]);
});
