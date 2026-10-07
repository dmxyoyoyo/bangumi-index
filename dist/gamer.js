'use strict';
const gamerCatalog=window.GAMER_CATALOG;
const gamerState={query:'',sort:'recent',page:1},gamerPageSize=30;
const gamer$=id=>document.getElementById(id);
const gamerKey=text=>String(text||'').normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\p{Z}\s]/gu,'');
function gamerNode(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function gamerLink(label,url,className){const link=gamerNode('a',className,label);link.href=url;link.target='_blank';link.rel='noopener noreferrer';return link;}
function gamerRender(){
 const query=gamerKey(gamerState.query);
 const results=gamerCatalog.items.filter(item=>!query||[item.title,item.officialTitle,item.japaneseTitle,item.originalTitle,String(item.id),item.url].some(name=>gamerKey(name).includes(query)));
 results.sort((a,b)=>gamerState.sort==='title'?a.title.localeCompare(b.title,'zh-CN'):gamerState.sort==='oldest'?(a.date||'9999').localeCompare(b.date||'9999')||(a.id-b.id):(b.date||'').localeCompare(a.date||'')||(b.id-a.id));
 const pages=Math.max(1,Math.ceil(results.length/gamerPageSize));gamerState.page=Math.min(gamerState.page,pages);const start=(gamerState.page-1)*gamerPageSize;
 gamer$('rows').replaceChildren();
 for(const item of results.slice(start,start+gamerPageSize)){
  const row=gamerNode('tr'),name=gamerNode('td');name.append(gamerLink(item.title,item.url,'anime-title gamer-title'),gamerNode('div','alternate',item.officialTitle));
  const original=gamerNode('div','original-title',item.japaneseTitle||(item.originalStatus==='non-japanese'?(item.originalTitle||'原名未提供')+'（非日本作品）':'日文原名待核实'));original.dataset.originalStatus=item.originalStatus;name.append(original);
  if(item.bilingual||item.edition)name.append(gamerNode('div','release-line',[item.bilingual?'双语':'',item.edition].filter(Boolean).join(' · ')));
  const date=gamerNode('td','',item.date||'官方未提供');date.dataset.label='首播年月';
  const episodes=gamerNode('td','',item.episodes?item.episodes+' 集':'官方未提供');episodes.dataset.label='目录集数';
  const official=gamerNode('td');official.dataset.label='官方页面';official.append(gamerLink('打开动画疯',item.url,'open-link'),gamerNode('div','data-source','作品 ID：'+item.id));
  appendAnimeCover(name,item.cover);
  row.append(name,date,episodes,official);gamer$('rows').append(row);
 }
 gamer$('result-count').textContent=results.length.toLocaleString('zh-CN')+' 条记录';gamer$('empty').hidden=results.length>0;
 gamer$('page-info').textContent=results.length?'显示 '+(start+1)+'–'+Math.min(start+gamerPageSize,results.length)+' / '+results.length+' 条':'0 条记录';
 gamer$('page-number').textContent=gamerState.page+' / '+pages;gamer$('previous').disabled=gamerState.page<=1;gamer$('next').disabled=gamerState.page>=pages;
}
function gamerUpdate(values){Object.assign(gamerState,values,{page:1});gamerRender();}
try{
 gamer$('total-count').textContent=gamerCatalog.items.length.toLocaleString('zh-CN');gamer$('title-note').textContent=gamerCatalog.meta.titleNote;
 gamer$('sync-date').textContent=new Date(gamerCatalog.meta.lastSuccessfulRefresh).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'});
 gamer$('sync-date').title=new Date(gamerCatalog.meta.lastSuccessfulRefresh).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'});
 gamer$('search').addEventListener('input',event=>gamerUpdate({query:event.target.value}));gamer$('sort').addEventListener('change',event=>gamerUpdate({sort:event.target.value}));
 for(const [id,step] of [['previous',-1],['next',1]])gamer$(id).addEventListener('click',()=>{gamerState.page+=step;gamerRender();gamer$('catalog').scrollIntoView({block:'start'});});
 gamer$('reset').addEventListener('click',()=>{gamer$('search').value='';gamerUpdate({query:''});});gamerRender();
}catch{gamer$('result-count').textContent='目录未能读取，请刷新页面重试。';}
