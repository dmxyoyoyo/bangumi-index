import OpenCC from 'opencc-js';
const simplify=OpenCC.Converter({from:'tw',to:'cn'});
// Preserve punctuation: NEW GAME! and NEW GAME!! are different seasons.
const nameKey=text=>simplify(String(text||'')).normalize('NFKC').toLowerCase().replace(/\s/gu,'');
const dubbing=/[（(【\[]?\s*(?:粤配版|台配版?|国配版|(?:粤语|国语|普通话|英语|日语)(?:配音)?版)\s*[）)】\]]?/g;
export function regionalTitles(originals,subjects,links={}){
 const byId=new Map(Object.values(subjects).map(x=>[x.id,x])),bySubject=new Map(),media=new Map(),names=new Map(),japanese=new Map();
 function add(map,key,record){if(!key)return;const found=map.get(key)||new Map();found.set(record.subjectId||record.name,record);map.set(key,found);}
 for(const record of originals){
  if(!record.name_cn)continue;
  if(record.subjectId)bySubject.set(record.subjectId,record);
  for(const id of record.mediaIds||[])add(media,id,record);
  add(japanese,nameKey(record.name),record);
  for(const name of [record.name,...record.aliases||[]])add(names,nameKey(name),record);
 }
 const unique=found=>found?.size===1?[...found.values()][0]:null;
 return (entry,base)=>{
  const plain=simplify(base),dub=plain.match(dubbing)||[],withoutDub=plain.replace(dubbing,'').trim();
  const linked=media.get(entry.mediaId),named=unique(names.get(nameKey(withoutDub)));
  // Shared media IDs can cover both cours; an inherited Japanese name may be the last cour.
  const record=bySubject.get(links[entry.id]?.subjectId)||(linked?.size>1?(named&&linked.has(named.subjectId||named.name)?named:null):unique(linked)||named||unique(japanese.get(nameKey(entry.japaneseTitle))));
  if(!record)return null;
  const subject=byId.get(record.subjectId);let title=simplify(subject?.name_cn||record.name_cn);
  if(record.name.startsWith('東京喰種'))title=title.replace(/^东京(?:食尸鬼|战记)/,'东京喰种');
  let original=record.name;
  if(!/第[\d一二三四五六七八九十]+(?:部|章)|[前后]篇/.test(plain)){
   title=title.replace(/\s*第[\d一二三四五六七八九十]+(?:部分|章)|\s*[前后]篇$/g,'').trim();
   original=original.replace(/\s*第\d+[部章]|\s*[前後]編$/g,'').trim();
  }
  const season=plain.match(/第[\d一二三四五六七八九十]+季|\bS\d+\b/i)?.[0];
  if(season&&!/第[\d一二三四五六七八九十]+季|\bS\d+\b|\d+(?:st|nd|rd|th)\s*Season|[23456789]$/i.test(title))title+=' '+season;
  const part=plain.match(/\b(?:I|II|III|IV|V|VI)\s*[:：].+$/)?.[0];if(part&&!title.includes(part))title+=' '+part;
  const year=plain.match(/[（(](?:19|20)\d{2}[)）]/)?.[0]||(/新作/.test(plain)?record.name.match(/[（(](?:19|20)\d{2}[)）]/)?.[0]:'');if(year&&!title.includes(year.slice(1,-1)))title+=' '+year;
  for(const suffix of dub){const text=suffix.replace(/[（()）【】\[\]]/g,'').trim();if(!title.includes(text))title+='（'+text+'）';}
  for(const suffix of plain.match(/【(?:安全版|无修版|未删减版|重制版)】/g)||[])if(!title.includes(suffix))title+=suffix;
  return {title,japaneseTitle:original,subjectId:record.subjectId,aliases:[record.name_cn,subject?.name_cn,...record.aliases||[],...subject?.aliases||[],plain].filter(Boolean),source:subject?.name_cn?'https://bangumi.tv/subject/'+subject.id:'https://github.com/bangumi-data/bangumi-data'};
 };
}
