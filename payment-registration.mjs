import fs from 'node:fs';
import { registrationUrl, requireSavedRuntimeToken, requireAgentAuthor } from './registration-config.mjs';
import { USDM } from './paid-task.mjs';
const statePath = 'docs/registration-state.json';
const payment = JSON.parse(fs.readFileSync('docs/payment-state.json'));
let state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath)) : {provenance:'VERIFIED', sourceId:payment.sourceId, walletId:payment.walletId};
const save=()=>fs.writeFileSync(statePath,JSON.stringify(state,null,2));
const base=process.env.MPS_URL+'/api/v1';
// key and register need the admin key; update and the sync use the wallet-scoped runtime key (canPay, canRead).
const headers={token:['key','register'].includes(process.argv[2])?process.env.ADMIN_KEY:(process.env.MPS_RUNTIME_TOKEN||process.env.ADMIN_KEY),'content-type':'application/json'};
async function request(path,body){const r=await fetch(base+path,{headers,method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok||j.status!=='success')throw Error(`${r.status}: ${JSON.stringify(j.error??j.message??{})}`);return j.data;}
if(process.argv[2]==='key'){
 if(state.runtimeKeyId){requireSavedRuntimeToken('.local/mps-runtime.env');console.log('Runtime key already saved',state.runtimeKeyId);process.exit(0);}
 if(state.keyWritePending)throw Error('Previous key write uncertain; inspect API key records before retry');
 state.keyWritePending=true;save();
 const key=await request('/api-key',{usageLimited:'false',UsageCredits:[],NetworkLimit:['Preprod'],ChainIdLimit:[],canRead:true,canPay:true,canAdmin:false,walletScopeEnabled:true,WalletScopeHotWalletIds:[payment.walletId],x402WalletScopeEnabled:true,X402WalletScopeEvmWalletIds:[]});
 state.runtimeKeyId=key.id;state.keyWritePending=false;save();
 if(typeof key.token!=='string'||key.token.startsWith('*****'))throw Error('Created key token was not revealed; key ID preserved for supported token update');
 fs.writeFileSync('.local/mps-runtime.env',`MPS_RUNTIME_TOKEN=${key.token}\n`,{mode:0o600});
 state.runtimeKeyId=key.id;state.keyWritePending=false;state.keyEvidence={canRead:key.canRead,canPay:key.canPay,canAdmin:key.canAdmin,NetworkLimit:key.NetworkLimit,walletScopeEnabled:key.walletScopeEnabled,WalletScopeHotWalletIds:key.WalletScopeHotWalletIds};save();console.log('Runtime key created',key.id,JSON.stringify(state.keyEvidence));
}else if(process.argv[2]==='register'){
 const author=requireAgentAuthor(process.env.AGENT_AUTHOR);
 if(state.registrationId){console.log('Registration already saved',state.registrationId);process.exit(0);}
 if(state.registrationWritePending)throw Error('Previous registration write uncertain; inspect registry before retry');
 // The minted metadata is immutable: register only the public MIP-003 URL that Sokosumi and the registry can reach.
 if(!process.env.AGENT_PUBLIC_URL)throw Error('AGENT_PUBLIC_URL must be set to the public https URL of the MIP-003 API before registration');
 const apiBaseUrl=registrationUrl(process.env.AGENT_API_PORT,process.env.AGENT_PUBLIC_URL);
 if(!process.env.OPENAI_MODEL?.trim())throw Error('OPENAI_MODEL must name the model for the registry Capability');
 const wallet=await request(`/wallet?walletType=Selling&id=${payment.walletId}`);
 const sources=await request('/payment-source?take=100');
 const find=(x)=>{if(Array.isArray(x)){for(const y of x){const r=find(y);if(r)return r;}}else if(x&&typeof x==='object'){if(x.id===payment.sourceId)return x;for(const y of Object.values(x)){const r=find(y);if(r)return r;}}};
 const source=find(sources);if(!source||wallet.walletAddress!==payment.sellerAddress)throw Error('Dedicated source or wallet mismatch');
 // Second registration on 31.10. under the product name; the first one (TenderScout) is archived in docs/registration-state-tenderscout.json.
 const body={network:'Preprod',type:'Standard',sellingWalletVkey:wallet.walletVkey,supportedPaymentSources:[{chain:'Cardano',network:'Preprod',paymentSourceType:'Web3CardanoV2',address:source.smartContractAddress,pricing:{pricingType:'Fixed',fixed:[{asset:USDM,amount:'1000000'}]}}],ExampleOutputs:[],Tags:['hackathon','tenders','bavaria'],name:'JuicyBids',description:'Ranked, verified shortlist of open Bavarian public tenders with go/no-go reasoning from a free-text request or a Firmenpass JSON.',Capability:{name:process.env.OPENAI_MODEL.trim(),version:'1'},Author:{name:author},apiBaseUrl};
 state.registrationWritePending=true;state.request=body;save();
 const r=await request('/registry',body);state.registrationId=r.id;state.registrationWritePending=false;state.registration=r;save();console.log(JSON.stringify(r));
}else if(process.argv[2]==='update'){
 // Rename: V2 UpdateAction burns the registry NFT and mints the next version. Price, payment source and URL stay the same.
 // npm-free call: node --env-file=.env --env-file=.local/mps-runtime.env payment-registration.mjs update NAME
 const name=process.argv[3]?.trim();
 if(!name)throw Error('Usage: payment-registration.mjs update NAME');
 if(state.registrationState!=='RegistrationConfirmed'||!state.agentIdentifier)throw Error('Only a confirmed registration can be updated; run the sync first');
 if(state.updateWritePending)throw Error('Previous update write uncertain; inspect the registry before retry');
 const {sellingWalletVkey,...previous}=state.request;
 const body={...previous,name,agentIdentifier:state.agentIdentifier,supportedPaymentSources:previous.supportedPaymentSources};
 state.updateWritePending=true;state.updateRequest=body;state.previousAgentIdentifier=state.agentIdentifier;save();
 const r=await request('/registry/update',body);
 state.updateWritePending=false;state.update=r;state.request={...state.request,name};state.registration=r;state.registrationState=r.state;
 if(r.agentIdentifier)state.agentIdentifier=r.agentIdentifier;save();
 console.log(JSON.stringify({id:r.id,state:r.state,name:r.name,agentIdentifier:r.agentIdentifier}));
}else{
 const r=await request('/registry?network=Preprod&filterPaymentSourceType=Web3CardanoV2&limit=100');
 state.observedRegistry=r; const walk=x=>{if(Array.isArray(x)){for(const y of x)walk(y);}else if(x&&typeof x==='object'){if(x.id===state.registrationId){state.registration=x;state.agentIdentifier=x.agentIdentifier;state.registrationState=x.state;}else Object.values(x).forEach(walk);}};walk(r);save();console.log(JSON.stringify({id:state.registrationId,state:state.registration?.state,agentIdentifier:state.agentIdentifier,transaction:state.registration?.CurrentTransaction,error:state.registration?.error}));
}
