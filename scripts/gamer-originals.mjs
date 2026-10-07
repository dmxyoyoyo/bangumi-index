import OpenCC from 'opencc-js';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {readJson,writeJson,today,getJson} from './shared.mjs';
const simplify=OpenCC.Converter({from:'tw',to:'cn'});
const key=text=>simplify(String(text||'')).normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\p{Z}\s]/gu,'');
const kana=text=>/[\u3040-\u30ff]/u.test(text||'');
function clean(html){return html.replace(/<[^>]*>/g,'').replace(/&#(x[\da-f]+|\d+);/gi,(_,code)=>String.fromCodePoint(code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code))).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,code)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[code]).replace(/\s+/g,' ').trim();}
export function parseAcgOriginals(html){
 const block=html.match(/<div class=["']ACG-info-container["']>([\s\S]*?)<\/ul>/)?.[1];
 if(!block||!block.includes('<h1>'))throw new Error('官方 ACG 标题字段未能读取');
 const title=clean(block.match(/<h1>([\s\S]*?)<\/h1>/)?.[1]||'');
 const names=[...block.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(x=>clean(x[1]));
 const region=clean(block.match(/首播地區[：:]([\s\S]*?)<\/li>/)?.[1]||'');
 const japanese=kana(names[0])||region.includes('日本');
 const nonJapanese=!japanese&&/韓國|中國|台灣|香港|美國|英國|法國|歐洲|俄羅斯|德國|巴西|加拿大|澳洲/.test(region);
 const japaneseTitle=japanese?(names[0]||(names[1]&&key(names[1])===key(title)?names[1]:'')):'';
 return {title,candidateOriginalTitle:names[0]||'',englishTitle:names[1]||'',japaneseTitle,originalTitle:japaneseTitle||(nonJapanese?names.find(Boolean)||title:''),originalStatus:japaneseTitle?'japanese':nonJapanese?'non-japanese':'missing',premiereRegion:region};
}
async function exactBangumi(item,parsed,subject){
 const options={headers:{'User-Agent':'SEA-Bangumi-Index/1.0 (https://sea-bangumi-index.qmqy.chatgpt.site)',Referer:'https://bgm.tv/'}};
 if(subject)return getJson('https://api.bgm.tv/v0/subjects/'+subject.id,options);
 for(const title of [...new Set([parsed.candidateOriginalTitle,parsed.englishTitle,simplify(item.title)].filter(Boolean))]){
  const result=await getJson('https://api.bgm.tv/v0/search/subjects?limit=10',{...options,method:'POST',headers:{...options.headers,'Content-Type':'application/json'},body:JSON.stringify({keyword:title,sort:'match',filter:{type:[2]}})});
  const matches=(result.data||[]).filter(s=>[s.name,s.name_cn].some(name=>key(name)===key(title)));
  if(matches.length===1)return getJson('https://api.bgm.tv/v0/subjects/'+matches[0].id,options);
  await delay(500);
 }
 return null;
}
async function fetchOriginal(item,subject){
 const acgId=Number(item.acgSn),url='https://acg.gamer.com.tw/acgDetail.php?s='+acgId;
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 if(response.status===404)return {acgId,japaneseTitle:'',originalTitle:'',originalStatus:'missing',source:'巴哈姆特 ACG 资料页未返回',sourceUrl:url,checkedAt:today()};
 if(!response.ok)throw new Error('巴哈姆特 ACG 原名资料 HTTP '+response.status+'；保留已核查缓存');
 const parsed=parseAcgOriginals(await response.text());
 if(parsed.originalStatus==='missing'){
  const found=await exactBangumi(item,parsed,subject);
  if(found){const tags=found.meta_tags||[],common={acgId,...parsed,source:'Bangumi 精确原名与巴哈姆特资料核对',sourceUrl:'https://bgm.tv/subject/'+found.id,acgEvidenceUrl:url,bangumiId:found.id,checkedAt:today()};if(kana(found.name)||tags.includes('日本')||parsed.premiereRegion.includes('日本'))return {...common,japaneseTitle:found.name,originalTitle:found.name,originalStatus:'japanese'};if(tags.some(x=>['中国','国产','美国','英国','法国','韩国','台湾','香港'].includes(x)))return {...common,japaneseTitle:'',originalTitle:found.name,originalStatus:'non-japanese'};}
 }
 return {acgId,...parsed,source:'巴哈姆特 ACG 作品资料',sourceUrl:url,checkedAt:today()};
}
export async function enrichGamerOriginals(raw,{offline=false,bootstrap=false}={}){
 const cache=await readJson('data/gamer-originals.json',{});
 const saved=Object.values(await readJson('data/bangumi-subjects.json',{}));
 const dump=bootstrap?await readJson('research/bangumi-anime.json',null):null;
 const names=new Map();
 for(const s of [...saved,...dump?.items||[]]){
  const aliases=s.aliases||[...(s.infobox?.match(/\|别名\s*=\s*\{([\s\S]*?)\}/)?.[1]||'').matchAll(/\[([^\]\r\n]+)\]/g)].map(x=>x[1].split('|').at(-1).trim());
  for(const name of [s.name,s.name_cn,...aliases]){const k=key(name);if(!k)continue;const matches=names.get(k)||new Map();matches.set(s.id,s);names.set(k,matches);}
 }
 const hints=new Map();
 for(const item of raw.items){
  const id=Number(item.animeSn),acgId=Number(item.acgSn);
  const matches=names.get(key(item.title)),subject=matches?.size===1?[...matches.values()][0]:null;
  hints.set(id,subject);
  if(cache[id]?.acgId===acgId){
   const original=cache[id];
   if(original.originalStatus==='non-japanese'&&kana(original.originalTitle))cache[id]={...original,japaneseTitle:original.originalTitle,originalStatus:'japanese'};
   else if(original.originalStatus==='missing'&&original.premiereRegion?.includes('日本')&&subject?.name)cache[id]={...original,japaneseTitle:subject.name,originalTitle:subject.name,originalStatus:'japanese',source:'Bangumi 精确原名与巴哈姆特资料核对',sourceUrl:'https://bgm.tv/subject/'+subject.id,acgEvidenceUrl:original.sourceUrl,bangumiId:subject.id};
   continue;
  }
  if(subject&&kana(subject.name))cache[id]={acgId,japaneseTitle:subject.name,originalTitle:subject.name,originalStatus:'japanese',source:'Bangumi 精确名称匹配',sourceUrl:'https://bgm.tv/subject/'+subject.id,bangumiId:subject.id,checkedAt:today()};
 }
 if(!offline){
  const pending=raw.items.filter(item=>!cache[item.animeSn]||cache[item.animeSn].acgId!==Number(item.acgSn)||cache[item.animeSn].originalStatus==='missing'&&(bootstrap||cache[item.animeSn].checkedAt<new Date(Date.now()-7*86400000).toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'})));
  const targets=bootstrap?pending:pending.slice(0,80);
  console.log(JSON.stringify({phase:'gamer-originals-start',cached:Object.keys(cache).length,lookups:targets.length}));
  const acgCache=new Map(Object.values(cache).filter(x=>x.source==='巴哈姆特 ACG 作品资料'&&x.originalStatus!=='missing').map(x=>[x.acgId,x]));let checked=0;
  for(let i=0;i<targets.length;i+=2){
   const batch=targets.slice(i,i+2);
   const results=await Promise.allSettled(batch.map(item=>acgCache.has(Number(item.acgSn))?acgCache.get(Number(item.acgSn)):fetchOriginal(item,hints.get(Number(item.animeSn)))));
   let failure;
   results.forEach((result,index)=>{if(result.status==='fulfilled'){cache[batch[index].animeSn]=result.value;acgCache.set(result.value.acgId,result.value);checked++;}else failure=result.reason;});
   if(checked%40===0||i+2>=targets.length||failure){await writeJson('data/gamer-originals.json',cache);console.log(JSON.stringify({phase:'gamer-originals-progress',checked,total:targets.length,status:Object.values(cache).reduce((counts,item)=>(counts[item.originalStatus]=(counts[item.originalStatus]||0)+1,counts),{})}));}
   if(failure)throw failure;
   await delay(500);
  }
  await writeJson('data/gamer-originals.json',cache);
 }
 return cache;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await enrichGamerOriginals(await readJson('data/gamer-list.json'),{offline:process.argv.includes('--offline'),bootstrap:process.argv.includes('--bootstrap')});
