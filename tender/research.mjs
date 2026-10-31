import {spawnSync} from 'node:child_process';
// Agent-to-agent research: when a free-text request names a company but leaves the Firmenpass thin (no references,
// certificates, services), JuicyBids hires a research agent in the Sokosumi gallery, pays it from its own credits and
// lets the intake model merge the findings into the Firmenpass. Every adopted fact is marked as "aus Recherche".
// The step is optional: it runs only with RESEARCH_AGENT_ID set, has a hard timeout and never blocks the assessment.
// Hire and polling use the Sokosumi CLI exactly like dev/assistant.mjs (field names measured in T13 and T25).
const FAILED=/fail|cancel|refund|error|dispute|expired/i;

/** Reads the research configuration from the environment. Returns null when no agent is configured. */
export function researchConfig(env=process.env){
 const agentId=env.RESEARCH_AGENT_ID?.trim();
 if(!agentId)return null;
 const credits=Number(env.RESEARCH_MAX_CREDITS),minutes=Number(env.RESEARCH_TIMEOUT_MINUTES);
 return {agentId,maxCredits:Number.isInteger(credits)&&credits>0?credits:10,timeoutMs:(minutes>0?minutes:4)*60000,
  inputField:env.RESEARCH_INPUT_FIELD?.trim()||'prompt',inputTemplate:env.RESEARCH_INPUT_TEMPLATE?.trim()||null,target:env.RESEARCH_TARGET?.trim()||'preprod'};
}

/** Builds the agent's input from its own schema: RESEARCH_INPUT_TEMPLATE is a JSON object whose string values may contain
 *  {company}, {location}, {trade} and {brief}; without a template the whole brief goes into RESEARCH_INPUT_FIELD. */
export function researchInput(config,pass,brief){
 if(!config.inputTemplate)return {[config.inputField]:brief};
 const fill=s=>typeof s==='string'?s.replace(/\{(company|location|trade|brief)\}/g,(_,k)=>({company:pass.company_name??'',location:pass.home_location??'',trade:pass.trade??'',brief})[k]):s;
 const template=JSON.parse(config.inputTemplate);
 return Object.fromEntries(Object.entries(template).map(([k,v])=>[k,fill(v)]));
}

/** True when research can add facts: a company is named and the intake still asks for references, certificates or services. */
export function needsResearch(understanding){
 const pass=understanding?.pass;
 if(!pass?.company_name||understanding.source!=='text')return false;
 return !pass.references?.length||!pass.certifications?.length||!(pass.custom_services?.length||pass.exclusions?.length);
}

/** German research brief for the external agent. Asks only for facts the Firmenpass can hold, never for contact data. */
export function researchPrompt(pass){
 const where=pass.home_location?` (${pass.home_location})`:'';
 return [`Recherchiere öffentlich verfügbare Informationen über die Firma „${pass.company_name}“${where}, Branche: ${pass.trade}.`,
  'Gesucht sind nur Fakten für ein Bewerbungsprofil für öffentliche Ausschreibungen:',
  '1. Leistungen und Spezialisierung (konkret, mit Technologien oder Gewerken)',
  '2. Teamgröße und Firmensitz',
  '3. Referenzprojekte der letzten fünf Jahre, besonders für öffentliche Auftraggeber (Jahr, Auftraggeber-Typ, Leistung, Größenordnung in Euro)',
  '4. Zertifikate, Zulassungen, Präqualifikationen',
  '5. Typische Auftragsgrößen und Leistungen, die die Firma nicht anbietet',
  'Nenne zu jedem Punkt die Quelle. Schreibe „nicht gefunden“, wenn es nichts Belegtes gibt. Erfinde nichts. Keine Namen von Personen, keine E-Mail-Adressen, keine Telefonnummern. Antworte auf Deutsch.'].join('\n');
}

function defaultCli(args){
 const r=spawnSync('sokosumi',args,{encoding:'utf8'});
 if(r.status!==0)throw new Error((r.stderr||r.stdout||'sokosumi failed').trim().slice(0,400));
 return JSON.parse(r.stdout);
}
const sleepFor=ms=>new Promise(r=>setTimeout(r,ms));

/** Hires the research agent once and polls the job until it completes, fails or the timeout passes.
 *  Returns {jobId, agentId, credits, status, result} where result is the delivered text or null. Throws only when no job was created. */
export async function hireResearch(prompt,config,{cli=defaultCli,sleep=sleepFor,pollMs=15000,now=Date.now,writeInput,pass={}}={}){
 const inputPath=writeInput?writeInput(JSON.stringify(researchInput(config,pass,prompt))):null;
 const hired=cli(['--'+config.target,'agents','hire',config.agentId,'--input-file',inputPath,'--max-credits',String(config.maxCredits),'--json']);
 const jobId=hired?.job?.id;
 if(!jobId)throw new Error(`hire returned no job id: ${JSON.stringify(hired).slice(0,200)}`);
 const started=now();
 let status=hired.job.status??'unknown',details={},job=hired.job;
 while(!/^completed$/i.test(status)){
  if(now()-started>config.timeoutMs)return {jobId,agentId:config.agentId,credits:config.maxCredits,status:`timeout after ${Math.round(config.timeoutMs/60000)} min (${status})`,result:null};
  await sleep(pollMs);
  try{details=cli(['--'+config.target,'jobs','get',jobId,'--details','--json']);job=details.job??job;}catch{continue;}
  status=job.status??status;
  const latest=details.events?.[0]?.status;
  if(FAILED.test(status)||FAILED.test(latest??''))return {jobId,agentId:config.agentId,credits:config.maxCredits,status:`failed (${status}${latest?`, ${latest}`:''})`,result:null};
 }
 const result=job.result??(details.events??[]).find(e=>e?.status==='COMPLETED'&&e.result)?.result??null;
 return {jobId,agentId:config.agentId,credits:config.maxCredits,status:'completed',result:typeof result==='string'?result:JSON.stringify(result)};
}

/** Model prompt that merges research findings into the current Firmenpass. Facts from the user win; research fills gaps only. */
export function mergePrompt(previous,research,now=Date.now()){
 const {nuts_prefixes,...pass}=previous.pass;
 return ['AUFGABE: Ergänze den Firmenpass um belegte Fakten aus der RECHERCHE eines externen Agenten. Angaben des Nutzers bleiben unverändert; die Recherche füllt nur Lücken (references, certifications, licenses, custom_services, exclusions, employees, home_location, service_description). Übernimm nichts, was die Recherche als „nicht gefunden“ oder unsicher kennzeichnet. Kein Personenname, keine Kontaktdaten. Jede übernommene Angabe bekommt einen Eintrag in assumptions, der mit „aus Recherche:“ beginnt. Antworte ausschließlich mit dem JSON-Objekt {"pass":{…},"assumptions":[…],"questions":[…]}; behalte die bisherigen assumptions und entferne nur Fragen, die die Recherche beantwortet.',
  `HEUTE: ${new Date(now).toISOString().slice(0,10)}`,
  `BISHERIGER FIRMENPASS:\n${JSON.stringify(pass)}`,
  `BISHERIGE ANNAHMEN:\n${JSON.stringify(previous.assumptions??[])}`,
  `OFFENE FRAGEN:\n${JSON.stringify(previous.questions??[])}`,
  `RECHERCHE:\n${String(research).trim().slice(0,12000)}`].join('\n\n');
}

/** German one-liner for the report and the confirmation text. */
export function researchNote(outcome,agentName){
 const who=agentName?`„${agentName}“`:`Agent ${outcome.agentId}`;
 if(outcome.status==='completed')return `Firmenrecherche: Sokosumi-Agent ${who} beauftragt und bezahlt (Job ${outcome.jobId}, bis ${outcome.credits} Credits); übernommene Angaben sind mit „aus Recherche“ markiert`;
 return `Firmenrecherche: Sokosumi-Agent ${who} beauftragt (Job ${outcome.jobId}), aber kein Ergebnis (${outcome.status}); Bewertung nur mit Ihren Angaben`;
}
