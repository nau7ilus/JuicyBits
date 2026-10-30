import {z} from 'zod';
import {STATE_NUTS,TRADE_CPV,deriveCpv,normalizePrefixes} from './trades.mjs';
// Firmenpass (T4): the company profile sent with every job. Required fields reject the job; recommended fields only lower certainty.
const text=z.string().trim().min(1).max(500);
const list=z.array(text).max(50);
const yesNo=z.boolean().optional();
const PassSchema=z.object({
 company_name:z.string().trim().max(200).optional(),
 trade:z.string().trim().min(1).max(60),
 trades:z.array(z.string()).max(40).default([]),
 custom_services:list.default([]),
 categories:z.array(z.string()).max(20).default([]),
 manual_cpv:z.array(z.string()).max(40).default([]),
 service_description:z.string().trim().min(20,'service_description braucht mindestens 20 Zeichen').max(2000),
 cpv_prefixes:z.array(z.string().regex(/^\d{2,8}$/,'CPV-Präfixe bestehen aus 2 bis 8 Ziffern')).max(40).optional(),
 states:z.array(z.string()).min(1,'states darf nicht leer sein'),
 min_value_eur:z.number().nonnegative(),
 max_value_eur:z.number().positive(),
 available_from:z.iso.date('available_from muss das Format YYYY-MM-DD haben'),
 employees:z.number().int().positive().optional(),
 capacity_note:z.string().trim().max(500).optional(),
 // T4 additions and T6 inputs (distance, free capacity, size fit, bid lead time, company wishes).
 home_location:z.string().trim().max(200).optional(),
 radius_km:z.number().positive().max(1000).optional(),
 free_capacity:z.string().trim().max(500).optional(),
 largest_reference_eur:z.number().nonnegative().optional(),
 bid_lead_days:z.number().int().min(0).max(60).optional(),
 preferences:z.string().trim().max(2000).optional(),
 licenses:list,
 certifications:list,
 revenue_band_eur:z.enum(['<250k','250k-1M','1M-2.5M','2.5M-10M','>10M']).optional(),
 liability_insurance_eur:z.number().nonnegative().optional(),
 references:z.array(z.object({year:z.number().int().min(1990).max(2100).optional(),value_eur:z.number().nonnegative().optional(),
  cpv:z.string().regex(/^\d{2,8}$/).optional(),public_client:z.boolean().optional(),summary:z.string().trim().max(500).optional()})).max(30).default([]),
 price_positioning:z.enum(['budget','mid','premium']).optional(),
 consortium_ok:yesNo,
 subcontracting_ok:yesNo,
 risk_limits:z.object({max_penalty_pct:z.number().min(0).max(100).optional(),max_guarantee_pct:z.number().min(0).max(100).optional(),
  max_term_months_without_price_adjustment:z.number().int().positive().optional(),prefinancing_ok:yesNo}).optional(),
 max_bid_effort:z.enum(['low','medium','high']).optional(),
 exclusions:list,
 lookback_days:z.number().int().min(1).max(60).default(14),
}).refine(p=>p.min_value_eur<=p.max_value_eur,{message:'min_value_eur muss kleiner oder gleich max_value_eur sein',path:['min_value_eur']})
 .refine(p=>p.states.every(s=>s in STATE_NUTS),{message:'TenderScout deckt nur Bayern ab: states muss ["DE-BY"] sein',path:['states']})
 .refine(p=>p.trades.every(t=>t in TRADE_CPV),{message:'trades enthält eine unbekannte Leistung',path:['trades']});
export class PassError extends Error{constructor(issues){super(`Firmenpass ungültig: ${issues.join('; ')}`);this.issues=issues;}}
// Accepts the pass as object or JSON text (a Sokosumi task description). Returns the pass with derived fields filled in.
export function validatePass(input){
 let raw=input;
 if(typeof input==='string'){
  const json=input.slice(input.indexOf('{'),input.lastIndexOf('}')+1);
  try{raw=JSON.parse(json)}catch{throw new PassError(['Eingabe ist kein gültiges JSON. Erwartet wird ein Firmenpass als JSON-Objekt.'])}
 }
 const result=PassSchema.safeParse(raw);
 if(!result.success)throw new PassError(result.error.issues.map(i=>`${i.path.join('.')||'pass'}: ${i.message}`));
 const pass=result.data;
 const cpv=normalizePrefixes(pass.cpv_prefixes?.length?pass.cpv_prefixes:deriveCpv(pass));
 if(!cpv.length)throw new PassError(['cpv_prefixes: keine CPV-Präfixe angegeben und keine aus trades ableitbar']);
 return {...pass,cpv_prefixes:cpv,nuts_prefixes:[...new Set(pass.states.map(s=>STATE_NUTS[s]))]};
}
