// Trade catalogue from the Firmenpass form (T4). CPV prefixes still need a check against the official CPV list (T3).
export const TRADES={
 bau:{hochbau:['4521'],tiefbau:['4523'],abbruch:['4511'],beton_mauer:['452623','452625'],geruestbau:['452621']},
 dach_fassade:{dachdecker:['45261'],zimmerei:['452611'],spengler:['452613'],daemmung_fassade:['4532','45443']},
 ausbau:{maler:['45442'],fliesen_boden:['4543'],tischler:['4542'],putz_trockenbau:['4541'],glaser:['45441']},
 haustechnik:{elektro:['4531'],shk:['4533'],brandmelde:['45312'],wartung_tga:['507']},
 sanierung:{modernisierung:['45453'],schadstoff:['45262660'],restaurierung:['454541']},
 gebaeudeservice:{gebaeudereinigung:['90911','90919'],glasreinigung:['909113'],winterdienst:['9062','9063'],gruenpflege:['7731'],hausmeister:['79993','98341140']},
 sicherheit:{bewachung:['79713'],sicherheitsdienst:['7971'],alarmueberwachung:['79711']},
 beratung_planung:{unternehmensberatung:['794'],architektur:['712'],ingenieurbuero:['713'],it:['72'],recht_steuer:['791','792']},
 sonstige:{transport:['601'],catering:['555'],entsorgung:['905'],kfz:['501'],schulung:['805']},
};
export const FALLBACK_CPV={bau:['45'],dach_fassade:['45261','4532','45443'],ausbau:['454'],haustechnik:['453'],sanierung:['4545'],gebaeudeservice:['909'],sicherheit:['7971'],beratung_planung:['79','71'],sonstige:[]};
export const TRADE_CPV=Object.fromEntries(Object.values(TRADES).flatMap(group=>Object.entries(group)));
export const tradeCategory=trade=>Object.keys(TRADES).find(c=>trade in TRADES[c]);
// Only Bavaria is covered by our dataset. Other states are rejected instead of silently returning nothing.
export const STATE_NUTS={'DE-BY':'DE2'};
// Shorter prefixes absorb longer ones: ['45','45261'] -> ['45'].
export function normalizePrefixes(prefixes){
 const sorted=[...new Set(prefixes.map(p=>String(p).replace(/\D/g,'')).filter(Boolean))].sort((a,b)=>a.length-b.length||a.localeCompare(b));
 return sorted.filter((p,i)=>!sorted.slice(0,i).some(q=>p.startsWith(q)));
}
// Derived fields of the form, for agents that send a pass without it.
export function deriveCpv({trades=[],custom_services=[],categories=[],manual_cpv=[]}){
 const fromTrades=trades.flatMap(t=>TRADE_CPV[t]??[]);
 const customOnly=custom_services.length?categories.filter(c=>!trades.some(t=>tradeCategory(t)===c)).flatMap(c=>FALLBACK_CPV[c]??[]):[];
 return normalizePrefixes([...fromTrades,...customOnly,...manual_cpv]);
}
