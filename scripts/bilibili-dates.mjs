import OpenCC from 'opencc-js';
import BilibiliCatalog from '../dist/bilibili-catalog.js';
const simplify=OpenCC.Converter({from:'tw',to:'cn'});
export const premiereName=text=>simplify(String(text||'')).normalize('NFKC').toLowerCase().replace(/[（(【\[]\s*(?:仅限|只限|仅在|只在|仅)[^()（）【】\[\]]+(?:[)）】\]]|$)/g,'').replace(/\s*(?:[（(【\[]\s*)?(?:中配(?:版)?|中文配音(?:版)?|普通话(?:版|配音版)?|国语(?:配音)?版|粤配版|粤语(?:配音)?版|中文|国语|粤语)\s*[)）】\]]?\s*$/,'').replace(/\s/gu,'');
const dateText=value=>{const text=String(value||'').trim().split(/[T ]/)[0];return BilibiliCatalog.classifyPremiere(text).year?text:'';};
function mediaDate(refs){if(!refs?.length||refs.some(x=>!dateText(x.date)))return null;const dates=refs.map(x=>dateText(x.date)),unique=[...new Set(dates)];if(unique.length===1)return {date:unique[0],sourceUrl:refs[0].sourceUrl};const years=new Set(dates.map(x=>x.slice(0,4)));if(years.size!==1)return null;const months=new Set(dates.map(x=>x.slice(0,7)));return {date:months.size===1&&dates.every(x=>x.length>=7)?dates[0].slice(0,7):dates[0].slice(0,4),sourceUrl:refs[0].sourceUrl};}
export function fillBilibiliDates(items,{entries=[],chinese={},originals=[],subjects=[],saved={}}={}){
 const byMedia=new Map(),byName=new Map(),sources=new Map();
 for(const entry of entries){const previous=sources.get(entry.id);sources.set(entry.id,{...previous,...entry,mediaId:entry.mediaId||previous?.mediaId,date:entry.date||previous?.date,verification:entry.verification||previous?.verification});}
 function add(name,ref){const key=premiereName(name);if(!key||!ref.date)return;const found=byName.get(key)||new Map();found.set(ref.id,ref);byName.set(key,found);}
 for(const original of originals){const ref={id:original.subjectId||original.name,date:dateText(original.date),sourceUrl:original.subjectId?'https://bgm.tv/subject/'+original.subjectId:'https://github.com/bangumi-data/bangumi-data',japaneseOnly:true};for(const name of [original.name,...original.aliases||[]])add(name,ref);for(const id of original.mediaIds||[]){const found=byMedia.get(id)||[];found.push(ref);byMedia.set(id,found);}}
 for(const subject of subjects){const ref={id:subject.id,date:dateText(subject.date),sourceUrl:'https://bgm.tv/subject/'+subject.id};for(const name of [subject.name,subject.name_cn,...subject.aliases||[]])add(name,ref);}
 for(const item of items){const entry=sources.get(item.id),meta=chinese[item.id],official=Number(meta?.season_id)===item.id?dateText(meta.publish?.release_date||meta.publish?.pub_time):'',page=/^official-(?:simple-season|season-page)$/.test(entry?.verification||'')?dateText(entry.date):'';
  let found=official?{date:official,sourceUrl:'https://api.bilibili.com/pgc/view/web/season?season_id='+item.id}:page?{date:page,sourceUrl:entry.sourceUrl}:item.originCategory==='japan'?mediaDate(byMedia.get(entry?.mediaId)):null;
  const prior=saved[item.key];if(!found&&prior&&prior.title===item.officialTitle&&dateText(prior.date))found=prior;
  if(!found)for(const name of [item.officialTitle,item.japaneseTitle]){const candidates=byName.get(premiereName(name));if(candidates?.size===1){const candidate=[...candidates.values()][0];if(!candidate.japaneseOnly||item.originCategory==='japan'){found=candidate;break;}}}
  item.premiereDate=found?.date||'';item.premiereSourceUrl=found?.sourceUrl||'';item.classification=BilibiliCatalog.classifyPremiere(item.premiereDate);
 }
}
