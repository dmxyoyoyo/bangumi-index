import {getJson,today} from './shared.mjs';
import {setTimeout as delay} from 'node:timers/promises';
const mid=928123;
const publishers=new Set([mid,11783021]);
export async function collectOfficialVideos(previous,seeds,{request=getJson,pause=delay,day=today(),includeCollections=true}={}){
 const ids=new Set([...Object.keys(previous?.items||{}),...seeds.map(x=>x.bvid)]),items={...previous?.items},checks={...previous?.checks};let sources=previous?.meta?.sources||[],failure=null,checked=0;
 try{if(includeCollections){const j=await request('https://api.bilibili.com/x/polymer/web-space/seasons_series_list?mid='+mid+'&page_num=1&page_size=20'),lists=j.data?.items_lists;
 if([-412,-352].includes(j.code))throw new Error('Source rate-limited');
 if(j.code!==0||!lists?.page||!Array.isArray(lists.series_list)||Number(lists.page.total)>20)throw new Error('官方账号合集列表未完整返回，保留上次结果');sources=[];
 for(const collection of lists.series_list){const info=collection.meta;if(Number(info.mid)!==mid||!Number.isSafeInteger(info.series_id))throw new Error('官方合集身份不匹配');let total=null,count=0,page=1;const seen=new Set();
  do{const result=await request('https://api.bilibili.com/x/series/archives?'+new URLSearchParams({mid:String(mid),series_id:String(info.series_id),only_normal:'true',sort:'desc',pn:String(page),ps:'100'})),d=result.data;
   if([-412,-352].includes(result.code))throw new Error('Source rate-limited');
   if(result.code!==0||!Array.isArray(d?.archives)||!Number.isSafeInteger(d.page?.total))throw new Error('官方合集分页无效');if(total===null)total=d.page.total;if(total!==d.page.total)throw new Error('官方合集同步期间发生变化');
   for(const video of d.archives){if(!/^BV[0-9A-Za-z]{10}$/.test(video.bvid)||seen.has(video.bvid))throw new Error('官方合集条目无效或分页重叠');seen.add(video.bvid);ids.add(video.bvid);}count+=d.archives.length;
   if(!d.archives.length&&count<total)throw new Error('官方合集分页不完整');page++;if(page>100)throw new Error('官方合集分页超出范围');await pause(3500);
  }while(count<total);
  if(count!==total)throw new Error('官方合集分页数量不符');sources.push({id:info.series_id,title:info.name,records:total,complete:true});
 }}}catch(error){failure=error;}
 for(const bvid of ids){if(failure)break;const old=items[bvid];if(old?.checkedAt===day||checks[bvid]&&Date.parse(day)-Date.parse(checks[bvid].checkedAt)<7*86400000)continue;
  try{
  const result=await request('https://api.bilibili.com/x/web-interface/view?bvid='+bvid),d=result.data;
  if(result.code===-404){if(old)items[bvid]={...old,available:false,checkedAt:day};checks[bvid]={checkedAt:day,status:'not-returned'};}
  else if([-412,-352].includes(result.code))throw new Error('Source rate-limited');
  else if(result.code!==0||d?.bvid!==bvid)checks[bvid]={checkedAt:day,status:'unverified',code:result.code};
  else if(!publishers.has(Number(d.owner?.mid)))checks[bvid]={checkedAt:day,status:'non-official'};
  else if(/预告|預告|先导|先導|\bPV\b|\bCM\b|花絮|OP[&＆/]ED|主题曲|主題曲/i.test(d.title)||d.duration<180&&!/^【\d{1,2}月/.test(d.title))checks[bvid]={checkedAt:day,status:'non-episode'};
  else{items[bvid]={bvid,aid:d.aid,title:d.title,cover:d.pic,ownerId:d.owner.mid,ownerName:d.owner.name,publishedAt:d.pubdate,description:d.desc,...(d.redirect_url||old?.redirectUrl?{redirectUrl:d.redirect_url||old.redirectUrl}:{}),...(old?.sourceUrl?{sourceUrl:old.sourceUrl}:{}),parts:d.pages?.map(x=>({page:x.page,title:x.part}))||[],available:d.duration>0,statusNote:d.duration>0?null:'播放状态待确认',checkedAt:day};checks[bvid]={checkedAt:day,status:d.duration>0?'verified':'metadata-only'};}
  checked++;if(checked%10===0)console.log(JSON.stringify({phase:'official-video-check',checked,verified:Object.keys(items).length}));await pause(3500);
  }catch(error){failure=error;}
 }
 return {...previous,meta:{...previous?.meta,checkedAt:day,sources,partial:Boolean(failure),rateLimited:Boolean(failure&&/rate-limited/.test(failure.message)),checked,warning:failure?'官方视频核查中断，保留已确认结果，下次继续':null,officialAccount:'https://space.bilibili.com/'+mid,scope:'官方公开合集、专栏视频线索与已确认正片链接；投稿总目录仍可能遗漏隐藏视频'},checks,items};
}
export async function collectLegacyVideos(previous,leads,{request=getJson,pause=delay,day=today()}={}){
 const items={...previous?.items},legacyChecks={...previous?.legacyChecks},pending=leads.filter(x=>!legacyChecks[x.aid]||Date.parse(day)-Date.parse(legacyChecks[x.aid].checkedAt)>=7*86400000);let failure=null;
 for(let start=0;start<pending.length;start+=40){const batch=pending.slice(start,start+40);
  try{const j=await request('https://api.bilibili.com/x/article/cards?'+new URLSearchParams({ids:batch.map(x=>'av'+x.aid).join(',')}));if([-412,-352].includes(j.code))throw new Error('Source rate-limited');if(j.code!==0||!j.data)throw new Error('旧卡片接口未返回有效数据');
   for(const lead of batch){const d=j.data['av'+lead.aid];
    if(!d||Number(d.aid)!==lead.aid){legacyChecks[lead.aid]={checkedAt:day,status:'unresolved'};continue;}
    if(!publishers.has(Number(d.owner?.mid))||!/^https:\/\/www\.bilibili\.com\/bangumi\/play\/ep\d+/.test(d.redirect_url||'')){legacyChecks[lead.aid]={checkedAt:day,status:'not-official-anime'};continue;}
    if(!/^BV[0-9A-Za-z]{10}$/.test(d.bvid)||!d.title){legacyChecks[lead.aid]={checkedAt:day,status:'unresolved'};continue;}
    items[d.bvid]={bvid:d.bvid,aid:d.aid,title:d.title,cover:d.pic,ownerId:d.owner.mid,ownerName:d.owner.name,publishedAt:d.pubdate,description:d.desc,redirectUrl:d.redirect_url,parts:[],available:true,checkedAt:day,sourceUrl:lead.sourceUrl};legacyChecks[lead.aid]={checkedAt:day,status:'verified',bvid:d.bvid};
   }
   console.log(JSON.stringify({phase:'legacy-cards',checked:Math.min(start+40,pending.length),queued:pending.length,verified:Object.values(legacyChecks).filter(x=>x.status==='verified').length}));await pause(3500);
  }catch(error){failure=error;break;}
 }
 return {...previous,meta:{...previous?.meta,legacyPartial:Boolean(failure),legacyRateLimited:Boolean(failure&&/rate-limited/.test(failure.message))},legacyChecks,items};
}
