import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {collectChinese,collectIndexSeeds} from './refresh-cn.mjs';
import {normalizeOfficialDate} from './release.mjs';
import {selectMapping,matchesReleaseDate,candidatesFor} from './mapping.mjs';
const indexItems=[{title:'命运拳台',seaTitle:'Ringing Fate',aliases:[],originCategory:'china'}],indexRequests=[];
const directory=await collectIndexSeeds({items:indexItems,pause:async()=>{},request:async url=>{
 indexRequests.push(url);return new URL(url).searchParams.get('page')==='1'?{code:0,data:{list:[{season_id:39668,title:'命运拳台'}],has_next:1}}:{code:0,data:{list:[{season_id:123,title:'Unrelated anime'}],has_next:0}};
}});
assert.deepEqual(directory,[39668],'Older public directory IDs must be discovered without probing a large numeric range');assert.equal(indexRequests.length,2);
await assert.rejects(collectIndexSeeds({items:indexItems,pause:async()=>{},request:async()=>({code:0,data:{list:[],has_next:1}})}),/incomplete/);
await assert.rejects(collectIndexSeeds({items:indexItems,pause:async()=>{},request:async()=>{throw new Error('Source HTTP 412');}}),/412/);
const day='2026-10-10',seeds=[{id:326551},{id:324859}],original={323926:{season_id:323926,checkedAt:day,richCheckedAt:day}},before=structuredClone(original),seen=[];
const first=await collectChinese({cache:original,discovery:{backfillNext:288511},catalog:{items:[{cnId:323926}]},seeds,day,pause:async()=>{},request:async url=>{
 if(url.includes('/season/index/result'))return {code:0,data:{list:[],has_next:0}};
 const id=Number(new URL(url).searchParams.get('season_id'));seen.push(id);
 return seeds.some(x=>x.id===id)?{code:0,result:{season_id:id,title:'Example '+id,evaluate:'Official complete description for this animation.',episodes:[],seasons:[]}}:{code:-404};
}});
assert.deepEqual(original,before,'A refresh must not mutate the previous cache');
assert(seen.includes(326551)&&seen.includes(324859),'User links beyond the former frontier must be checked');
assert.equal(first.cache[326551].season_id,326551);assert.equal(first.cache[324859].season_id,324859);
assert.equal(first.discovery.range[0],326451);assert.equal(first.discovery.forwardNext,326952);
const second=await collectChinese({cache:first.cache,discovery:first.discovery,catalog:{items:[{cnId:323926}]},seeds,day,pause:async()=>{},request:async url=>url.includes('/season/index/result')?{code:0,data:{list:[],has_next:0}}:{code:-404}});
assert(second.discovery.range[0]>first.discovery.range[1],'The next scan must advance even when no new mapping was made');
const discovered=await collectChinese({cache:{323926:{season_id:323926,checkedAt:day,richCheckedAt:day}},discovery:{backfillNext:288511},catalog:{items:indexItems},day,pause:async()=>{},request:async url=>{
 if(url.includes('/season/index/result'))return {code:0,data:{list:[{season_id:39668,title:'命运拳台'}],has_next:0}};
 const id=Number(new URL(url).searchParams.get('season_id'));return id===39668?{code:0,result:{season_id:id,title:'命运拳台',episodes:[],seasons:[{season_id:39669,season_title:'S2'}]}}:id===39669?{code:0,result:{season_id:id,title:'Example sequel',episodes:[],seasons:[]}}:{code:-404};
}});
assert.equal(discovered.cache[39668].title,'命运拳台','Public-directory IDs must feed the actual metadata collector');
assert.equal(discovered.cache[39669].title,'Example sequel','Official related-season IDs must be followed outside the numeric window');
const secondBefore=structuredClone(second);
await assert.rejects(collectChinese({cache:second.cache,discovery:second.discovery,catalog:{items:[]},seeds,day,pause:async()=>{},request:async url=>url.includes('/season/index/result')?{code:0,data:{list:[],has_next:0}}:({code:-412})}),/rate-limited/);
await assert.rejects(collectChinese({cache:second.cache,discovery:second.discovery,catalog:{items:[]},seeds,day,pause:async()=>{},request:async()=>{throw new Error('Source HTTP 429');}}),/429/);
await assert.rejects(collectChinese({cache:second.cache,discovery:second.discovery,catalog:{items:[]},seeds,day,pause:async()=>{},request:async url=>url.includes('/season/index/result')?{code:0,data:{list:[],has_next:0}}:({code:0,result:{season_id:1}})}),/invalid season/);
assert.deepEqual(second,secondBefore,'Source failures must leave the previous cache and scan progress unchanged');
assert.equal(normalizeOfficialDate('May 22, 2026'),'2026-05-22');assert.equal(normalizeOfficialDate('Apr 7, 2023'),'2023-04-07');
assert.equal(normalizeOfficialDate('2026/10/05'),'2026-10-05');assert.equal(normalizeOfficialDate('2026-10'),'2026-10');
assert.equal(normalizeOfficialDate('Feb 30, 2026'),'Feb 30, 2026');
const editions=[{season_id:278104,publish:{pub_time:'2023-04-07 01:00:00'}},{season_id:278126,publish:{pub_time:'2023-04-21 01:00:00'}}];
assert.equal(selectMapping(editions,{source:'B站国际版',date:'Apr 6, 2023'}).season_id,278104);
assert.equal(selectMapping(editions,{source:'B站国际版',date:'Apr 7, 2023'}).season_id,278104);
assert.equal(selectMapping(editions,{source:'B站国际版',date:'Apr 20, 2023'}).season_id,278126);
assert.equal(selectMapping(editions,{source:'Bangumi',date:'Apr 6, 2023'}),null);
assert.equal(selectMapping([{publish:{pub_time:'2026-05-22'}},{publish:{pub_time:'2026-05-23'}}],{source:'B站国际版',date:'May 22, 2026'}),null,'Nearby editions must remain ambiguous');
assert.equal(matchesReleaseDate(editions[0],{source:'B站国际版',date:'2023-02-30'}),false);
const longSynopsis='阿明是山海城图书馆的学徒，他每天整理旧地图，却发现城市的道路总在夜里改变。为了寻找失踪的老师，他和修补机械的小林、熟悉星象的小夏组成调查小队。他们沿着地图留下的标记走遍不同街区，帮助居民找回遗失的物品，也逐渐发现古老钟楼与城市变化之间的联系。旅途让三人学会合作，最终决定一起保护这座城市的秘密。';
const intro='故事发生在一座漂浮于云海之上的城市。这里的居民通过旧地图寻找回家的道路，而那些地图有时会隐藏重要线索。';
assert.equal(candidatesFor({seaTitle:'Example',title:'示例动画'},null,{title:'示例动画',description:intro+longSynopsis},[{season_id:43370,title:'示例动画',evaluate:longSynopsis}]).length,1);
assert.equal(candidatesFor({seaTitle:'Different title',title:'其他',aliases:['示例动画']},null,{title:'Different title',description:intro+longSynopsis},[{season_id:43370,title:'示例动画',evaluate:longSynopsis}]).length,0,'Shared synopsis alone must not match an alias from a different official title');
assert.equal(candidatesFor({seaTitle:'Example',title:'例子'},null,{title:'例子',description:'少年展开冒险之旅，这是一个关于梦想与成长的故事。'},[{season_id:1,title:'例子',evaluate:'少年展开冒险之旅'}]).length,0,'Short generic synopsis fragments must not produce a mapping');
const root=new URL('../',import.meta.url),catalog=JSON.parse(await readFile(new URL('dist/catalog.json',root),'utf8'));
for(const [intlId,cnId] of [[2433041,326551],[2433665,324859],[2078586,278104],[2080734,278126],[2407257,282288],[2407935,282299],[2411817,282344],[2096264,39668],[2105385,45957],[2105746,45973],[2433235,118958],[2105814,43370]]){
 assert.equal(catalog.items.find(x=>x.intlId===intlId)?.cnId,cnId,'A verified missing platform mapping must survive refresh');
}
assert.equal(catalog.items.find(x=>x.intlId===2418319)?.cnId,null,'A different regional release must not share the same Chinese ID');

assert.equal(catalog.items.find(x=>x.intlId===2129353)?.cnId,null,'Different full descriptions must not be matched solely by title');
assert(catalog.items.find(x=>x.intlId===2129353)?.mappingStatus.candidateIds.includes(45964));
assert.equal(catalog.items.find(x=>x.intlId===2433235)?.release.status,'upcoming','Allocated IDs must not turn an unstarted season into an aired one');
