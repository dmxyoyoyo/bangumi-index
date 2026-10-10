import {normalizeOfficialDate} from './release.mjs';
export function nameKey(text){return String(text||'').normalize('NFKC').toLowerCase().replace(/&amp;/g,'&').replace(/[\p{P}\p{Z}\s]/gu,'');}
export function synopsisKey(text){return nameKey(text);}
function dub(text){if(/thai\s*dub|泰配|泰语配音/i.test(text))return 'TH';if(/dub\s*indo|indo\s*dub|印配|印尼语配音/i.test(text))return 'ID';if(/english\s*dub|dub\s*eng|英配|英语配音/i.test(text))return 'EN';if(/vietnamese\s*dub|越配|越南语配音/i.test(text))return 'VN';return null;}
function label(item){return item.seasons?.find(s=>s.id===item.season_id)?.title||'';}
function season(text){const m=String(text||'').match(/第([一二三四五六七八九十0-9]+)[季期]|season\s*([0-9]+)|([0-9]+)(?:st|nd|rd|th)\s*season|(?:^|\s)S([0-9]+)(?:$|\s)/i);return m?(Number(m[2]||m[3]||m[4]||m[1])||({一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10}[m[1]]||null)):null;}
export function candidatesFor(item,metadata,localized,chinese){
 const direct=[metadata?.title,localized?.title,item.seaTitle].map(nameKey).filter(Boolean),other=[item.title,...(item.aliases||[])].map(nameKey).filter(Boolean);
 const descriptions=[metadata?.description,localized?.description].map(synopsisKey).filter(x=>x.length>=25),expectedDub=dub(item.seaTitle||metadata?.title||item.title),expectedSeason=season(item.seaTitle||metadata?.title);
 const editions=chinese.filter(x=>{const edition=label(x),candidateDub=dub(x.title+' '+edition);
  return x.available!==false&&!/drama|真人|电视剧/i.test(edition)&&candidateDub===expectedDub;});
 const valid=editions.filter(x=>descriptions.includes(synopsisKey(x.evaluate)));
 const exact=valid.filter(x=>direct.includes(nameKey(x.title)));if(exact.length)return exact;
 const aliased=valid.filter(x=>other.includes(nameKey(x.title))&&(!expectedSeason||expectedSeason===1||season(x.title+' '+label(x))===expectedSeason));if(aliased.length)return aliased;
 // Some official localized descriptions add an introduction before the entire Chinese synopsis.
 // Require an exact official title and a long, largely shared Chinese synopsis; short generic text is insufficient.
 const localSynopsis=synopsisKey(localized?.description);
 return editions.filter(x=>{
  if(!direct.includes(nameKey(x.title)))return false;
  const candidate=synopsisKey(x.evaluate),shorter=localSynopsis.length<candidate.length?localSynopsis:candidate,longer=localSynopsis.length<candidate.length?candidate:localSynopsis;
  return (shorter.match(/\p{Script=Han}/gu)||[]).length>=80&&shorter.length/longer.length>=0.5&&longer.includes(shorter);
 });
}
export function matchesReleaseDate(candidate,release){
 if(release?.source!=='B站国际版')return false;
 const a=normalizeOfficialDate(release.date),b=candidate.publish?.pub_time?.slice(0,10),parse=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?Date.parse(v+'T00:00:00Z'):NaN;
 const first=parse(a),second=parse(b);
 // The same platform date can differ by one day between local and GitHub request regions.
 return Number.isFinite(first)&&Number.isFinite(second)&&new Date(first).toISOString().slice(0,10)===a&&new Date(second).toISOString().slice(0,10)===b&&Math.abs(first-second)<=86400000;
}
export function selectMapping(candidates,release,version=null){
 if(candidates.length===1)return candidates[0];
 if(candidates.length>1){const sameDate=candidates.filter(x=>matchesReleaseDate(x,release));if(sameDate.length===1)return sameDate[0];}
 if(candidates.length>1&&version){const matched=candidates.filter(x=>version.special?/^(?:SP|Special)$/i.test(label(x)):version.season?/^S[0-9]+$/i.test(label(x))&&Number(label(x).slice(1))===version.season:false);if(matched.length===1)return matched[0];}return null;
}
export function editionVersion(item,metadata){if(dub(item.seaTitle||''))return null;const names=[metadata?.originName,item.seaTitle,item.title,...(item.aliases||[])].join(' ');if(/special episode|特别篇|特別篇|特別編/i.test(names))return {special:true};const n=season(names);return n?{season:n}:null;}
