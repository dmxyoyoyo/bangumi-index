import OpenCC from 'opencc-js';
import {classifyOrigin} from './origin.mjs';
import {classifyRelease,normalizeOfficialDate} from './release.mjs';
import {readJson,writeJson,saveCatalog,today,getJson} from './shared.mjs';
import {setTimeout as delay} from 'node:timers/promises';
const simplify=OpenCC.Converter({from:'tw',to:'cn'}),day=today();
const c=await readJson('dist/catalog.json');
const excluded=new Set((await readJson('data/excluded-seasons.json',{items:[]})).items.map(x=>x.intlId));c.items=c.items.filter(x=>!excluded.has(x.intlId));
const intl=await readJson('data/intl-metadata.json',await readJson('research/intl-metadata.json',{}));
const zh=await readJson('data/localized-metadata.json',await readJson('research/localized-metadata.json',{}));
const cn=await readJson('data/cn-metadata.json',await readJson('research/cn-metadata.json',{}));
const dump=await readJson('research/bangumi-anime.json',null),saved=await readJson('data/bangumi-subjects.json',{}),manual=await readJson('data/title-overrides.json',{});
export function key(text){return String(text||'').normalize('NFKC').toLowerCase().replace(/&amp;/g,'&').replace(/[\p{P}\p{S}\p{Z}\s]/gu,'');}
function aliases(s){const block=s.infobox?.match(/\|别名\s*=\s*\{([\s\S]*?)\}/)?.[1]||'';return [...block.matchAll(/\[([^\]\r\n]+)\]/g)].map(x=>x[1].split('|').at(-1).trim());}
function variant(text){const value=String(text||'');if(/thai\s*dub|泰配版/i.test(value))return '（泰语配音版）';if(/dub\s*indo|indo\s*dub|印配版/i.test(value))return '（印尼语配音版）';if(/dub\s*(?:eng|english)|english\s*dub|英配版/i.test(value))return '（英语配音版）';if(/vietnamese\s*dub|越配版/i.test(value))return '（越南语配音版）';return '';}
function base(text){return String(text||'').replace(/[（(][^()（）]*(?:dub|配版|配音版|仅限)[^()（）]*[)）]/gi,'').trim();}
function season(text){const t=String(text||'').normalize('NFKC');const m=t.match(/season\s*(\d+)|(\d+)(?:st|nd|rd|th)\s*season|第([一二三四五六七八九十\d]+)[季期]|(?:^|\s)([IV]{1,4})(?:$|\s)/i);if(m){const v=m[1]||m[2]||m[3]||m[4];return Number(v)||({一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,I:1,II:2,III:3,IV:4}[v.toUpperCase()]||null);}if(/[参叁三][ノ之]章/.test(t))return 3;if(/そのに/.test(t))return 2;return null;}
const subjects=dump?.items||Object.values(saved);const index=new Map();
for(const s of dump?.items||[]){s.aliases=s.aliases||aliases(s);for(const name of [s.name,s.name_cn,...s.aliases]){for(const k of [key(name),key(simplify(name||''))]){if(!k)continue;const list=index.get(k)||[];if(!list.some(x=>x.id===s.id))list.push(s);index.set(k,list);}}}
function strict(text){return String(text||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/[’‘]/g,"'");}
function findSubject(item,meta,local){const expected=season(item.officialTitle)||season(item.title);for(const title of [base(item.title),base(item.officialTitle),meta?.originName,local?.originName,...(item.aliases||[])]){const found=(index.get(key(title))||index.get(key(simplify(title||'')))||[]).filter(s=>!expected||expected===1||season(s.name_cn+' '+s.name)===expected);const precise=found.filter(s=>[s.name,s.name_cn,...(s.aliases||[])].some(n=>strict(n)===strict(title)));if(precise.length===1)return precise[0];if(found.length===1)return found[0];}return null;}
const releaseOverrides=await readJson('data/release-overrides.json',{});
const countries=await readJson('data/bangumi-countries.json',{}),originOverrides=await readJson('data/origin-overrides.json',{});
const forced=await readJson('data/bangumi-matches.json',{});const selected={};let bgmCount=0,apiLookups=0;
for(const item of c.items){const meta=intl[item.intlId],local=zh[item.intlId];let subject=(forced[item.intlId]?(saved[item.intlId]?.id===forced[item.intlId]?saved[item.intlId]:subjects.find(s=>s.id===forced[item.intlId])):saved[item.intlId])||findSubject(item,meta,local);
 if(!subject&&!process.argv.includes('--offline')&&(!meta?.originName||!/[\p{Script=Han}]/u.test(item.title)||item.release?.status==='unknown'&&/[\u3040-\u30ff]/.test(meta?.originName||''))){
  const keyword=meta?.originName||base(item.title);if(keyword){const response=await getJson('https://api.bgm.tv/v0/search/subjects?limit=5',{method:'POST',headers:{'User-Agent':'SEA-Bangumi-Index/1.0 (https://sea-bangumi-index.qmqy.chatgpt.site)','Content-Type':'application/json'},body:JSON.stringify({keyword,sort:'match',filter:{type:[2]}})});apiLookups++;const found=(response.data||[]).filter(s=>[s.name,s.name_cn].some(x=>key(x)===key(keyword)));if(found.length===1){const detail=await getJson('https://api.bgm.tv/v0/subjects/'+found[0].id,{headers:{'User-Agent':'SEA-Bangumi-Index/1.0 (https://sea-bangumi-index.qmqy.chatgpt.site)'}});subject={id:detail.id,name:detail.name,name_cn:detail.name_cn,date:detail.date,aliases:(detail.infobox||[]).filter(x=>x.key==='别名').flatMap(x=>Array.isArray(x.value)?x.value.map(v=>v.v):[x.value])};}await delay(1000);}
 }
 if(subject&&!process.argv.includes('--offline')&&item.release?.status!=='aired'&&saved[item.intlId]?.checkedAt!==day){const fresh=await getJson('https://api.bgm.tv/v0/subjects/'+subject.id,{headers:{'User-Agent':'SEA-Bangumi-Index/1.0 (https://sea-bangumi-index.qmqy.chatgpt.site)'}});subject={...subject,name:fresh.name,name_cn:fresh.name_cn,date:fresh.date};await delay(1000);}
 if(subject&&!process.argv.includes('--offline')&&!countries[subject.id]&&Number(meta?.type)!==4&&!/[\u3040-\u30ff]/u.test([subject.name,meta?.originName,local?.originName].filter(Boolean).join(' '))){const detail=await getJson('https://api.bgm.tv/v0/subjects/'+subject.id,{headers:{'User-Agent':'SEA-Bangumi-Index/1.0 (https://sea-bangumi-index.qmqy.chatgpt.site)'}});countries[subject.id]={tags:detail.meta_tags||[],checkedAt:day};await delay(1000);}
 if(subject){selected[item.intlId]={id:subject.id,name:subject.name,name_cn:subject.name_cn,date:subject.date,aliases:subject.aliases||[],checkedAt:day};bgmCount++;}
 const previous=item.title,sea=meta?.title||item.officialTitle||item.title,extra=variant(sea)||variant(item.title);let name=manual[item.intlId]?.title;
 let nameSource=manual[item.intlId]?.source||null;
 const isChinese=t=>Boolean(t&&/\p{Script=Han}/u.test(t)&&!/[\u3040-\u30ff]/u.test(t));
 if(!name&&isChinese(local?.title)){name=base(local.title);nameSource='B站国际版官方简体中文';}
 if(!name&&subject){name=subject.name_cn;if(!isChinese(name))name=subject.aliases?.find(isChinese)||(isChinese(previous)?base(previous):(item.aliases||[]).find(isChinese))||name||subject.name;if(name)nameSource='Bangumi 番组计划';}
 if(!name&&isChinese(previous)){name=base(previous);nameSource='历史中文目录';}
 if(!name&&isChinese(meta?.originName)){name=meta.originName;nameSource='B站国际版官方作品原名';}
 if(!name){name=base(local?.title)||base(previous);nameSource='官方名称保留';}
 item.title=simplify(name).trim();if(extra&&!item.title.endsWith(extra))item.title+=extra;
 item.seaTitle=sea;item.seaTitleSource=meta?.available===false?'历史目录':meta?'官方国际版':'历史目录';
 const original=subject?.name||local?.originName||meta?.originName||null;
 const countryTags=countries[subject?.id]?.tags||[];
 const nonJapanese=Number(meta?.type)===4||!countryTags.includes('日本')&&countryTags.some(x=>['中国','美国','韩国','英国','法国','加拿大','德国','澳大利亚'].includes(x))||/中国|china|美国|united states|korea|韩国/i.test(local?.originAreas||meta?.originAreas||'');
 const isJapan=!nonJapanese&&(manual[item.intlId]?.language==='ja'||countryTags.includes('日本')||/日本|japan/i.test(local?.originAreas||meta?.originAreas||'')||/[\u3040-\u30ff]/u.test([original,local?.originName,meta?.originName].filter(Boolean).join(' ')));
 item.japaneseTitle=isJapan?original:null;item.originalName=original;item.originalNameStatus=isJapan?'japanese':Number(meta?.type)===4||/中国|china|美国|united states|korea|韩国/i.test(local?.originAreas||meta?.originAreas||'')?'non-japanese':'unknown';
 const overrideOrigin=originOverrides[item.intlId],origin=overrideOrigin&&!meta?.originAreas&&!local?.originAreas?overrideOrigin:classifyOrigin({area:meta?.originAreas||local?.originAreas,type:meta?.type,tags:countryTags,japaneseOriginal:isJapan});item.originCategory=origin.category;item.originCategorySource=origin.source;
 item.nameSource=nameSource;item.bangumiId=subject?.id||null;item.nameSourceUrl=subject&&nameSource==='Bangumi 番组计划'?'https://bgm.tv/subject/'+subject.id:manual[item.intlId]?.url||'https://api.bilibili.tv/intl/gateway/web/v2/ogv/play/season_info?season_id='+item.intlId+'&s_locale=zh_CN';
 item.aliases=[...new Set([...(item.aliases||[]),previous,sea,original,subject?.name_cn,...(subject?.aliases||[])].filter(Boolean))];
 // Store a source date independently from whether a Chinese ID has been allocated.
 item.cover=meta?.cover||local?.cover||cn[item.cnId]?.cover||item.cover||'';
 const chinese=cn[item.cnId],override=releaseOverrides[item.intlId],cnDate=chinese?.publish?.pub_time?.slice(0,10),date=normalizeOfficialDate(override?.date||local?.airDate||meta?.airDate||(extra&&cnDate)||subject?.date||cnDate||'');
 const source=override?.source||(local?.airDate||meta?.airDate?'B站国际版':extra&&cnDate?'B站中国版':subject?.date?'Bangumi':cnDate?'B站中国版':null);
 const evidence=override?.url||(source==='Bangumi'?'https://bgm.tv/subject/'+subject.id:source==='B站中国版'?'https://api.bilibili.com/pgc/view/web/season?season_id='+item.cnId:'https://api.bilibili.tv/intl/gateway/web/v2/ogv/play/season_info?season_id='+item.intlId+'&s_locale=zh_CN');
 const result=classifyRelease({date,day,started:chinese?.publish?.is_started===1,finished:local?.isFinished===true||meta?.isFinished===true,officialUpcoming:override?.verifiedSchedule===true||chinese?.publish?.is_started===0&&source==='B站中国版'});
 item.release={...result,date:date||null,source,evidenceUrl:source?evidence:null,checkedAt:day,note:[override?.note,extra&&source==='Bangumi'?'日期为原作开播日期，本配音版日期待核实':result.status==='upcoming'&&!result.confirmed?'预计排期；提前配信及平台上线状态待核实':null].filter(Boolean).join('；')||null};
}
await writeJson('data/bangumi-countries.json',countries);await writeJson('data/bangumi-subjects.json',selected);await writeJson('data/intl-metadata.json',intl);await writeJson('data/localized-metadata.json',zh);await writeJson('data/cn-metadata.json',cn);c.meta.titleNote='中文标题优先使用官方简体中文与 Bangumi 名称；简繁转换仅用于中文标题，日文原名保留来源写法。拉丁字母品牌名称可能保留官方名称。';
c.meta.updatedAt=day;await saveCatalog(c);
console.log(JSON.stringify({phase:'enrichment-complete',records:c.items.length,bangumiMatched:bgmCount,apiLookups,release:c.items.reduce((a,x)=>(a[x.release.status]=(a[x.release.status]||0)+1,a),{}),latinTitles:c.items.filter(x=>!/[\p{Script=Han}]/u.test(x.title)).map(x=>({id:x.intlId,title:x.title,source:x.nameSource})).slice(0,80),missingJapanese:c.items.filter(x=>x.originalNameStatus==='unknown').length}));



