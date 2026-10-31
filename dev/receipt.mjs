import {existsSync,readFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {sellerTokenNet} from '../settlement.mjs';
import {USDM,confirmedState} from '../paid-task.mjs';
import {closePrompt,color} from './common.mjs';
// Read-only seller receipt for a paid MIP-003 job (agent-api.mjs): confirmed MPS withdrawal plus Blockfrost net tUSDM at the seller address.
// npm run receipt -- <jobId>   or   npm run receipt -- --blockchain-identifier <id>
// Prints one JSON evidence object on stdout. Exit 0 verified, 2 not withdrawn yet (MPS withdraws after unlockTime), 1 error. Tokens are never printed.
const args=process.argv.slice(2),FLAG='--blockchain-identifier',WITHDRAWN=['Withdrawn','DisputedWithdrawn'];
const exit=code=>{closePrompt();process.exit(code)};
const fail=message=>{console.error(color.bad(message));exit(1)};
const flagValue=args.includes(FLAG)?args[args.indexOf(FLAG)+1]?.trim():null;
const jobId=args.find((a,i)=>!a.startsWith('--')&&args[i-1]!==FLAG)??null;
if((!jobId&&!flagValue)||(args.includes(FLAG)&&!flagValue))fail('Aufruf: npm run receipt -- <jobId>  oder  npm run receipt -- --blockchain-identifier <id>');
const usdm=atomic=>{const abs=atomic<0n?-atomic:atomic;return `${atomic<0n?'-':''}${abs/1000000n}.${(abs%1000000n).toString().padStart(6,'0')}`};
async function resolvePayment(blockchainIdentifier){
 const response=await fetch(`${process.env.MPS_URL}/api/v1/payment/resolve-blockchain-identifier`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),
  headers:{'content-type':'application/json',token:process.env.MPS_RUNTIME_TOKEN},body:JSON.stringify({network:'Preprod',blockchainIdentifier,includeHistory:'true'})});
 const data=await response.json().catch(()=>null);
 if(!response.ok||data?.status!=='success')throw new Error(`Payment service HTTP ${response.status}`);
 return data.data;
}
try{
 let job=null,blockchainIdentifier=flagValue;
 if(jobId){
  if(!/^[0-9a-f-]{36}$/.test(jobId))fail('jobId muss die UUID eines agent-api-Jobs sein (.local/standard-jobs/<jobId>.json).');
  const file=`.local/standard-jobs/${jobId}.json`;
  if(!existsSync(file))fail(`Job nicht gefunden: ${file}`);
  job=JSON.parse(readFileSync(file,'utf8'));
  const fromJob=job.payment?.blockchainIdentifier;
  if(!fromJob)fail(`Job ${jobId} hat noch keine Zahlung (phase ${job.phase}).`);
  if(blockchainIdentifier&&blockchainIdentifier!==fromJob)fail(`${FLAG} passt nicht zum Job ${jobId}.`);
  blockchainIdentifier=fromJob;
 }
 for(const name of ['MPS_URL','MPS_RUNTIME_TOKEN'])if(!process.env[name]?.trim())fail(`${name} fehlt (.env bzw. .local/mps-runtime.env).`);
 if(!existsSync('docs/payment-state.json'))fail('docs/payment-state.json fehlt (sellerAddress, siehe docs/tickets/T13/plan.md).');
 // No collection address is configured, so the MPS withdraws to the selling wallet recorded here.
 const {sellerAddress}=JSON.parse(readFileSync('docs/payment-state.json','utf8'));
 if(!sellerAddress)fail('sellerAddress fehlt in docs/payment-state.json.');
 const payment=await resolvePayment(blockchainIdentifier);
 const history=payment.TransactionHistory??[],current=payment.CurrentTransaction;
 const all=[...history];if(current&&!history.some(t=>t?.txHash&&t.txHash===current.txHash))all.push(current);
 const withdraw=all.find(t=>t?.status==='Confirmed'&&WITHDRAWN.includes(t.newOnChainState)&&t.txHash);
 const evidence={jobId,blockchainIdentifier,onChainState:payment.onChainState??null,
  resultHashOnChain:payment.resultHash??null,jobResultHash:job?.resultHash??null,
  resultHashMatches:job?Boolean(job.resultHash)&&job.resultHash===payment.resultHash:null,
  resultSubmittedConfirmed:confirmedState(payment,'ResultSubmitted'),
  transactions:all.filter(Boolean).map(t=>({txHash:t.txHash??null,status:t.status??null,newOnChainState:t.newOnChainState??null})),
  withdrawTxHash:withdraw?.txHash??null,sellerAddress,unit:USDM,netAtomicUnits:null,netUSDM:null,verified:false,checkedAt:new Date().toISOString()};
 if(!withdraw){
  evidence.reason='Withdrawal not confirmed yet; the MPS withdraws after unlockTime';
  console.log(JSON.stringify(evidence,null,2));
  const unlock=Number(payment.unlockTime);
  console.error(color.todo(`Auszahlung noch nicht bestätigt (onChainState ${evidence.onChainState}${unlock?`, unlockTime ${new Date(unlock).toLocaleString('de-DE')}`:''}). Später erneut prüfen.`));
  exit(2);
 }
 if(!/^[0-9a-f]{64}$/i.test(withdraw.txHash))fail('Withdraw-txHash hat ein unerwartetes Format.');
 if(!process.env.BLOCKFROST_API_KEY_PREPROD?.trim())fail('BLOCKFROST_API_KEY_PREPROD fehlt (.env).');
 const response=await fetch(`https://cardano-preprod.blockfrost.io/api/v0/txs/${withdraw.txHash}/utxos`,{headers:{project_id:process.env.BLOCKFROST_API_KEY_PREPROD},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(`Blockfrost HTTP ${response.status}`);
 const net=sellerTokenNet(await response.json(),sellerAddress,USDM);
 Object.assign(evidence,{netAtomicUnits:net.toString(),netUSDM:usdm(net),verified:net>0n});
 if(!evidence.verified)evidence.reason='No net tUSDM at the seller address in the withdrawal transaction';
 console.log(JSON.stringify(evidence,null,2));
 // Revenue log (ignored path): one JSON line per verified receipt; the human-readable ledger is docs/einnahmen.md.
 mkdirSync('.local',{recursive:true});appendFileSync('.local/receipts.jsonl',JSON.stringify(evidence)+'\n');
 if(!evidence.verified){console.error(color.bad('Withdraw bestätigt, aber kein Netto-tUSDM an sellerAddress. Adresse und Transaktion prüfen.'));exit(1);}
 console.error(color.ok(`Seller-Zahlung belegt: ${evidence.netUSDM} tUSDM, Tx ${withdraw.txHash}`));
 exit(0);
}catch(e){fail(`Receipt fehlgeschlagen: ${e.message}`)}
