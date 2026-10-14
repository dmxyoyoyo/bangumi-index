import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Filters=require('../dist/sea-filters.js'),Catalog=require('../dist/catalog.js');
const vip=Filters.classify({title:'Example (English Dubbed)',styles:['Action','Sci-Fi'],payPolicy:'VIP',payPolicyEnum:1},'2026-10-09');
assert.deepEqual(vip,{genres:['Action','Sci-Fi'],dub:'english',paid:'premium',year:2026,quarter:'autumn'});
const free=Filters.classify({title:'Example',styles:['Comedy'],payPolicy:'FREE NOW',payPolicyEnum:3},'2019-12-31');
assert.equal(free.paid,'free');assert.equal(free.dub,null);assert.equal(Filters.classify({title:'Unknown',styles:[]},'').paid,null);
assert.equal(Filters.classify({payPolicyEnum:2},'2026').paid,null,'An unknown payment policy must not be guessed as free');
assert.equal(Filters.classify({},'2026').quarter,null);assert.equal(Filters.classify({},'2026-13-01').quarter,null);
const item=(id,data,origin='japan')=>({intlId:id,cnId:null,title:'示例作品 '+id,regions:['TH'],originCategory:origin,classification:data,release:{status:'aired'}});
const items=[item(1,vip),item(2,free,'china'),item(3,Filters.classify({},''),'other')];
assert.deepEqual(Catalog.filter(items,{origin:'japan',genre:'Action',dub:'english',paid:'premium',year:'2026',quarter:'autumn'}).map(x=>x.intlId),[1]);
assert.equal(Catalog.filter(items,{genre:'Comedy',paid:'premium'}).length,0,'Different groups must combine with AND');
assert.deepEqual(Catalog.filter(items,{year:'2015-2019'}).map(x=>x.intlId),[2]);assert.equal(Catalog.filter(items,{year:'2020'}).length,0);
assert.deepEqual(Catalog.filter(items,{query:'科幻'}).map(x=>x.intlId),[1]);assert.deepEqual(Catalog.filter(items,{query:'大会员'}).map(x=>x.intlId),[1]);
assert.equal(Catalog.filter(items,Filters.defaults).length,3,'All must still include works whose country or category is unknown');
assert.equal(Catalog.filter(items,{paid:'free'}).length,1,'Unknown payment metadata must not appear in free results');
for(const [year,range,expected] of [[2015,'2015-2019',true],[2019,'2015-2019',true],[2020,'2015-2019',false],[1979,'before-1980',true],[1980,'before-1980',false]])assert.equal(Filters.matches(item(1,{year}),{year:range}),expected);
const groups=Filters.groups(items,2026);assert.equal(groups.length,6);assert.deepEqual(groups[0].options.map(x=>x[1]),['全部','中国','日本']);
assert.equal(groups.some(x=>/Sort by|排序/.test(x.label)),false);assert.equal(new Set(Filters.genres.map(x=>x[0])).size,46);
assert.equal(groups[1].options.find(x=>x[0]==='18+')[1],'18+');
assert.equal(groups[2].options.length,7);
for(const [name,expected] of [['Eng Dubbed','english'],['Thai Dub','thai'],['ID Dub','indonesian'],['VN Dub','vietnamese'],['JPN Dub','japanese'],['Dub CN','chinese']]){
 const classified=Filters.classify({title:'Example ('+name+')'});
 assert.equal(classified.dub,expected);assert(Filters.searchText(item(1,classified)).includes(groups[2].options.find(x=>x[0]===expected)[1]));
}
assert.equal(Filters.classify({title:'日本动画',originAreas:['Japan']}).dub,null,'Production country must not be mistaken for audio language');
console.log(JSON.stringify({seaCategoryChecks:'passed',groups:groups.length,genres:Filters.genres.length,dubs:groups[2].options.length-1}));
