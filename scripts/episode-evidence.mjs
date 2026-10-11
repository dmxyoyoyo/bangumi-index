import {nameKey} from './mapping.mjs';
import {readJson,writeJson,getJson,today} from './shared.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export async function collectEpisodeEvidence({catalog,chinese,cache={intl:{},cn:{}},day=today(),request=getJson,pause=delay}){
 const next={intl:{...cache.intl},cn:{...cache.cn}},pending=catalog.items.filter(x=>!x.cnId&&Number.isSafeInteger(x.intlId));
 const names=new Set(pending.flatMap(x=>[x.title,x.seaTitle,...(x.aliases||[])]).map(nameKey).filter(Boolean));
 for(const item of pending){const id=item.intlId;if(next.intl[id]?.checkedAt===day)continue;
  const j=await request('https://api.bilibili.tv/intl/gateway/web/v2/ogv/play/episodes?season_id='+id+'&platform=web&s_locale=en_US');
  if(j.code===-412)throw new Error('International episode source rate-limited');
  if(j.code!==0)next.intl[id]={available:false,code:j.code,checkedAt:day};
  else{
   if(!Array.isArray(j.data?.sections)||j.data.sections.some(x=>!Array.isArray(x.episodes)))throw new Error('International episode source returned invalid data for '+id);
   const main=j.data.sections.filter(x=>!/PV|More|预告|特典|花絮/i.test(x.ep_list_title||x.title||'')).flatMap(x=>x.episodes),all=j.data.sections.flatMap(x=>x.episodes);
   const time=Date.parse(main[0]?.publish_time);
   next.intl[id]={available:true,mainCount:main.length,extraCount:all.length-main.length,firstPublishedAt:Number.isFinite(time)?time:null,checkedAt:day};
  }
  await pause(1200);
 }
 for(const candidate of Object.values(chinese).filter(x=>x.available!==false&&names.has(nameKey(x.title)))){const id=candidate.season_id;
  if(next.cn[id]?.checkedAt===day)continue;
  const j=await request('https://api.bilibili.com/pgc/web/season/section?season_id='+id);
  if(j.code===-412)throw new Error('Chinese episode source rate-limited');
  if(j.code!==0)next.cn[id]={available:false,code:j.code,checkedAt:day};
  else{
   const main=j.result?.main_section?.episodes,upcoming=main===undefined&&candidate.publish?.is_started===0&&candidate.episodeCount===0;
   if(!Array.isArray(main)&&!upcoming||!Array.isArray(j.result?.section))throw new Error('Chinese episode source returned invalid data for '+id);
   const extra=j.result.section.flatMap(x=>{if(!Array.isArray(x.episodes))throw new Error('Chinese episode section returned invalid data');return x.episodes;});
   next.cn[id]={available:true,mainCount:upcoming?0:main.length,extraCount:extra.length,firstPublishedAt:candidate.firstEpisodePublishedAt||null,checkedAt:day};
  }
  await pause(1200);
 }
 return next;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv.includes('--offline')){
  const result=await collectEpisodeEvidence({catalog:await readJson('dist/catalog.json'),chinese:await readJson('data/cn-metadata.json',{}),cache:await readJson('data/mapping-episodes.json',{intl:{},cn:{}})});
  await writeJson('data/mapping-episodes.json',result);
  console.log(JSON.stringify({phase:'episode-evidence-complete',international:Object.keys(result.intl).length,chinese:Object.keys(result.cn).length}));
 }
}
