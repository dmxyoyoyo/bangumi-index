import {getJson,today} from './shared.mjs';
import {setTimeout as delay} from 'node:timers/promises';
export async function collectDirectory({request=getJson,pause=delay}={}){
 const items=new Map(),sources=[];
 for(const type of [1,4]){
  let total=null,count=0,page=1,firstPage=[];const seen=new Set();
  while(page<=250){
   const url='https://api.bilibili.com/pgc/season/index/result?'+new URLSearchParams({season_type:String(type),order:'5',sort:'0',page:String(page),pagesize:'50',type:'1',st:'1'});
   const j=await request(url),d=j.data;
   if(j.code!==0||!Array.isArray(d?.list)||!Number.isSafeInteger(d.total)||![0,1,false,true].includes(d.has_next)||d.total<1)throw new Error('哔哩哔哩国区目录返回无效数据');
   if(total===null){total=d.total;firstPage=d.list.map(x=>x.season_id);}if(d.total!==total)throw new Error('哔哩哔哩国区目录同步期间数量变化');
   for(const row of d.list){const id=Number(row.season_id),kind=Number(row.season_type);if(!Number.isSafeInteger(id)||id<=0||!row.title||!Number.isSafeInteger(kind)||kind<1)throw new Error('哔哩哔哩国区目录条目无效：'+JSON.stringify({id:row.season_id,title:row.title,type:row.season_type}));if(seen.has(id))throw new Error('哔哩哔哩国区目录分页重叠，保留上次结果');seen.add(id);items.set(id,{id,title:row.title,cover:row.cover||'',type:kind,sourceType:type,mediaId:row.media_id||null,indexShow:row.index_show||'',firstEpisode:row.first_ep?.ep_id||null,isFinish:row.is_finish===1});}
   count+=d.list.length;if(page%20===0)console.log(JSON.stringify({phase:'bilibili-directory',type,page,records:count,total}));
   if(!d.has_next){if(count!==total)throw new Error('哔哩哔哩国区目录分页尚未完整');break;}
   if(!d.list.length)throw new Error('哔哩哔哩国区目录中途分页为空');page++;await pause(700);
  }
  if(page>250)throw new Error('哔哩哔哩国区目录分页超出范围');const recheck=await request('https://api.bilibili.com/pgc/season/index/result?'+new URLSearchParams({season_type:String(type),order:'5',sort:'0',page:'1',pagesize:'50',type:'1',st:'1'}));if(recheck.code!==0||recheck.data?.total!==total||JSON.stringify(recheck.data?.list?.map(x=>x.season_id))!==JSON.stringify(firstPage))throw new Error('哔哩哔哩国区目录同步期间发生变化');sources.push({type,pages:page,total,complete:true});await pause(700);
 }
 return {meta:{checkedAt:today(),sources,source:'https://api.bilibili.com/pgc/season/index/result'},items:[...items.values()]};
}
