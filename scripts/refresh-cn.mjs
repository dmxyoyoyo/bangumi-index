import {nameKey} from './mapping.mjs';
import {readJson,writeJson,getJson,today} from './shared.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export async function collectIndexSeeds({items,request=getJson,pause=delay}){
 const pending=items.filter(x=>!x.cnId),names=new Set(pending.flatMap(x=>[x.title,x.seaTitle,...(x.aliases||[])]).map(nameKey).filter(Boolean)),ids=new Set();
 if(!names.size)return [];
 const types=new Set(pending.map(x=>x.originCategory==='china'?4:1));
 for(const type of types){let complete=false;for(let page=1;page<=250;page++){
  const j=await request('https://api.bilibili.com/pgc/season/index/result?season_type='+type+'&order=3&sort=0&page='+page+'&pagesize=50&type=1&st=1'),data=j.data;
  if(j.code!==0||!Array.isArray(data?.list)||![0,1,false,true].includes(data.has_next))throw new Error('Chinese index returned invalid data');
  for(const row of data.list){if(Number.isSafeInteger(row.season_id)&&row.season_id>0&&names.has(nameKey(row.title)))ids.add(row.season_id);}
  if(page%10===0)console.log(JSON.stringify({phase:'chinese-index',type,page,candidates:ids.size}));
  if(!data.has_next){complete=true;break;}if(!data.list.length)throw new Error('Chinese index pagination incomplete');await pause(1200);
 }if(!complete)throw new Error('Chinese index pagination incomplete');await pause(1200);}
 return [...ids];
}
export async function collectChinese({cache,discovery,catalog,seeds=[],links={},day=today(),request=getJson,pause=delay}){
 const indexed=await collectIndexSeeds({items:catalog.items,request,pause});
 const next={...cache},age=v=>v?Math.floor((Date.parse(day)-Date.parse(v))/86400000):Infinity;
 const pendingNames=new Set(catalog.items.filter(x=>!x.cnId).flatMap(x=>[x.title,x.seaTitle,...(x.aliases||[])]).map(nameKey).filter(Boolean));
 const pendingIds=new Set(Object.values(cache).filter(x=>pendingNames.has(nameKey(x.title))).map(x=>x.season_id));
 const activeLinks=Object.entries(links).filter(([id])=>catalog.items.some(x=>x.intlId===Number(id)&&!x.cnId)).map(([,x])=>x),linkedIds=activeLinks.flatMap(x=>[x.sourceCnId,x.cnId]);
 const related=[...new Set(Object.values(cache).flatMap(x=>x.seasons||[]).map(x=>x.id).filter(x=>Number.isSafeInteger(x)&&x>0&&!cache[x]))];
 const known=Object.values(cache).map(x=>x.season_id),seedIds=seeds.map(x=>x.id).filter(x=>Number.isSafeInteger(x)&&x>0),bridge=catalog.items.filter(x=>x.cnId>=272000).map(x=>x.cnId);
 const frontier=Math.max(282999,...Object.values(cache).filter(x=>x.available!==false).map(x=>x.season_id),...bridge,...seedIds),start=Math.max(frontier-100,discovery.forwardNext||frontier-100),end=start+500;
 const required=[...new Set([...seedIds,...indexed,...linkedIds,...related,...pendingIds])],forward=Array.from({length:501},(_,i)=>start+i),base=new Set([...required,...forward]);
 const rechecks=known.filter(id=>!base.has(id)&&(age(cache[id]?.checkedAt)>=7||cache[id]?.publish?.is_started===0&&age(cache[id]?.checkedAt)>=1)).sort((a,b)=>age(cache[b]?.checkedAt)-age(cache[a]?.checkedAt)).slice(0,Math.max(0,4000-base.size-501));
 const priority=[...new Set([...required,...rechecks,...forward])],backfillBudget=Math.min(2000,Math.max(0,4000-priority.length));
 const backfillStart=discovery.backfillNext&&discovery.backfillNext<start?discovery.backfillNext:283000,backfillEnd=Math.min(backfillStart+backfillBudget-1,start-1);
 const ids=[...priority,...Array.from({length:Math.max(0,backfillEnd-backfillStart+1)},(_,i)=>backfillStart+i).filter(x=>!base.has(x)&&!rechecks.includes(x))],seen=new Set(ids);let cursor=0,done=0,added=0,missing=0,failure=null;
 async function worker(){while(!failure&&cursor<ids.length){const id=ids[cursor++];if(next[id]?.available!==false&&next[id]?.checkedAt===day&&next[id]?.richCheckedAt===day&&(!pendingIds.has(id)||next[id]?.firstEpisodePublishedAt!==undefined)){done++;continue;}
  try{const j=await request('https://api.bilibili.com/pgc/view/web/season?season_id='+id),s=j.result;
   if(j.code===-412)throw new Error('Chinese source rate-limited');
   if(j.code===0&&s?.season_id===id){if(!next[id])added++;next[id]={...next[id],season_id:id,title:s.title,cover:s.cover||next[id]?.cover||null,evaluate:s.evaluate,jpTitle:s.jp_title,seasonTitle:s.season_title,publish:s.publish,firstEpisode:s.episodes?.[0]?.id||null,firstEpisodePublishedAt:s.episodes?.[0]?.pub_time?Number(s.episodes[0].pub_time)*1000:null,type:s.type,episodeCount:s.episodes?.length||0,episodeTitles:s.episodes?.slice(0,3).map(x=>x.long_title),total:s.total,seasons:s.seasons?.map(x=>({id:x.season_id,title:x.season_title})),available:true,code:0,checkedAt:day,richCheckedAt:day};
    for(const x of s.seasons||[]){const candidate=Number(x.season_id);if(candidate>0&&!seen.has(candidate)&&!next[candidate]&&ids.length<4000){seen.add(candidate);ids.push(candidate);}}
   }else if(j.code===-404||j.code===-1){missing++;if(next[id]||related.includes(id)||linkedIds.includes(id))next[id]={...next[id],season_id:id,available:false,code:j.code,checkedAt:day};}
   else throw new Error('Chinese source returned invalid season data');
   done++;if(done%100===0)console.log(JSON.stringify({phase:'chinese-candidates',checked:done,total:ids.length,added,missing}));await pause(1200);
  }catch(error){failure=error;}
 }}
 await Promise.all([worker(),worker()]);if(failure)throw failure;
 return {cache:next,discovery:{...discovery,checkedAt:day,range:[start,end],forwardNext:end+1,backfillRange:[backfillStart,backfillEnd],backfillNext:backfillEnd>=backfillStart?backfillEnd+1:backfillStart,validCandidates:Object.values(next).filter(x=>x.available!==false).length,requestBudget:4000,backfillLimit:2000,recheckQueued:rechecks.length,indexCandidates:indexed.length,added,missing}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await collectChinese({cache:await readJson('data/cn-metadata.json',{}),discovery:await readJson('data/cn-discovery.json',{}),catalog:await readJson('dist/catalog.json'),seeds:await readJson('data/user-links.json',[]),links:await readJson('data/linked-candidates.json',{})});
 await writeJson('data/cn-metadata.json',result.cache);await writeJson('data/cn-discovery.json',result.discovery);
 console.log(JSON.stringify({phase:'chinese-candidates-complete',added:result.discovery.added,validCandidates:result.discovery.validCandidates,range:result.discovery.range}));
}
