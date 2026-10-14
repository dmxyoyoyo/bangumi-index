'use strict';
const gamerCatalog=window.GAMER_CATALOG;
const gamerState={query:'',sort:'recent',...GamerFilters.defaults,page:1},gamerPageSize=30;
const gamer$=id=>document.getElementById(id);
const gamerKey=text=>String(text||'').normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\p{Z}\s]/gu,'');
function gamerNode(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function gamerLink(label,url,className){const link=gamerNode('a',className,label);link.href=url;link.target='_blank';link.rel='noopener noreferrer';return link;}
function gamerRender(){
 const query=gamerKey(gamerState.query);
 const results=gamerCatalog.items.filter(item=>GamerFilters.matches(item,gamerState)&&(!query||[item.title,item.officialTitle,item.japaneseTitle,item.originalTitle,String(item.id),item.url,GamerFilters.searchText(item)].some(name=>gamerKey(name).includes(query))));
 results.sort((a,b)=>gamerState.sort==='title'?a.title.localeCompare(b.title,'zh-CN'):gamerState.sort==='oldest'?(a.date||'9999').localeCompare(b.date||'9999')||(a.id-b.id):(b.date||'').localeCompare(a.date||'')||(b.id-a.id));
 const pages=Math.max(1,Math.ceil(results.length/gamerPageSize));gamerState.page=Math.min(gamerState.page,pages);const start=(gamerState.page-1)*gamerPageSize;
 gamer$('rows').replaceChildren();
 for(const item of results.slice(start,start+gamerPageSize)){
  const row=gamerNode('tr'),name=gamerNode('td');name.append(gamerLink(item.title,item.url,'anime-title gamer-title'),gamerNode('div','alternate',item.officialTitle));
  const original=gamerNode('div','original-title',item.japaneseTitle||(item.originalStatus==='non-japanese'?(item.originalTitle||'原名未提供'):'日文原名待核实'));original.dataset.originalStatus=item.originalStatus;if(item.contentType==='non-animation')original.append('（非动画）');name.append(original);
  if(item.bilingual||item.edition)name.append(gamerNode('div','release-line',[item.bilingual?'双语':'',item.edition].filter(Boolean).join(' · ')));
  const date=gamerNode('td','',item.date||'官方未提供');date.dataset.label='首播年月';
  const episodes=gamerNode('td','',item.episodes?item.episodes+' 集':'官方未提供');episodes.dataset.label='目录集数';
  const official=gamerNode('td');official.dataset.label='官方页面';official.append(gamerLink('打开动画疯',item.url,'open-link'),gamerNode('div','data-source','作品 ID：'+item.id));
  appendAnimeCover(name,item.cover);
  row.append(name,date,episodes,official);gamer$('rows').append(row);
 }
 gamer$('result-count').textContent=results.length.toLocaleString('zh-CN')+' 条记录';gamer$('empty').hidden=results.length>0;
 gamer$('page-info').textContent=results.length?'显示 '+(start+1)+'–'+Math.min(start+gamerPageSize,results.length)+' / '+results.length+' 条':'0 条记录';
 gamer$('page-input').max=String(pages);gamer$('page-input').value=String(gamerState.page);gamer$('page-input').disabled=!results.length;gamer$('jump-button').disabled=!results.length;
 gamer$('page-number').textContent=gamerState.page+' / '+pages;gamer$('previous').disabled=gamerState.page<=1;gamer$('next').disabled=gamerState.page>=pages;
 for(const button of document.querySelectorAll('.category-button')){const key=button.dataset.filter,value=button.dataset.value,selected=key==='attributes'?(value==='all'?gamerState.attributes.length===0:gamerState.attributes.includes(value)):gamerState[key]===value;button.setAttribute('aria-pressed',String(selected));button.disabled=key==='attributes'&&value!=='all'&&!selected&&gamerState.attributes.length>=5;}
 gamer$('gamer-attributes-label').textContent='属性（'+gamerState.attributes.length+'/5）';
}
function gamerUpdate(values){Object.assign(gamerState,values,{page:1});gamerRender();}
try{
 gamer$('title-note').textContent=gamerCatalog.meta.titleNote;
 for(const group of GamerFilters.groups){const row=gamerNode('div','category-row'),label=gamerNode('div','category-label',group.label),choices=gamerNode('div','category-choices');if(group.key==='attributes')label.id='gamer-attributes-label';choices.setAttribute('role','group');choices.setAttribute('aria-label',group.label);for(const [value,title] of group.options){const button=gamerNode('button','category-button',title);button.type='button';button.dataset.filter=group.key;button.dataset.value=value;button.addEventListener('click',()=>{if(group.key==='attributes'){const current=gamerState.attributes;gamerUpdate({attributes:value==='all'?[]:current.includes(value)?current.filter(x=>x!==value):current.length<5?[...current,value]:current});}else gamerUpdate({[group.key]:value});});choices.append(button);}row.append(label,choices);gamer$('category-options').append(row);}
 gamer$('search').addEventListener('input',event=>gamerUpdate({query:event.target.value}));gamer$('sort').addEventListener('change',event=>gamerUpdate({sort:event.target.value}));
 for(const [id,step] of [['previous',-1],['next',1]])gamer$(id).addEventListener('click',()=>{gamerState.page+=step;gamerRender();gamer$('catalog').scrollIntoView({block:'start'});});
 gamer$('page-jump').addEventListener('submit',event=>{event.preventDefault();const page=Number(gamer$('page-input').value),max=Number(gamer$('page-input').max);if(!Number.isSafeInteger(page)||page<1||page>max)return;gamerState.page=page;gamerRender();gamer$('catalog').scrollIntoView({block:'start'});});
 gamer$('reset').addEventListener('click',()=>{gamer$('search').value='';gamerUpdate({query:'',...GamerFilters.defaults,attributes:[]});});gamerRender();
}catch{gamer$('result-count').textContent='目录未能读取，请刷新页面重试。';}
