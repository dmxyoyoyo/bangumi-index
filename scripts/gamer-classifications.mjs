import {readJson,writeJson,today} from './shared.mjs';
import Filters from '../dist/gamer-filters.js';
import {setTimeout as delay} from 'node:timers/promises';
const source='https://api.gamer.com.tw/anime/v1/anime_list.php';
export async function readFilterPage(option,page,sort=1){
 const query=new URLSearchParams({sort:String(sort),page:String(page),[option.field]:option.value});
 for(let attempt=0;attempt<3;attempt++){
  let response;try{response=await fetch(source+'?'+query,{signal:AbortSignal.timeout(30000)});}catch(error){if(attempt===2)throw error;await delay(1000*(attempt+1));continue;}
  if((response.status===429||response.status>=500)&&attempt<2){await delay(1000*(attempt+1));continue;}
  if(!response.ok)throw new Error('动画疯分类 HTTP '+response.status+'，保留上次结果');const j=await response.json();if(j.error||!j.data)throw new Error('动画疯分类接口未返回有效数据');return j.data;
 }
}
export async function collectGamerClassifications(raw,{readPage=readFilterPage,wait=delay,options=Filters.options}={}){
 const items=Object.fromEntries(raw.items.map(x=>[Number(x.animeSn),{attributes:[],types:[],audiences:[]}])) ;let cursor=0,checked=0,failure=null;
 async function collectOption(option,sort){
  const first=await readPage(option,1,sort),pages=Number(first.totalPage),size=first.animeList?.length,ids=new Set();let lastSize=size;
  if(!Number.isSafeInteger(pages)||pages<0||pages>250||!Array.isArray(first.animeList)||pages>1&&!size||pages===0&&size)throw new Error('动画疯分类分页无效：'+option.value);
  function append(data,page){if(Number(data.totalPage)!==pages||!Array.isArray(data.animeList)||data.animeList.length>size||page<pages&&data.animeList.length!==size||page>1&&!data.animeList.length)throw Object.assign(new Error('动画疯分类分页不完整：'+option.value),{retryable:true});for(const row of data.animeList){const id=Number(row.animeSn);if(!Number.isSafeInteger(id)||id<=0)throw new Error('动画疯分类 ID 无效');ids.add(id);}lastSize=data.animeList.length;}
  append(first,1);for(let page=2;page<=pages;page++){await wait(500);append(await readPage(option,page,sort),page);}
  const expected=pages?((pages-1)*size+lastSize):0;
  if(ids.size!==expected)throw Object.assign(new Error('动画疯分类唯一 ID 不足：'+option.value),{retryable:true});
  if(pages>1){const end=await readPage(option,1,sort);if(Number(end.totalPage)!==pages||!Array.isArray(end.animeList)||end.animeList.length!==size||end.animeList.some(x=>!ids.has(Number(x.animeSn))))throw Object.assign(new Error('动画疯分类同步期间发生变化：'+option.value),{retryable:true});}
  return ids;
 }
 async function worker(){while(!failure&&cursor<options.length){const option=options[cursor++];try{
  let ids;for(let attempt=0;attempt<3;attempt++){try{ids=await collectOption(option,[1,2,1][attempt]);break;}catch(error){if(!error.retryable||attempt===2)throw error;console.log(JSON.stringify({phase:'gamer-classification-retry',filter:option.label,attempt:attempt+1}));await wait(1500);}}
  for(const id of ids)if(items[id])items[id][option.property].push(option.value);
  checked++;if(checked%5===0||checked===options.length)console.log(JSON.stringify({phase:'gamer-classifications',checked,total:options.length,filter:option.label}));await wait(500);
 }catch(error){failure=error;}}}

 await Promise.all([worker(),worker()]);if(failure)throw failure;
 return {meta:{source,checkedAt:today(),checkedFilters:options.length,catalogIds:raw.items.map(x=>Number(x.animeSn)).sort((a,b)=>a-b)},items};
}
export async function enrichGamerClassifications(raw,{offline=false}={}){if(offline){const cache=await readJson('data/gamer-classifications.json',null);if(!cache||raw.items.some(x=>!cache.items?.[x.animeSn]))throw new Error('动画疯分类缓存不完整，需先完成在线更新');return cache;}const cache=await collectGamerClassifications(raw);await writeJson('data/gamer-classifications.json',cache);return cache;}
