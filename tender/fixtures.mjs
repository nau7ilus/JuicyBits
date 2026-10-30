// Shared test data for tender/*.test.mjs.
export const NOW=Date.parse('2026-10-30T12:00:00+01:00');
// Example pass from the Firmenpass form (T4).
export const EXAMPLE_PASS={trade:'dachdecker',trades:['dachdecker','spengler'],custom_services:[],
 service_description:'Steil- und Flachdachsanierung, Abdichtung und Dachentwässerung für öffentliche und gewerbliche Gebäude',
 cpv_prefixes:['45261'],states:['DE-BY'],min_value_eur:20000,max_value_eur:500000,available_from:'2027-01-15',
 licenses:['Meisterbetrieb / Handwerksrolle'],certifications:['Präqualifikation Bau (PQ-VOB)'],exclusions:['Ausführungsfrist < 4 Wochen'],lookback_days:14,
 references:[{year:2025,value_eur:140000,cpv:'45261',public_client:true,summary:'Flachdachsanierung Grundschule'}],
 revenue_band_eur:'1M-2.5M',liability_insurance_eur:3000000,employees:18,capacity_note:'2 Kolonnen',price_positioning:'premium',
 consortium_ok:true,subcontracting_ok:false,risk_limits:{max_penalty_pct:5,max_guarantee_pct:5,max_term_months_without_price_adjustment:24,prefinancing_ok:false},
 max_bid_effort:'medium'};
export function record(id,{tag=['tender'],pubDay='2026-10-29',cpv=['45261000'],nuts=['DE212'],deadline='2026-11-30T09:00:00+01:00',value=null,eforms=true}={}){
 return {id,source:{pubDay,link:`https://oeffentlichevergabe.de/ui/de/search/details?noticeId=${id}`},
  summary:{tag,title:`Dacharbeiten ${id}`,buyer:'Stadt Musterstadt',cpv,nuts,deadline},
  ocds:{tender:{description:'Sanierung des Flachdachs'}},
  eforms:eforms?{procedureType:'open',estimatedValue:value?{amount:value,currency:'EUR'}:null,lots:[{id:'LOT-0001',title:'Los 1',description:'Dach',cpv,nuts,
   deadline,participationDeadline:null,plannedStart:'2027-02-01+01:00',plannedEnd:null,duration:null,estimatedValue:null,smeSuitable:true,
   selectionCriteria:[{type:'slc-stand-to-gen',description:'Meisterbrief'}],awardCriteria:[],guarantee:null}]}:null};
}
