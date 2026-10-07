import OpenCC from 'opencc-js';
import {enrichGamerOriginals} from './gamer-originals.mjs';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {root,readJson,writeJson} from './shared.mjs';
const source='https://api.gamer.com.tw/anime/v1/anime_list.php';
const simplify=OpenCC.Converter({from:'tw',to:'cn'});
const key=text=>simplify(String(text||'')).normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\p{Z}\s]/gu,'');
async function readPage(page,sort=1){
 const response=await fetch(source+'?sort='+sort+'&page='+page,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('动画疯目录 HTTP '+response.status+'，保留上次结果');
 const result=await response.json();
 if(result.error||!result.data)throw new Error('动画疯目录返回错误，保留上次结果');
 return result.data;
}
async function collectGamerOnce(pageReader,wait,sort){
 const first=await pageReader(1,sort),pages=Number(first.totalPage);
 if(!Number.isSafeInteger(pages)||pages<1)throw new Error('动画疯分页信息无效');
 const pageSize=first.animeList?.length;
 if(!pageSize)throw new Error('动画疯首个分页为空');
 const items=new Map();let lastPageSize=pageSize;
 function append(data,page){
  if(Number(data.totalPage)!==pages||!Array.isArray(data.animeList)||!data.animeList.length||(page<pages&&data.animeList.length!==pageSize)||data.animeList.length>pageSize)throw Object.assign(new Error('动画疯第 '+page+' 页不完整或同步期间发生变化'),{retryable:true});
  const duplicates=[];
  for(const item of data.animeList){
   const id=Number(item.animeSn);
   if(!Number.isSafeInteger(id)||id<=0||!String(item.title||'').trim())throw new Error('动画疯第 '+page+' 页作品字段无效，ID：'+item.animeSn);
   if(items.has(id))duplicates.push(id);
   items.set(id,item);
  }
  if(duplicates.length)console.warn(JSON.stringify({phase:'gamer-page-overlap',page,sort,ids:duplicates}));
  if(page===pages)lastPageSize=data.animeList.length;
  if(page%10===0||page===pages)console.log(JSON.stringify({phase:'gamer-pages',page,pages,records:items.size,sort}));
 }
 append(first,1);
 for(let page=2;page<=pages;page++){await wait(500);append(await pageReader(page,sort),page);}
 const end=await pageReader(1,sort);
 if(Number(end.totalPage)!==pages||JSON.stringify(end.animeList?.map(x=>x.animeSn))!==JSON.stringify(first.animeList.map(x=>x.animeSn)))throw Object.assign(new Error('动画疯目录在同步期间变化'),{retryable:true});
 const records=(pages-1)*pageSize+lastPageSize;
 return {meta:{source,officialDirectory:'https://ani.gamer.com.tw/animeList.php',pages,records,lastSuccessfulRefresh:new Date().toISOString()},items:[...items.values()],signature:[pages,pageSize,records].join('-')};
}
export async function collectGamer(pageReader=readPage,wait=delay){
 let collected=new Map(),signature='';
 for(let attempt=1;attempt<=3;attempt++){
  let failure;
  try{
   const result=await collectGamerOnce(pageReader,wait,[1,2,1][attempt-1]);
   if(result.items.length===result.meta.records)return {meta:result.meta,items:result.items};
   if(signature!==result.signature){collected.clear();signature=result.signature;}
   for(const item of result.items)collected.set(Number(item.animeSn),item);
   if(collected.size===result.meta.records)return {meta:result.meta,items:[...collected.values()]};
   if(collected.size>result.meta.records)collected=new Map(result.items.map(item=>[Number(item.animeSn),item]));
   failure=new Error('动画疯目录尚未完整：唯一 ID '+collected.size+' / 应有 '+result.meta.records+'，保留上次结果');
  }catch(error){
   if(!error.retryable)throw error;
   collected.clear();signature='';failure=error;
  }
  if(attempt===3)throw failure;
  console.warn(JSON.stringify({phase:'gamer-pagination-retry',attempt,reason:failure.message,nextAttempt:attempt+1}));
  await wait(10000);
 }
}

async function build(raw){
 const originals=await enrichGamerOriginals(raw,{offline:process.argv.includes('--offline')});
 const subjects=Object.values(await readJson('data/bangumi-subjects.json',{})),names=new Map();
 for(const s of subjects)for(const name of [s.name_cn,s.name,...s.aliases||[]]){const k=key(name);if(!k)continue;const matches=names.get(k)||new Map();matches.set(s.id,s);names.set(k,matches);}
 const items=raw.items.map(item=>{
  const matches=names.get(key(item.title)),subject=matches?.size===1?[...matches.values()][0]:null;
  const original=originals[item.animeSn];
  return {id:Number(item.animeSn),title:simplify(subject?.name_cn||item.title),officialTitle:item.title,cover:item.cover||'',japaneseTitle:original?.japaneseTitle||'',originalTitle:original?.originalTitle||subject?.name||'',originalStatus:original?.originalStatus||'missing',originalSourceUrl:original?.sourceUrl||'',nameSource:subject?'Bangumi':'动画疯官方译名（简体转换）',nameSourceUrl:subject?'https://bgm.tv/subject/'+subject.id:'https://ani.gamer.com.tw/animeRef.php?sn='+item.animeSn,date:item.dateInfo?.match(/\d{4}\/\d{2}/)?.[0]||'',episodes:Number(item.totalEpisode)||0,bilingual:!!item.highlightTag?.bilingual,edition:simplify(item.highlightTag?.edition||''),url:'https://ani.gamer.com.tw/animeRef.php?sn='+item.animeSn};
 });
 const catalog={meta:{...raw.meta,titleNote:'主标题优先精确匹配的 Bangumi 中文名，其余使用动画疯官方译名并转换为简体；下方保留官方繁体名，日文原名来自巴哈姆特 ACG 资料或 Bangumi 精确匹配，保留原文写法并支持检索。非日本作品展示其原文名称；资料不足时显示日文原名待核实。'},items};
 await writeJson('dist/gamer-catalog.json',catalog);
 await writeFile(new URL('dist/gamer-data.js',root),'window.GAMER_CATALOG='+JSON.stringify(catalog).replace(/</g,'\\u003c')+';\n');
 const sea=await readJson('dist/catalog.json');
 await writeFile(new URL('dist/home-data.js',root),'window.PLATFORM_COUNTS='+JSON.stringify({sea:sea.items.length,gamer:items.length})+';\n');
 console.log(JSON.stringify({phase:'gamer-complete',records:items.length,pages:raw.meta.pages,mode:process.argv.includes('--offline')?'cached-data-validation':'live-source-update'}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const offline=process.argv.includes('--offline');
 const raw=offline?await readJson('data/gamer-list.json'):await collectGamer();
 await build(raw);
 if(!offline)await writeJson('data/gamer-list.json',raw);
}
