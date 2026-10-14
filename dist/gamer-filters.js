(function(root){
'use strict';
const attributes=[['動作','动作'],['冒險','冒险'],['奇幻','奇幻'],['異世界','异世界'],['魔法','魔法'],['超能力','超能力'],['科幻','科幻'],['機甲','机甲'],['校園','校园'],['喜劇','喜剧'],['戀愛','恋爱'],['青春','青春'],['勵志','励志'],['溫馨','温馨'],['悠閒','悠闲'],['料理','料理'],['親情','亲情'],['感人','感人'],['運動','运动'],['競技','竞技'],['偶像','偶像'],['音樂','音乐'],['職場','职场'],['推理','推理'],['懸疑','悬疑'],['時間穿越','时间穿越'],['歷史','历史'],['戰爭','战争'],['血腥暴力','血腥暴力'],['靈異神怪','灵异神怪'],['黑暗','黑暗'],['特攝','特摄'],['BL','耽美'],['GL','百合']];
const types=[['電影','电影'],['OVA','OVA'],['雙語','双语'],['泡麵番','泡面番'],['真人演出','真人演出']],targets=[['闔家觀賞','阖家观赏'],['付費會員','付费会员'],['年齡限制','年龄限制']];
const groups=[{key:'attributes',label:'属性',options:[['all','全部'],...attributes]},{key:'type',label:'类型',options:[['all','全部'],...types]},{key:'target',label:'对象',options:[['all','全部'],...targets]}];
const options=[...attributes.map(([value,label])=>({field:'tags',value,label,property:'attributes'})),...types.map(([value,label])=>({field:'category',value,label,property:'types'})),...targets.map(([value,label])=>({field:'target',value,label,property:'audiences'}))];
const defaults={attributes:[],type:'all',target:'all'};
function matches(item,state={}){const c=item.classification||{};return !(state.attributes||[]).some(x=>!c.attributes?.includes(x))&&(!state.type||state.type==='all'||c.types?.includes(state.type))&&(!state.target||state.target==='all'||c.audiences?.includes(state.target));}
function searchText(item){const c=item.classification||{};return options.filter(x=>c[x.property]?.includes(x.value)).flatMap(x=>[x.value,x.label]).join(' ');}
const api={groups,options,defaults,matches,searchText};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GamerFilters=api;
})(typeof globalThis!=='undefined'?globalThis:this);
