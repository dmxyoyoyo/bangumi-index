import {getJson,today} from './shared.mjs';
import {setTimeout as delay} from 'node:timers/promises';

export function seasonPage(response,target,sourceUrl,day=today()){
 const field=target.kind==='ep'?'ep_id':'season_id';let s,verification='official-season-page';
 if(typeof response==='string'){
  const match=response.match(/<script\b(?=[^>]*\bid="__NEXT_DATA__")[^>]*>([\s\S]*?)<\/script>/);if(!match)return null;
  const page=JSON.parse(match[1]),queries=page.props?.pageProps?.dehydratedState?.queries||[];
  s=queries.find(x=>x.queryKey?.[0]==='pgc/view/web/simple/season'&&Number(x.queryKey[1]?.[field])===target.id&&x.state?.status==='success')?.state?.data;
 }else{
  const api=new URL(response.sourceUrl);if(api.origin!=='https://api.bilibili.com'||api.pathname!=='/pgc/view/web/simple/season'||Number(api.searchParams.get(field))!==target.id||response.code!==0)return null;
  s=response.result;sourceUrl=api.href;verification='official-simple-season';
 }
 if(!Number.isSafeInteger(s?.season_id)||s.season_id<=0||!s.title||![1,2,4].includes(Number(s.season_type))||target.kind==='ss'&&s.season_id!==target.id)return null;
 return {id:s.season_id,mediaId:Number(s.media_id)||null,title:s.title,cover:s.cover||'',type:Number(s.season_type),areas:s.areas||[],japaneseTitle:s.jp_title||'',date:s.publish?.release_date||s.publish?.pub_time?.slice(0,10)||'',indexShow:s.new_ep?.desc||'',historical:true,sourceUrl,checkedAt:day,verification,episodeIds:target.kind==='ep'?[target.id]:[],seasons:(s.seasons||[]).map(x=>({id:Number(x.season_id),title:x.season_title}))};
}
async function getPage(url){
 const target=new URL(url).pathname.match(/^\/bangumi\/play\/(ep|ss)(\d+)$/),sourceUrl='https://api.bilibili.com/pgc/view/web/simple/season?'+(target[1]==='ep'?'ep_id=':'season_id=')+target[2],j=await getJson(sourceUrl);
 if(j.code===0)return {...j,sourceUrl};if([-412,-352].includes(j.code))throw new Error('Source rate-limited');if(![-404,-1].includes(j.code))throw new Error('Season metadata not returned');
 const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0',Referer:'https://www.bilibili.com/'},signal:AbortSignal.timeout(30000)});if([412,429].includes(r.status))throw new Error('Source rate-limited');if(r.status===404)return '';if(!r.ok)throw new Error('Season page HTTP '+r.status);return r.text();
}
export async function collectSeasonPages(previous,videos,{seeds=[],knownSeasonIds=[],request=getPage,pause=delay,budget=60,day=today(),onProgress=async()=>{}}={}){
 const checks={...previous?.checks},items=new Map((previous?.items||[]).map(x=>[x.id,{...x,episodeIds:[...x.episodeIds||[]]}])),queue=[],seen=new Set();let checked=0,failure=null;
 const known=new Set(knownSeasonIds);
 function add(kind,id){const key=kind+':'+id;if(!Number.isSafeInteger(id)||id<=0||seen.has(key)||kind==='ss'&&known.has(id)&&!items.has(id))return;seen.add(key);queue.push({kind,id,key});}
 for(const video of Object.values(videos.items||{})){const ep=video.redirectUrl?.match(/^https:\/\/www\.bilibili\.com\/bangumi\/play\/ep(\d+)(?:[/?#]|$)/);if(ep)add('ep',Number(ep[1]));}
 for(const seed of seeds)add('ss',seed.id);
 for(const item of items.values())for(const related of item.seasons||[])add('ss',related.id);
 queue.sort((a,b)=>Number(!checks[b.key])-Number(!checks[a.key])||Number(checks[a.key]?.status==='verified')-Number(checks[b.key]?.status==='verified'));
 function snapshot(){return {meta:{checkedAt:day,checked,partial:Boolean(failure)||queue.some(x=>!checks[x.key]||checks[x.key].status!=='verified'),rateLimited:Boolean(failure&&/rate-limited/.test(failure.message)),pending:queue.filter(x=>!checks[x.key]||checks[x.key].status!=='verified').length},checks,items:[...items.values()]};}
 for(const target of queue){if(checked>=budget)break;const old=checks[target.key];if(old&&Date.parse(day)-Date.parse(old.checkedAt)<7*86400000&&(old.status!=='verified'||items.has(old.seasonId)))continue;
  if(target.kind==='ss'&&items.get(target.id)?.checkedAt===day){checks[target.key]={checkedAt:day,status:'verified',seasonId:target.id};continue;}
  const url='https://www.bilibili.com/bangumi/play/'+target.kind+target.id;
  try{const item=seasonPage(await request(url),target,url,day);if(item){const prior=items.get(item.id);if(!item.japaneseTitle&&prior?.japaneseTitle){item.japaneseTitle=prior.japaneseTitle;if(prior.japaneseTitleSource)item.japaneseTitleSource=prior.japaneseTitleSource;}item.episodeIds=[...new Set([...prior?.episodeIds||[],...item.episodeIds])];items.set(item.id,item);checks[target.key]={checkedAt:day,status:'verified',seasonId:item.id};for(const related of item.seasons)add('ss',related.id);}else checks[target.key]={checkedAt:day,status:'unresolved'};checked++;
   if(checked%10===0){await onProgress(snapshot());console.log(JSON.stringify({phase:'season-pages',checked,queued:queue.length,verified:items.size}));}await pause(3500);
  }catch(error){failure=error;break;}
 }
 return snapshot();
}
