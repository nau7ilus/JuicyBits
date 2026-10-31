import {existsSync,mkdirSync} from 'node:fs';
import {renderReport} from './report.mjs';
// Delivers the report as Markdown plus a PDF link. Sokosumi and MIP-003 accept only a text result, so the PDF is
// written to .local/reports/<id>.pdf and served read-only by agent-api.mjs under AGENT_PUBLIC_URL/reports/<id>.pdf.
// The id is a random UUID (MIP-003 job id or Sokosumi task id), so the link cannot be guessed.
export const REPORTS_DIR='.local/reports';
export const REPORT_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Public link for a report id, or null without AGENT_PUBLIC_URL or with an unsafe id. */
export function pdfUrl(id,base=process.env.AGENT_PUBLIC_URL){
 const root=base?.trim().replace(/\/+$/,'');
 return root&&REPORT_ID.test(String(id))?`${root}/reports/${id}.pdf`:null;
}
/** Local file for a report id, or null for an unsafe id. */
export function pdfPath(id){return REPORT_ID.test(String(id))?`${REPORTS_DIR}/${id}.pdf`:null;}

/** Renders the Markdown report with a PDF link and writes the PDF. If the PDF fails, returns the report without the link,
 *  so a paid job never delivers a dead link and never fails because of the PDF. */
export async function deliver(data,id,{base=process.env.AGENT_PUBLIC_URL,render}={}){
 const url=pdfUrl(id,base),path=pdfPath(id);
 if(!url||!path)return renderReport(data);
 const markdown=renderReport({...data,pdfUrl:url});
 try{
  mkdirSync(REPORTS_DIR,{recursive:true,mode:0o700});
  const renderPdf=render??(await import('./pdf.mjs')).renderPdf;
  await renderPdf({...data,markdownResult:markdown},path);
  if(!existsSync(path))throw new Error('PDF not written');
  return markdown;
 }catch(e){
  console.error('PDF not delivered',id,e.message.slice(0,160));
  return renderReport(data);
 }
}
