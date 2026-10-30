import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {zipSync,strToU8} from 'fflate';
import {joinDateTime,parseEforms,runImport,stripContacts} from './import.mjs';
const release=(id,region,delivery)=>({uri:`https://oeffentlichevergabe.de/api/notices/${id}`,publishedDate:'2026-10-29T03:00:00Z',
 releases:[{ocid:`ocds-x-${id}`,id,date:'2026-10-29T03:00:00Z',tag:['tender'],
  buyer:{name:'Stadt',address:{region}},
  parties:[{name:'Stadt',roles:['buyer'],address:{region},contactPoint:{name:'Erika Muster',email:'erika@example.org',telephone:'+49 1'}}],
  tender:{title:`Dach ${id}`,items:[{classification:{scheme:'CPV',id:'45261000'},deliveryAddress:{region:delivery}}],lots:[{id:'LOT-0001'}]}}]});
const eforms=(id,nuts,deadline)=>`<?xml version="1.0"?><ContractNotice xmlns:cac="c" xmlns:cbc="b" xmlns:efac="a" xmlns:efext="e" xmlns:ext="x"><cbc:ID>${id}</cbc:ID><cbc:VersionID>01</cbc:VersionID>
<cac:ContractingParty><cac:Party><cac:Contact><cbc:ElectronicMail>vergabe@example.org</cbc:ElectronicMail></cac:Contact></cac:Party></cac:ContractingParty>
<cac:TenderingProcess><cbc:ProcedureCode listName="procurement-procedure-type">open</cbc:ProcedureCode></cac:TenderingProcess>
<cac:ProcurementProjectLot><cbc:ID>LOT-0001</cbc:ID><cac:TenderingTerms><ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent><efext:EformsExtension>
<efac:SelectionCriteria><cbc:TendererRequirementTypeCode>slc-stand-to-gen</cbc:TendererRequirementTypeCode><cbc:Description>Meisterbrief</cbc:Description></efac:SelectionCriteria>
</efext:EformsExtension></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>
<cac:RequiredFinancialGuarantee><cbc:GuaranteeTypeCode listName="tender-guarantee-required">true</cbc:GuaranteeTypeCode><cbc:Description>5 % Vertragserfüllung</cbc:Description></cac:RequiredFinancialGuarantee>
<cac:AwardingTerms><cac:AwardingCriterion><cac:SubordinateAwardingCriterion><ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent><efext:EformsExtension>
<efac:AwardCriterionParameter><efbc:ParameterCode listName="number-weight">poi-exa</efbc:ParameterCode><efbc:ParameterNumeric>70.0</efbc:ParameterNumeric></efac:AwardCriterionParameter>
</efext:EformsExtension></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions><cbc:AwardingCriterionTypeCode>price</cbc:AwardingCriterionTypeCode><cbc:Name>Preis</cbc:Name></cac:SubordinateAwardingCriterion></cac:AwardingCriterion></cac:AwardingTerms></cac:TenderingTerms>
<cac:TenderingProcess>${deadline?'<cac:TenderSubmissionDeadlinePeriod><cbc:EndDate>2026-11-30+01:00</cbc:EndDate><cbc:EndTime>09:00:00+01:00</cbc:EndTime></cac:TenderSubmissionDeadlinePeriod>':''}</cac:TenderingProcess>
<cac:ProcurementProject><cbc:Name>Los 1</cbc:Name><cac:MainCommodityClassification><cbc:ItemClassificationCode listName="cpv">03000000</cbc:ItemClassificationCode></cac:MainCommodityClassification>
<cac:RealizedLocation><cac:Address><cbc:PostalZone>08523</cbc:PostalZone><cbc:CountrySubentityCode listName="nuts">${nuts}</cbc:CountrySubentityCode></cac:Address></cac:RealizedLocation></cac:ProcurementProject>
</cac:ProcurementProjectLot></ContractNotice>`;
test('eForms date and time join with their own offsets',()=>{
 assert.equal(joinDateTime('2026-11-30+01:00','09:00:00+01:00'),'2026-11-30T09:00:00+01:00');
 assert.equal(joinDateTime('2026-11-30Z','09:00:00'),'2026-11-30T09:00:00Z');
 assert.equal(joinDateTime('2026-11-30+01:00'),'2026-11-30+01:00');
 assert.equal(joinDateTime(undefined,'09:00:00'),null);
});
test('eForms extraction keeps codes as strings and drops contacts',()=>{
 const form=parseEforms(eforms('a',"DE219",true));
 assert.deepEqual(form.lots[0].cpv,['03000000']);
 assert.equal(form.lots[0].deadline,'2026-11-30T09:00:00+01:00');
 assert.deepEqual(form.lots[0].selectionCriteria,[{type:'slc-stand-to-gen',description:'Meisterbrief'}]);
 assert.equal(form.procedureType,'open');
 assert.deepEqual(form.lots[0].awardCriteria,[{type:'price',name:'Preis',description:null,weight:70}]);
 assert.deepEqual(form.lots[0].guarantee,{required:true,description:'5 % Vertragserfüllung'});
 assert.doesNotMatch(JSON.stringify(form),/@example|ElectronicMail/);
});
test('contact keys are removed at any depth',()=>{
 assert.deepEqual(stripContacts({a:[{contactPoint:{email:'x'},name:'Stadt'}],email:'y'}),{a:[{name:'Stadt'}]});
});
test('free-text contact data is redacted without touching dates or codes',()=>{
 assert.equal(stripContacts('Markt Prien, Tel.: +49 805160639, Fax: +49 805160637, E-Mail: vergabe@prien.de'),
  'Markt Prien, Tel.: [Telefon entfernt], Fax: [Telefon entfernt], E-Mail: [E-Mail entfernt]');
 for(const keep of ['2026-11-30T09:00:00+01:00','45000000','Berichtseinheit-ID 00013164','LOT-0001','ocds-mnwr74-23db66a1-3707-418b-8e2c-71e6470a958b'])assert.equal(stripContacts(keep),keep);
});
test('import keeps Bavarian notices from buyer or place of performance and merges eForms',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tender-import-'));
 try{
  const inbox=join(dir,'inbox'),out=join(dir,'bayern');mkdirSync(inbox);
  writeFileSync(join(inbox,'notices_2026-10-29_OCDS.zip'),zipSync({
   'by-buyer-01.json':strToU8(JSON.stringify(release('by-buyer','DE212','DE212'))),
   'by-place-01.json':strToU8(JSON.stringify(release('by-place','DE300',undefined))),
   'hessen-01.json':strToU8(JSON.stringify(release('hessen','DE724','DE724')))}));
  writeFileSync(join(inbox,'notices_2026-10-29_eForms.zip'),zipSync({
   'by-buyer-01.xml':strToU8(eforms('by-buyer','DE212',true)),
   'by-place-01.xml':strToU8(eforms('by-place','DE219',false)),
   'hessen-01.xml':strToU8(eforms('hessen','DE724',true))}));
  const stats=runImport({inbox,out});
  assert.equal(stats.bavaria,2);assert.equal(stats.withDeadline,1);assert.equal(stats.ocdsOnly,0);
  assert.deepEqual(readdirSync(out).sort(),['by-buyer-01.json','by-place-01.json','index.json']);
  const index=JSON.parse(readFileSync(join(out,'index.json'),'utf8'));
  assert.equal(index.find(n=>n.id==='by-buyer-01').deadline,'2026-11-30T09:00:00+01:00');
  assert.equal(index.find(n=>n.id==='by-buyer-01').link,'https://oeffentlichevergabe.de/ui/de/search/details?noticeId=by-buyer');
  assert.equal(index.find(n=>n.id==='by-place-01').deadline,null);
  for(const f of readdirSync(out))assert.doesNotMatch(readFileSync(join(out,f),'utf8'),/@example|contactPoint|Erika/);
  assert.deepEqual(runImport({inbox,out}).indexed,2);
 }finally{rmSync(dir,{recursive:true})}
});
