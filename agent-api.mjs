import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {scout} from './tender/scout.mjs';
import {inputHash,resultHash,sha256} from './standard-hash.mjs';
import {confirmedState} from './paid-task.mjs';
const jobsDir='.local/standard-jobs';mkdirSync(jobsDir,{recursive:true,mode:0o700});
const token=process.env.MPS_RUNTIME_TOKEN;
const registry=()=>JSON.parse(readFileSync('docs/registration-state.json','utf8'));
// Paid jobs need a confirmed V2 registration with its source index and a runtime key.
const readyRegistration=()=>{try{const r=registry();return token&&(r.registrationState==='RegistrationConfirmed'||r.registration?.state==='RegistrationConfirmed')&&r.agentIdentifier&&Number.isInteger(r.supportedPaymentSourceIndex)?r:null}catch{return null}};
const save=job=>writeFileSync(`${jobsDir}/${job.id}.json`,JSON.stringify(job),{mode:0o600});
const load=id=>JSON.parse(readFileSync(`${jobsDir}/${id}.json`,'utf8'));
export async function mps(path,body){
 const response=await fetch(process.env.MPS_URL+'/api/v1'+path,{method:body?'POST':'GET',headers:{token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 const data=await response.json();if(!response.ok)throw new Error(`Payment service HTTP ${response.status}`);return data.data;
}
const schema={input_data:[{id:'prompt',type:'textarea',name:'Anfrage',data:{placeholder:'z. B. Dachdeckerbetrieb, 8 Mitarbeiter, sucht Dachsanierungen in Oberbayern von 50.000 bis 400.000 €, Referenzen: drei Schuldächer, Zertifikat: Präqualifikation',description:'Freitext oder Firmenpass als JSON. Freitext: Gewerk und Leistungen, Region in Bayern, Auftragswert von/bis, Referenzen, Zulassungen und Zertifikate. Firmenpass: JSON-Objekt mit den Feldern aus docs/firmenpass.md im Repository (u. a. trade, service_description, states ["DE-BY"], min_value_eur, max_value_eur, available_from, licenses, certifications, exclusions). Bitte keine Kontaktdaten angeben. Ergebnis: geprüfte Rangliste offener Ausschreibungen in Bayern mit Begründung (GO, GO MIT AUFLAGE, NO-GO).'},validations:[{validation:'min',value:'1'},{validation:'max',value:'16000'}]}]};
const respond=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data))};
const port=Number(process.env.AGENT_API_PORT||21950);
createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://127.0.0.1');
 if(req.method==='GET'&&url.pathname==='/availability'){const ok=Boolean(readyRegistration());return respond(res,200,{status:ok?'available':'unavailable',type:'masumi-agent',message:ok?'JuicyBids nimmt bezahlte Aufträge an.':'JuicyBids ist noch nicht bereit: Registrierung oder Zahlungsschlüssel fehlt.'});}
 if(req.method==='GET'&&url.pathname==='/input_schema')return respond(res,200,schema);
 if(req.method==='GET'&&url.pathname==='/status'){
 const id=url.searchParams.get('job_id');if(!/^[0-9a-f-]{36}$/.test(id||''))return respond(res,400,{error:'Invalid job_id'});
 if(!existsSync(`${jobsDir}/${id}.json`))return respond(res,404,{error:'Job not found'});
 const job=load(id);return respond(res,200,job.status==='completed'?{status:job.status,result:job.result}:{status:job.status});
 }
 if(req.method!=='POST'||url.pathname!=='/start_job')return respond(res,404,{error:'Route not found'});
 // 16000 characters may need several bytes each after UTF-8 and JSON escaping.
 let bytes=0,body='';for await(const part of req){bytes+=part.length;if(bytes>100000)return respond(res,413,{error:'Request too large'});body+=part}
 let input;try{input=JSON.parse(body)}catch{return respond(res,400,{error:'Request body must be JSON'})}
 // MIP-003: input_data is an object keyed by input_schema ids. MIP-004 hashes exactly that object.
 const nonce=input?.identifier_from_purchaser??input?.identifierFromPurchaser;const data=input?.input_data;
 if(typeof nonce!=='string'||!/^[a-fA-F0-9]{14,26}$/.test(nonce)||!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>k!=='prompt')||typeof data.prompt!=='string'||!data.prompt.trim()||data.prompt.length>16000)return respond(res,400,{error:'Expected hex identifier_from_purchaser and input_data.prompt (1-16000 characters)'});
 const prompt={prompt:data.prompt};
 const reg=readyRegistration();if(!reg)return respond(res,503,{error:'Registration not confirmed'});
 // Persist before the payment write. Unknown outcomes require inspection, never automatic replay.
 const key=sha256(nonce);let job=readdirSync(jobsDir).filter(x=>/^[0-9a-f-]{36}\.json$/.test(x)).map(x=>load(x.replace('.json',''))).find(j=>j.nonceKey===key);
 if(job){if(job.inputHash!==inputHash(prompt,nonce))return respond(res,409,{error:'Nonce already used with another input'});return respond(res,job.response?200:409,job.response||{error:'Payment outcome requires inspection'});}
 const now=Date.now();const minute=60000;
 job={id:randomUUID(),nonceKey:key,nonce,input:prompt,inputHash:inputHash(prompt,nonce),status:'awaiting_payment',phase:'payment-pending'};save(job);
 // Fixed registry pricing: MPS rejects RequestedFunds and takes the amount from the on-chain metadata.
 const payment=await mps('/payment',{network:'Preprod',paymentSourceType:'Web3CardanoV2',supportedPaymentSourceIndex:reg.supportedPaymentSourceIndex,inputHash:job.inputHash,agentIdentifier:reg.agentIdentifier,identifierFromPurchaser:nonce,payByTime:new Date(now+10*minute).toISOString(),submitResultTime:new Date(now+20*minute).toISOString(),unlockTime:new Date(now+36*minute).toISOString(),externalDisputeUnlockTime:new Date(now+52*minute).toISOString()});
 // MIP-003 start_job fields; times are the signed unix-ms values. Source type and index are read by Sokosumi for V2.
 job.payment=payment;job.phase='waiting-payment';job.response={id:job.id,blockchainIdentifier:payment.blockchainIdentifier,payByTime:Number(payment.payByTime),submitResultTime:Number(payment.submitResultTime),unlockTime:Number(payment.unlockTime),externalDisputeUnlockTime:Number(payment.externalDisputeUnlockTime),agentIdentifier:reg.agentIdentifier,sellerVKey:payment.SmartContractWallet?.walletVkey??reg.sellerVkey,identifierFromPurchaser:nonce,input_hash:job.inputHash,paymentSourceType:'Web3CardanoV2',supportedPaymentSourceIndex:reg.supportedPaymentSourceIndex};save(job);return respond(res,200,job.response);
 }catch(e){respond(res,500,{error:'Request failed. Inspect the saved job state before retrying.'})}
}).listen(port,'127.0.0.1',()=>console.log('Agent API running',port));
let busy=false;
setInterval(async()=>{
 if(busy)return;busy=true;
 try{for(const file of readdirSync(jobsDir).filter(x=>/^[0-9a-f-]{36}\.json$/.test(x))){
 const job=load(file.replace('.json',''));try{
 if(!['waiting-payment','awaiting-result'].includes(job.phase))continue;
 const payment=await mps('/payment/resolve-blockchain-identifier',{network:'Preprod',blockchainIdentifier:job.payment.blockchainIdentifier,includeHistory:'true'});
 if(job.phase==='awaiting-result'){if(payment.onChainState==='ResultSubmitted'&&payment.resultHash===job.resultHash&&confirmedState(payment,'ResultSubmitted')){job.phase='result-confirmed';job.status='completed';save(job)}continue;}
 if(payment.onChainState!=='FundsLocked'||!confirmedState(payment,'FundsLocked'))continue;
 if(Number(payment.submitResultTime)<=Date.now()+120000){job.phase='deadline-blocked';job.status='failed';save(job);continue;}
 job.phase='model-pending';job.status='running';save(job);
 if(Number(payment.submitResultTime)<=Date.now()+120000)continue;
 job.result=await scout(job.input.prompt,`${jobsDir}/${job.id}-session`,Number(payment.submitResultTime));
 writeFileSync(`${jobsDir}/${job.id}.txt`,job.result,{mode:0o600});job.resultHash=resultHash(job.result,job.nonce);job.phase='submit-pending';save(job);
 if(Number(payment.submitResultTime)<=Date.now()){job.phase='deadline-blocked';job.status='failed';save(job);continue;}
 await mps('/payment/submit-result',{network:'Preprod',blockchainIdentifier:payment.blockchainIdentifier,submitResultHash:job.resultHash});
 job.phase='awaiting-result';save(job);
 }catch(e){console.error('Standard job needs inspection',job.id)}
 }}finally{busy=false}
},5000);
