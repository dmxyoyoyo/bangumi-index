import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {collectGamer} from './gamer.mjs';
import {parseAcgOriginals} from './gamer-originals.mjs';
const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root),'utf8');
const catalog=JSON.parse(await read('dist/gamer-catalog.json')),raw=JSON.parse(await read('data/gamer-list.json'));
assert(catalog.items.length>0);assert.equal(catalog.items.length,raw.items.length);assert.equal(raw.meta.records,raw.items.length);
assert.equal(new Set(catalog.items.map(x=>x.id)).size,catalog.items.length);
for(const item of catalog.items){assert(Number.isSafeInteger(item.id)&&item.id>0&&item.title&&item.officialTitle);assert.equal(item.url,'https://ani.gamer.com.tw/animeRef.php?sn='+item.id);assert(!Object.hasOwn(item,'cnId'));}
for(const item of catalog.items){assert(['japanese','non-japanese','missing'].includes(item.originalStatus));if(item.originalStatus==='japanese')assert(item.japaneseTitle&&item.originalSourceUrl);else assert.equal(item.japaneseTitle,'');}
const acg=(name,region)=>'<div class="ACG-info-container"><h1>官方名称</h1><h2>'+name+'</h2><h2>English title</h2><ul><li>首播地區：'+region+'</li></ul>';
assert.equal(parseAcgOriginals(acg('魔法少女育成計画 restart','日本')).japaneseTitle,'魔法少女育成計画 restart');
assert.equal(parseAcgOriginals(acg('NEW GAME!','日本')).japaneseTitle,'NEW GAME!');
assert.equal(parseAcgOriginals(acg('フルーツバスケット 2nd Season','不明')).japaneseTitle,'フルーツバスケット 2nd Season');
assert.equal(parseAcgOriginals(acg('ウルトラマンアーク','全球')).japaneseTitle,'ウルトラマンアーク');
assert.equal(parseAcgOriginals(acg('ニワトリ・ファイター','北美')).japaneseTitle,'ニワトリ・ファイター');
assert.equal(parseAcgOriginals(acg('MONSTERS 一百三情飛龍侍極','全球')).originalStatus,'missing');
assert.equal(parseAcgOriginals(acg('Kung Fu Panda','美國')).originalStatus,'non-japanese');
assert.equal(parseAcgOriginals(acg('Kung Fu Panda','美國')).japaneseTitle,'');
assert.equal(parseAcgOriginals(acg('','日本')).originalStatus,'missing');
assert.equal(parseAcgOriginals(acg('A &amp; B &#x30AB;','日本')).japaneseTitle,'A & B カ');
assert.throws(()=>parseAcgOriginals('<html>暂时无法返回</html>'));
const context={window:{}};vm.runInNewContext(await read('dist/gamer-data.js'),context);assert.equal(JSON.stringify(context.window.GAMER_CATALOG),JSON.stringify(catalog));
vm.runInNewContext(await read('dist/home-data.js'),context);assert.equal(context.window.PLATFORM_COUNTS.gamer,catalog.items.length);assert.equal(context.window.PLATFORM_COUNTS.sea,JSON.parse(await read('dist/catalog.json')).items.length);
const home=await read('dist/index.html');for(const path of ['sea.html','gamer.html','home-data.js','home.js']){assert(home.includes('./'+path));await read('dist/'+path);}
const gamerHtml=await read('dist/gamer.html');for(const path of ['gamer-data.js','gamer.js','style.css']){assert(gamerHtml.includes('./'+path));await read('dist/'+path);}assert(!gamerHtml.includes('中国版 ss'));
const fixture=(id,title='动画')=>({animeSn:id,title});
const pages=[{totalPage:2,animeList:[fixture(1),fixture(2)]},{totalPage:2,animeList:[fixture(3)]}];
assert.equal((await collectGamer(async page=>pages[page-1])).items.length,3);
await assert.rejects(collectGamer(async page=>page===1?pages[0]:{totalPage:2,animeList:[]}));
await assert.rejects(collectGamer(async page=>page===1?pages[0]:{totalPage:2,animeList:[fixture(1)]}));
await assert.rejects(collectGamer(async page=>page===1?pages[0]:{totalPage:3,animeList:[fixture(3)]}));
await assert.rejects(collectGamer(async page=>({totalPage:3,animeList:page===1?[fixture(1),fixture(2)]:[fixture(3)]})));
let calls=0;await assert.rejects(collectGamer(async page=>++calls===3?{...pages[0],animeList:[fixture(4),fixture(5)]}:pages[page-1]));
assert.equal(await read('data/gamer-list.json'),JSON.stringify(raw,null,2)+'\n');
console.log(JSON.stringify({gamerChecks:'passed',records:catalog.items.length,pages:raw.meta.pages,checks:['unique official IDs and independent links','complete payload and homepage counts','empty/repeated/truncated/changed pagination rejected','failed collection does not replace stored snapshot']}));
