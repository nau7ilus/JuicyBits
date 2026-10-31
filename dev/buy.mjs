import {randomBytes} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {inputHash,resultHash} from '../standard-hash.mjs';
import {USDM,confirmedState} from '../paid-task.mjs';
import {registrationUrl} from '../registration-config.mjs';
import {closePrompt,color} from './common.mjs';
// Fallback buyer, only if the Sokosumi gallery path fails: one paid MIP-003 purchase of our own TenderScout agent
// with the Purchasing wallet of our own Masumi Payment Service (Preprod, MPS 0.29.0).
// npm run buy -- <firmenpass.json|anfrage.txt>   or   npm run buy -- --resume <nonce>
// .local/buy-<nonce>.json is saved before each write. An uncertain write is looked up read-only, never sent again.
// Prints one JSON evidence object on stdout. Exit 0 verified, 2 not finished yet, 1 error. Tokens are never printed.
const args=process.argv.slice(2),RESUME='--resume',OUT='.local',POLL_MS=15000,MAX_MS=30*60*1000,MINUTE=60000;
// Fixed registry price (payment-registration.mjs): 1 tUSDM, 6 decimals.
const PRICE='1000000',TIMES=['payByTime','submitResultTime','unlockTime','externalDisputeUnlockTime'];
const JOB={awaiting_payment:'wartet auf Zahlung',running:'läuft, Bericht wird erstellt',completed:'fertig',failed:'fehlgeschlagen'};
const STATE={FundsLocked:'Betrag im Smart Contract gesperrt',ResultSubmitted:'Ergebnis-Hash eingereicht',FundsOrDatumInvalid:'Betrag oder Datum ungültig',RefundRequested:'Erstattung angefordert',Disputed:'Streitfall',WithdrawAuthorized:'Auszahlung freigegeben',RefundAuthorized:'Erstattung freigegeben',Withdrawn:'an den Verkäufer ausgezahlt',RefundWithdrawn:'an den Käufer erstattet',DisputedWithdrawn:'Streitfall ausgezahlt'};
const exit=code=>{closePrompt();process.exit(code)};
const fail=message=>{console.error(color.bad(message));exit(1)};
const say=message=>console.error(message);
const event=message=>console.error(`${color.dim(new Date().toLocaleTimeString('de-DE'))} ${message}`);
const journalPath=nonce=>`${OUT}/buy-${nonce}.json`,resultPath=nonce=>`${OUT}/buy-${nonce}-result.md`;
const usage='Aufruf: npm run buy -- <firmenpass.json|anfrage.txt>  oder  npm run buy -- --resume <nonce>';
const resumeAt=args.indexOf(RESUME),nonceArg=resumeAt>=0?args[resumeAt+1]?.trim():null;
const inputFile=resumeAt>=0?null:args.find(a=>!a.startsWith('--'));
if(resumeAt>=0?!/^[0-9a-f]{20}$/.test(nonceArg??''):!inputFile)fail(usage);
for(const name of ['AGENT_PUBLIC_URL','MPS_URL'])if(!process.env[name]?.trim())fail(`${name} fehlt (.env).`);
// A dedicated purchase key (+PAY) is preferred; ADMIN_KEY from .local/mps.env is the fallback.
const token=process.env.MPS_PURCHASE_TOKEN?.trim()||process.env.ADMIN_KEY?.trim();
if(!token)fail('MPS_PURCHASE_TOKEN oder ADMIN_KEY fehlt (.env bzw. .local/mps.env).');
let agentUrl;
try{agentUrl=registrationUrl(process.env.AGENT_API_PORT||'21950',process.env.AGENT_PUBLIC_URL.trim())}catch(e){fail(`AGENT_PUBLIC_URL ungültig: ${e.message}`)}
const mpsUrl=`${process.env.MPS_URL.trim().replace(/\/+$/,'')}/api/v1`;
// Returns the status and the JSON body, or null for a non-JSON body (e.g. an ngrok error page). Network errors throw.
async function call(url,body,headers){
 const response=await fetch(url,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(30000),
  headers:{...headers,...(body&&{'content-type':'application/json'})},body:body&&JSON.stringify(body)});
 return {status:response.status,data:await response.json().catch(()=>null)};
}
const agent=(path,body)=>call(`${agentUrl}${path}`,body,{'ngrok-skip-browser-warning':'1'});
const mps=(path,body)=>call(`${mpsUrl}${path}`,body,{token});
let journal;
const save=()=>{journal.updatedAt=new Date().toISOString();writeFileSync(journalPath(journal.nonce),JSON.stringify(journal,null,2),{mode:0o600})};
const reject=message=>{journal.phase='rejected';journal.error=message;save();fail(message)};
// MPS 0.29.0 POST /purchase/resolve-blockchain-identifier (READ access). null: the MPS holds no such purchase.
async function lookup(){
 const r=await mps('/purchase/resolve-blockchain-identifier',{network:'Preprod',blockchainIdentifier:journal.job.blockchainIdentifier,includeHistory:'true'});
 if(r.status===404)return null;
 if(r.status!==200||r.data?.status!=='success'||!r.data.data?.id)throw new Error(`Payment service HTTP ${r.status}`);
 return r.data.data;
}
function checkStart(job){
 const p=[];
 if(!/^[0-9a-f-]{36}$/.test(String(job.id)))p.push('id ist keine Job-UUID');
 if(typeof job.blockchainIdentifier!=='string'||!job.blockchainIdentifier)p.push('blockchainIdentifier fehlt');
 if(job.identifierFromPurchaser!==journal.nonce)p.push('identifierFromPurchaser ≠ nonce');
 if(job.input_hash!==journal.inputHash)p.push('input_hash ≠ inputHash({prompt}, nonce)');
 if(job.paymentSourceType!=='Web3CardanoV2'||!Number.isInteger(job.supportedPaymentSourceIndex))p.push('paymentSourceType oder supportedPaymentSourceIndex unerwartet');
 if(typeof job.agentIdentifier!=='string'||job.agentIdentifier.length<57||typeof job.sellerVKey!=='string'||!job.sellerVKey)p.push('agentIdentifier oder sellerVKey fehlt');
 for(const k of TIMES)if(!Number.isSafeInteger(job[k])||job[k]<=0)p.push(`${k} ist keine Unix-ms-Zahl`);
 // Buy only our own agent: compare with the local registration when this machine has it.
 if(existsSync('docs/registration-state.json')){
  const reg=JSON.parse(readFileSync('docs/registration-state.json','utf8'));
  if(reg.agentIdentifier&&reg.agentIdentifier!==job.agentIdentifier)p.push('agentIdentifier ≠ docs/registration-state.json');
  if(Number.isInteger(reg.supportedPaymentSourceIndex)&&reg.supportedPaymentSourceIndex!==job.supportedPaymentSourceIndex)p.push('supportedPaymentSourceIndex ≠ docs/registration-state.json');
 }
 return p;
}
async function start(prompt){
 journal.phase='start-pending';save();
 say(color.dim(`start_job an ${agentUrl} · Journal ${journalPath(journal.nonce)}`));
 let r;try{r=await agent('/start_job',{identifier_from_purchaser:journal.nonce,input_data:{prompt}})}catch(e){r={status:0,error:e.message}}
 // agent-api answers 400, 404, 413 and 503 before it saves a job. Anything else may have created a seller payment request.
 if([400,404,413,503].includes(r.status))return reject(`start_job abgelehnt (HTTP ${r.status}): ${String(r.data?.error??'').slice(0,300)}`);
 if(r.status!==200||!r.data)fail(`start_job unsicher (${r.status?`HTTP ${r.status}`:r.error}), nicht wiederholt. Es wurde nichts bezahlt; für einen neuen Kauf npm run buy -- ${journal.file} erneut starten.`);
 journal.job=r.data;journal.phase='started';save();
 const problems=checkStart(r.data);
 if(problems.length)return reject(`start_job-Antwort nicht verwendbar, nichts bezahlt: ${problems.join('; ')}`);
 say(`${color.ok('Job angelegt')} ${r.data.id} · input_hash lokal geprüft`);
 say(color.dim(`Ergebnis fällig bis ${new Date(r.data.submitResultTime).toLocaleTimeString('de-DE')} · agentIdentifier ${r.data.agentIdentifier.slice(0,24)}…`));
}
function purchased(id,message){journal.purchase={id};journal.phase='purchased';save();say(`${color.ok(message)} ${id}`)}
// Uncertain write: look the purchase up instead of sending it again.
async function recover(reason){
 let found;try{found=await lookup()}catch(e){found=undefined;reason+=`; Abfrage fehlgeschlagen: ${e.message}`}
 if(found)return purchased(found.id,'Kauf beim Payment Service gefunden');
 fail(`Kauf unsicher (${reason}), nicht erneut gesendet.${found===null?' Der Payment Service kennt (noch) keinen Kauf zu diesem blockchainIdentifier; bleibt das so, wurde nichts gesperrt.':''} Vor jedem neuen Kauf prüfen: npm run buy -- --resume ${journal.nonce}`);
}
async function purchase(){
 const job=journal.job,left=job.submitResultTime-Date.now();
 // MPS rejects a purchase when submitResultTime is less than 15 minutes away; agent-api signs start + 20 minutes.
 if(left<15*MINUTE+30000)return reject(`Kaufzeitfenster abgelaufen (submitResultTime in ${Math.max(0,Math.round(left/1000))} s, der Payment Service verlangt mindestens 15 min). Nichts bezahlt; neuen Kauf starten.`);
 // MPS 0.29.0 OpenAPI POST /purchase: times are unix-ms strings and must be the values the seller signed.
 // Amounts is optional for Fixed pricing; when given, the MPS rejects the purchase unless it equals the on-chain price.
 const body={network:'Preprod',blockchainIdentifier:job.blockchainIdentifier,agentIdentifier:job.agentIdentifier,sellerVkey:job.sellerVKey,
  inputHash:job.input_hash,identifierFromPurchaser:journal.nonce,paymentSourceType:job.paymentSourceType,supportedPaymentSourceIndex:job.supportedPaymentSourceIndex,
  ...Object.fromEntries(TIMES.map(k=>[k,String(job[k])])),Amounts:[{amount:PRICE,unit:USDM}]};
 journal.purchaseRequest=body;journal.phase='purchase-pending';save();
 say(color.dim('Kauf beim Payment Service (Purchasing Wallet, 1 tUSDM) …'));
 let r;try{r=await mps('/purchase',body)}catch(e){r={status:0,error:e.message}}
 if(r.status===200&&r.data?.status==='success'&&r.data.data?.id)return purchased(r.data.data.id,'Kauf angelegt');
 // 409: the MPS already holds a purchase for this blockchainIdentifier and returns its id.
 if(r.status===409&&typeof r.data?.id==='string')return purchased(r.data.id,'Kauf existierte bereits');
 // Auth, validation and lookup errors are raised before the purchase record is created.
 if([400,401,403,404].includes(r.status))return reject(`Kauf abgelehnt (HTTP ${r.status}): ${String(r.data?.error?.message??'').slice(0,300)}. Kein Kauf angelegt.`);
 await recover(r.status?`HTTP ${r.status}`:r.error);
}
function evidence(p,result){
 const job=journal.job,history=p?.TransactionHistory??[],current=p?.CurrentTransaction;
 const all=[...history];if(current&&!history.some(t=>t?.txHash&&t.txHash===current.txHash))all.push(current);
 const local=result===null?null:resultHash(result,journal.nonce);
 return {jobId:job.id,blockchainIdentifier:job.blockchainIdentifier,agentIdentifier:job.agentIdentifier,purchaseId:p?.id??journal.purchase?.id??null,
  purchasingWalletAddress:p?.SmartContractWallet?.walletAddress??null,paidFunds:p?.PaidFunds??null,onChainState:p?.onChainState??null,
  inputHash:journal.inputHash,inputHashMatches:p?p.inputHash===journal.inputHash:null,
  fundsLockedConfirmed:p?confirmedState(p,'FundsLocked'):null,resultSubmittedConfirmed:p?confirmedState(p,'ResultSubmitted'):null,
  transactions:all.filter(Boolean).map(t=>({txHash:t.txHash??null,status:t.status??null,newOnChainState:t.newOnChainState??null})),
  resultHash:local,resultHashOnChain:p?.resultHash??null,resultHashMatches:local!==null&&local===p?.resultHash,
  resultFile:result===null?null:resultPath(journal.nonce),checkedAt:new Date().toISOString()};
}
// Prints the on-chain state, the next MPS action and the current transaction whenever they change.
function changes(p,seen){
 const tx=p.CurrentTransaction,action=p.NextAction;
 const lines={state:p.onChainState&&`Kauf on-chain: ${p.onChainState}${STATE[p.onChainState]?` (${STATE[p.onChainState]})`:''}`,
  action:action?.requestedAction&&`MPS-Aktion: ${action.requestedAction}${action.errorType?color.bad(` Fehler ${action.errorType}: ${String(action.errorNote??'').slice(0,200)}`):''}`,
  tx:tx?.txHash&&`Transaktion ${tx.txHash} ${tx.status}${tx.newOnChainState?` → ${tx.newOnChainState}`:''}`};
 for(const [k,line] of Object.entries(lines))if(line&&seen[k]!==line){seen[k]=line;event(line)}
}
async function poll(){
 const job=journal.job,since=Date.now(),seen={};let status=null,result=null,p=null;
 say(color.dim(`Warte auf Sperrung, Bericht und Ergebnis-Hash (alle ${POLL_MS/1000} s, max. 30 min). Fortsetzen nach Abbruch: npm run buy -- --resume ${journal.nonce}`));
 for(;;){
  try{
   const r=await agent(`/status?job_id=${job.id}`);
   if(r.status!==200||typeof r.data?.status!=='string')event(color.todo(`Agent /status HTTP ${r.status}`));
   else{
    if(r.data.status!==status){status=r.data.status;event(`Agent-Job: ${JOB[status]??status}`)}
    if(status==='completed'&&typeof r.data.result==='string'&&result===null){result=r.data.result;writeFileSync(resultPath(journal.nonce),result,{mode:0o600})}
   }
  }catch(e){event(color.todo(`Agent /status nicht erreichbar: ${e.message.slice(0,160)}`))}
  try{const found=await lookup();if(found){p=found;changes(p,seen)}else event(color.todo('Kauf beim Payment Service (noch) nicht gefunden.'))}
  catch(e){event(color.todo(`Kauf-Abfrage fehlgeschlagen: ${e.message.slice(0,160)}`))}
  if(result!==null&&p?.resultHash&&confirmedState(p,'ResultSubmitted')){
   const ev=evidence(p,result);journal.phase='completed';journal.evidence=ev;save();
   console.log(JSON.stringify(ev,null,2));
   if(!ev.resultHashMatches||!ev.inputHashMatches)fail('Hash-Abgleich fehlgeschlagen: resultHash oder inputHash weicht ab. Kauf nicht als belegt melden.');
   say(color.ok(`Kauf belegt: Ergebnis-Hash on-chain = lokal. Bericht: ${ev.resultFile}`));exit(0);
  }
  if(status==='failed'){
   journal.phase='failed';save();console.log(JSON.stringify(evidence(p,result),null,2));
   fail(`Agent-Job fehlgeschlagen (z. B. Ergebnisfrist verpasst). Erstattung des gesperrten Betrags im Payment Service prüfen (Kauf ${p?.id??journal.purchase?.id}).`);
  }
  if(p?.NextAction?.requestedAction==='WaitingForManualAction'){
   console.log(JSON.stringify(evidence(p,result),null,2));
   fail(`Payment Service wartet auf manuellen Eingriff (${p.NextAction.errorType??'ohne errorType'}). Bei InsufficientFunds: Purchasing Wallet mit tUSDM und ADA aufladen. Kauf ${p.id} im Admin-Dashboard prüfen.`);
  }
  if(Date.now()-since>MAX_MS){
   console.log(JSON.stringify(evidence(p,result),null,2));
   say(color.todo(`Nach 30 Minuten noch nicht abgeschlossen (Agent-Job ${status??'unbekannt'}, on-chain ${p?.onChainState??'unbekannt'}). Später: npm run buy -- --resume ${journal.nonce}`));exit(2);
  }
  await new Promise(r=>setTimeout(r,POLL_MS));
 }
}
try{
 if(nonceArg){
  if(!existsSync(journalPath(nonceArg)))fail(`Journal nicht gefunden: ${journalPath(nonceArg)}`);
  journal=JSON.parse(readFileSync(journalPath(nonceArg),'utf8'));
  say(color.dim(`Fortsetzen: ${journalPath(nonceArg)} (Phase ${journal.phase})`));
  if(journal.phase==='start-pending')fail('start_job war unsicher und wird nicht wiederholt. Es wurde nichts bezahlt; für einen neuen Kauf npm run buy -- <datei> starten.');
  if(journal.phase==='rejected')fail(`Abgebrochen: ${journal.error}`);
  if(journal.phase==='completed'){const ev=journal.evidence;console.log(JSON.stringify(ev,null,2));exit(ev?.resultHashMatches&&ev?.inputHashMatches?0:1)}
  if(journal.phase==='started')await purchase();
  else if(journal.phase==='purchase-pending')await recover('Wiederaufnahme');
 }else{
  if(!existsSync(inputFile))fail(`Datei nicht gefunden: ${inputFile}\n${usage}`);
  const prompt=readFileSync(inputFile,'utf8');
  if(!prompt.trim()||prompt.length>16000)fail(`Die Eingabe muss 1 bis 16000 Zeichen haben (hat ${prompt.length}).`);
  mkdirSync(OUT,{recursive:true,mode:0o700});
  const nonce=randomBytes(10).toString('hex');
  journal={nonce,file:inputFile,inputHash:inputHash({prompt},nonce),createdAt:new Date().toISOString()};
  await start(prompt);
  await purchase();
 }
 await poll();
}catch(e){fail(`Kauf abgebrochen: ${e.message}${journal?.nonce?`. Journal: ${journalPath(journal.nonce)}`:''}`)}
