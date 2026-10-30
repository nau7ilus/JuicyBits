import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PassError,validatePass} from './pass.mjs';
import {deriveCpv,normalizePrefixes} from './trades.mjs';
import {EXAMPLE_PASS} from './fixtures.mjs';
const rejects=(pass,pattern)=>assert.throws(()=>validatePass(pass),e=>e instanceof PassError&&pattern.test(e.message));
test('T4 example pass is valid and maps Bavaria to NUTS DE2',()=>{
 const pass=validatePass(EXAMPLE_PASS);
 assert.deepEqual(pass.cpv_prefixes,['45261']);assert.deepEqual(pass.nuts_prefixes,['DE2']);
});
test('pass is accepted as JSON text with surrounding words',()=>{
 assert.equal(validatePass(`Firmenpass: ${JSON.stringify(EXAMPLE_PASS)} Danke`).trade,'dachdecker');
 rejects('kein json',/kein gültiges JSON/);
});
test('required fields, ranges and Bavaria-only scope are enforced',()=>{
 rejects({...EXAMPLE_PASS,service_description:'zu kurz'},/service_description/);
 rejects({...EXAMPLE_PASS,min_value_eur:600000},/min_value_eur/);
 rejects({...EXAMPLE_PASS,states:['DE-BW']},/nur Bayern/);
 rejects({...EXAMPLE_PASS,available_from:'15.01.2027'},/YYYY-MM-DD/);
 const {licenses,...withoutLicenses}=EXAMPLE_PASS;rejects(withoutLicenses,/licenses/);
});
test('CPV prefixes are derived from trades when absent and shorter prefixes absorb longer ones',()=>{
 const {cpv_prefixes,...pass}=EXAMPLE_PASS;
 assert.deepEqual(validatePass(pass).cpv_prefixes,['45261']);
 assert.deepEqual(normalizePrefixes(['45261','45','4526130']),['45']);
 assert.deepEqual(deriveCpv({trades:[],custom_services:['Fassadenbegrünung'],categories:['dach_fassade']}),['4532','45261','45443']);
});
