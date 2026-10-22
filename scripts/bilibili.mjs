import fs from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import OpenCC from 'opencc-js';
import {readJson,writeJson,root,today} from './shared.mjs';
import {collectDirectory,preserveDirectoryHistory} from './bilibili-directory.mjs';
import {collectOfficialVideos,collectLegacyVideos} from './bilibili-videos.mjs';
import {collectHistory,getMediaPage} from './bilibili-history.mjs';
import {collectOrigins} from './bilibili-origins.mjs';
import {classifyOrigin} from './origin.mjs';
import {collectArticleLeads,collectLinkedSeasons} from './bilibili-discovery.mjs';
import {collectSeasonPages} from './bilibili-pages.mjs';
import {regionalTitles} from './bilibili-titles.mjs';
import {fillBilibiliOriginals} from './bilibili-originals.mjs';
import {fillBilibiliDates} from './bilibili-dates.mjs';
const simplify=OpenCC.Converter({from:'tw',to:'cn'});
const traditional=OpenCC.Converter({from:'cn',to:'tw'});
export const key=text=>simplify(String(text||'')).normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]/gu,'');
const editionKey=text=>simplify(String(text||'')).normalize('NFKC').toLowerCase().replace(/\s/gu,'');
export function videoWorkTitle(title,{episodic=false}={}){const monthly=/^【\d{1,2}月(?:[\/／](?:完结|完結))?】/.test(title),restriction=title.match(/[（(【\[]\s*(?:[僅仅]限|[僅仅])[^()（）【】\[\]]+[)）】\]]/)?.[0]||'';let name=stripRegion(title).replace(/^【(?:\d{1,2}月(?:[\/／](?:完结|完結))?|合集|剧场版|劇場版|电影|電影)】\s*/, '');if(monthly||episodic)name=name.replace(/\s*【(?:完结|完結|独家正版|獨家正版)】\s*$/,'').replace(/\s+\d{1,3}(?:\s*[（(][^()（）]*[)）])?$/,'');return name.trim()+restriction;}
export function stripRegion(title){return String(title||'').replace(/[（(【\[]\s*(?:[僅仅]限|只限|[僅仅]在|只在|[僅仅])[^()（）【】\[\]]+(?:[)）】\]]|$)/g,'').trim();}
export function regionalLabel(title){const text=simplify(title);return text.match(/[（(【\[]\s*(?:仅限|只限|仅在|只在|仅)([^()（）【】\[\]]+?)(?:地区)?(?:[）)】\]]|$)/)?.[0].replace(/[（）()【】\[\]]/g,'').trim()||'以官方播放权限为准';}
export function buildBilibili({directory,videos,chinese,subjects,countries={},origins={items:{}},extras={items:[]},overrides={},titleLinks={},originalReferences=[],originalOverrides={},premieres={}}){
 const names=new Map();for(const s of Object.values(subjects)){if(!s.name)continue;for(const name of [s.name_cn,s.name,...s.aliases||[]]){const k=key(name);if(!k)continue;const found=names.get(k)||new Map();found.set(s.id,s);names.set(k,found);}}
 const originals=new Map(),japaneseNames=new Set((extras.originals||[]).map(s=>editionKey(s.name)));for(const s of extras.originals||[])for(const name of [s.name,...s.aliases||[]]){const k=editionKey(name);if(!k)continue;originals.set(k,!originals.has(k)||originals.get(k)===s.name?s.name:null);}
 const localizedTitle=regionalTitles(extras.originals||[],subjects,titleLinks),items=new Map(),byName=new Map(),byEpisode=new Map();
 for(const entry of [...directory.items,...extras.items]){
  for(const ep of entry.episodeIds||[]){if(!byEpisode.has(ep))byEpisode.set(ep,entry.id);else if(byEpisode.get(ep)!==entry.id)byEpisode.set(ep,null);}
  if(items.has('ss:'+entry.id))continue;
  const meta=chinese[entry.id],official=entry.title,base=stripRegion(official),matches=names.get(key(base)),subject=matches?.size===1?[...matches.values()][0]:null;
  const region=regionalLabel(official),localized=/[港澳台]/.test(region)?localizedTitle({...entry,japaneseTitle:entry.japaneseTitle||meta?.jpTitle||subject?.name},base):null;
  const reference=originals.get(editionKey(base)),original=localized?.japaneseTitle||subject?.name||meta?.jpTitle||entry.japaneseTitle||reference||'',isJapanese=entry.type!==4&&entry.sourceType!==4&&(japaneseNames.has(editionKey(original))||Boolean(reference)||/[\u3040-\u30ff]/u.test(original)||[...entry.areas||[],...meta?.areas||[]].some(x=>Number(x.id)===2||x.name==='日本')||countries[subject?.id]?.tags?.includes('日本'));
  const areas=entry.areas?.length?entry.areas:meta?.areas||[],facet=origins.items?.[entry.id],origin=areas.length?classifyOrigin({area:areas.map(x=>x.name).join(' ')}):facet?{category:facet.category,source:facet.source}:classifyOrigin({type:entry.sourceType||entry.type,tags:countries[subject?.id]?.tags,japaneseOriginal:isJapanese});
  const item={key:'ss:'+entry.id,id:entry.id,title:localized?localized.title+'（'+region+'）':simplify(entry.title),officialTitle:official,traditionalTitle:/[港澳台]/.test(region)?traditional(official):'',japaneseTitle:isJapanese?original:'',originalTitle:original,originCategory:origin.category,originSource:origin.source,cover:entry.cover||meta?.cover||'',date:meta?.publish?.pub_time?.slice(0,10)||entry.date||'',indexShow:entry.indexShow||'',region,source:entry.historical?'历史番剧条目':'官方番剧目录',url:'https://www.bilibili.com/bangumi/play/ss'+entry.id,videos:[],aliases:[...new Set([...subject?.aliases||[],...entry.aliases||[],...localized?.aliases||[]])],...(localized?{titleSource:localized.source}:{})};
  items.set(item.key,item);const k=editionKey(base),list=byName.get(k)||[];list.push(item);byName.set(k,list);
 }
 for(const video of Object.values(videos.items)){
  const seed=overrides[video.bvid],linked=Number.isSafeInteger(seed?.seasonId)?items.get('ss:'+seed.seasonId):null;
  if(linked&&seed.seasonTitle&&editionKey(stripRegion(linked.officialTitle))===editionKey(stripRegion(seed.seasonTitle))){linked.aliases.push(video.bvid,videoWorkTitle(video.title,{episodic:true}));continue;}
  const ep=video.redirectUrl?.match(/^https:\/\/www\.bilibili\.com\/bangumi\/play\/ep(\d+)(?:[/?#]|$)/);
  if(ep){const canonical=items.get('ss:'+byEpisode.get(Number(ep[1])));if(canonical)canonical.aliases.push(video.bvid,videoWorkTitle(video.title,{episodic:true}));continue;}
  const title=seed?.title||videoWorkTitle(video.title,{episodic:Boolean(video.redirectUrl)}),k=editionKey(title),base=stripRegion(title),matched=(byName.get(editionKey(base))||[]).filter(x=>x.region.replace(/地区/g,'')===regionalLabel(title).replace(/地区/g,'')),existing=matched.length===1?matched[0]:items.get('bv:'+k);
  const matches=names.get(key(base)),subject=matches?.size===1?[...matches.values()][0]:null,reference=originals.get(editionKey(base)),original=subject?.name||reference||'';
  const item=existing||{key:'bv:'+k,id:null,title:simplify(title),officialTitle:title,traditionalTitle:/[港澳台]/.test(regionalLabel(title))?traditional(title):'',japaneseTitle:reference||japaneseNames.has(editionKey(original))||/[\u3040-\u30ff]/u.test(original)||countries[subject?.id]?.tags?.includes('日本')?original:'',originalTitle:original,cover:video.cover||'',date:new Date(video.publishedAt*1000).toISOString().slice(0,10),indexShow:'官方账号正片',region:regionalLabel(title),source:'官方账号投稿',url:'https://www.bilibili.com/video/'+video.bvid+'/',videos:[],aliases:subject?.aliases||[]};
  if(!existing){const origin=classifyOrigin({tags:countries[subject?.id]?.tags,japaneseOriginal:Boolean(item.japaneseTitle)});Object.assign(item,{originCategory:origin.category,originSource:origin.source});items.set(item.key,item);}item.videos.push({bvid:video.bvid,title:video.title,url:'https://www.bilibili.com/video/'+video.bvid+'/',available:video.available!==false,statusNote:video.statusNote||null,publishedAt:video.publishedAt});
 }
 fillBilibiliOriginals([...items.values()],[...extras.items,...directory.items],extras.originals||[],{references:originalReferences,overrides:originalOverrides});
 fillBilibiliDates([...items.values()],{entries:[...extras.items,...directory.items],chinese,originals:extras.originals||[],saved:premieres});
 for(const item of items.values()){item.cover=item.cover.replace(/^http:/,'https:');item.videos.sort((a,b)=>a.publishedAt-b.publishedAt);if(!item.id)item.url=item.videos.find(x=>x.available)?.url||item.url;}
 return {meta:{updatedAt:today(),lastSuccessfulRefresh:directory.meta.checkedAt,sourceCounts:directory.meta.sources,records:items.size,coverage:'收录当前请求地区的官方番剧与国创索引，并补充官方作品卡片、历史媒体资料、关联季度及官方账号视频。部分公开接口仍受限，隐藏及港澳台内容尚不能保证全量；收录不代表当前网络可播放。'},items:[...items.values()]};
}
export async function build({offline=false}={}){
 let directory=await readJson('data/bilibili-directory.json',null),videos=await readJson('data/bilibili-videos.json',{items:{}}),history=await readJson('data/bilibili-history.json',{items:[],checks:{}}),discovery=await readJson('data/bilibili-discovery.json',{}),linked=await readJson('data/bilibili-linked.json',{items:[],checks:{}}),pages=await readJson('data/bilibili-pages.json',{items:[],checks:{}}),origins=await readJson('data/bilibili-origins.json',{items:{}});const seeds=await readJson('data/bilibili-video-seeds.json',[]),archive=await readJson('data/bilibili-archive.json',{items:[]});
 if(!offline){const previous=directory;directory=await collectDirectory();history=preserveDirectoryHistory(previous,directory,history);
  try{discovery=await collectArticleLeads(discovery,await readJson('data/bilibili-discovery-sources.json',[]));if(discovery.meta.partial)console.warn('部分专栏未能刷新，沿用已保存的线索。');}catch{console.warn('专栏线索刷新失败，保留已确认记录。');}
  let limited=discovery.meta?.rateLimited;
  if(!limited)try{pages=await collectSeasonPages(pages,videos,{seeds:[...seeds.filter(x=>Number.isSafeInteger(x.seasonId)).map(x=>({id:x.seasonId})),...linked.items.filter(x=>x.verification!=='official-season'),...discovery.seasons||[],...archive.items,...history.items.flatMap(x=>x.seasons||[])],knownSeasonIds:[...directory.items,...history.items].map(x=>x.id)});limited=pages.meta.rateLimited;if(pages.meta.partial)console.warn('部分旧入口仍待恢复番剧页，保留线索供下次继续。');}catch{console.warn('官方番剧网页暂未有效返回，保留上次已核验结果。');}
  if(!limited)try{linked=await collectLinkedSeasons(linked,discovery.seasons||[],directory,{cards:discovery.cards||[]});limited=linked.meta.rateLimited;if(linked.meta.warning)console.warn(linked.meta.warning);}catch{console.warn('关联季度暂未核查完成，保留上次结果。');}
  if(!limited)try{videos=await collectLegacyVideos(videos,discovery.legacyVideos||[]);limited=videos.meta.legacyRateLimited;if(!limited)videos=await collectOfficialVideos(videos,[...seeds,...discovery.videos||[]]);limited=limited||videos.meta.rateLimited;if(videos.meta.warning)console.warn(videos.meta.warning);}catch{if(!Object.keys(videos.items).length)throw new Error('官方视频缓存缺失且接口未能读取');console.warn('官方账号合集暂未返回，保留上次已核验视频。');}
  if(!limited)try{history=await collectHistory(history,directory,{pageRequest:getMediaPage,knownItems:[...linked.items,...pages.items],extraSeeds:archive.items});limited=history.meta.rateLimited;if(history.meta.warning)console.warn(history.meta.warning);}catch{console.warn('历史与港澳台条目核查暂未完成，保留上次已核验记录，下次继续。');}
  if(!limited)try{origins=await collectOrigins();}catch{console.warn('制作地区筛选未能完整刷新，保留原有分类依据。');}
  for(const [path,data] of [['directory',directory],['videos',videos],['history',history],['discovery',discovery],['linked',linked],['pages',pages],['origins',origins]])await writeJson('data/bilibili-'+path+'.json',data);
 }
 if(!directory?.items?.length)throw new Error('国区目录缓存缺失，需先完成在线同步');
 const historyById=new Map(history.items.map(x=>[x.id,x]));
 const sea=await readJson('dist/catalog.json'),gamer=await readJson('dist/gamer-catalog.json');
 const originalReferences=[...sea.items.filter(x=>x.japaneseTitle).map(x=>({names:[x.title,x.officialTitle,...x.aliases||[]],japaneseTitle:x.japaneseTitle,sourceUrl:x.nameSourceUrl})),...gamer.items.filter(x=>x.japaneseTitle).map(x=>({names:[x.title,x.officialTitle],japaneseTitle:x.japaneseTitle,sourceUrl:x.originalSourceUrl}))];
 const catalog=buildBilibili({directory,videos,origins,chinese:await readJson('data/cn-metadata.json',{}),subjects:await readJson('data/bangumi-subjects.json',{}),countries:await readJson('data/bangumi-countries.json',{}),titleLinks:await readJson('data/bilibili-title-links.json',{}),originalReferences,originalOverrides:await readJson('data/bilibili-originals.json',{}),premieres:await readJson('data/bilibili-dates.json',{}),extras:{...history,items:[...pages.items.map(x=>{const inherited=historyById.get(x.id)||{};return {...inherited,...x,areas:x.areas?.length?x.areas:inherited.areas||[],japaneseTitle:x.japaneseTitle||inherited.japaneseTitle||'',aliases:[...inherited.aliases||[],...x.aliases||[]]};}),...history.items,...linked.items]},overrides:Object.fromEntries(seeds.map(x=>[x.bvid,x]))});
 await writeJson('dist/bilibili-catalog.json',catalog);await fs.writeFile(new URL('dist/bilibili-data.js',root),'window.BILIBILI_CATALOG='+JSON.stringify(catalog).replace(/</g,'\\u003c')+';\n');
 await fs.writeFile(new URL('dist/home-data.js',root),'window.PLATFORM_COUNTS='+JSON.stringify({sea:sea.items.length,gamer:gamer.items.length,bilibili:catalog.items.length})+';\n');
 console.log(JSON.stringify({phase:'bilibili-complete',records:catalog.items.length,officialVideos:Object.keys(videos.items).length,regional:catalog.items.filter(x=>/[港澳台臺]/.test(x.region)).length}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await build({offline:process.argv.includes('--offline')});
