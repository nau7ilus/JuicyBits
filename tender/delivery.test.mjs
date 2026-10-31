import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rmSync,writeFileSync} from 'node:fs';
import {deliver,pdfPath,pdfUrl} from './delivery.mjs';
import {EXAMPLE_PASS,NOW,record} from './fixtures.mjs';
import {validatePass} from './pass.mjs';
import {prefilter} from './prefilter.mjs';
const ID='a2f61167-9885-4a90-a64b-358a75608020';
const data=()=>{const pass=validatePass(EXAMPLE_PASS);const {coverage,excluded}=prefilter(pass,[record('a')],NOW);return {pass,verified:[],excluded,coverage,dropped:[],now:NOW};};
test('PDF links need a public base URL and a UUID, so paths cannot escape the reports folder',()=>{
 assert.equal(pdfUrl(ID,'https://x.ngrok-free.dev/'),`https://x.ngrok-free.dev/reports/${ID}.pdf`);
 assert.equal(pdfUrl(ID,''),null);assert.equal(pdfUrl('../../.env','https://x'),null);
 assert.equal(pdfPath(ID),`.local/reports/${ID}.pdf`);assert.equal(pdfPath('../x'),null);
});
test('deliver links the PDF inside the hashed report, and drops the link when the PDF fails',async()=>{
 let written=null;
 const ok=await deliver(data(),ID,{base:'https://x.dev',render:async(d,path)=>{written={d,path};writeFileSync(path,'%PDF-test')}});
 rmSync(written.path,{force:true});
 assert.match(ok,new RegExp(`\\[Bericht als PDF herunterladen\\]\\(https://x.dev/reports/${ID}.pdf\\)`));
 assert.equal(written.path,`.local/reports/${ID}.pdf`);assert.equal(written.d.markdownResult,ok);
 const failed=await deliver(data(),ID,{base:'https://x.dev',render:async()=>{throw new Error('boom')}});
 assert.doesNotMatch(failed,/PDF herunterladen/);
 assert.doesNotMatch(await deliver(data(),ID,{base:''}),/PDF herunterladen/);
});
