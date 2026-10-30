import {mkdirSync,readFileSync} from 'node:fs';
import {placeholder} from './offline.mjs';
import {scout} from './scout.mjs';
// Local dry run without Sokosumi: npm run scout -- examples/dachdecker.pass.json [--offline]
// --offline replaces the model with a placeholder judgement to check data flow and report layout.
const args=process.argv.slice(2),offline=args.includes('--offline'),file=args.find(a=>!a.startsWith('--'));
if(!file){console.error('Usage: npm run scout -- <firmenpass.json> [--offline]');process.exit(1);}
mkdirSync('.local',{recursive:true,mode:0o700});
process.stdout.write(await scout(readFileSync(file,'utf8'),`.local/cli-${Date.now()}-session.json`,undefined,offline?{ask:placeholder}:{}));
