import fs from 'node:fs';
import { isIP } from 'node:net';
import { parseEnv } from 'node:util';
export function requireAgentAuthor(author) {
 if (typeof author !== 'string' || !author.trim()) throw Error('AGENT_AUTHOR must contain your author name');
 return author.trim();
}
export function registrationUrl(port = '21950', publicUrl = '') {
 if (!/^\d+$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535) throw Error('AGENT_API_PORT must be an integer between 1 and 65535');
 if (publicUrl === '') return `http://127.0.0.1:${Number(port)}`;
 // Registry metadata is immutable: accept only a bare public https origin, e.g. an ngrok domain.
 let url;
 try { url = new URL(publicUrl); } catch { url = null; }
 if (!url || url.protocol !== 'https:' || url.origin.toLowerCase() !== String(publicUrl).toLowerCase() || isIP(url.hostname.replace(/^\[|\]$/g, '')) || !url.hostname.includes('.')) throw Error('AGENT_PUBLIC_URL must be a public https origin such as https://name.example.org (no path, trailing slash, query or credentials)');
 return url.origin;
}
export function requireSavedRuntimeToken(path) {
 let token;
 try { token = parseEnv(fs.readFileSync(path, 'utf8')).MPS_RUNTIME_TOKEN; } catch { throw Error('Runtime key recovery required: private token file is missing or unreadable'); }
 if (!token || token.startsWith('*****')) throw Error('Runtime key recovery required: private token is missing or masked');
 return token;
}
