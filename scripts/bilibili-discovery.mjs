import {getJson,today} from './shared.mjs';
import {setTimeout as delay} from 'node:timers/promises';

export function articleLeads(html,url){
 const start=html.indexOf('window.__INITIAL_STATE__=');if(start<0)throw new Error('专栏正文未返回，保留上次线索');
 const tail=html.slice(start+'window.__INITIAL_STATE__='.length);let depth=0,quoted=false,escaped=false,end=-1;
 for(let i=0;i<tail.length;i++){const c=tail[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}}
 if(end<0)throw new Error('专栏数据不完整');const state=JSON.parse(tail.slice(0,end)),modules=state.detail?.modules,content=modules?.find(x=>x.module_content)?.module_content;
 if(!Array.isArray(content?.paragraphs))throw new Error('专栏正文格式无效');
 const articleTitle=modules.find(x=>x.module_title)?.module_title?.text||'',regionalArticle=/[僅仅]限.*[港澳台臺]|[港澳台臺].*番[剧劇]/.test(articleTitle),seasons=new Map(),videos=new Map(),media=new Map(),articles=new Set(),cards=[],legacyVideos=[];
 function link(value){if(typeof value!=='string')return;const ss=value.match(/(?:https?:)?\/\/(?:www\.)?bilibili\.com\/bangumi\/play\/ss(\d+)/),md=value.match(/(?:https?:)?\/\/(?:www\.)?bilibili\.com\/bangumi\/media\/md(\d+)/),bv=value.match(/BV[0-9A-Za-z]{10}/);if(ss)seasons.set(Number(ss[1]),{id:Number(ss[1]),sourceUrl:url});if(md)media.set(Number(md[1]),{mediaId:Number(md[1]),sourceUrl:url});if(bv)videos.set(bv[0],{bvid:bv[0],sourceUrl:url});if(/(?:https?:)?\/\/(?:www\.)?bilibili\.com\/(?:opus\/\d+|read\/cv\d+)/.test(value))articles.add(value);}
 function walk(value){if(Array.isArray(value)){for(const x of value)walk(x);}else if(value&&typeof value==='object'){const text=value.text?.nodes?.map(x=>x.word?.words||'').join('')||'';for(const match of text.matchAll(/(?:港澳[台臺]?|[台臺][灣湾]|香港|澳[門门])(?:地[区區])?\s*[：:]?\s*\*?\s*([1-9]\d{4,6})(?!\d)/g)){const id=Number(match[1]);seasons.set(id,{id,sourceUrl:url});}for(const [k,v] of Object.entries(value)){if(['jump_url','url','link','bvid','words'].includes(k))link(v);walk(v);}}}
 walk(content);
 let context='';for(const paragraph of content.paragraphs){const text=paragraph.text?.nodes?.map(x=>x.word?.words||'').join('').trim();if(text)context=text;const raw=paragraph.link_card?.card;if(raw?.type==='LINK_CARD_TYPE_ITEM_NULL'&&/^\d+$/.test(raw.oid)&&(regionalArticle||/[僅仅]限.*[港澳台臺]/.test(context)))legacyVideos.push({aid:Number(raw.oid),expectedTitle:context,sourceUrl:url});const card=raw?.common;if(card?.sub_type!=='ogv'||!card.title||!card.cover)continue;let target;try{target=new URL(card.jump_url);}catch{continue;}const match=target.pathname.match(/^\/bangumi\/play\/ss(\d+)\/?$/);if(!['www.bilibili.com','bilibili.com'].includes(target.hostname)||!match)continue;const id=Number(match[1]);cards.push({id,title:card.title,cover:card.cover,indexShow:card.desc1||'',historical:true,sourceUrl:url,verification:'official-ogv-card'});seasons.set(id,{id,title:card.title,sourceUrl:url});}
 return {sourceUrl:url,opusId:String(state.id),title:articleTitle,seasons:[...seasons.values()],videos:[...videos.values()],media:[...media.values()],cards,legacyVideos,relatedArticles:[...articles]};
}
async function getPage(url){const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error([412,429].includes(r.status)?'Source rate-limited':'专栏 HTTP '+r.status);return r.text();}
export async function collectArticleLeads(previous,sources,{request=getPage,pause=delay,day=today()}={}){
 const pages={...previous?.pages};let failures=0,rateLimited=false;
 for(const url of sources){const parsed=new URL(url);if(parsed.hostname!=='www.bilibili.com'||!/^\/(?:read\/|opus\/)/.test(parsed.pathname))throw new Error('不支持的专栏来源');
  try{pages[url]={...articleLeads(await request(url),url),checkedAt:day};}catch(error){failures++;if(/rate-limited/.test(error.message)){rateLimited=true;break;}}await pause(3500);
 }
 const seasons=new Map((previous?.seasons||[]).map(x=>[x.id,x])),videos=new Map((previous?.videos||[]).map(x=>[x.bvid,x])),media=new Map((previous?.media||[]).map(x=>[x.mediaId,x])),cards=new Map((previous?.cards||[]).map(x=>[x.id,x])),legacyVideos=new Map((previous?.legacyVideos||[]).map(x=>[x.aid,x]));
 for(const page of Object.values(pages)){for(const x of page.seasons)seasons.set(x.id,x);for(const x of page.videos)videos.set(x.bvid,x);for(const x of page.media)media.set(x.mediaId,x);for(const x of page.cards||[])cards.set(x.id,{...x,checkedAt:page.checkedAt});for(const x of page.legacyVideos||[])legacyVideos.set(x.aid,x);}
 return {meta:{checkedAt:day,partial:failures>0,rateLimited,failedSources:failures},pages,seasons:[...seasons.values()],videos:[...videos.values()],media:[...media.values()],cards:[...cards.values()],legacyVideos:[...legacyVideos.values()]};
}
export async function collectLinkedSeasons(previous,seeds,directory,{request=getJson,pause=delay,budget=150,day=today(),cards=[]}={}){
 const items=new Map((previous?.items||[]).map(x=>[x.id,x])),checks={...previous?.checks},indexed=new Set(directory.items.map(x=>x.id)),queue=[],seen=new Set();let checked=0,failure=null;
 function add(id,sourceUrl){if(!Number.isSafeInteger(id)||id<=0||seen.has(id))return;seen.add(id);queue.push({id,sourceUrl});}
 for(const card of cards)if(card.verification==='official-ogv-card'&&!items.has(card.id))items.set(card.id,{...card,seasons:[]});
 for(const seed of seeds)add(seed.id,seed.sourceUrl);for(const item of items.values())for(const s of item.seasons||[])add(s.id,item.sourceUrl);
 for(let cursor=0;cursor<queue.length&&checked<budget;cursor++){
  const {id,sourceUrl}=queue[cursor];if(checks[id]&&Date.parse(day)-Date.parse(checks[id].checkedAt)<7*86400000){for(const s of items.get(id)?.seasons||[])add(s.id,sourceUrl);continue;}
  try{const j=await request('https://api.bilibili.com/pgc/view/web/season?season_id='+id),s=j.result;
   if(j.code===0&&Number(s?.season_id)===id&&s.title&&[1,2,4].includes(Number(s.type))){
    const related=(s.seasons||[]).map(x=>({id:Number(x.season_id),title:x.season_title}));
    items.set(id,{id,mediaId:Number(s.media_id)||null,title:s.title,cover:s.cover||'',type:Number(s.type),japaneseTitle:s.jp_title||'',date:s.publish?.pub_time?.slice(0,10)||'',indexShow:s.new_ep?.desc||'',historical:true,sourceUrl,checkedAt:day,seasons:related,verification:'official-season'});checks[id]={checkedAt:day,available:true};for(const x of related)add(x.id,'https://www.bilibili.com/bangumi/play/ss'+id);
   }else if([-404,-1].includes(j.code))checks[id]={checkedAt:day,available:false,code:j.code};else if([-412,-352].includes(j.code))throw new Error('Source rate-limited');else checks[id]={checkedAt:day,status:'unverified',code:j.code};
   checked++;if(checked%10===0)console.log(JSON.stringify({phase:'linked-seasons',checked,queued:queue.length,verified:items.size}));await pause(3500);
  }catch(error){failure=error;break;}
 }
 const pending=queue.filter(x=>!checks[x.id]||checks[x.id].status==='unverified').length;
 return {meta:{checkedAt:day,checked,partial:Boolean(failure)||pending>0,rateLimited:Boolean(failure&&/rate-limited/.test(failure.message)),pending,warning:failure?'官方条目核查中断，保留已确认结果，下次继续':null,supplementary:[...items.values()].filter(x=>!indexed.has(x.id)).length},checks,items:[...items.values()]};
}
