'use strict';
const bilibiliData=window.BILIBILI_CATALOG,bilibiliState={query:'',sort:'title',region:'all',origin:'all',quarter:'all',year:'all',page:1},bilibiliPageSize=30;
const bili$=id=>document.getElementById(id);
function biliNode(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function biliLink(text,url,className='open-link'){const n=biliNode('a',className,text);n.href=url;n.target='_blank';n.rel='noopener noreferrer';return n;}
function biliRender(){
 const results=BilibiliCatalog.filter(bilibiliData.items,bilibiliState),pages=Math.max(1,Math.ceil(results.length/bilibiliPageSize));bilibiliState.page=Math.min(bilibiliState.page,pages);const start=(bilibiliState.page-1)*bilibiliPageSize;
 bili$('rows').replaceChildren();
 for(const item of results.slice(start,start+bilibiliPageSize)){
  const row=biliNode('tr'),name=biliNode('td');name.append(biliLink(BilibiliCatalog.primaryTitle(item),item.url,'anime-title'));if(BilibiliCatalog.isRegional(item))name.append(biliNode('div','alternate',BilibiliCatalog.displayTitle(item.traditionalTitle||item.officialTitle)));if(item.japaneseTitle)name.append(biliNode('div','original-title',item.japaneseTitle));
  const release=biliNode('div','release-line');release.append(biliNode('span','','首播：'+(item.premiereDate||'日期待补充')));if(item.indexShow)release.append(biliNode('span','',item.indexShow));name.append(release);appendAnimeCover(name,item.cover);
  const ids=biliNode('td');ids.dataset.label='作品 ID';if(item.id)ids.append(biliNode('span','cn-id','ss'+item.id));else{const primary=item.videos.find(x=>x.url===item.url)||item.videos[0];if(primary)ids.append(biliNode('span','cn-id',primary.bvid));}if(item.videos.length)ids.append(biliNode('div','data-source',item.videos.length+' 个官方视频'));
  const links=biliNode('td');links.dataset.label='官方页面';links.append(biliLink(item.id?'打开番剧页':'打开官方视频',item.url));
  if(item.videos.length){const details=biliNode('details','reason'),summary=biliNode('summary','',item.id?'官方视频选集（'+item.videos.length+'）':'视频选集（'+item.videos.length+'）');details.append(summary);for(const v of item.videos){const line=biliNode('div','bili-video');line.append(biliLink(v.title+(v.statusNote?'（'+v.statusNote+'）':v.available?'':'（当前未返回）'),v.url),biliNode('span','data-source',v.bvid));details.append(line);}links.append(details);}
  row.append(name,ids,links);bili$('rows').append(row);
 }
 for(const button of bili$('category-options').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.value===bilibiliState[button.dataset.filter]));
 bili$('result-count').textContent=results.length.toLocaleString('zh-CN')+' 条记录';bili$('empty').hidden=results.length>0;bili$('page-info').textContent=results.length?'显示 '+(start+1)+'–'+Math.min(start+bilibiliPageSize,results.length)+' / '+results.length+' 条':'0 条记录';bili$('page-number').textContent=bilibiliState.page+' / '+pages;bili$('previous').disabled=bilibiliState.page<=1;bili$('next').disabled=bilibiliState.page>=pages;bili$('page-input').max=String(pages);bili$('page-input').value=String(bilibiliState.page);bili$('page-input').disabled=!results.length;bili$('jump-button').disabled=!results.length;
}
function biliUpdate(values){Object.assign(bilibiliState,values,{page:1});biliRender();}
try{
 bili$('coverage-note').textContent=bilibiliData.meta.coverage;
 for(const group of BilibiliCatalog.groups(bilibiliData.items)){const row=biliNode('div','category-row'),label=biliNode('div','category-label',group.label),choices=biliNode('div','category-choices');choices.setAttribute('role','group');choices.setAttribute('aria-label',group.label);if(group.id)choices.id=group.id;for(const [value,title] of group.options){const button=biliNode('button','category-button',title);button.dataset.filter=group.key;button.dataset.value=value;button.addEventListener('click',()=>biliUpdate({[group.key]:value}));choices.append(button);}row.append(label,choices);bili$('category-options').append(row);}
 bili$('search').addEventListener('input',e=>biliUpdate({query:e.target.value}));bili$('sort').addEventListener('change',e=>biliUpdate({sort:e.target.value}));
 for(const [id,step] of [['previous',-1],['next',1]])bili$(id).addEventListener('click',()=>{bilibiliState.page+=step;biliRender();bili$('catalog').scrollIntoView({block:'start'});});
 bili$('page-jump').addEventListener('submit',event=>{event.preventDefault();const page=Number(bili$('page-input').value);if(!Number.isSafeInteger(page)||page<1||page>Number(bili$('page-input').max))return;bilibiliState.page=page;biliRender();bili$('catalog').scrollIntoView({block:'start'});});
 bili$('reset').addEventListener('click',()=>{bili$('search').value='';biliUpdate({query:'',region:'all',origin:'all',quarter:'all',year:'all'});});biliRender();
}catch{bili$('result-count').textContent='目录未能读取，请刷新页面重试。';}
