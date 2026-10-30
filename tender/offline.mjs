// Placeholder answers without a model: checks data flow and report layout (npm run scout -- … --offline, npm run try).
// Intake prompts (label ANFRAGE:) and correction prompts (label ANTWORT) from tender/intake.mjs get a canned IT pass.
const OFFLINE_INTAKE={pass:{company_name:'Offline-Beispiel',trade:'it',trades:['it'],service_description:'Platzhalter ohne Modell: IT-Dienstleistungen laut Freitext.',employees:5},
 assumptions:['Platzhalter-Eingang ohne Modell (--offline).'],questions:[]};
export const placeholder=async text=>{
 if(/^(ANFRAGE|ANTWORT|FREITEXT)\b/m.test(text))return JSON.stringify(OFFLINE_INTAKE);
 const ids=JSON.parse(text.slice(text.lastIndexOf('KANDIDATEN (')).replace(/^[^\n]*\n/,'')).map(c=>c.id);
 // T6 point schema: even candidates score as GO, odd ones as GO MIT AUFLAGE with a placeholder to-do.
 const points={zulassung:10,referenzen:15,leistungsfaehigkeit:10,leistungstext:5,kapazitaet:10,entfernung:3,groesse:5,gewinnchance:5,aufwand:3,risiko_abzug:3};
 return JSON.stringify({assessments:ids.map((id,i)=>({id,points,ko:[],todos:i%2?['Platzhalter-To-do ohne Modell (--offline).']:[],
  reasons:['Platzhalter ohne Modell (--offline).','Platzhalter.','Platzhalter.'],proofs:[],risks:['Keine echte Bewertung.'],unclear:[]}))});
};
