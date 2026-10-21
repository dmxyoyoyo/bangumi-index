import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {candidatesFor,verifiedOriginalMapping} from './mapping.mjs';
const root=new URL('../',import.meta.url),temp=await mkdtemp(join(tmpdir(),'bangumi-mapping-exclusions-'));
try{
 for(const name of ['scripts','dist','data'])await mkdir(join(temp,name));
 for(const path of ['scripts/diagnose.mjs','scripts/mapping.mjs','scripts/shared.mjs','scripts/release.mjs','scripts/update.mjs','dist/catalog.js','dist/sea-filters.js'])await copyFile(new URL(path,root),join(temp,path));
 const save=(path,value)=>writeFile(join(temp,path),JSON.stringify(value));
 const synopsis='Two companions explore an ancient city together, seeking its lost maps and the truth behind a forgotten promise.';
 const candidate={season_id:10,title:'示例动画',type:4,available:true,areas:[{id:1,name:'中国大陆'}],evaluate:synopsis};
 const item={intlId:1,cnId:10,title:'示例动画',seaTitle:'Example Anime',aliases:[],regions:['TH'],originCategory:'china',release:{status:'aired'}};
 const metadata={title:'Example Anime',originName:'示例动画',type:4,description:synopsis};
 const localized={title:'示例动画',description:synopsis};
 const verification={cnId:10,cnTitle:'示例动画',originalName:'示例动画'};
 assert.equal(candidatesFor(item,metadata,localized,[candidate]).length,1,'Production country alone must not exclude Chinese animation');
 assert.equal(candidatesFor(item,metadata,localized,[candidate],[10]).length,0);
 assert.equal(verifiedOriginalMapping(item,metadata,candidate,verification,[10]),false,'An old manual record cannot override a confirmed edition rejection');
 await save('dist/catalog.json',{meta:{},items:[item]});
 await save('data/cn-metadata.json',{10:candidate});
 await save('data/intl-metadata.json',{1:metadata});
 await save('data/localized-metadata.json',{1:localized});
 await save('data/mapping-verifications.json',{1:verification});
 await save('data/mapping-exclusions.json',{1:{cnIds:[10],checkedAt:'2026-10-21',reason:'用户实测为国区片源。'}});
 const run=async()=>{
  const result=spawnSync(process.execPath,[join(temp,'scripts/diagnose.mjs')],{cwd:temp,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  return JSON.parse(await readFile(join(temp,'dist/catalog.json'),'utf8')).items[0];
 };
 for(let attempt=0;attempt<2;attempt++){const result=await run();assert.equal(result.cnId,null);assert.equal(result.mappingStatus.code,'domestic-edition');assert.deepEqual(result.mappingStatus.excludedCnIds,[10]);assert.equal(result.mappingEvidence,undefined);}
 await save('data/cn-metadata.json',{10:candidate,20:{...candidate,season_id:20}});
 const pending=await run();assert.equal(pending.cnId,null,'A replacement sharing only work metadata still needs edition evidence');assert.deepEqual(pending.mappingStatus.candidateIds,[20]);
 const evidence={available:true,mainCount:1,extraCount:0,firstPublishedAt:1800000000000};
 await save('data/mapping-episodes.json',{intl:{1:evidence},cn:{20:evidence}});
 const recovered=await run();assert.equal(recovered.cnId,20,'A new matching SS ID for the same work must still be added');assert.equal(recovered.mappingStatus.code,'confirmed');assert.deepEqual(recovered.mappingStatus.excludedCnIds,[10]);
 const day=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});
 await save('dist/catalog.json',{meta:{},items:[{...item,cnId:null}]});
 await save('data/intl-metadata.json',{1:{...metadata,id:1,payPolicy:'FREE',checkedAt:day}});
 await save('data/localized-metadata.json',{1:{...localized,checkedAt:day}});
 const sourceCheck=spawnSync(process.execPath,['--input-type=module','--eval',`
  const requests=[];globalThis.fetch=async value=>{const url=new URL(value);requests.push(url.href);let data;
   if(url.pathname.endsWith('.xml'))return new Response('<loc>https://www.bilibili.tv/en/media/1</loc><loc>https://www.bilibili.tv/en/media/2</loc>');
   if(url.pathname.includes('/index/'))data={code:0,data:{cards:[{season_id:2,title:'New Anime'}],has_next:false}};
   else {const id=Number(url.searchParams.get('season_id'));data={code:0,data:{season:{season_id:id,title:'Anime '+id,origin_name:'作品'+id,description:'New official synopsis',limit_areas:['TH'],season_type_enum:4}}};}
   return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  };
  await import('./scripts/update.mjs');
  for(const locale of ['en_US','zh_CN'])if(!requests.some(value=>{const url=new URL(value);return url.searchParams.get('season_id')==='1'&&url.searchParams.get('s_locale')===locale;}))throw new Error('Same-day pending metadata was skipped');
 `],{cwd:temp,encoding:'utf8'});
 assert.equal(sourceCheck.status,0,sourceCheck.stderr);
 assert(JSON.parse(await readFile(join(temp,'dist/catalog.json'),'utf8')).items.some(x=>x.intlId===2),'A new official Southeast Asian work must be added');
 const workflow=await readFile(new URL('.github/workflows/refresh-edgeone.yml',root),'utf8');
 assert(/cron:\s*['"]0 7,19 \* \* \*['"]\s*\n\s*timezone:\s*Asia\/Shanghai/.test(workflow),'Preserve both Beijing-time update starts');
 assert(workflow.includes('run: npm run update'));assert(workflow.includes('makers deploy ./dist'));
 const refresh=await readFile(new URL('scripts/refresh.mjs',root),'utf8');
 for(const stage of ['update.mjs','refresh-cn.mjs','diagnose.mjs','gamer.mjs','bilibili.mjs'])assert(refresh.includes(stage));
 console.log(JSON.stringify({mappingExclusionsChecks:'passed',checks:['repeat updates keep rejected pairs unmapped','old manual matches stay blocked','replacement candidates wait for edition evidence','new matching SS IDs still added','Chinese production country is not an exclusion','07:00 and 19:00 live refresh and deployment retained']}));
}finally{
 if(dirname(resolve(temp))!==resolve(tmpdir())||!basename(temp).startsWith('bangumi-mapping-exclusions-'))throw new Error('Unexpected test directory');
 await rm(temp,{recursive:true,force:true});
}
