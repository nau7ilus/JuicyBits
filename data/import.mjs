import {existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {unzipSync,strFromU8} from 'fflate';
import {XMLParser} from 'fast-xml-parser';
// Offline import: reads manually downloaded OCDS + eForms exports from data/inbox, keeps Bavaria (NUTS DE2*) only.
export const BAVARIA='DE2';
const CONTACT_KEYS=new Set(['contactPoint','email','telephone','faxNumber']);
const xml=new XMLParser({removeNSPrefix:true,ignoreAttributes:false,attributeNamePrefix:'@',parseTagValue:false,parseAttributeValue:false});
const list=v=>v===undefined||v===null?[]:[].concat(v);
const text=v=>v===undefined||v===null?null:typeof v==='object'?(v['#text']??null):String(v);
const uniq=a=>[...new Set(a.filter(Boolean))];
export const stem=name=>basename(name).replace(/\.(json|xml)$/i,'');
// Some buyers put phone, fax and e-mail into free-text fields such as buyer.name, so strings are redacted too.
const EMAIL=/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE=/(?<![\w.:-])(?:\+|00)\d{1,3}[\d\s\/().-]{5,}\d/g;
export const redact=s=>s.replace(EMAIL,'[E-Mail entfernt]').replace(PHONE,'[Telefon entfernt]');
export function stripContacts(value){
 if(Array.isArray(value))return value.map(stripContacts);
 if(typeof value==='string')return redact(value);
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).filter(([k])=>!CONTACT_KEYS.has(k)).map(([k,v])=>[k,stripContacts(v)]));
}
// eForms splits date and time, each with its own offset: "2026-11-30+01:00" + "09:00:00+01:00".
export function joinDateTime(date,time){
 const d=text(date);if(!d)return null;
 const day=d.slice(0,10),dayZone=d.slice(10);
 const t=text(time);if(!t)return day+dayZone;
 const m=/^(\d\d:\d\d(?::\d\d)?)(.*)$/.exec(t);
 return m?`${day}T${m[1]}${m[2]||dayZone}`:day+dayZone;
}
export function ocdsNuts(release){
 return uniq([release.buyer?.address?.region,...list(release.parties).filter(p=>list(p.roles).includes('buyer')).map(p=>p.address?.region),...list(release.tender?.items).map(i=>i.deliveryAddress?.region)]);
}
export function ocdsCpv(release){
 return uniq(list(release.tender?.items).flatMap(i=>[i.classification,...list(i.additionalClassifications)]).filter(c=>c?.scheme==='CPV').map(c=>c.id));
}
function locationNuts(project){return list(project?.RealizedLocation).map(l=>text(l.Address?.CountrySubentityCode))}
function projectCpv(project){return [project?.MainCommodityClassification,...list(project?.AdditionalCommodityClassification)].map(c=>text(c?.ItemClassificationCode))}
function amount(project){const a=project?.RequestedTenderTotal?.EstimatedOverallContractAmount;return a?{amount:Number(text(a)),currency:a['@currencyID']??null}:null}
// Only fields listed here leave the XML. Organisations and contacts are never copied.
export function parseEforms(source){
 const doc=xml.parse(source);
 const type=Object.keys(doc).find(k=>!k.startsWith('?'));const root=doc[type];
 const lots=list(root.ProcurementProjectLot).map(lot=>{
  const project=lot.ProcurementProject,process=lot.TenderingProcess;
  const criteria=list(lot.TenderingTerms?.UBLExtensions?.UBLExtension).flatMap(u=>list(u.ExtensionContent?.EformsExtension?.SelectionCriteria));
  const sme=text(project?.SMESuitableIndicator);
  return {id:text(lot.ID),title:text(project?.Name),cpv:uniq(projectCpv(project)),nuts:uniq(locationNuts(project)),
   deadline:joinDateTime(process?.TenderSubmissionDeadlinePeriod?.EndDate,process?.TenderSubmissionDeadlinePeriod?.EndTime),
   participationDeadline:joinDateTime(process?.ParticipationRequestReceptionPeriod?.EndDate,process?.ParticipationRequestReceptionPeriod?.EndTime),
   plannedStart:joinDateTime(project?.PlannedPeriod?.StartDate),plannedEnd:joinDateTime(project?.PlannedPeriod?.EndDate),
   estimatedValue:amount(project),smeSuitable:sme===null?null:sme==='true',
   selectionCriteria:criteria.map(c=>({type:text(c.TendererRequirementTypeCode),description:text(c.Description)})).filter(c=>c.description)};
 });
 return {noticeType:type,noticeSubType:text(root.UBLExtensions?.UBLExtension?.ExtensionContent?.EformsExtension?.NoticeSubType?.SubTypeCode),
  noticeId:text(root.ID),version:text(root.VersionID),title:text(root.ProcurementProject?.Name),
  nuts:uniq([...locationNuts(root.ProcurementProject),...lots.flatMap(l=>l.nuts)]),cpv:uniq([...projectCpv(root.ProcurementProject),...lots.flatMap(l=>l.cpv)]),
  estimatedValue:amount(root.ProcurementProject),lots};
}
export const isBavarian=nuts=>nuts.some(n=>n.startsWith(BAVARIA));
// Yields {name, kind, content} for loose files and for files inside ZIPs.
export function* inboxEntries(dir){
 for(const file of readdirSync(dir).sort()){
  const path=join(dir,file);
  if(/\.zip$/i.test(file)){
   const entries=unzipSync(readFileSync(path),{filter:f=>/\.(json|xml)$/i.test(f.name)});
   for(const [name,bytes] of Object.entries(entries))yield {name,archive:file,kind:name.toLowerCase().endsWith('.xml')?'eforms':'ocds',content:strFromU8(bytes)};
  }else if(/\.(json|xml)$/i.test(file))yield {name:file,archive:null,kind:file.toLowerCase().endsWith('.xml')?'eforms':'ocds',content:readFileSync(path,'utf8')};
 }
}
export function mergeNotices(entries){
 const notices=new Map(),stats={read:0,skipped:0};
 const slot=key=>{if(!notices.has(key))notices.set(key,{});return notices.get(key)};
 for(const e of entries){
  stats.read++;const key=stem(e.name),from=e.archive?`${e.archive}:${basename(e.name)}`:e.name;
  try{
   if(e.kind==='eforms'){slot(key).eforms={file:from,data:parseEforms(e.content)};continue;}
   const pkg=JSON.parse(e.content);const release=list(pkg.releases)[0];
   if(!release){stats.skipped++;continue;}
   slot(key).ocds={file:from,uri:pkg.uri??null,publishedDate:pkg.publishedDate??null,data:stripContacts(release)};
  }catch{stats.skipped++;console.error('Unreadable entry skipped',from)}
 }
 return {notices,stats};
}
export function buildRecord(key,{ocds,eforms}){
 const release=ocds?.data,form=eforms?.data;
 const nuts=uniq([...(release?ocdsNuts(release):[]),...(form?.nuts??[])]);
 if(!isBavarian(nuts))return null;
 const deadlines=(form?.lots??[]).map(l=>l.deadline).filter(Boolean).sort();
 const pubDay=(ocds?.publishedDate??release?.date??'').slice(0,10)||null;
 const noticeId=release?.id??form?.noticeId??key.replace(/-\d+$/,'');
 // Public detail page format, taken from the T2 data handover.
 const link=`https://oeffentlichevergabe.de/ui/de/search/details?noticeId=${encodeURIComponent(noticeId)}`;
 return stripContacts({id:key,source:{pubDay,noticeId,link,ocdsFile:ocds?.file??null,eformsFile:eforms?.file??null,noticeUri:ocds?.uri??null},
  summary:{tag:list(release?.tag),noticeType:form?.noticeType??null,title:release?.tender?.title??form?.title??null,
   buyer:release?.buyer?.name??null,cpv:uniq([...(release?ocdsCpv(release):[]),...(form?.cpv??[])]),nuts,
   deadline:deadlines[0]??null,lots:form?.lots.length??list(release?.tender?.lots).length},
  ocds:release??null,eforms:form??null});
}
export function runImport({inbox='data/inbox',out='data/bayern'}={}){
 if(!existsSync(inbox))throw new Error(`Inbox ${inbox} not found. Put downloaded exports there.`);
 mkdirSync(out,{recursive:true});
 const {notices,stats}=mergeNotices(inboxEntries(inbox));
 Object.assign(stats,{notices:notices.size,bavaria:0,tenders:0,withDeadline:0,ocdsOnly:0,eformsOnly:0});
 for(const [key,parts] of notices){
  if(!parts.eforms)stats.ocdsOnly++;if(!parts.ocds)stats.eformsOnly++;
  const record=buildRecord(key,parts);if(!record)continue;
  stats.bavaria++;if(record.summary.tag.includes('tender'))stats.tenders++;if(record.summary.deadline)stats.withDeadline++;
  writeFileSync(join(out,`${key}.json`),JSON.stringify(record,null,1)+'\n');
 }
 const index=readdirSync(out).filter(f=>f.endsWith('.json')&&f!=='index.json').sort()
  .map(f=>{const r=JSON.parse(readFileSync(join(out,f),'utf8'));return {id:r.id,pubDay:r.source.pubDay,link:r.source.link,...r.summary}});
 writeFileSync(join(out,'index.json'),JSON.stringify(index,null,1)+'\n');
 return {...stats,indexed:index.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)console.log(runImport());
