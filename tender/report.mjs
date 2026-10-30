import {createHash} from 'node:crypto';
import {VERDICTS} from './assess.mjs';
import {CPV_STAGES} from './prefilter.mjs';
// German Markdown report with a JSON footer (T10, T19). Facts are printed from source data only.
const DAY=24*60*60*1000;
const PROCEDURES={open:'Offenes Verfahren',restricted:'Nicht offenes Verfahren','neg-w-call':'Verhandlungsverfahren mit Teilnahmewettbewerb',
 'neg-wo-call':'Verhandlungsverfahren ohne Teilnahmewettbewerb','comp-dial':'Wettbewerblicher Dialog',innovation:'Innovationspartnerschaft',
 'oth-single':'Sonstiges einstufiges Verfahren','oth-mult':'Sonstiges mehrstufiges Verfahren','comp-tend':'Wettbewerbliches Vergabeverfahren (VO 1370/2007)',
 // German national codes (eForms-DE, below EU thresholds) as seen in the dataset; unknown codes are printed as they are.
 'de-open':'Öffentliche Ausschreibung (national)','de-restricted-w-call':'Beschränkte Ausschreibung mit Teilnahmewettbewerb (national)','de-restricted-wo-call':'Beschränkte Ausschreibung ohne Teilnahmewettbewerb (national)',
 'de-comp-neg-w-call':'Verhandlungsvergabe mit Teilnahmewettbewerb (national)','de-comp-neg-wo-call':'Verhandlungsvergabe ohne Teilnahmewettbewerb (national)',
 'us-open':'Öffentliche Ausschreibung (national)','us-neg-w-call':'Verhandlungsvergabe mit Teilnahmewettbewerb (national)','us-neg-wo-call':'Verhandlungsvergabe ohne Teilnahmewettbewerb (national)','us-free-tw':'Freihändige Vergabe mit Teilnahmewettbewerb (national)'};
const dateTime=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const dateOnly=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',year:'numeric'});
const euro=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const day=s=>s?dateOnly.format(new Date(s.slice(0,10))):'–';
// Inline text from the model or the source must not break the Markdown structure.
// Some source titles carry HTML entities such as &quot;.
const ENTITIES={quot:'"',apos:"'",amp:'&',lt:'<',gt:'>'};
const decode=s=>s.replace(/&(quot|apos|amp|lt|gt|#\d+);/g,(m,e)=>e.startsWith('#')?String.fromCharCode(Number(e.slice(1))):ENTITIES[e]);
const inline=s=>decode(String(s??'')).replace(/\s+/g,' ').replace(/([\\`*_[\]<>|])/g,'\\$1').trim();
export function sha256(text){return createHash('sha256').update(text,'utf8').digest('hex')}
function deadlineLine(facts,now){
 const date=facts.deadline??facts.lots.map(l=>l.participationDeadline).filter(Boolean).sort()[0];
 if(!date)return 'nicht angegeben';
 const kind=facts.deadline?'Angebotsfrist':'Teilnahmefrist';
 const left=Math.ceil((Date.parse(date)-now)/DAY);
 const shown=/T\d\d:/.test(date)?`${dateTime.format(new Date(date))} Uhr`:day(date);
 return `${kind} ${shown} (noch ${left} ${left===1?'Tag':'Tage'})`;
}
const value=v=>v?.amount!=null?(v.currency&&v.currency!=='EUR'?`${v.amount} ${v.currency}`:euro.format(v.amount)):'nicht angegeben';
const bullets=(items,empty)=>items.length?items.map(i=>`- ${inline(i)}`).join('\n'):`- ${empty}`;
function matchSection(n,{facts,judgement},now){
 const b=judgement.blocks;
 return [`### ${n}. ${inline(facts.title)}`,
  `**${VERDICTS[judgement.verdict]}** · ${judgement.total}/100 (Eignung ${b.eignung}/35 · Leistbarkeit ${b.leistbarkeit}/25 · Wirtschaftlichkeit ${b.wirtschaftlichkeit}/25 · Risiko ${b.risiko}/15)`,'',
  `- **Auftraggeber:** ${inline(facts.buyer)}`,
  `- **Frist:** ${deadlineLine(facts,now)}`,
  `- **Geschätzter Wert:** ${value(facts.value)}`,
  `- **Ausführung:** ${facts.lots.map(l=>l.plannedStart?`${day(l.plannedStart)}${l.plannedEnd?` bis ${day(l.plannedEnd)}`:''}`:null).filter(Boolean)[0]??'nicht angegeben'}`,
  `- **Verfahren:** ${PROCEDURES[facts.procedureType]??inline(facts.procedureType??'nicht angegeben')}${facts.lots.length>1?` · ${facts.lots.length} offene Lose`:''}`,
  `- **CPV:** ${facts.cpv.join(', ')} · Stufe ${facts.cpvStage}: ${CPV_STAGES[facts.cpvStage].label}`,
  `- **Ort (NUTS):** ${facts.nuts.join(', ')}`,
  `- **Bekanntmachung:** ${facts.link}`,'',
  ...(judgement.todos.length?['**To-do bis zur Frist**',bullets(judgement.todos,''),'']:[]),
  '**Gründe**',bullets(judgement.reasons,'keine Angabe'),'',
  '**Geforderte Nachweise**',bullets(judgement.proofs,'in der Bekanntmachung nicht genannt, Vergabeunterlagen prüfen'),'',
  '**Risiken**',bullets(judgement.risks,'keine erkannt'),
  ...(judgement.unclear.length?['','**Unklar (Angabe fehlt)**',bullets(judgement.unclear,'')]:[])].join('\n');
}
// Free-text requests: what the agent understood, which defaults it assumed and what stayed open (tender/intake.mjs).
function understanding(pass,{assumptions=[],questions=[]}){
 return ['## So wurde Ihre Anfrage verstanden','',
  `**Firma:** ${inline(pass.company_name??'nicht genannt')} · **Leistung:** ${inline(pass.trade)}${pass.trades?.length>1?` (${pass.trades.map(inline).join(', ')})`:''} · **Region:** Bayern · **Auftragswert:** ${euro.format(pass.min_value_eur)} bis ${euro.format(pass.max_value_eur)} · **Verfügbar ab:** ${day(pass.available_from)}${pass.employees?` · **Team:** ${pass.employees} Personen`:''}`,
  `**Leistungsbeschreibung:** ${inline(pass.service_description)}`,'',
  '**Annahmen**',bullets(assumptions,'keine, alle Angaben stammen aus Ihrer Anfrage'),'',
  ...(questions.length?['**Offene Punkte**',bullets(questions,''),'']:[]),
  '_Korrektur: Antworten Sie im Task mit den geänderten Angaben oder senden Sie einen vollständigen Firmenpass (docs/firmenpass.md)._',''];
}
// T6: only GO and GO MIT AUFLAGE are listed; NO-GO is counted in the exclusion table.
// intake: how the Firmenpass came in. source 'text' adds the understanding block (assumptions and open questions) after the header.
export function renderReport({pass,verified,excluded,coverage,dropped=[],intake,now=Date.now()}){
 const order={go:0,conditional:1,nogo:2};
 const ranked=[...verified].sort((a,b)=>order[a.judgement.verdict]-order[b.judgement.verdict]||b.judgement.total-a.judgement.total);
 const shown=ranked.filter(m=>m.judgement.verdict!=='nogo');
 const count=v=>ranked.filter(m=>m.judgement.verdict===v).length,go=count('go'),conditional=count('conditional'),nogo=count('nogo');
 const lines=['# TenderScout – Ausschreibungs-Shortlist','',
  `**Firma:** ${inline(pass.company_name??pass.trade)} · **Leistung:** ${inline(pass.trade)} (CPV ${pass.cpv_prefixes.join(', ')}) · **Region:** Bayern · **Auftragswert:** ${euro.format(pass.min_value_eur)} bis ${euro.format(pass.max_value_eur)} · **Verfügbar ab:** ${day(pass.available_from)}`,
  `**Datenstand:** Bekanntmachungen vom ${day(coverage.firstDay)} bis ${day(coverage.lastDay)} · **Erstellt:** ${dateTime.format(new Date(now))} Uhr`,'',
  ...(intake?.source==='text'?understanding(pass,intake):[]),
  shown.length?`**Ergebnis:** ${go} GO, ${conditional} GO MIT AUFLAGE. ${ranked.length} Kandidaten geprüft, ${nogo} davon NO-GO (nicht aufgeführt).`
   :`**Ergebnis:** Keine Ausschreibung lohnt sich für Ihren Firmenpass. ${ranked.length} Kandidaten geprüft. Die Liste wird nicht aufgefüllt, die Gründe stehen unten.`,''];
 shown.forEach((m,i)=>lines.push(matchSection(i+1,m,now),''));
 const reasons=Object.entries(excluded).sort((a,b)=>b[1]-a[1]);
 if(nogo)reasons.unshift(['vom Modell als NO-GO bewertet (K.O.-Kriterium oder unter 40 Punkten)',nogo]);
 if(dropped.length)reasons.push(['bei der Gegenprüfung mit der Quelle verworfen',dropped.length]);
 if(reasons.length)lines.push('## Ausgeschlossene Bekanntmachungen','','| Grund | Anzahl |','|---|---|',...reasons.map(([r,n])=>`| ${r} | ${n} |`),'');
 lines.push('---',`_Quelle: Datenservice Öffentlicher Einkauf (oeffentlichevergabe.de), Lizenz CC0. Abdeckung: nur Bayern. Oberhalb der EU-Schwellenwerte ist die Veröffentlichung dort Pflicht, unterhalb ist die Abdeckung lückenhaft; Landes- und Kommunalportale sind nicht enthalten. Fakten stammen aus der Bekanntmachung, Bewertungen vom KI-Modell nach dem TenderScout-Punkteschema (GO ab 70, GO MIT AUFLAGE ab 40 Punkten). Prüfen Sie vor einer Bewerbung die Vergabeunterlagen._`);
 const markdown=lines.join('\n');
 // matches: assessed by the model; verified: passed the source re-check; go/conditional: listed above.
 const footer={sha256:sha256(markdown),matches:ranked.length+dropped.length,verified:ranked.length,go,conditional,source_date:coverage.lastDay};
 return `${markdown}\n\n\`\`\`json\n${JSON.stringify(footer)}\n\`\`\`\n`;
}
