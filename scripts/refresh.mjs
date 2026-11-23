import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {appendFile} from 'node:fs/promises';
import {root,readJson,saveCatalog,today} from './shared.mjs';
const offline=process.argv.includes('--offline');
const run=(file,...flags)=>new Promise(resolve=>{
 const args=[fileURLToPath(new URL(file,import.meta.url)),...flags];
 const child=spawn(process.execPath,args,{cwd:fileURLToPath(root),stdio:'inherit'});
 child.on('exit',code=>resolve(code??1));
 child.on('error',error=>{console.error(error.message);resolve(1);});
});
function requireSuccess(...codes){
 const failed=codes.find(code=>code!==0);
 if(failed)process.exit(failed);
}
let cnDiscovery={},episodeEvidence={};
if(!offline){
 requireSuccess(await run('update.mjs'));
 requireSuccess(...await Promise.all([
  run('refresh-cn.mjs'),
  run('episode-evidence.mjs','--international-only')
 ]));
 cnDiscovery=await readJson('data/cn-discovery.json');
 requireSuccess(await run('episode-evidence.mjs','--chinese-only',...(cnDiscovery.refreshStatus==='cached'?['--skip-chinese']:[])));
 episodeEvidence=await readJson('data/mapping-episodes.json',{});
}
const skipChinese=cnDiscovery.refreshStatus==='cached';
const platformFlags=offline?['--offline']:[];
for(const [file,...flags] of [
 ['enrich.mjs',...platformFlags],['diagnose.mjs'],['enrich.mjs','--offline'],
 ['gamer.mjs',...platformFlags],['bilibili.mjs',...platformFlags,...(skipChinese?['--skip-chinese']:[])],['check.mjs'],
])requireSuccess(await run(file,...flags));
const c=await readJson('dist/catalog.json');
const cachedSources=[];
if(!offline){
 if(skipChinese)cachedSources.push('中国版 ID 补查');
 if(episodeEvidence.intlContentReview?.warning)cachedSources.push('东南亚国际版分集检查');
 if((await readJson('dist/bilibili-catalog.json')).meta.refreshStatus==='cached')cachedSources.push('哔哩哔哩国区目录');
 c.meta.lastRefreshAttempt=new Date().toISOString();c.meta.refreshStatus=cachedSources.length?'partial':'updated';c.meta.cachedSources=cachedSources;
 if(!cachedSources.length)c.meta.lastSuccessfulRefresh=c.meta.lastRefreshAttempt;
 c.meta.updatedAt=today();await saveCatalog(c);
 if(cachedSources.length)console.warn('::warning::本轮已通过数据检查，但以下来源沿用缓存：'+cachedSources.join('、')+'。未改写上次完整更新时间。');
 if(process.env.GITHUB_STEP_SUMMARY){
  let summary='## 番剧目录更新结果\n\n'+(cachedSources.length?'本轮部分更新成功，以下来源沿用上次数据：'+cachedSources.join('、')+'。下次定时任务会继续尝试。':'三个平台的必需来源均已更新并通过数据检查。')+'\n\n东南亚记录：'+c.items.length+'；已核实 ID：'+c.items.filter(x=>x.cnId).length+'。\n';
  const reviews=[['国际版','intlId',episodeEvidence.intlContentReview],['国区','cnId',cnDiscovery.contentReview]];
  for(const [label,key,review] of reviews){
   if(!review)continue;
   const titles=new Map(c.items.map(item=>[item[key],item.title]));
   summary+='\n### 东南亚条目'+label+'内容复查\n\n'+
    '今日已检查 '+review.attempted+'/'+review.total+' 个 ID，有效返回 '+review.verified+' 个。本轮发现 '+review.changes.length+' 个旧 ID 新增正片或预告。\n';
   for(const {id,episodes,previews} of review.changes){
    const title=titles.get(id)?.replace(/\s+/g,' ').replace(/[\\[\]<>]/g,'\\$&')||'番剧';
    const adds=[episodes?'正片 '+episodes+' 集':'',previews?'预告 '+previews+' 条':''].filter(Boolean).join('、');
    summary+='- '+title+'（'+(key==='cnId'?'ss':'')+id+'）新增'+adds+'\n';
   }
  }
  await appendFile(process.env.GITHUB_STEP_SUMMARY,summary+'\n上次完整更新：'+(c.meta.lastSuccessfulRefresh||'尚未完整成功')+'。\n\n部署结果请查看后续发布和域名核对步骤。\n');
 }
}
console.log(JSON.stringify({phase:'refresh-complete',mode:offline?'cached-data-validation':cachedSources.length?'partial-source-update':'live-source-update',cachedSources,records:c.items.length,mapped:c.items.filter(x=>x.cnId).length}));
