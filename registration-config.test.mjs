import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registrationUrl, requireSavedRuntimeToken } from './registration-config.mjs';
import * as registrationConfig from './registration-config.mjs';
test('registration author rejects missing or blank configuration', () => {
 for (const author of [undefined, '', ' ', '\t\n']) {
 assert.throws(() => registrationConfig.requireAgentAuthor(author), /AGENT_AUTHOR must contain your author name/);
 }
 assert.equal(registrationConfig.requireAgentAuthor('  Participant Team  '), 'Participant Team');
});
test('registration uses the configured loopback port', () => {
 assert.equal(registrationUrl('32123'), 'http://127.0.0.1:32123');
 assert.equal(registrationUrl(), 'http://127.0.0.1:21950');
 for (const value of ['0','65536','abc','21950.5','']) assert.throws(() => registrationUrl(value));
 assert.equal(registrationUrl('32123', ''), 'http://127.0.0.1:32123');
});
test('registration uses a bare public https origin when configured', () => {
 assert.equal(registrationUrl('21950', 'https://juicybids.ngrok-free.app'), 'https://juicybids.ngrok-free.app');
 assert.equal(registrationUrl(undefined, 'https://JuicyBids.Ngrok-Free.app'), 'https://juicybids.ngrok-free.app');
 for (const value of ['http://juicybids.ngrok-free.app','https://juicybids.ngrok-free.app/','https://juicybids.ngrok-free.app/api','https://juicybids.ngrok-free.app?x=1','https://juicybids.ngrok-free.app#x','https://user:pw@juicybids.ngrok-free.app','https://juicybids.ngrok-free.app:443',' https://juicybids.ngrok-free.app','juicybids.ngrok-free.app','https://localhost','https://127.0.0.1','https://[::1]','https://']) assert.throws(() => registrationUrl('21950', value), /AGENT_PUBLIC_URL/);
});
test('saved key requires its private unmasked token', () => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registration-test-'));
 const file = path.join(dir, 'runtime.env');
 try {
 assert.throws(() => requireSavedRuntimeToken(file), /recovery required/);
 for (const value of ['', '*****masked']) {
 fs.writeFileSync(file, `MPS_RUNTIME_TOKEN=${value}\n`);
 assert.throws(() => requireSavedRuntimeToken(file), /recovery required/);
 }
 fs.writeFileSync(file, 'MPS_RUNTIME_TOKEN=test-token\n');
 assert.equal(requireSavedRuntimeToken(file), 'test-token');
 } finally { fs.rmSync(dir, { recursive: true }); }
});
