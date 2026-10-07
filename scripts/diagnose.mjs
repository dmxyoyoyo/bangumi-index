import {readJson,saveCatalog,today} from './shared.mjs';import {candidatesFor,selectMapping,editionVersion} from './mapping.mjs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Catalog=require('../dist/catalog.js');const c=await readJson('dist/catalog.json'),en=await readJson('data/intl-metadata.json',{}),zh=await readJson('data/localized-metadata.json',{}),cn=Object.values(await readJson('data/cn-metadata.json',{})),day=today();
const matches=new Map(),selected=new Map(),used=new Map(c.items.filter(x=>x.cnId).map(x=>[x.cnId,x.intlId]));let added=0;
for(const item of c.items){if(item.cnId)continue;const candidates=candidatesFor(item,en[item.intlId],zh[item.intlId],cn);matches.set(item.intlId,candidates);const chosen=selectMapping(candidates,item.release,editionVersion(item,en[item.intlId]));if(chosen){const list=selected.get(chosen.season_id)||[];list.push(item);selected.set(chosen.season_id,list);}}
for(const [id,items]of selected){if(items.length!==1||used.has(id))continue;const item=items[0];item.cnId=id;used.set(id,item.intlId);added++;item.mappingEvidence={method:'Official title and complete synopsis match; ambiguous titles further checked with official season/SP labels or official release date',checkedAt:day,checkedCandidateCount:cn.length,cnApi:'https://api.bilibili.com/pgc/view/web/season?season_id='+id,intlApi:'https://api.bilibili.tv/intl/gateway/web/v2/ogv/play/season_info?season_id='+item.intlId};}
for(const item of c.items){const candidates=matches.get(item.intlId)||[];let code,reason;
 if(item.cnId){code='confirmed';reason='官方元数据已匹配；实际播放权限另行确认';}
 else if(item.release.status==='upcoming'){code='upcoming';reason=(item.release.confirmed?'原作官方排期尚未开播':'公开计划播出日期在未来，平台当前开播状态仍待核实')+'；当前未找到唯一中国版对应项。未开播不代表不会提前分配 ss ID，将继续检查。';}
 else if(!en[item.intlId]||en[item.intlId]?.available===false){code='source-unavailable';reason='国际版历史 ID 当前未返回有效元数据，无法核对迁移后的中国版 ID；不能据此判定未开播或下架。';}
 else if(candidates.length){code='ambiguous';reason='存在多个季度、地区或配音版本候选，现有元数据不足以确定唯一对应 ID。';}
 else{code='not-found';reason='已检查的中国版候选中没有标题与完整简介均一致的条目；可能尚未同步、未覆盖对应 ID，或两端简介不同。';}
 item.mappingStatus={code,reason,checkedAt:day,candidateIds:candidates.map(x=>x.season_id)};
}
Catalog.validate(c.items);c.meta.mappingNote='中国版 ID 通过官方标题与完整简介匹配，候选共 '+cn.length+' 条。未开播、接口未返回、版本歧义与尚未找到对应项分别标注；开播状态不等于中国版可播放状态。';c.meta.diagnosis=c.items.reduce((a,x)=>(a[x.mappingStatus.code]=(a[x.mappingStatus.code]||0)+1,a),{});await saveCatalog(c);
console.log(JSON.stringify({phase:'diagnosis-complete',added,mapped:c.items.filter(x=>x.cnId).length,status:c.meta.diagnosis}));
