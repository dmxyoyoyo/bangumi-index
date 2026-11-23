import {nameKey,previewAssets,isPreviewPage} from './mapping.mjs';
import {contentQueue,contentReview,episodeIds,addedContent} from './content-recheck.mjs';
import {readJson,writeJson,getJson,today,SourceError} from './shared.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export async function collectEpisodeEvidence({catalog,chinese,metadata={},cache={intl:{},cn:{}},day=today(),request=getJson,pause=delay,skipChinese=false,skipInternational=false}){
 const next={...cache,intl:{...cache.intl},cn:{...cache.cn}};
 if(!skipInternational){
  const {tracked,queue}=contentQueue(catalog.items,'intlId',next.intl,day,item=>
   !item.cnId||item.mappingStatus?.preview||item.release?.status==='upcoming'||metadata[item.intlId]?.isFinished===false);
  const changes=[];
  let cursor=0,warning=null;
  async function worker(){
   while(!warning&&cursor<queue.length){
    const id=queue[cursor++],item=tracked.get(id),previous=next.intl[id];
    let j;
    try{
     j=await request('https://api.bilibili.tv/intl/gateway/web/v2/ogv/play/episodes?season_id='+id+'&platform=web&s_locale=en_US');
     if([-352,-412,-429].includes(j.code))throw new SourceError('International episode source rate-limited',{rateLimited:true});
    }catch(error){
     if(!(error instanceof SourceError))throw error;
     warning=error.message;break;
    }
    const sections=j.data?.sections,valid=Array.isArray(sections)&&sections.every(x=>Array.isArray(x.episodes));
    if(j.code===0&&valid){
     const extras=sections.filter(x=>/PV|More|预告|預告|trailer|特典|花絮/i.test(x.ep_list_title||x.title||''));
     const main=sections.filter(x=>!extras.includes(x)).flatMap(x=>x.episodes);
     if(item.cnId&&previous?.mainCount>0&&!main.length){
      next.intl[id]={...previous,contentAttemptAt:day};
      await pause(1200);continue;
     }
     const time=Date.parse(main[0]?.publish_time),previews=previewAssets(extras).filter(pv=>pv.id||pv.asset&&pv.publishedAt);
     next.intl[id]={available:true,mainCount:main.length,extraCount:extras.reduce((n,section)=>n+section.episodes.length,0),
      firstPublishedAt:Number.isFinite(time)&&time>0?time:null,mainEpisodeIds:episodeIds(main),checkedAt:day,
      contentAttemptAt:day,contentCheckedAt:day,...(previews.length?{previews}:{})};
     const change=addedContent(previous,next.intl[id]);
     if(change.episodes||change.previews)changes.push({id,...change});
    }else{
     if(j.code===0&&!item.cnId)throw new Error('International episode source returned invalid data for '+id);
     next.intl[id]={...(item.cnId?previous:{available:false,code:j.code,checkedAt:day}),contentAttemptAt:day};
    }
    await pause(1200);
   }
  }
  await Promise.all([worker(),worker()]);
  next.intlContentReview=contentReview(tracked,next.intl,day,changes,warning);
 }
 const pending=catalog.items.filter(x=>!x.cnId&&Number.isSafeInteger(x.intlId));
 const names=new Set(pending.flatMap(x=>[x.title,x.seaTitle,...(x.aliases||[])]).map(nameKey).filter(Boolean));
 for(const candidate of (skipChinese?[]:Object.values(chinese)).filter(x=>x.available!==false&&names.has(nameKey(x.title)))){const id=candidate.season_id;
  const j=await request('https://api.bilibili.com/pgc/web/season/section?season_id='+id);
  if(j.code===-412)throw new Error('Chinese episode source rate-limited');
  if(j.code!==0)next.cn[id]={available:false,code:j.code,checkedAt:day};
  else{
   const main=j.result?.main_section?.episodes,upcoming=main===undefined&&isPreviewPage(candidate);
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
  const skipChinese=process.argv.includes('--skip-chinese'),internationalOnly=process.argv.includes('--international-only');
  const skipInternational=process.argv.includes('--chinese-only');
  if(skipChinese)console.warn('本轮中国版接口异常，保留中国版分集证据，不再继续请求该来源。');
  const result=await collectEpisodeEvidence({catalog:await readJson('dist/catalog.json'),
   chinese:internationalOnly?{}:await readJson('data/cn-metadata.json',{}),
   metadata:await readJson('data/intl-metadata.json',{}),cache:await readJson('data/mapping-episodes.json',{intl:{},cn:{}}),
   skipChinese:skipChinese||internationalOnly,skipInternational});
  await writeJson('data/mapping-episodes.json',result);
  const review=result.intlContentReview;
  console.log(JSON.stringify({phase:'episode-evidence-complete',international:Object.keys(result.intl).length,chinese:Object.keys(result.cn).length,
   ...(review?{reviewed:review.attempted,verified:review.verified,changed:review.changes.length}:{})}));
 }
}
