import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {SourceError,getJson,getIndexPage} from './shared.mjs';
import {collectDirectory} from './bilibili-directory.mjs';
import {collectChinese} from './refresh-cn.mjs';
import {collectEpisodeEvidence} from './episode-evidence.mjs';
const pause=async()=>{},oldDay='2026-10-23',day='2026-10-25',row=id=>({season_id:id,season_type:1,title:'作品 '+id});
const previous={meta:{checkedAt:oldDay,sources:[]},items:[{id:10,title:'旧作品',type:1},{id:11,title:'另一旧作品',type:1}]},before=structuredClone(previous);
let attempts=0;
const recovered=await collectDirectory({previous,pause,request:async url=>{
 if(attempts++===0)return {code:0,data:{list:[],total:2,has_next:1}};
 const type=Number(new URL(url).searchParams.get('season_type'));return {code:0,data:{list:[row(type)],total:1,has_next:0}};
}});
assert.equal(attempts,5);assert.equal(recovered.meta.refreshStatus,'updated');assert.equal(recovered.items.length,2);
let badPage=0;
const cached=await collectDirectory({previous,pause,request:async url=>{
 const page=Number(new URL(url).searchParams.get('page'));if(page===1)return {code:0,data:{list:[row(99)],total:2,has_next:1}};
 badPage++;return {code:0,data:{list:[],total:2,has_next:1}};
}});
assert.equal(badPage,3,'Only the failed page is retried, within a fixed limit');assert.equal(cached.meta.checkedAt,oldDay);assert.equal(cached.meta.refreshStatus,'cached');assert.deepEqual(cached.items,previous.items,'A partially fetched index cannot replace the complete snapshot');assert.deepEqual(previous,before);
await assert.rejects(collectDirectory({previous,pause,request:async()=>{throw new ReferenceError('collector code defect');}}),ReferenceError,'Programming errors must not become a successful cached refresh');
let malformed=0;
const page=await getIndexPage('https://api.bilibili.com/pgc/season/index/result',{pause,request:async()=>++malformed===1?{code:0,data:null}:{code:0,data:{list:[],has_next:0}}});
assert.equal(malformed,2);assert.equal(page.list.length,0);
for(const code of [-352,-412,-429]){let count=0;await assert.rejects(getIndexPage('https://api.bilibili.com/pgc/season/index/result',{pause,request:async()=>{count++;return {code};}}),error=>error instanceof SourceError&&error.rateLimited);assert.equal(count,1,'API limits are never retried');}
const cnCache={10:{season_id:10,title:'旧作品',checkedAt:oldDay,richCheckedAt:oldDay}},progress={checkedAt:oldDay,forwardNext:300000,backfillNext:285000},pending={items:[{title:'未核实作品',originCategory:'japan'}]};
const failed=await collectChinese({cache:cnCache,discovery:progress,catalog:pending,day,pause,request:async()=>({code:0,data:null})});
assert.deepEqual(failed.cache,cnCache);assert.equal(failed.discovery.checkedAt,oldDay);assert.equal(failed.discovery.forwardNext,progress.forwardNext);assert.equal(failed.discovery.backfillNext,progress.backfillNext);assert.equal(failed.discovery.refreshStatus,'cached');
const resumed=await collectChinese({cache:cnCache,discovery:failed.discovery,catalog:{items:[]},day,pause,request:async()=>({code:-404})});
assert.equal(resumed.discovery.refreshStatus,'updated');assert.equal(resumed.discovery.refreshWarning,null);assert(resumed.discovery.forwardNext>progress.forwardNext);assert(resumed.discovery.backfillNext>progress.backfillNext);
const evidence=await collectEpisodeEvidence({catalog:{items:[{intlId:1,title:'旧作品'}]},chinese:cnCache,cache:{intl:{},cn:{10:{checkedAt:oldDay,mainCount:2}}},skipChinese:true,pause,request:async url=>{assert(url.startsWith('https://api.bilibili.tv/'),'No further Chinese requests after a failed Chinese stage');return {code:0,data:{sections:[]}};}});
assert.equal(evidence.cn[10].checkedAt,oldDay);assert.equal(evidence.cn[10].mainCount,2);assert(evidence.intl[1].available);
const originalFetch=globalThis.fetch;
try{
 for(const status of [412,429]){let count=0;globalThis.fetch=async()=>{count++;return new Response('limited',{status});};await assert.rejects(getJson('https://api.bilibili.com/test'),error=>error instanceof SourceError&&error.rateLimited);assert.equal(count,1);}
 for(const failure of ['network','timeout','5xx','json']){let count=0;globalThis.fetch=async()=>{if(++count===1){if(failure==='network')throw new TypeError('fetch failed');if(failure==='timeout')throw new DOMException('Request timed out','TimeoutError');return new Response(failure==='json'?'{':'unavailable',{status:failure==='5xx'?503:200});}return new Response('{"ok":true}');};assert.deepEqual(await getJson('https://api.bilibili.com/test'),{ok:true});assert.equal(count,2);}
 let count=0;globalThis.fetch=async()=>{count++;throw new TypeError('fetch failed');};await assert.rejects(getJson('https://api.bilibili.com/test'),SourceError);assert.equal(count,3,'Network retries are bounded');
 globalThis.fetch=async()=>{throw new ReferenceError('code defect');};await assert.rejects(getJson('https://api.bilibili.com/test'),ReferenceError);
 globalThis.fetch=async()=>{throw new TypeError('Invalid request option');};await assert.rejects(getJson('https://api.bilibili.com/test'),error=>error instanceof TypeError&&!(error instanceof SourceError));
}finally{globalThis.fetch=originalFetch;}
const temp=await mkdtemp(join(tmpdir(),'bangumi-stability-')),root=new URL('../',import.meta.url),json=(path,value)=>writeFile(join(temp,path),JSON.stringify(value));
try{
 for(const path of ['scripts','data','dist'])await mkdir(join(temp,path));
 for(const path of ['scripts/refresh.mjs','scripts/shared.mjs'])await copyFile(new URL(path,root),join(temp,path));
 for(const stage of ['update','refresh-cn','episode-evidence','enrich','diagnose','gamer','bilibili','check'])await writeFile(join(temp,'scripts',stage+'.mjs'),`import {appendFile,writeFile} from 'node:fs/promises';
await appendFile('events.jsonl',JSON.stringify({stage:'${stage}',skip:process.argv.includes('--skip-chinese')})+'\\n');
if('${stage}'==='refresh-cn')await writeFile('data/cn-discovery.json',JSON.stringify({refreshStatus:process.env.TEST_CACHED==='cn'?'cached':'updated'}));
if('${stage}'==='bilibili')await writeFile('dist/bilibili-catalog.json',JSON.stringify({meta:{refreshStatus:process.argv.includes('--skip-chinese')||process.env.TEST_CACHED==='directory'?'cached':'updated'}}));
if('${stage}'==='check'&&process.env.TEST_CHECK_FAIL==='1')process.exit(1);`);
 const lastSuccess='2026-10-23T01:00:00Z',initial={meta:{lastSuccessfulRefresh:lastSuccess},items:[{intlId:1,cnId:278118}]};
 for(const mode of ['cn','directory','healthy','check-failure']){
  await json('dist/catalog.json',initial);await writeFile(join(temp,'events.jsonl'),'');await writeFile(join(temp,'summary.md'),'');
  const result=spawnSync(process.execPath,['scripts/refresh.mjs'],{cwd:temp,encoding:'utf8',env:{...process.env,TEST_CACHED:mode,TEST_CHECK_FAIL:mode==='check-failure'?'1':'0',GITHUB_STEP_SUMMARY:join(temp,'summary.md')}}),catalog=JSON.parse(await readFile(join(temp,'dist/catalog.json'),'utf8')),events=(await readFile(join(temp,'events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  if(mode==='check-failure'){assert.notEqual(result.status,0);assert.deepEqual(catalog,initial);assert.equal(await readFile(join(temp,'summary.md'),'utf8'),'');continue;}
  assert.equal(result.status,0,result.stderr);assert(events.some(x=>x.stage==='gamer'));assert(events.some(x=>x.stage==='check'));
  assert.equal(events.find(x=>x.stage==='episode-evidence').skip,mode==='cn');assert.equal(events.find(x=>x.stage==='bilibili').skip,mode==='cn');
  assert.equal(catalog.meta.refreshStatus,mode==='healthy'?'updated':'partial');
  if(mode==='healthy'){assert.notEqual(catalog.meta.lastSuccessfulRefresh,lastSuccess);assert.deepEqual(catalog.meta.cachedSources,[]);}else{assert.equal(catalog.meta.lastSuccessfulRefresh,lastSuccess);assert(catalog.meta.cachedSources.includes('哔哩哔哩国区目录'));assert((await readFile(join(temp,'summary.md'),'utf8')).includes('沿用上次数据'));}
 }
}finally{
 if(dirname(resolve(temp))!==resolve(tmpdir())||!basename(temp).startsWith('bangumi-stability-'))throw new Error('Unexpected test directory');
 await rm(temp,{recursive:true,force:true});
}
console.log(JSON.stringify({stabilityChecks:'passed',checks:['bounded network and malformed-page retries','stop immediately on rate limits','preserve complete snapshots and scan pointers','recover on the next healthy run','continue other platforms with honest partial status','validation and programming errors still fail']}));
