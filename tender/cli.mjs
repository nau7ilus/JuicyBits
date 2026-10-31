import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {placeholder} from './offline.mjs';
import {PassError} from './pass.mjs';
import {renderReport} from './report.mjs';
import {run,scout} from './scout.mjs';
// Local dry run without Sokosumi: npm run scout -- examples/dachdecker.pass.json [--offline] [--pdf]
// --offline replaces the model with a placeholder judgement to check data flow and report layout.
// --pdf also writes the Markdown and a PDF version to .local/report-<timestamp>.{md,pdf} and prints the paths on stderr.
const args=process.argv.slice(2),offline=args.includes('--offline'),pdf=args.includes('--pdf'),file=args.find(a=>!a.startsWith('--'));
if(!file){console.error('Usage: npm run scout -- <firmenpass.json> [--offline] [--pdf]');process.exit(1);}
mkdirSync('.local',{recursive:true,mode:0o700});
const stamp=Date.now(),journal=`.local/cli-${stamp}-session.json`,options=offline?{ask:placeholder}:{};
if(!pdf)process.stdout.write(await scout(readFileSync(file,'utf8'),journal,undefined,options));
else{
 let result;
 try{result=await run(readFileSync(file,'utf8'),journal,undefined,options)}
 catch(e){if(e instanceof PassError){console.error(`Firmenpass ungültig:\n${e.issues.map(i=>`- ${i}`).join('\n')}`);process.exit(1)}throw e}
 const data={...result,dropped:result.rejected,now:Date.now()};
 const markdown=renderReport(data);
 process.stdout.write(markdown);
 const base=`.local/report-${stamp}`;
 writeFileSync(`${base}.md`,markdown,{mode:0o600});
 const {renderPdf}=await import('./pdf.mjs');
 await renderPdf({...data,markdownResult:markdown},`${base}.pdf`);
 console.error(`\nMarkdown: ${base}.md\nPDF: ${base}.pdf`);
}
