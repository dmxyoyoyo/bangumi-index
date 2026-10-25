import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {appendFile} from 'node:fs/promises';
import {root,readJson,saveCatalog,today} from './shared.mjs';
const offline=process.argv.includes('--offline');
const stages=[...(offline?[]:[['update.mjs'],['refresh-cn.mjs']]),['episode-evidence.mjs',...(offline?['--offline']:[])],['enrich.mjs',...(offline?['--offline']:[])],['diagnose.mjs'],['enrich.mjs','--offline'],['gamer.mjs',...(offline?['--offline']:[])],['bilibili.mjs',...(offline?['--offline']:[])],['check.mjs']];
let skipChinese=false;
for(const [file,...flags] of stages){if(skipChinese&&['episode-evidence.mjs','bilibili.mjs'].includes(file))flags.push('--skip-chinese');const args=[fileURLToPath(new URL(file,import.meta.url)),...flags];const result=spawnSync(process.execPath,args,{cwd:fileURLToPath(root),stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);if(file==='refresh-cn.mjs')skipChinese=(await readJson('data/cn-discovery.json')).refreshStatus==='cached';}
const c=await readJson('dist/catalog.json');
const cachedSources=[];
if(!offline){
 if(skipChinese)cachedSources.push('中国版 ID 补查');
 if((await readJson('dist/bilibili-catalog.json')).meta.refreshStatus==='cached')cachedSources.push('哔哩哔哩国区目录');
 c.meta.lastRefreshAttempt=new Date().toISOString();c.meta.refreshStatus=cachedSources.length?'partial':'updated';c.meta.cachedSources=cachedSources;
 if(!cachedSources.length)c.meta.lastSuccessfulRefresh=c.meta.lastRefreshAttempt;
 c.meta.updatedAt=today();await saveCatalog(c);
 if(cachedSources.length)console.warn('::warning::本轮已通过数据检查，但以下来源沿用缓存：'+cachedSources.join('、')+'。未改写上次完整更新时间。');
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'## 番剧目录更新结果\n\n'+(cachedSources.length?'本轮部分更新成功，以下来源沿用上次数据：'+cachedSources.join('、')+'。下次定时任务会继续尝试。':'三个平台的必需来源均已更新并通过数据检查。')+'\n\n东南亚记录：'+c.items.length+'；已核实 ID：'+c.items.filter(x=>x.cnId).length+'。\n\n上次完整更新：'+(c.meta.lastSuccessfulRefresh||'尚未完整成功')+'。\n\n部署结果请查看后续发布和域名核对步骤。\n');
}
console.log(JSON.stringify({phase:'refresh-complete',mode:offline?'cached-data-validation':cachedSources.length?'partial-source-update':'live-source-update',cachedSources,records:c.items.length,mapped:c.items.filter(x=>x.cnId).length}));
