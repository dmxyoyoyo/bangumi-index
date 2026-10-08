'use strict';
const catalog=window.SEA_CATALOG;
const $=id=>document.getElementById(id);
const state={query:'',region:'',origin:'all',mappedOnly:false,sort:'mapped',status:'all',page:1},pageSize=30;
const countryEntries=Object.entries(Catalog.countries);
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function external(text,url,className){const node=element('a',className,text);node.href=url;node.target='_blank';node.rel='noopener noreferrer';return node;}
function action(text,callback,className){const node=element('button',className,text);node.type='button';node.addEventListener('click',callback);return node;}
let toastTimer;
async function copy(text,label){try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);$('toast').textContent=label+'已复制';$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2300);}catch{$('copy-value').value=text;$('copy-dialog').showModal();$('copy-value').focus();$('copy-value').select();}}
function render(){
 const matches=Catalog.filter(catalog.items,state),pages=Math.max(1,Math.ceil(matches.length/pageSize));state.page=Math.min(state.page,pages);
 const start=(state.page-1)*pageSize,visible=matches.slice(start,start+pageSize);
 $('rows').replaceChildren();
 for(const item of visible){
  const row=document.createElement('tr');
  const name=element('td');name.append(element('div','anime-title',item.title));
  name.append(element('div','alternate',(item.seaTitle||item.officialTitle||item.title)+(item.seaTitleSource==='历史目录'?'（历史记录）':'')));
  name.append(element('div','original-title',item.japaneseTitle?item.japaneseTitle:item.originalNameStatus==='non-japanese'?(item.originalName||'来源未提供')+'（非日本动画）':item.originalName?item.originalName+'（原名语言待确认）':'来源未提供'));
  const release=element('div','release-line');release.append(element('span','release-tag '+item.release.status,({upcoming:item.release.confirmed?'未开播（官方排期）':'计划开播',aired:item.release.confirmed?'已开播 / 上映':'首播日期已过',unknown:'开播时间待核实'})[item.release.status]),element('span','',item.release.date?(item.release.status==='upcoming'?'预计 ':'')+item.release.date:''));
  if(item.release.note)release.append(element('span','',item.release.note));
  name.append(release);
  const intl=element('td');intl.dataset.label='国际版 ID';if(item.intlId){intl.append(external(String(item.intlId),'https://www.bilibili.tv/en/play/'+item.intlId,'intl-link'),action('复制国际版 ID',()=>copy(String(item.intlId),'国际版 ID'),'small-button'));}else{intl.append(element('div','unmapped','对应 ID 待核实'));}
  const regions=element('td');const tags=element('div','region-tags');
  for(const [code,title] of countryEntries.filter(([code])=>item.regions.includes(code)))tags.append(element('span','',title));
  if(!tags.childNodes.length)tags.append(element('span','',item.regionSource==='unknown'?'地区待核实':'无东南亚地区记录'));
  regions.append(tags,element('div','data-source',item.regionSource==='official'?'官方地区信息 · '+item.regionCheckedAt: item.regionSource==='unknown'?'当前来源未提供地区信息':'历史授权 · '+catalog.meta.archiveDate));
  const cn=element('td');cn.dataset.label='中国版 ss ID';const link=Catalog.chineseLink(item);
  if(link){cn.append(element('span','status-tag',item.intlId?'两端元数据已匹配':'中国版条目已核实'),element('span','cn-id','ss'+item.cnId));const actions=element('div','cn-actions');actions.append(action('复制链接',()=>copy(link,'中国版链接'),'copy-link'),external('打开',link,'open-link'));cn.append(actions,action('复制 ss ID',()=>copy('ss'+item.cnId,'中国版 ss ID'),'small-button'));}
  else{const titles={upcoming:'计划开播 · ID 待核实','source-unavailable':'接口未返回',ambiguous:'版本存在歧义','not-found':'未找到对应 ID'};const note=element('div','unmapped',titles[item.mappingStatus.code]||'待核实');const details=element('details','reason');details.append(element('summary','','查看排查原因'),element('p','',item.mappingStatus.reason));if(item.mappingStatus.candidateIds?.length)details.append(element('p','','候选 ID：'+item.mappingStatus.candidateIds.map(x=>'ss'+x).join('、')));note.append(details);cn.append(note);}
  appendAnimeCover(name,item.cover);
  row.append(name,intl,regions,cn);$('rows').append(row);
 }
 $('result-count').textContent=matches.length.toLocaleString('zh-CN')+' 条记录';
 $('region-title').textContent=state.region?Catalog.countries[state.region]:'全部东南亚地区';
 $('page-info').textContent=matches.length?'显示 '+(start+1)+'–'+Math.min(start+pageSize,matches.length)+' / '+matches.length+' 条':'0 条记录';
 $('page-number').textContent=state.page+' / '+pages;
 $('previous').disabled=state.page<=1;$('next').disabled=state.page>=pages;$('empty').hidden=matches.length>0;
 for(const button of $('regions').children)button.setAttribute('aria-pressed',String(button.dataset.region===state.region));
 for(const button of $('origins').children)button.setAttribute('aria-pressed',String(button.dataset.origin===state.origin));
}
function update(values){Object.assign(state,values,{page:1});render();}
function setup(){
 Catalog.validate(catalog.items);
 for(const [code,label] of [['','全部地区'],...countryEntries]){const button=action('',()=>update({region:code}),'region-button');button.dataset.region=code;const regionLabel=element('span','region-label');if(code){const flag=element('img','region-flag');flag.src='./assets/flags/'+code.toLowerCase()+'.svg';flag.alt='';flag.width=22;flag.height=16;regionLabel.append(flag);}regionLabel.append(element('span','',label));button.append(regionLabel,element('span','region-count',String(catalog.items.filter(item=>!code||item.regions.includes(code)).length)));$('regions').append(button);}
 for(const [code,label] of Object.entries(Catalog.origins)){const button=action(label,()=>update({origin:code}),'origin-button');button.dataset.origin=code;$('origins').append(button);}
 $('total-count').textContent=catalog.items.length.toLocaleString('zh-CN');
 $('mapped-count').textContent=catalog.items.filter(Catalog.chineseLink).length.toLocaleString('zh-CN');
 $('update-note').textContent=catalog.meta.lastSuccessfulRefresh?'上次完整更新：'+new Date(catalog.meta.lastSuccessfulRefresh).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):'完整刷新仍待数据源恢复。';
 $('status').addEventListener('change',event=>update({status:event.target.value}));
 $('mapping-note').textContent=catalog.meta.mappingNote.replace(/^中国版 ID 通过官方标题与完整简介匹配，候选共 \d+ 条。\s*/,'');
 $('live-note').textContent=catalog.meta.liveNote;
 $('search').addEventListener('input',event=>update({query:event.target.value}));
 $('sort').addEventListener('change',event=>update({sort:event.target.value}));
 $('mapped-only').addEventListener('change',event=>update({mappedOnly:event.target.checked}));
 $('previous').addEventListener('click',()=>{state.page--;render();$('catalog').scrollIntoView({block:'start'});});
 $('next').addEventListener('click',()=>{state.page++;render();$('catalog').scrollIntoView({block:'start'});});
 $('reset').addEventListener('click',()=>{$('search').value='';$('sort').value='mapped';$('mapped-only').checked=false;$('status').value='all';update({query:'',region:'',origin:'all',mappedOnly:false,sort:'mapped',status:'all'});});
 render();
 if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'search_sea_anime',title:'查询东南亚番剧 ID',description:'搜索番剧与已核实的中国版 ID，同时更新页面筛选。未核实的记录不返回中国版链接。',inputSchema:{type:'object',properties:{query:{type:'string'},region:{type:'string',enum:['',...Object.keys(Catalog.countries)]},mappedOnly:{type:'boolean'},origin:{type:'string',enum:Object.keys(Catalog.origins)}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['query','region','mappedOnly','origin'].includes(key))||('query' in input&&typeof input.query!=='string')||('region'in input&&input.region!==''&&!Object.hasOwn(Catalog.countries,input.region))||('origin'in input&&(typeof input.origin!=='string'||!Object.hasOwn(Catalog.origins,input.origin)))||('mappedOnly'in input&&typeof input.mappedOnly!=='boolean'))throw new Error('Invalid search input');const values={query:input.query||'',region:input.region||'',mappedOnly:input.mappedOnly||false,origin:input.origin||'all'};$('search').value=values.query;$('mapped-only').checked=values.mappedOnly;update(values);const found=Catalog.filter(catalog.items,state);return {total:found.length,items:found.slice(0,30).map(x=>({title:x.title,intlId:x.intlId,cnId:x.cnId||null,chineseLink:Catalog.chineseLink(x),regions:x.regions,origin:x.originCategory}))};}})).catch(()=>{});}catch{}}
}
try{setup();}catch{$('result-count').textContent='目录未能读取，请刷新页面重试。';}



