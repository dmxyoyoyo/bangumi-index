(function(root){
'use strict';
const genres=[['Original','原创'],['Comic adaptation','漫画改编'],['Novel adaptation','小说改编'],['Game adaptation','游戏改编'],['Tokusatsu','特摄'],['Hot-blooded','热血'],['Isekai','异世界'],['Supernatural','超自然'],['Time travel','穿越'],['Fantasy','奇幻'],['Action','动作'],['Comedy','喜剧'],['Slice of life','日常'],['Sci-Fi','科幻'],['Moe','萌系'],['Healing','治愈'],['School','校园'],['Kids','少儿'],['Romance','恋爱'],['Shoujo','少女'],['Adventure','冒险'],['Historical','历史'],['Mecha','机甲'],['Sports','运动'],['Encouraging','励志'],['Music','音乐'],['Suspense','悬疑'],['Idols','偶像'],['Workplace','职场'],['Gourmet','美食'],['Chinese style','国风'],['Xuanhuan','玄幻'],['Cultivation','修仙'],['Revenge','复仇'],['Mystery','推理'],['Tear trigger','催泪'],['Martial arts','武侠'],['Harem','后宫'],['Furry','兽人'],['18+','18+'],['Boys love','耽美'],['Girls love','百合'],['Urban','都市'],['Racing','赛车'],['Modern','现代'],['Plot','剧情']];
const dubs=[['english','英语配音',/\b(?:english|eng)\s*dub|\bdub(?:bed)?\s*(?:english|eng)\b|英(?:语)?配(?:音)?/i],['thai','泰语配音',/\b(?:thai|th)\s*dub|\bdub(?:bed)?\s*(?:thai|th)\b|泰(?:语)?配(?:音)?/i],['indonesian','印尼语配音',/\b(?:indonesian|indo|id)\s*dub|\bdub(?:bed)?\s*(?:indonesian|indo|id)\b|印尼(?:语)?配(?:音)?|印配/i],['vietnamese','越南语配音',/\b(?:vietnamese|vn)\s*dub|\bdub(?:bed)?\s*(?:vietnamese|vn)\b|越南(?:语)?配(?:音)?|越配/i],['japanese','日语配音',/\b(?:japanese|jpn|jp)\s*dub|\bdub(?:bed)?\s*(?:japanese|jpn|jp)\b|日(?:语)?配(?:音)?/i],['chinese','中文配音',/\b(?:chinese|mandarin|cn|chn)\s*dub|\bdub(?:bed)?\s*(?:chinese|mandarin|cn|chn)\b|中文配音|国语配音|國語配音|中配/i]];
const labels=Object.fromEntries(genres),quarters=['winter','spring','summer','autumn'];
const defaults={origin:'all',genre:'all',dub:'all',paid:'all',year:'all',quarter:'all'};
function groups(items=[],year=new Date().getFullYear()){
 const latest=Math.max(year,...items.map(x=>x.classification?.year||0));
 const years=Array.from({length:Math.max(0,latest-2019)},(_,i)=>[String(latest-i),String(latest-i)]);
 years.push(['2015-2019','2015—2019'],['2010-2014','2010—2014'],['2005-2009','2005—2009'],['2000-2004','2000—2004'],['1990-1999','1990年代'],['1980-1989','1980年代'],['before-1980','更早']);
 return [{key:'origin',label:'制作地区',options:[['all','全部'],['china','中国'],['japan','日本']]},{key:'genre',label:'题材',options:[['all','全部'],...genres]},{key:'dub',label:'配音',options:[['all','全部'],...dubs.map(([value,label])=>[value,label])]},{key:'paid',label:'付费类型',options:[['all','全部'],['free','免费'],['premium','大会员']]},{key:'year',label:'首播年份',options:[['all','全部'],...years]},{key:'quarter',label:'首播季度',options:[['all','全部'],['winter','冬季'],['spring','春季'],['summer','夏季'],['autumn','秋季']]}];
}
function classify(metadata={},date=''){
 const match=String(date).match(/^(\d{4})(?:-(\d{2})(?:-\d{2})?)?$/),month=Number(match?.[2]);
 const policy=String(metadata.payPolicy||'').trim().toUpperCase();
 const paid=['VIP','PREMIUM'].includes(policy)||metadata.payPolicyEnum===1?'premium':['FREE','FREE NOW'].includes(policy)||metadata.payPolicyEnum===3?'free':null;
 return {genres:(metadata.styles||[]).filter(x=>Object.hasOwn(labels,x)),dub:dubs.find(([,label,pattern])=>pattern.test(metadata.title||''))?.[0]||null,paid,year:match?Number(match[1]):null,quarter:month>=1&&month<=12?quarters[Math.floor((month-1)/3)]:null};
}
function matches(item,options={}){
 const data=item.classification||{};
 if(options.genre&&options.genre!=='all'&&!data.genres?.includes(options.genre))return false;
 if(options.dub&&options.dub!=='all'&&data.dub!==options.dub)return false;
 if(options.paid&&options.paid!=='all'&&data.paid!==options.paid)return false;
 if(options.quarter&&options.quarter!=='all'&&data.quarter!==options.quarter)return false;
 if(options.year&&options.year!=='all'){
  if(!data.year)return false;
  const range=String(options.year).match(/^(\d{4})-(\d{4})$/);
  if(options.year==='before-1980'){if(data.year>=1980)return false;}
  else if(range){if(data.year<Number(range[1])||data.year>Number(range[2]))return false;}
  else if(data.year!==Number(options.year))return false;
 }
 return true;
}
function searchText(item){const data=item.classification||{};return [...(data.genres||[]).flatMap(x=>[x,labels[x]||'']),dubs.find(([value])=>value===data.dub)?.[1]||'',data.paid==='premium'?'大会员 Premium':data.paid==='free'?'免费 Free':''].join(' ');}
const api={genres,defaults,groups,classify,matches,searchText};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SeaFilters=api;
})(typeof globalThis!=='undefined'?globalThis:this);
