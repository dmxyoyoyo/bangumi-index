import {getJson,today} from './shared.mjs';
import {setTimeout as delay} from 'node:timers/promises';
export async function collectOrigins({request=getJson,pause=delay,day=today()}={}){
 const items={},sources=[];
 const conditions=await request('https://api.bilibili.com/pgc/season/index/condition?season_type=1&type=1');if(conditions.code!==0||!conditions.data?.filter?.find(x=>x.field==='area')?.values?.some(x=>x.keyword==='2'&&x.name==='日本'))throw new Error('官方日本制作地区筛选参数未确认');
 for(const [area,category] of [[2,'japan']]){
  const ids=new Set();let total=null,page=1,first=[];
  const url=p=>'https://api.bilibili.com/pgc/season/index/result?'+new URLSearchParams({season_type:'1',area:String(area),order:'5',sort:'0',page:String(p),pagesize:'50',type:'1',st:'1'});
  while(page<=250){const j=await request(url(page)),d=j.data;if(j.code!==0||!Array.isArray(d?.list)||!Number.isSafeInteger(d.total)||d.total<0||![0,1,false,true].includes(d.has_next))throw new Error('官方制作地区目录未完整返回');
   if(total===null){total=d.total;first=d.list.map(x=>x.season_id);}if(total!==d.total)throw new Error('制作地区目录同步期间发生变化');
   for(const row of d.list){const id=Number(row.season_id);if(!Number.isSafeInteger(id)||id<=0||ids.has(id))throw new Error('制作地区目录 ID 无效或分页重叠');ids.add(id);}
   if(!d.has_next){if(ids.size!==total)throw new Error('制作地区目录分页未完整');break;}if(!d.list.length)throw new Error('制作地区目录中途分页为空');page++;if(page%20===0)console.log(JSON.stringify({phase:'origin-pages',category,page,total}));await pause(700);
  }
  if(page>250)throw new Error('制作地区目录分页超出范围');const check=await request(url(1));if(check.code!==0||check.data?.total!==total||JSON.stringify(check.data.list?.map(x=>x.season_id))!==JSON.stringify(first))throw new Error('制作地区目录同步期间发生变化');
  for(const id of ids)items[id]={category:items[id]&&items[id].category!==category?'other':category,source:'官方制作地区筛选',sourceUrl:url(1),checkedAt:day};sources.push({area,category,records:ids.size,complete:true});await pause(700);
 }
 return {meta:{checkedAt:day,sources},items};
}
