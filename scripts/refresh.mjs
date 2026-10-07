import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {root,readJson,saveCatalog,today} from './shared.mjs';
const offline=process.argv.includes('--offline');
const stages=[...(offline?[]:[['update.mjs'],['refresh-cn.mjs']]),['enrich.mjs',...(offline?['--offline']:[])],['diagnose.mjs'],['enrich.mjs','--offline'],['gamer.mjs',...(offline?['--offline']:[])],['check.mjs']];
for(const [file,...flags] of stages){const args=[fileURLToPath(new URL(file,import.meta.url)),...flags];const result=spawnSync(process.execPath,args,{cwd:fileURLToPath(root),stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
const c=await readJson('dist/catalog.json');
if(!offline){c.meta.lastSuccessfulRefresh=new Date().toISOString();c.meta.updatedAt=today();await saveCatalog(c);}
console.log(JSON.stringify({phase:'refresh-complete',mode:offline?'cached-data-validation':'live-source-update',records:c.items.length,mapped:c.items.filter(x=>x.cnId).length}));
