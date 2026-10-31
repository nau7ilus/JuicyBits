import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inputHash,resultHash} from './standard-hash.mjs';
test('fixed input shape uses canonical JSON and UTF-8',()=>{
 assert.equal(inputHash({prompt:'Cardano payments'},'aabbccddeeff0011'),'25f3afe66b39b0582711c9faf53930c7b6a6feffd10294750ec77be47fd63080');
});
test('Sokosumi shows output hash as not verified for multi-line reports',()=>{
 // Sokosumi hashResult: sha256(`${identifierFromPurchaser};${JSON.stringify(result).slice(1,-1)}`). Pre-image escaped by hand here.
 const nonce='8bdba5a2712cbef13f14';
 const report='# JuicyBids – Bericht\n\nGrößenpassung: „gut“, Bieter sagt "GO MIT AUFLAGE"\n\tPfad C:\\Angebote\\Bayern\r\nEnde';
 const preimage=String.raw`8bdba5a2712cbef13f14;# JuicyBids – Bericht\n\nGrößenpassung: „gut“, Bieter sagt \"GO MIT AUFLAGE\"\n\tPfad C:\\Angebote\\Bayern\r\nEnde`;
 assert.equal(resultHash(report,nonce),createHash('sha256').update(preimage,'utf8').digest('hex'));
 assert.notEqual(resultHash(report,nonce),createHash('sha256').update(`${nonce};${report}`,'utf8').digest('hex'));
 assert.notEqual(resultHash('Line 1\nLine 2',nonce),resultHash('Line 1\\nLine 2',nonce));
});
