import {dub,nameKey,previewAssets} from './mapping.mjs';
import {normalizePremiereDate} from './release.mjs';
import {contentQueue,contentReview,episodeIds,addedContent} from './content-recheck.mjs';
import {readJson,writeJson,getJson,getIndexPage,SourceError,today} from './shared.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export async function collectIndexSeeds({items,metadata={},request=getJson,pause=delay}){
 const pending=items.filter(x=>!x.cnId),names=new Set(pending.flatMap(x=>[x.title,x.seaTitle,...(x.aliases||[])]).map(nameKey).filter(Boolean)),ids=new Set();
 if(!names.size)return [];
 const types=new Set(pending.map(x=>x.originCategory==='china'||Number(metadata[x.intlId]?.type)===4?4:1));
 for(const type of types){let complete=false;for(let page=1;page<=250;page++){
  const data=await getIndexPage('https://api.bilibili.com/pgc/season/index/result?season_type='+type+'&order=3&sort=0&page='+page+'&pagesize=50&type=1&st=1',{request,pause});
  for(const row of data.list){if(Number.isSafeInteger(row.season_id)&&row.season_id>0&&names.has(nameKey(row.title)))ids.add(row.season_id);}
  if(page%10===0)console.log(JSON.stringify({phase:'chinese-index',type,page,candidates:ids.size}));
  if(!data.has_next){complete=true;break;}await pause(1200);
 }if(!complete)throw new SourceError('Chinese index pagination incomplete');await pause(1200);}
 return [...ids];
}
export async function collectChinese({cache,discovery,catalog,metadata={},seeds=[],links={},day=today(),request=getJson,pause=delay}){
 const {tracked,queue}=contentQueue(catalog.items,'cnId',cache,day,item=>
  item.mappingStatus?.preview||item.release?.status==='upcoming'||cache[item.cnId]?.publish?.is_finish===0||metadata[item.intlId]?.isFinished===false);
 const contentIds=new Set(queue),changes=[];
 try{
 const indexed=await collectIndexSeeds({items:catalog.items,metadata,request,pause});
 const next={...cache},age=v=>v?Math.floor((Date.parse(day)-Date.parse(v))/86400000):Infinity;
 const pendingNames=new Set(catalog.items.filter(x=>!x.cnId).flatMap(x=>[x.title,x.seaTitle,...(x.aliases||[])]).map(nameKey).filter(Boolean));
 const pendingIds=new Set(Object.values(cache).filter(x=>pendingNames.has(nameKey(x.title))).map(x=>x.season_id));
 const activeLinks=Object.entries(links).filter(([id])=>catalog.items.some(x=>x.intlId===Number(id)&&!x.cnId)).map(([,x])=>x),linkedIds=activeLinks.flatMap(x=>[x.sourceCnId,x.cnId]);
 const related=[...new Set(Object.values(cache).flatMap(x=>x.seasons||[]).map(x=>x.id).filter(x=>Number.isSafeInteger(x)&&x>0&&!cache[x]))];
 const known=Object.values(cache).map(x=>x.season_id),seedIds=seeds.map(x=>x.id).filter(x=>Number.isSafeInteger(x)&&x>0),bridge=catalog.items.filter(x=>x.cnId>=272000).map(x=>x.cnId);
 const nearby=new Set();
 for(const {id,intlId} of seeds){
  const premiere=cache[id]?.publish?.pub_time?.slice(0,10);
  if(!seedIds.includes(id)||!Number.isSafeInteger(intlId)||intlId<=0||!(Math.abs(age(premiere))<=7))continue;
  for(let candidate=Math.max(1,id-40);candidate<=id+40;candidate++)if(!cache[candidate])nearby.add(candidate);
 }
 const nearbyIds=[...nearby].slice(0,160);
 // A dub can premiere long after its Chinese season ID was allocated.
 const dubLanguages=new Set(catalog.items.filter(item=>{
  const official=metadata[item.intlId];
  const premiere=normalizePremiereDate(official?.airDate)||normalizePremiereDate(item.release?.date);
  return !item.cnId&&item.intlId&&official?.available!==false&&Math.abs(age(premiere))<=21;
 }).map(item=>dub(metadata[item.intlId]?.title||item.seaTitle||item.title)).filter(Boolean));
 const dubAnchors=new Map();
 if(dubLanguages.size)for(const candidate of Object.values(cache)){
  const id=candidate.season_id,language=dub(candidate.title);
  if(dubLanguages.has(language)&&id>=272000&&candidate.available!==false&&[1,4].includes(candidate.type)&&
   Math.abs(age(candidate.publish?.pub_time?.slice(0,10)))<=21&&id>(dubAnchors.get(language)||0))dubAnchors.set(language,id);
 }
 const dubRadius=512,dubIds=new Set();
 for(let distance=1;dubAnchors.size&&distance<=dubRadius&&dubIds.size<900;distance++){
  for(const anchor of dubAnchors.values())for(const id of [anchor-distance,anchor+distance]){
   if(!cache[id]||cache[id].available===false)dubIds.add(id);
  }
 }
 const dubRanges=[...dubAnchors.values()].map(id=>[id-dubRadius,id+dubRadius]);
 // Public PV pages may be published behind both numeric scan cursors.
 const latestAnimation=Math.max(0,...bridge,...Object.values(cache).filter(x=>x.available!==false&&[1,4].includes(x.type)).map(x=>x.season_id));
 const publicationRange=latestAnimation>=272000&&catalog.items.some(item=>!item.cnId&&item.intlId&&item.release?.status!=='aired')?[latestAnimation-200,latestAnimation+1024]:null;
 const recent=publicationRange?Array.from({length:publicationRange[1]-publicationRange[0]+1},(_,i)=>publicationRange[0]+i):[];
 const frontier=Math.max(282999,...Object.values(cache).filter(x=>x.available!==false).map(x=>x.season_id),...bridge,...seedIds),start=Math.max(frontier-100,discovery.forwardNext||frontier-100),end=start+500;
 const forward=Array.from({length:501},(_,i)=>start+i),required=[...new Set([...seedIds,...indexed,...linkedIds,...pendingIds,...queue,...nearbyIds,...dubIds,...recent,...related])].slice(0,4000-forward.length),base=new Set([...required,...forward]);
 const rechecks=known.filter(id=>!base.has(id)&&!tracked.has(id)&&(age(cache[id]?.checkedAt)>=7||cache[id]?.publish?.is_started===0&&age(cache[id]?.checkedAt)>=1)).sort((a,b)=>age(cache[b]?.checkedAt)-age(cache[a]?.checkedAt)).slice(0,Math.max(0,4000-base.size-501));
 const priority=[...new Set([...required,...rechecks,...forward])],backfillBudget=Math.min(2000,Math.max(0,4000-priority.length));
 const backfillStart=discovery.backfillNext&&discovery.backfillNext<start?discovery.backfillNext:283000,backfillEnd=Math.min(backfillStart+backfillBudget-1,start-1);
 const ids=[...priority,...Array.from({length:Math.max(0,backfillEnd-backfillStart+1)},(_,i)=>backfillStart+i).filter(x=>!base.has(x)&&!rechecks.includes(x))],seen=new Set(ids);let cursor=0,done=0,added=0,missing=0,failure=null;
 async function worker(){while(!failure&&cursor<ids.length){const id=ids[cursor++];if(next[id]?.available!==false&&next[id]?.checkedAt===day&&next[id]?.richCheckedAt===day&&!pendingIds.has(id)&&!contentIds.has(id)){done++;continue;}
  try{const j=await request('https://api.bilibili.com/pgc/view/web/season?season_id='+id),s=j?.result;
   if([-352,-412,-429].includes(j?.code))throw new SourceError('Chinese source rate-limited',{rateLimited:true});
   const trackedId=tracked.has(id),previous=next[id],validSeason=j?.code===0&&s?.season_id===id;
   const missingContent=trackedId&&validSeason&&(!Array.isArray(s.episodes)||previous?.episodeCount>0&&!s.episodes.length);
   if(missingContent||trackedId&&[-404,-1].includes(j?.code)){
    missing++;next[id]={...previous,season_id:id,contentAttemptAt:day};
   }else if(validSeason){if(!previous)added++;
    const previews=previewAssets(s.section);
    next[id]={...previous,season_id:id,title:s.title,cover:s.cover||previous?.cover||null,areas:s.areas||[],evaluate:s.evaluate,jpTitle:s.jp_title,seasonTitle:s.season_title,publish:s.publish,firstEpisode:s.episodes?.[0]?.id||null,firstEpisodePublishedAt:s.episodes?.[0]?.pub_time?Number(s.episodes[0].pub_time)*1000:null,type:s.type,episodeCount:s.episodes?.length||0,episodeTitles:s.episodes?.slice(0,3).map(x=>x.long_title),total:s.total,seasons:s.seasons?.map(x=>({id:x.season_id,title:x.season_title})),available:true,code:0,checkedAt:day,richCheckedAt:day};
    if(previews.length)next[id].previews=previews;else delete next[id].previews;
    if(Array.isArray(s.episodes)){
     next[id].mainEpisodeIds=episodeIds(s.episodes);
     next[id].contentAttemptAt=day;next[id].contentCheckedAt=day;
     const change=addedContent(previous,next[id]);
     if(trackedId&&(change.episodes||change.previews))changes.push({id,...change});
    }
    for(const x of s.seasons||[]){const candidate=Number(x.season_id);if(candidate>0&&!seen.has(candidate)&&!next[candidate]&&ids.length<4000){seen.add(candidate);ids.push(candidate);}}
   }else if(j?.code===-404||j?.code===-1){missing++;if(next[id]||related.includes(id)||linkedIds.includes(id))next[id]={...next[id],season_id:id,available:false,code:j.code,checkedAt:day};}
   else throw new SourceError('Chinese source returned invalid season data');
   done++;if(done%100===0)console.log(JSON.stringify({phase:'chinese-candidates',checked:done,total:ids.length,added,missing}));await pause(1200);
  }catch(error){failure=error;}
 }}
 await Promise.all([worker(),worker()]);if(failure)throw failure;
 return {cache:next,discovery:{...discovery,refreshStatus:'updated',refreshWarning:null,lastAttemptAt:day,checkedAt:day,range:[start,end],forwardNext:end+1,publicationRange,dubRanges,backfillRange:[backfillStart,backfillEnd],backfillNext:backfillEnd>=backfillStart?backfillEnd+1:backfillStart,validCandidates:Object.values(next).filter(x=>x.available!==false).length,requestBudget:4000,backfillLimit:2000,recheckQueued:rechecks.length,indexCandidates:indexed.length,added,missing,contentReview:contentReview(tracked,next,day,changes)}};
 }catch(error){
  if(!(error instanceof SourceError)||!Object.values(cache).some(x=>x.available!==false&&x.title&&Number.isSafeInteger(x.season_id)))throw error;
  console.warn('::warning::中国版 ID 补查未完成，保留原有核实结果和扫描进度，下次继续：'+error.message);
  return {cache,discovery:{...discovery,refreshStatus:'cached',lastAttemptAt:day,refreshWarning:error.message,contentReview:contentReview(tracked,cache,day,[],error.message)}};
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await collectChinese({cache:await readJson('data/cn-metadata.json',{}),discovery:await readJson('data/cn-discovery.json',{}),catalog:await readJson('dist/catalog.json'),metadata:await readJson('data/intl-metadata.json',{}),seeds:await readJson('data/user-links.json',[]),links:await readJson('data/linked-candidates.json',{})});
 await writeJson('data/cn-metadata.json',result.cache);await writeJson('data/cn-discovery.json',result.discovery);
 console.log(JSON.stringify({phase:'chinese-candidates-complete',added:result.discovery.added,validCandidates:result.discovery.validCandidates,range:result.discovery.range,publicationRange:result.discovery.publicationRange,dubRanges:result.discovery.dubRanges}));
}
