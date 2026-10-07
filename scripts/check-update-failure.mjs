import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const paths=['dist/catalog.json','data/intl-metadata.json','data/localized-metadata.json'];
const before=await Promise.all(paths.map(p=>readFile(new URL('../'+p,import.meta.url),'utf8'))),originalFetch=globalThis.fetch;
try{
 globalThis.fetch=async()=>new Response('Source restricted',{status:412});
 await assert.rejects(import('./update.mjs?test=rate-limit'),/Source rate-limited/);
 globalThis.fetch=async()=>new Response(JSON.stringify({code:0,data:{cards:[],has_next:true}}),{status:200,headers:{'Content-Type':'application/json'}});
 await assert.rejects(import('./update.mjs?test=incomplete'),/Incomplete pagination/);
 assert.deepEqual(await Promise.all(paths.map(p=>readFile(new URL('../'+p,import.meta.url),'utf8'))),before);
}finally{globalThis.fetch=originalFetch;}
