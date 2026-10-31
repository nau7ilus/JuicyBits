import {createWriteStream} from 'node:fs';
import PDFDocument from 'pdfkit';
import {VERDICTS} from './assess.mjs';
import {CPV_STAGES} from './prefilter.mjs';
import {BLOCKS,PAYMENT,SCORING,SOURCE_NOTE,TITLE,deadlineLine,execution,plain,procedure,sha256,summarize,value} from './report.mjs';
// PDF version of the German report (pure JS, pdfkit, built-in Helvetica and Courier). Page 1 is the dashboard, the detail sections follow.
// Facts come from source data, judgement from the model, exactly as in report.mjs; the footer carries the SHA-256 of the Markdown report.
// No emoji: the standard fonts are WinAnsi (umlauts and euro sign work); badges and dots are drawn shapes. Green and amber only for badges and bars.
const C={ink:'#111111',muted:'#6b6b6b',rule:'#d9d9d9',track:'#ececec',go:'#1f8a4c',amber:'#c98a00',amberBg:'#fdf6e7',link:'#1a4d8f'};
const MARGIN=48,PAGE_W=595.28,WIDTH=PAGE_W-2*MARGIN; // A4
const SANS='Helvetica',BOLD='Helvetica-Bold',MONO='Courier',MONO_BOLD='Courier-Bold';
// Results table columns: [label, width]. Sum = WIDTH.
const COLS=[['#',16],['AUSSCHREIBUNG',221],['FRIST',58],['WERT',56],['ERGEBNIS',62],['PUNKTE',56],['',30]];
export function renderPdf({markdownResult,pass,verified,excluded,coverage,dropped=[],intake,now=Date.now()},outPath){
 const s=summarize({pass,verified,excluded,dropped,coverage,now}),{shown}=s;
 const doc=new PDFDocument({size:'A4',margin:MARGIN,info:{Title:`${TITLE} – Ausschreibungs-Shortlist`,Author:TITLE,Subject:plain(pass.company_name??pass.trade)}});
 const done=new Promise((resolve,reject)=>{const out=createWriteStream(outPath,{mode:0o600});out.on('finish',()=>resolve(outPath));out.on('error',reject);doc.pipe(out)});
 const bottom=()=>doc.page.height-MARGIN;
 const ensure=h=>{if(doc.y+h>bottom())doc.addPage()};
 const rule=(y,color=C.rule,w=0.5,x=MARGIN,len=WIDTH)=>doc.save().moveTo(x,y).lineTo(x+len,y).strokeColor(color).lineWidth(w).stroke().restore();
 const mono=(t,x,y,o={})=>doc.font(MONO).fontSize(7).fillColor(C.muted).text(t.toUpperCase(),x,y,o);
 const text=(t,o={})=>doc.text(plain(t),{width:WIDTH,...o});
 const colorOf=v=>v==='go'?C.go:C.amber;
 const drawBar=(x,y,w,h,v,max,color)=>{doc.save().rect(x,y,w,h).fill(C.track);if(v>0)doc.rect(x,y,Math.max(1,w*Math.min(1,v/max)),h).fill(color);doc.restore()};
 // Verdict badge: GO = filled black, GO MIT AUFLAGE = amber outline.
 const badge=(verdict,x,y,w)=>{const h=13,label=VERDICTS[verdict];doc.save();
  if(verdict==='go'){doc.roundedRect(x,y,w,h,2).fill(C.ink);doc.font(BOLD).fontSize(7).fillColor('#ffffff')}
  else{doc.roundedRect(x+0.5,y+0.5,w-1,h-1,2).lineWidth(0.8).strokeColor(C.amber).stroke();doc.font(BOLD).fontSize(6).fillColor(C.amber)}
  doc.text(label,x,y+(verdict==='go'?3.5:4),{width:w,align:'center',lineBreak:false});doc.restore()};
 // 1. Top bar
 doc.font(BOLD).fontSize(15).fillColor(C.ink).text(TITLE,MARGIN,MARGIN);
 doc.font(MONO).fontSize(7).fillColor(C.ink).text(s.meta.pass.toUpperCase(),MARGIN+200,MARGIN+1,{width:WIDTH-200,align:'right'});
 mono(s.meta.result,MARGIN+200,MARGIN+11,{width:WIDTH-200,align:'right'});
 rule(MARGIN+26,C.ink,0.8);doc.x=MARGIN;doc.y=MARGIN+40;
 // 2. Headline
 doc.font(BOLD).fontSize(21).fillColor(C.ink);text(s.headline,{lineGap:-1});
 doc.moveDown(0.35).font(SANS).fontSize(9.5).fillColor(C.muted);text(s.subline,{width:WIDTH*0.85});
 // 3. Profile strip
 doc.moveDown(0.9);let y=doc.y;rule(y);y+=8;
 const colW=WIDTH/s.profile.length;
 doc.font(SANS).fontSize(8.5);const valueH=Math.max(...s.profile.map(([,v])=>doc.heightOfString(plain(v),{width:colW-10})));
 s.profile.forEach(([k,v],i)=>{const x=MARGIN+i*colW;mono(k,x,y,{width:colW-10});doc.font(SANS).fontSize(8.5).fillColor(C.ink).text(plain(v),x,y+11,{width:colW-10})});
 y+=11+valueH+8;rule(y);doc.y=y+10;
 // 4. Payment badge line
 y=doc.y;doc.save().rect(MARGIN,y+1.5,6,6).fill(C.ink).restore();
 doc.font(BOLD).fontSize(7.5).fillColor(C.ink).text(PAYMENT.badge,MARGIN+10,y,{continued:true,lineBreak:false});
 doc.font(MONO).fontSize(7).fillColor(C.muted).text(`   ${PAYMENT.meta}`,{lineBreak:false});
 doc.x=MARGIN;doc.y=y+22;
 // 5. Results table
 if(s.rows.length){
  const header=()=>{const hy=doc.y;let x=MARGIN;COLS.forEach(([label,w])=>{if(label)mono(label,x+2,hy,{width:w-4});x+=w});rule(hy+11,C.ink,0.6);doc.y=hy+15};
  header();
  for(const r of s.rows){
   const [,tw]=COLS[1],inner=tw-6;
   doc.font(BOLD).fontSize(8.5);const h1=doc.heightOfString(r.title,{width:inner});
   doc.font(SANS).fontSize(7);const h2=doc.heightOfString(r.sub,{width:inner}),h3=doc.heightOfString(r.todo,{width:inner-8});
   const h=Math.max(30,h1+h2+h3+10);
   if(doc.y+h>bottom()){doc.addPage();header()}
   const ry=doc.y;let x=MARGIN;
   if(r.verdict==='conditional')doc.save().rect(MARGIN,ry,WIDTH,h).fill(C.amberBg).restore();
   doc.font(SANS).fontSize(8).fillColor(C.muted).text(String(r.rank),x+2,ry+4,{width:COLS[0][1]-4});x+=COLS[0][1];
   doc.font(BOLD).fontSize(8.5).fillColor(C.ink).text(r.title,x+3,ry+4,{width:inner});
   doc.font(SANS).fontSize(7).fillColor(C.muted).text(r.sub,x+3,ry+4+h1+1,{width:inner});
   doc.save().rect(x+3,ry+4+h1+h2+3.5,3,3).fill(r.verdict==='go'?C.go:C.amber).restore();
   doc.font(SANS).fontSize(7).fillColor(C.ink).text(r.todo,x+11,ry+4+h1+h2+1,{width:inner-8});x+=tw;
   doc.font(SANS).fontSize(7.5).fillColor(C.ink).text(r.deadline,x+2,ry+4,{width:COLS[2][1]-4});x+=COLS[2][1];
   doc.text(r.value,x+2,ry+4,{width:COLS[3][1]-4});x+=COLS[3][1];
   badge(r.verdict,x+2,ry+3,COLS[4][1]-8);x+=COLS[4][1];
   drawBar(x+2,ry+6,COLS[5][1]-26,7,r.total,100,colorOf(r.verdict));doc.font(BOLD).fontSize(7.5).fillColor(C.ink).text(`${r.total} %`,x+COLS[5][1]-24,ry+4,{width:22,align:'right'});x+=COLS[5][1];
   doc.font(SANS).fontSize(7.5).fillColor(C.link).text('Öffnen',x+2,ry+4,{width:COLS[6][1]-4,link:r.link,underline:true});
   rule(ry+h);doc.y=ry+h;
  }
  doc.x=MARGIN;
 }
 // 6. Summary line
 ensure(230);doc.y+=8;mono(s.summaryLine,MARGIN,doc.y,{width:WIDTH});doc.y+=18;
 // 7. Two boxes: NO-GO reasons and scoring
 const boxW=(WIDTH-12)/2,pad=10,top=doc.y;
 const boxHeights=[];
 const box=(x,body)=>{doc.y=top+pad;doc.x=x+pad;body(x+pad,boxW-2*pad);boxHeights.push(doc.y-top+pad)};
 box(MARGIN,(x,w)=>{
  doc.font(BOLD).fontSize(11).fillColor(C.ink).text(s.nogoTitle,x,doc.y,{width:w});doc.y+=6;
  doc.font(SANS).fontSize(8);
  const rows=s.reasons.slice(0,6);if(!rows.length)doc.fillColor(C.muted).text('Keine Bekanntmachung wurde aussortiert.',x,doc.y,{width:w});
  for(const [r,k] of rows){const ry=doc.y,rh=doc.heightOfString(plain(r),{width:w-36});doc.fillColor(C.ink).text(plain(r),x,ry,{width:w-36});doc.font(MONO_BOLD).fontSize(8).text(String(k),x+w-30,ry,{width:30,align:'right'});doc.font(SANS).fontSize(8);doc.y=ry+rh+3}
 });
 box(MARGIN+boxW+12,(x,w)=>{
  doc.font(BOLD).fontSize(11).fillColor(C.ink).text('So entsteht die Punktzahl.',x,doc.y,{width:w});doc.y+=4;
  doc.font(SANS).fontSize(8.5).fillColor(C.ink).text(SCORING.lead,x,doc.y,{width:w});doc.y+=6;
  for(const [,label,max] of BLOCKS){const ry=doc.y;mono(label,x,ry+1,{width:90});drawBar(x+92,ry+1,w-92-26,6,max,35,C.ink);doc.font(MONO).fontSize(7).fillColor(C.ink).text(String(max),x+w-22,ry,{width:22,align:'right'});doc.y=ry+12}
  doc.y+=4;doc.font(SANS).fontSize(8).fillColor(C.ink).text(SCORING.thresholds,x,doc.y,{width:w});doc.y+=2;doc.fillColor(C.muted).text(SCORING.rule,x,doc.y,{width:w});
 });
 const boxH=Math.max(...boxHeights);
 doc.save().rect(MARGIN,top,boxW,boxH).lineWidth(0.5).strokeColor(C.rule).stroke().rect(MARGIN+boxW+12,top,boxW,boxH).stroke().restore();
 doc.x=MARGIN;doc.y=top+boxH;
 // 8. Detail sections, one per match
 const label=t=>{ensure(24);doc.font(BOLD).fontSize(9).fillColor(C.ink);text(t);doc.font(SANS)};
 const bullets=(items,empty)=>{doc.font(SANS).fontSize(9).fillColor(C.ink);const list=items.length?items:[empty];
  for(const i of list){const t=plain(i);ensure(doc.heightOfString(t,{width:WIDTH-12})+2);doc.text('–',MARGIN,doc.y,{width:8});doc.moveUp();doc.text(t,MARGIN+12,doc.y,{width:WIDTH-12})}
  doc.x=MARGIN;doc.moveDown(0.4)};
 if(shown.length){doc.addPage();doc.font(BOLD).fontSize(15).fillColor(C.ink);text('Treffer im Detail');rule(doc.y+4,C.ink,0.8);doc.y+=12}
 shown.forEach((m,i)=>{
  const {facts,judgement:j}=m,color=colorOf(j.verdict);
  ensure(130);
  doc.moveDown(0.5).font(BOLD).fontSize(11).fillColor(C.ink);text(`${i+1}. ${facts.title}`);
  let y=doc.y+3;
  badge(j.verdict,MARGIN,y,74);
  drawBar(MARGIN+84,y+3,120,7,j.total,100,color);
  doc.font(BOLD).fontSize(9).fillColor(C.ink).text(`${j.total}/100`,MARGIN+210,y+2,{width:60});
  y+=20;
  for(const [key,name,max] of BLOCKS){
   mono(name,MARGIN,y+1,{width:84});
   drawBar(MARGIN+84,y+1,120,5,j.blocks[key],max,C.muted);
   doc.font(SANS).fontSize(7.5).fillColor(C.ink).text(`${j.blocks[key]}/${max}`,MARGIN+210,y,{width:40});
   y+=11;
  }
  doc.x=MARGIN;doc.y=y+6;
  const facts_=[['Auftraggeber',facts.buyer],['Frist',deadlineLine(facts,now)],['Geschätzter Wert',value(facts.value)],['Ausführung',execution(facts)],
   ['Verfahren',`${procedure(facts)}${facts.lots.length>1?` · ${facts.lots.length} offene Lose`:''}`],['CPV',`${facts.cpv.join(', ')} · Stufe ${facts.cpvStage}: ${CPV_STAGES[facts.cpvStage].label}`],['Ort (NUTS)',facts.nuts.join(', ')]];
  doc.fontSize(9);
  for(const [k,v] of facts_){ensure(14);doc.font(BOLD).fillColor(C.ink).text(`${k}: `,MARGIN,doc.y,{continued:true,width:WIDTH});doc.font(SANS).text(plain(v),{width:WIDTH})}
  ensure(14);doc.font(BOLD).text('Bekanntmachung: ',MARGIN,doc.y,{continued:true,width:WIDTH});doc.font(SANS).fillColor(C.link).text(facts.link,{link:facts.link,underline:true,width:WIDTH});doc.fillColor(C.ink);
  doc.moveDown(0.5);
  if(j.todos.length){label('To-do bis zur Frist');bullets(j.todos,'')}
  label('Gründe');bullets(j.reasons,'keine Angabe');
  label('Geforderte Nachweise');bullets(j.proofs,'in der Bekanntmachung nicht genannt, Vergabeunterlagen prüfen');
  label('Risiken');bullets(j.risks,'keine erkannt');
  if(j.unclear.length){label('Unklar (Angabe fehlt)');bullets(j.unclear,'')}
  if(i<shown.length-1){ensure(10);rule(doc.y)}
 });
 // Understanding block for free-text requests
 if(intake?.source==='text'){
  ensure(80);doc.moveDown(1).font(BOLD).fontSize(11).fillColor(C.ink);text('So wurde Ihre Anfrage verstanden');doc.moveDown(0.3);
  doc.font(SANS).fontSize(9).fillColor(C.ink);text(`Leistungsbeschreibung: ${pass.service_description}`);doc.moveDown(0.3);
  label('Annahmen');bullets(intake.assumptions??[],'keine, alle Angaben stammen aus Ihrer Anfrage');
  if(intake.questions?.length){label('Offene Punkte');bullets(intake.questions,'')}
 }
 // Footer: source and coverage note, hash of the Markdown report
 ensure(80);
 doc.moveDown(0.8);rule(doc.y);
 doc.moveDown(0.4).font(SANS).fontSize(7.5).fillColor(C.muted);text(SOURCE_NOTE);text(s.meta.data);
 if(markdownResult){const md=markdownResult.slice(0,markdownResult.lastIndexOf('\n\n```json'));doc.moveDown(0.3);doc.font(MONO).fontSize(7);text(`SHA-256 des Markdown-Berichts: ${sha256(md)}`)}
 doc.end();
 return done;
}
