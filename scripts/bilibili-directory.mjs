import {getJson,getIndexPage,SourceError,today} from './shared.mjs';
import {setTimeout as delay} from 'node:timers/promises';
export function preserveDirectoryHistory(previous,current,history){
 const active=new Set(current.items.map(x=>x.id)),saved=new Map(history.items.map(x=>[x.id,x]));
 for(const entry of previous?.items||[])if(!active.has(entry.id)&&!saved.has(entry.id))saved.set(entry.id,{...entry,historical:true,sourceUrl:previous.meta?.source||'https://api.bilibili.com/pgc/season/index/result',checkedAt:entry.checkedAt||previous.meta?.checkedAt,verification:'official-index-history'});
 return {...history,items:[...saved.values()]};
}
export async function collectDirectory({request=getJson,pause=delay,previous=null}={}){
 try{
 const items=new Map(),sources=[];
 for(const type of [1,4]){
  let total=null,count=0,page=1,firstPage=[];const seen=new Set();
  while(page<=250){
   const url='https://api.bilibili.com/pgc/season/index/result?'+new URLSearchParams({season_type:String(type),order:'5',sort:'0',page:String(page),pagesize:'50',type:'1',st:'1'});
   const d=await getIndexPage(url,{request,pause,requireTotal:true});
   if(total===null){total=d.total;firstPage=d.list.map(x=>x?.season_id);}if(d.total!==total)throw new SourceError('哔哩哔哩国区目录同步期间数量变化');
   for(const row of d.list){const id=Number(row?.season_id),kind=Number(row?.season_type);if(!Number.isSafeInteger(id)||id<=0||typeof row?.title!=='string'||!row.title||!Number.isSafeInteger(kind)||kind<1)throw new SourceError('哔哩哔哩国区目录条目无效');if(seen.has(id))throw new SourceError('哔哩哔哩国区目录分页重叠，保留上次结果');seen.add(id);items.set(id,{id,title:row.title,cover:row.cover||'',type:kind,sourceType:type,mediaId:row.media_id||null,indexShow:row.index_show||'',firstEpisode:row.first_ep?.ep_id||null,isFinish:row.is_finish===1});}
   count+=d.list.length;if(page%20===0)console.log(JSON.stringify({phase:'bilibili-directory',type,page,records:count,total}));
   if(!d.has_next){if(count!==total)throw new SourceError('哔哩哔哩国区目录分页尚未完整');break;}
   page++;await pause(700);
  }
  if(page>250)throw new SourceError('哔哩哔哩国区目录分页超出范围');const recheck=await getIndexPage('https://api.bilibili.com/pgc/season/index/result?'+new URLSearchParams({season_type:String(type),order:'5',sort:'0',page:'1',pagesize:'50',type:'1',st:'1'}),{request,pause,requireTotal:true});if(recheck.total!==total||JSON.stringify(recheck.list.map(x=>x?.season_id))!==JSON.stringify(firstPage))throw new SourceError('哔哩哔哩国区目录同步期间发生变化');sources.push({type,pages:page,total,complete:true});await pause(700);
 }
 return {meta:{checkedAt:today(),refreshStatus:'updated',sources,source:'https://api.bilibili.com/pgc/season/index/result'},items:[...items.values()]};
 }catch(error){
  if(!(error instanceof SourceError)||!previous?.items?.length||!previous.meta?.checkedAt)throw error;
  console.warn('::warning::哔哩哔哩国区目录未能完整刷新，沿用 '+previous.meta.checkedAt+' 的完整目录：'+error.message);
  return {...previous,meta:{...previous.meta,refreshStatus:'cached',lastAttemptAt:new Date().toISOString(),refreshWarning:error.message}};
 }
}
