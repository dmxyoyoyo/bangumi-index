import assert from 'node:assert/strict';
import {classifyRelease} from './release.mjs';
import {classifyOrigin} from './origin.mjs';
import {candidatesFor,selectMapping,editionVersion} from './mapping.mjs';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),Catalog=require('../dist/catalog.js'),root=new URL('../',import.meta.url);
const catalog=JSON.parse(await readFile(new URL('dist/catalog.json',root),'utf8'));Catalog.validate(catalog.items);
const userLinks=JSON.parse(await readFile(new URL('data/user-links.json',root),'utf8'));for(const link of userLinks){const found=Catalog.filter(catalog.items,{query:'ss'+link.id});assert.equal(found.length,1);assert.equal(found[0].cnId,link.id);assert.equal(Catalog.chineseLink(found[0]),'https://www.bilibili.com/bangumi/play/ss'+link.id);}
const sample=catalog.items.find(x=>x.intlId===2080019);assert.equal(sample.cnId,278118);
assert.equal(Catalog.chineseLink(sample),'https://www.bilibili.com/bangumi/play/ss278118');
assert.equal(Catalog.chineseLink({intlId:123456,cnId:null}),null); const chineseOnly={intlId:null,cnId:282342,title:'无职转生第三季',regions:[]};Catalog.validate([chineseOnly]);assert.equal(Catalog.chineseLink(chineseOnly),'https://www.bilibili.com/bangumi/play/ss282342');assert.equal(Catalog.filter([chineseOnly],{query:'ss282342',mappedOnly:true}).length,1);assert.equal(Catalog.filter([chineseOnly],{query:'https://www.bilibili.tv/en/play/282342'}).length,0);assert.throws(()=>Catalog.validate([{...chineseOnly,cnId:null}]));assert.throws(()=>Catalog.validate([chineseOnly,{...chineseOnly,title:'Duplicate'}]));
for(const query of ['我推的孩子','2080019','ss278118','https://www.bilibili.com/bangumi/play/ss278118?spm_id_from=333.1387.0.0','https://www.bilibili.tv/en/play/2080019'])assert(Catalog.filter(catalog.items,{query}).some(x=>x.intlId===2080019));
assert(Catalog.filter(catalog.items,{region:'TH',mappedOnly:true}).some(x=>x.intlId===2080019));
assert(!Catalog.filter(catalog.items,{region:'SG',query:'ss278118'}).length);
assert(Catalog.filter(catalog.items,{mappedOnly:true}).every(Catalog.chineseLink));
assert(!Catalog.filter(catalog.items,{query:'a-title-that-is-not-in-the-catalog-190384'}).length);
for(const code of Object.keys(Catalog.countries))assert(Catalog.filter(catalog.items,{region:code}).every(x=>x.regions.includes(code)));
const context={window:{}};vm.runInNewContext(await readFile(new URL('dist/data.js',root),'utf8'),context);assert.equal(context.window.SEA_CATALOG.items.length,catalog.items.length);
const html=await readFile(new URL('dist/sea.html',root),'utf8');for(const path of ['style.css','data.js','catalog.js','app.js']){assert(html.includes('./'+path));await readFile(new URL('dist/'+path,root));}

const get=id=>catalog.items.find(x=>x.intlId===id);
assert.equal(get(2126386).title,'鬼人幻灯抄');assert.equal(get(2126386).japaneseTitle,'鬼人幻燈抄');
assert.equal(get(2246901).title,'小手指同学，请别乱摸');assert.equal(get(2342439).title,'Re：从零开始的异世界生活 第四季');
assert.equal(get(34885).title,'NEW GAME!');assert.equal(get(34488).title,'One Room');
assert.equal(get(37566).cnId,276423);assert.equal(get(1064501).cnId,277964);
for(const status of ['upcoming','aired','unknown'])assert(Catalog.filter(catalog.items,{status}).every(x=>x.release.status===status));
assert(Catalog.filter(catalog.items,{status:'unmapped'}).every(x=>!x.cnId));
assert(Catalog.filter(catalog.items,{query:'鬼人幻燈抄'}).some(x=>x.intlId===2126386));
for(const item of catalog.items){assert(item.seaTitle);assert(['aired','upcoming','unknown'].includes(item.release.status));assert(item.mappingStatus.reason);if(!item.cnId)assert.equal(Catalog.chineseLink(item),null);}
const day='2026-10-06',release=v=>classifyRelease({day,...v});
assert.deepEqual(release({date:'2026-10-07'}),{status:'upcoming',confirmed:false});
assert.deepEqual(release({date:'2026-10-07',finished:true}),{status:'aired',confirmed:true});
assert.deepEqual(release({date:'2026-10-07',officialUpcoming:true}),{status:'upcoming',confirmed:true});
assert.equal(release({date:'2026-10'}).status,'unknown');assert.equal(release({date:'2026'}).status,'unknown');
assert.equal(release({date:'2025'}).status,'aired');assert.equal(release({date:''}).status,'unknown');assert.equal(release({date:'2026-10-06'}).status,'unknown');
assert.equal(get(2113722).release.source,'B站中国版');assert.equal(get(2113722).release.date,'2024-08-06');
assert.equal(get(2432099).release.date,'2026-09-30');assert.equal(get(2432099).release.status,'aired');
const candidates=[{season_id:1,seasons:[{id:1,title:'S2'}]},{season_id:2,seasons:[{id:2,title:'SP'}]}];
assert.equal(selectMapping(candidates,null),null);assert.equal(selectMapping(candidates,null,{season:2}).season_id,1);assert.equal(selectMapping(candidates,null,{special:true}).season_id,2);
assert.equal(editionVersion({seaTitle:'Name (Thai Dub)',title:'作品 第二季'},{}),null);
const desc='A complete official synopsis with enough text for comparison.';
assert.equal(candidatesFor({title:'Example'}, {title:'Example',description:desc},null,[{season_id:1,title:'EXAMPLE!',evaluate:desc.replaceAll(' ','\n')},{season_id:2,title:'EXAMPLE!',evaluate:desc,available:false},{season_id:3,title:'EXAMPLE!',evaluate:'Another description'}]).length,1);
const dubbed=candidatesFor({seaTitle:'Example (Thai Dub)',title:'例子（泰语配音版）',aliases:['Example']},{title:'Example (Thai Dub)',description:desc},null,[{season_id:8,title:'Example',evaluate:desc,seasons:[{id:8,title:'TV'}]},{season_id:9,title:'Example (Thai Dub)',evaluate:desc,seasons:[{id:9,title:'Thai Dub'}]}]);assert.deepEqual(dubbed.map(x=>x.season_id),[9]);
const excluded=JSON.parse(await readFile(new URL('data/excluded-seasons.json',root),'utf8'));
const excludedIds=new Set(excluded.items.map(x=>x.intlId));assert.equal(excludedIds.size,excluded.items.length);
for(const id of excluded.userSamples)assert(excludedIds.has(id));
assert(catalog.items.every(x=>!excludedIds.has(x.intlId)&&['japan','china','other'].includes(x.originCategory)&&x.originCategorySource));
for(const link of userLinks)assert(!excluded.items.some(x=>x.intlId===catalog.items.find(y=>y.cnId===link.id)?.intlId));
for(const id of [35236,35237,36499,36500,1032858,1049771,1065327]){assert.equal(get(id),undefined);assert.equal(excluded.items.find(x=>x.intlId===id)?.decision,'user-requested-source-unavailable');}
assert.equal(get(2080019).originCategory,'japan');assert.equal(get(2187279).originCategory,'japan');
assert.equal(get(1006275).originCategory,'china');assert.equal(get(2077925).originCategory,'china');
for(const id of [2096264,2105385,2105746,2105814,2433174,2129353,2433235])assert.equal(get(id).originCategory,'china','Normal unmapped animation must remain');
for(const origin of ['japan','china','other'])assert(Catalog.filter(catalog.items,{origin}).every(x=>x.originCategory===origin));
assert.equal(Catalog.filter(catalog.items,{origin:'china',query:'ss278118'}).length,0);
assert(Catalog.filter(catalog.items,{origin:'japan',region:'TH',query:'推しの子'}).some(x=>x.intlId===2080019));
assert.equal(Catalog.filter(catalog.items,{origin:'all'}).length,catalog.items.length);
assert.equal(classifyOrigin({area:'United States',type:1,japaneseOriginal:true}).category,'other');
assert.equal(classifyOrigin({area:'Chinese Mainland',japaneseOriginal:true}).category,'china');
assert.equal(classifyOrigin({area:'Japan',type:4}).category,'japan');
assert.equal(classifyOrigin({tags:['中国','日本']}).category,'other');
assert.equal(classifyOrigin({tags:['国产']}).category,'china');
assert.equal(classifyOrigin({}).category,'other');
await import('./check-update-failure.mjs');
await import('./check-gamer.mjs');
console.log(JSON.stringify({checks:'passed',records:catalog.items.length,mappings:catalog.items.filter(x=>x.cnId).length,scope:'Excluded short dramas, country categories and combined filters, titles/original names, date precision and advance broadcasts, ambiguous editions, source failure preservation, unique IDs, search, filters and local assets'}));



