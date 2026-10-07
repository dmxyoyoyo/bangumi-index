import {readFile,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
export const root=new URL('../',import.meta.url);
export const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});
export async function readJson(path,fallback){try{return JSON.parse((await readFile(new URL(path,root),'utf8')).replace(/^\uFEFF/,''));}catch(error){if(error.code==='ENOENT'&&fallback!==undefined)return fallback;throw error;}}
export async function writeJson(path,value){await writeFile(new URL(path,root),JSON.stringify(value,null,2)+'\n');}
export async function saveCatalog(catalog){await writeJson('dist/catalog.json',catalog);await writeFile(new URL('dist/data.js',root),'window.SEA_CATALOG='+JSON.stringify(catalog).replace(/</g,'\\u003c')+';\n');}
export async function getJson(url,options={}){for(let attempt=0;attempt<3;attempt++){const response=await fetch(url,{...options,headers:{'User-Agent':'Mozilla/5.0',Referer:url.includes('api.bilibili.tv')?'https://www.bilibili.tv/en/category?season_type=1,4':'https://www.bilibili.com/',...options.headers},signal:AbortSignal.timeout(30000)});if([412,429].includes(response.status)){await response.body?.cancel();throw new Error('Source rate-limited; preserve previous results and retry on the next update.');}if(response.status>=500&&attempt<2){await response.body?.cancel();await delay(2000*(attempt+1));continue;}if(!response.ok)throw new Error('Source HTTP '+response.status);return response.json();}}
