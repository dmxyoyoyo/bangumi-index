import {readJson,saveCatalog,today} from './shared.mjs';import {candidatesFor,selectMapping,editionVersion,matchesReleaseDate,nameKey,verifiedOriginalMapping,matchesEpisodes,unavailableAssociatedCandidate} from './mapping.mjs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Catalog=require('../dist/catalog.js');const c=await readJson('dist/catalog.json'),en=await readJson('data/intl-metadata.json',{}),zh=await readJson('data/localized-metadata.json',{}),cn=Object.values(await readJson('data/cn-metadata.json',{})),day=today();
const episodes=await readJson('data/mapping-episodes.json',{intl:{},cn:{}}),verifications=await readJson('data/mapping-verifications.json',{}),links=await readJson('data/linked-candidates.json',{});
 for(const candidate of cn)candidate.episodeEvidence=episodes.cn[candidate.season_id];
 const metadata=id=>({...en[id],episodeEvidence:episodes.intl[id]});
const platformRelease=item=>en[item.intlId]?.airDate?{source:'B站国际版',date:en[item.intlId].airDate}:item.release;
const matches=new Map(),selected=new Map(),used=new Map(c.items.filter(x=>x.cnId).map(x=>[x.cnId,x.intlId]));let added=0;
for(const item of c.items){const verification=verifications[item.intlId],candidate=verification&&cn.find(x=>x.season_id===verification.cnId);if(!item.cnId&&!used.has(verification?.cnId)&&verifiedOriginalMapping(item,en[item.intlId],candidate,verification)){
 item.cnId=candidate.season_id;used.set(item.cnId,item.intlId);added++;item.mappingEvidence={method:verification.reason,checkedAt:day,verifiedAt:verification.checkedAt,cnApi:'https://api.bilibili.com/pgc/view/web/season?season_id='+item.cnId,intlApi:'https://api.bilibili.tv/intl/gateway/web/v2/ogv/play/season_info?season_id='+item.intlId};
}}
for(const item of c.items){if(item.cnId)continue;const candidates=candidatesFor(item,metadata(item.intlId),zh[item.intlId],cn);matches.set(item.intlId,candidates);const chosen=selectMapping(candidates,platformRelease(item),editionVersion(item,en[item.intlId]),episodes.intl[item.intlId]);if(chosen){const list=selected.get(chosen.season_id)||[];list.push(item);selected.set(chosen.season_id,list);}}
for(const [id,items]of selected){if(used.has(id))continue;const candidate=cn.find(x=>x.season_id===id),sameEpisodes=items.filter(item=>matchesEpisodes(candidate?.episodeEvidence,episodes.intl[item.intlId])),dated=items.filter(item=>matchesReleaseDate(candidate,platformRelease(item)));const item=items.length===1?items[0]:sameEpisodes.length===1?sameEpisodes[0]:dated.length===1?dated[0]:null;if(!item)continue;item.cnId=id;used.set(id,item.intlId);added++;item.mappingEvidence={method:'Official title with complete synopsis or matching episode count and exact publication time; ambiguous editions checked using episode sections, season/SP labels and platform dates',checkedAt:day,checkedCandidateCount:cn.length,cnApi:'https://api.bilibili.com/pgc/view/web/season?season_id='+id,intlApi:'https://api.bilibili.tv/intl/gateway/web/v2/ogv/play/season_info?season_id='+item.intlId};}
for(const item of c.items){const candidates=matches.get(item.intlId)||[],officialNames=[en[item.intlId]?.title,zh[item.intlId]?.title,item.seaTitle].map(nameKey).filter(Boolean),sameName=!item.cnId?cn.filter(x=>x.available!==false&&officialNames.includes(nameKey(x.title))):[];const associated=unavailableAssociatedCandidate(links[item.intlId],cn);let code,reason;
 if(item.cnId){code='confirmed';reason='官方元数据已匹配；实际播放权限另行确认';}
 else if(item.release.status==='upcoming'){code='upcoming';reason=(item.release.confirmed?'原作官方排期尚未开播':'公开计划播出日期在未来，平台当前开播状态仍待核实')+'；当前未找到唯一中国版对应项。未开播不代表不会提前分配 ss ID，将继续检查。';}
 else if(!en[item.intlId]||en[item.intlId]?.available===false){code='source-unavailable';reason='国际版历史 ID 当前未返回有效元数据，无法核对迁移后的中国版 ID；不能据此判定未开播或下架。';}
 else if(associated){code='candidate-unavailable';reason='已从官方季度关系定位 ss'+associated.season_id+'，但中国版条目接口当前返回 '+associated.code+'，暂无法读取完整条目。国际版官方条目仍可读取，这不能判定国际版已下架，也不代表该中国版链接当前可播放。';}
 else if(candidates.length){code='ambiguous';reason='存在多个季度、地区或配音版本候选，现有元数据不足以确定唯一对应 ID。';}
 else if(sameName.length){code='not-found';reason='已找到同名中国版候选，但简介不一致或资料不足，暂不自动确认对应关系。';}
 else{code='not-found';reason='已检查的中国版候选中没有标题与完整简介均一致的条目；可能尚未同步、未覆盖对应 ID，或两端简介不同。';}
 item.mappingStatus={code,reason,checkedAt:day,candidateIds:associated&&!item.cnId?[associated.season_id]:(candidates.length?candidates:sameName).map(x=>x.season_id)};
}
Catalog.validate(c.items);c.meta.mappingNote='未开播、接口未返回、版本歧义与尚未找到对应项分别标注；开播状态不等于中国版可播放状态。';c.meta.diagnosis=c.items.reduce((a,x)=>(a[x.mappingStatus.code]=(a[x.mappingStatus.code]||0)+1,a),{});await saveCatalog(c);
console.log(JSON.stringify({phase:'diagnosis-complete',added,mapped:c.items.filter(x=>x.cnId).length,status:c.meta.diagnosis}));
