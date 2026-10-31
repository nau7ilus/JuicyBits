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
// plain: decoded single-line text for the PDF; inline: the same with Markdown escaping.
export const plain=s=>decode(String(s??'')).replace(/\s+/g,' ').trim();
const inline=s=>plain(s).replace(/([\\`*_[\]<>|])/g,'\\$1');
export function sha256(text){return createHash('sha256').update(text,'utf8').digest('hex')}
// Facts shared by the Markdown and the PDF renderer (tender/pdf.mjs).
export const procedure=facts=>PROCEDURES[facts.procedureType]??plain(facts.procedureType??'nicht angegeben');
export const execution=facts=>facts.lots.map(l=>l.plannedStart?`${day(l.plannedStart)}${l.plannedEnd?` bis ${day(l.plannedEnd)}`:''}`:null).filter(Boolean)[0]??'nicht angegeben';
export const deadlineOf=facts=>facts.deadline??facts.lots.map(l=>l.participationDeadline).filter(Boolean).sort()[0];
const daysLeft=(date,now)=>{const left=Math.ceil((Date.parse(date)-now)/DAY);return `noch ${left} ${left===1?'Tag':'Tage'}`};
export function deadlineLine(facts,now){
 const date=deadlineOf(facts);
 if(!date)return 'nicht angegeben';
 const kind=facts.deadline?'Angebotsfrist':'Teilnahmefrist';
 const shown=/T\d\d:/.test(date)?`${dateTime.format(new Date(date))} Uhr`:day(date);
 return `${kind} ${shown} (${daysLeft(date,now)})`;
}
// Compact form for the overview table: date and days left only.
export const deadlineShort=(facts,now)=>{const date=deadlineOf(facts);return date?`${day(date)} (${daysLeft(date,now)})`:'nicht angegeben'};
export const value=v=>v?.amount!=null?(v.currency&&v.currency!=='EUR'?`${v.amount} ${v.currency}`:euro.format(v.amount)):'nicht angegeben';
export const formatDay=day,formatDateTime=d=>`${dateTime.format(new Date(d))} Uhr`,formatEuro=n=>euro.format(n);
export const shorten=(s,max=45)=>{s=plain(s);return s.length>max?`${s.slice(0,max-1).trimEnd()}…`:s};
// T6 blocks with their maximum points, in report order.
export const BLOCKS=[['eignung','Eignung',35],['leistbarkeit','Leistbarkeit',25],['wirtschaftlichkeit','Wirtschaftlichkeit',25],['risiko','Risiko',15]];
// Text progress bar with 10 Unicode blocks, filled = round(value/max*10). Sokosumi renders plain Markdown, no HTML.
export const bar=(v,max=100)=>{const f=Math.max(0,Math.min(10,Math.round(v/max*10)));return '█'.repeat(f)+'░'.repeat(10-f)};
const DOTS={go:'🟢',conditional:'🟡',nogo:'🔴'};
const verdictLabel=v=>`${DOTS[v]} ${VERDICTS[v]}`;
const bullets=(items,empty)=>items.length?items.map(i=>`- ${inline(i)}`).join('\n'):`- ${empty}`;
// The four T6 blocks as mini bars in a code block so the columns stay aligned in any Markdown renderer.
const blockBars=b=>['```',...BLOCKS.map(([key,label,max])=>`${label.padEnd(18)} ${bar(b[key],max)} ${String(b[key]).padStart(2)}/${max}`),'```'].join('\n');
function matchSection(n,{facts,judgement},now){
 const b=judgement.blocks;
 return [`### ${n}. ${inline(facts.title)}`,
  `**${verdictLabel(judgement.verdict)}** · ${bar(judgement.total)} ${judgement.total}/100`,'',blockBars(b),'',
  `- **Auftraggeber:** ${inline(facts.buyer)}`,
  `- **Frist:** ${deadlineLine(facts,now)}`,
  `- **Geschätzter Wert:** ${value(facts.value)}`,
  `- **Ausführung:** ${execution(facts)}`,
  `- **Verfahren:** ${inline(procedure(facts))}${facts.lots.length>1?` · ${facts.lots.length} offene Lose`:''}`,
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
export const TITLE='JuicyBids';
export const SOURCE_NOTE='Quelle: Datenservice Öffentlicher Einkauf (oeffentlichevergabe.de), Lizenz CC0. Abdeckung: nur Bayern. Oberhalb der EU-Schwellenwerte ist die Veröffentlichung dort Pflicht, unterhalb ist die Abdeckung lückenhaft; Landes- und Kommunalportale sind nicht enthalten. Fakten stammen aus der Bekanntmachung, Bewertungen vom KI-Modell nach dem JuicyBids-Punkteschema (GO ab 70, GO MIT AUFLAGE ab 40 Punkten). Prüfen Sie vor einer Bewerbung die Vergabeunterlagen.';
export const SCORING={lead:'4 Blöcke, 100 Punkte, ein ehrliches Urteil.',blocks:BLOCKS.map(([,label,max])=>`${label} ${max}`).join(' · '),
 thresholds:'GO ab 70, GO MIT AUFLAGE 40–69, NO-GO darunter.',rule:'Ein fehlender Nachweis ist kein K.O. Wir zählen ihn als Auflage, kein Treffer wird erfunden.'};
export const PAYMENT={badge:'BEZAHLT AUF CARDANO',meta:'1 tUSDM · Beleg: Ergebnis-Hash on-chain · SHA-256 im Fuß'};
const n=(k,one,many)=>`${k} ${k===1?one:many}`;
// Everything the dashboard (Markdown and PDF) shows above the detail sections: counts, headline, profile strip, result rows, exclusion reasons.
// Facts in rows come from the notice; sub (first reason) and todo (first to-do) come from the model's judgement.
export function summarize({pass,verified,excluded={},dropped=[],coverage={},now=Date.now()}){
 const order={go:0,conditional:1,nogo:2};
 const ranked=[...verified].sort((a,b)=>order[a.judgement.verdict]-order[b.judgement.verdict]||b.judgement.total-a.judgement.total);
 const shown=ranked.filter(m=>m.judgement.verdict!=='nogo');
 const count=v=>ranked.filter(m=>m.judgement.verdict===v).length,go=count('go'),conditional=count('conditional'),nogo=count('nogo');
 const prefiltered=Object.values(excluded).reduce((s,v)=>s+v,0),assessed=ranked.length+dropped.length,sorted=nogo+dropped.length; // of the assessed notices; the prefilter count is in the summary line
 const headline=shown.length?`${n(shown.length,'Ausschreibung','Ausschreibungen')}, die Sie realistisch gewinnen können.`:'Keine Ausschreibung, die sich für Sie lohnt.';
 const subline=`${n(assessed,'neue Bekanntmachung passte','neue Bekanntmachungen passten')} zu Ihrem Gewerk und Ihrer Region. Wir haben jede gegen Ihren Firmenpass geprüft und ${sorted} aussortiert.`;
 const reasons=Object.entries(excluded).sort((a,b)=>b[1]-a[1]);
 if(nogo)reasons.unshift(['vom Modell als NO-GO bewertet (K.O.-Kriterium oder unter 40 Punkten)',nogo]);
 if(dropped.length)reasons.push(['bei der Gegenprüfung mit der Quelle verworfen',dropped.length]);
 const proofs=[...(pass.certifications??[]),...(pass.licenses??[])].map(plain);
 const profile=[['Gewerk',plain(pass.trade)],['Region',`Bayern${pass.home_location?` · ${plain(pass.home_location)}`:''}`],['Auftragsgröße',`${euro.format(pass.min_value_eur).replace(/\s?€$/,'')}–${euro.format(pass.max_value_eur)}`],
  ['Frei ab',day(pass.available_from)],['Nachweise',proofs.length?proofs.join(', '):'keine angegeben']];
 const rows=shown.map((m,i)=>({rank:i+1,title:plain(m.facts.title),sub:[shorten(m.facts.buyer,50),m.facts.nuts.slice(0,3).join(', ')+(m.facts.nuts.length>3?' …':''),shorten(m.judgement.reasons[0]??'',90)].filter(Boolean).join(' · '),
  todo:m.judgement.todos.length?shorten(m.judgement.todos[0],90):'Keine Auflage',deadline:deadlineShort(m.facts,now),value:m.facts.value?.amount!=null?value(m.facts.value):'–',
  verdict:m.judgement.verdict,total:m.judgement.total,link:m.facts.link}));
 const nogoTitle=`${n(nogo,'Ausschreibung ist','Ausschreibungen sind')} NO-GO. Darum.`;
 const summaryLine=`GO ${go} · GO MIT AUFLAGE ${conditional} · NO-GO ${nogo} · ${prefiltered} im Vorfilter aussortiert`;
 const meta={pass:`FIRMENPASS: ${plain(pass.trade)} · Bayern`,result:`SEARCH RESULT · ${dateTime.format(new Date(now))} Uhr`,
  data:`Datenstand: Bekanntmachungen vom ${day(coverage.firstDay)} bis ${day(coverage.lastDay)}`};
 return {ranked,shown,go,conditional,nogo,prefiltered,assessed,headline,subline,reasons,profile,rows,nogoTitle,summaryLine,meta};
}
const cell=s=>inline(s);
function dashboard(s){
 const lines=[`# ${TITLE}`,'',`\`${s.meta.pass}\` · \`${s.meta.result}\` · \`${s.meta.data}\``,'',`## ${s.headline}`,'',s.subline,'',
  `| ${s.profile.map(([k])=>k.toUpperCase()).join(' | ')} |`,`|${s.profile.map(()=>'---').join('|')}|`,`| ${s.profile.map(([,v])=>cell(v)).join(' | ')} |`,'',
  `**■ ${PAYMENT.badge}** · \`${PAYMENT.meta}\``,''];
 if(s.rows.length)lines.push('| # | AUSSCHREIBUNG | FRIST | WERT | ERGEBNIS | PUNKTE | |','|---|---|---|---|---|---|---|',
  ...s.rows.map(r=>`| ${r.rank} | **${cell(r.title)}** — ${cell(r.sub)} — ▸ ${cell(r.todo)} | ${r.deadline} | ${cell(r.value)} | ${verdictLabel(r.verdict)} | ${bar(r.total)} ${r.total} % | [Öffnen](${r.link}) |`),'');
 lines.push(`\`${s.summaryLine}\``,'');
 if(s.reasons.length)lines.push(`## ${s.nogoTitle}`,'','| Grund | Anzahl |','|---|---|',...s.reasons.slice(0,6).map(([r,k])=>`| ${r} | ${k} |`),'');
 lines.push('## So entsteht die Punktzahl.','',`**${SCORING.lead}**`,'',`\`${SCORING.blocks}\``,'',SCORING.thresholds,SCORING.rule,'');
 return lines;
}
// pdfUrl: public link to the PDF twin of this report (tender/delivery.mjs); shown right under the payment line.
export function renderReport({pass,verified,excluded,coverage,dropped=[],intake,now=Date.now(),pdfUrl}){
 const s=summarize({pass,verified,excluded,dropped,coverage,now}),{ranked,shown,go,conditional}=s;
 const lines=dashboard(s);
 if(pdfUrl){const at=lines.findIndex(l=>l.includes(PAYMENT.badge));lines.splice(at+1,0,'',`**📄 [Bericht als PDF herunterladen](${pdfUrl})**`);}
 if(shown.length)lines.push('## Treffer im Detail','');
 shown.forEach((m,i)=>lines.push(matchSection(i+1,m,now),''));
 if(intake?.source==='text')lines.push(...understanding(pass,intake));
 lines.push('---',`_${SOURCE_NOTE}_`);
 const markdown=lines.join('\n');
 // matches: assessed by the model; verified: passed the source re-check; go/conditional: listed above.
 const footer={sha256:sha256(markdown),matches:ranked.length+dropped.length,verified:ranked.length,go,conditional,source_date:coverage.lastDay};
 return `${markdown}\n\n\`\`\`json\n${JSON.stringify(footer)}\n\`\`\`\n`;
}
