import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {createInterface} from 'node:readline/promises';
import {parseEnv} from 'node:util';
// Shared helpers for the developer workflow (npm run setup, npm run try). Secret values are never printed.
export const interactive=Boolean(process.stdin.isTTY&&process.stdout.isTTY);
const rl=interactive?createInterface({input:process.stdin,output:process.stdout}):null;
export async function ask(question,fallback=''){
 if(!rl)return fallback;
 return (await rl.question(question)).trim()||fallback;
}
export async function confirm(question,yes=true){
 const answer=await ask(`${question} ${yes?'[J/n]':'[j/N]'} `,yes?'j':'n');
 return /^[jy]/i.test(answer);
}
export function closePrompt(){rl?.close()}
export function readEnv(file='.env'){return existsSync(file)?parseEnv(readFileSync(file,'utf8')):null}
// Runs a CLI and captures its output. Windows needs a shell for npm and sokosumi .cmd shims; args are fixed literals.
export function run(cmd,args,{inherit=false}={}){
 const options={encoding:'utf8',stdio:inherit?'inherit':'pipe'};
 const r=process.platform==='win32'?spawnSync([cmd,...args].join(' '),{...options,shell:true}):spawnSync(cmd,args,options);
 return {ok:r.status===0,out:(r.stdout??'').trim(),err:(r.stderr??'').trim()};
}
export async function reachable(url){
 try{await fetch(url,{signal:AbortSignal.timeout(1500)});return true}catch{return false}
}
export const color={ok:s=>`\x1b[32m${s}\x1b[0m`,bad:s=>`\x1b[31m${s}\x1b[0m`,todo:s=>`\x1b[33m${s}\x1b[0m`,dim:s=>`\x1b[2m${s}\x1b[0m`,bold:s=>`\x1b[1m${s}\x1b[0m`};
