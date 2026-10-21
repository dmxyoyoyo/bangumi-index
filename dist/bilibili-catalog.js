(function(root){
'use strict';
const clean=text=>String(text||'').normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]/gu,'');
function isRegional(item){return /(?:[僅仅]限|只限|[僅仅]在|只在|[僅仅])\s*(?:香港|澳[門门]|[臺台][灣湾]|[港澳臺台])/.test([item.region,item.officialTitle].join(' '));}
function displayTitle(text){return String(text||'').replace(/[（(【\[]\s*(?:[僅仅]限|只限|[僅仅]在|只在|[僅仅])\s*(?:香港|澳[門门]|[臺台][灣湾]|[港澳臺台])[^()（）【】\[\]]*(?:[)）】\]]|$)/g,'').trim();}
function primaryTitle(item){return displayTitle(item.title)+(isRegional(item)?'（仅限港澳台地区）':'');}
function classifyPremiere(date){const text=String(date||''),match=text.match(/^(\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/);if(!match||text.length===10&&new Date(text+'T00:00:00Z').toISOString().slice(0,10)!==text)return {year:null,quarter:null};const month=Number(match[2]);return {year:Number(match[1]),quarter:month?String(Math.floor((month-1)/3)*3+1):null};}
function groups(items=[],year=new Date().getFullYear()){
 const latest=Math.max(year,...items.map(x=>x.classification?.year||0)),years=Array.from({length:Math.max(0,latest-2014)},(_,i)=>[String(latest-i),String(latest-i)]);
 years.push(['2010-2014','2014–2010'],['2005-2009','2009–2005'],['2000-2004','2004–2000'],['1990-1999','90年代'],['1980-1989','80年代'],['before-1980','更早']);
 return [{key:'origin',id:'bili-origin-filters',label:'地区',options:[['all','全部'],['japan','日本'],['china','国创'],['other','其他']]},{key:'region',id:'bili-region-filters',label:'播放地区',options:[['all','全部'],['hmt','仅限港澳台地区']]},{key:'quarter',label:'季度',options:[['all','全部'],['1','1月'],['4','4月'],['7','7月'],['10','10月']]},{key:'year',label:'年份',options:[['all','全部'],...years]}];
}
function matchesDate(item,year,quarter){const data=item.classification||{};if(quarter!=='all'&&data.quarter!==quarter)return false;if(year==='all')return true;if(!data.year)return false;if(year==='before-1980')return data.year<1980;const range=String(year).match(/^(\d{4})-(\d{4})$/);return range?data.year>=Number(range[1])&&data.year<=Number(range[2]):data.year===Number(year);}
function filter(items,{query='',sort='title',region='all',origin='all',quarter='all',year='all'}={}){const q=clean(query),ss=String(query).match(/(?:^ss|\/ss)(\d+)/i),bv=String(query).match(/BV[0-9A-Za-z]{10}/);
 return items.filter(item=>(origin==='all'||item.originCategory===origin)&&(region!=='hmt'||isRegional(item))&&matchesDate(item,year,quarter)&&(ss?item.id===Number(ss[1]):bv?item.videos.some(x=>x.bvid===bv[0])||(item.aliases||[]).includes(bv[0]):!q||[item.title,item.officialTitle,item.traditionalTitle,item.japaneseTitle,item.originalTitle,item.id?'ss'+item.id:'',...item.aliases||[],...item.videos.flatMap(x=>[x.bvid,x.title])].some(x=>clean(x).includes(q)))).sort((a,b)=>sort==='recent'?(b.date||'').localeCompare(a.date||'')||a.title.localeCompare(b.title,'zh-CN'):sort==='id-desc'?(b.id||0)-(a.id||0):a.title.localeCompare(b.title,'zh-CN'));
}
const api={filter,isRegional,displayTitle,primaryTitle,classifyPremiere,groups};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BilibiliCatalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
