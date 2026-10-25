import {readFile,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
export const root=new URL('../',import.meta.url);
export const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});
export async function readJson(path,fallback){try{return JSON.parse((await readFile(new URL(path,root),'utf8')).replace(/^\uFEFF/,''));}catch(error){if(error.code==='ENOENT'&&fallback!==undefined)return fallback;throw error;}}
export async function writeJson(path,value){await writeFile(new URL(path,root),JSON.stringify(value,null,2)+'\n');}
export async function saveCatalog(catalog){await writeJson('dist/catalog.json',catalog);await writeFile(new URL('dist/data.js',root),'window.SEA_CATALOG='+JSON.stringify(catalog).replace(/</g,'\\u003c')+';\n');}
export class SourceError extends Error{
 constructor(message,{rateLimited=false}={}){super(message);this.name='SourceError';this.rateLimited=rateLimited;}
}
const networkError=error=>['TimeoutError','AbortError'].includes(error.name)||error instanceof TypeError&&['fetch failed','terminated'].includes(error.message);
export async function getJson(url,options={}){
 for(let attempt=0;attempt<3;attempt++){
  let response;
  try{response=await fetch(url,{...options,headers:{'User-Agent':'Mozilla/5.0',Referer:url.includes('api.bilibili.tv')?'https://www.bilibili.tv/en/category?season_type=1,4':'https://www.bilibili.com/',...options.headers},signal:AbortSignal.timeout(30000)});}
  catch(error){if(!networkError(error))throw error;if(attempt===2)throw new SourceError('Source network request failed or timed out');await delay(2000*(attempt+1));continue;}
  if([412,429].includes(response.status)){await response.body?.cancel();throw new SourceError('Source rate-limited; preserve previous results and retry on the next update.',{rateLimited:true});}
  if(response.status>=500&&attempt<2){await response.body?.cancel();await delay(2000*(attempt+1));continue;}
  if(!response.ok){await response.body?.cancel();throw new SourceError('Source HTTP '+response.status);}
  try{return await response.json();}
  catch(error){if(!(error instanceof SyntaxError)&&!networkError(error))throw error;if(attempt===2)throw new SourceError('Source returned incomplete or invalid JSON');await delay(2000*(attempt+1));}
 }
}
export async function getIndexPage(url,{request=getJson,pause=delay,requireTotal=false}={}){
 for(let attempt=0;attempt<3;attempt++){
  const j=await request(url),data=j?.data;
  if([-352,-412,-429].includes(j?.code))throw new SourceError('Chinese index rate-limited',{rateLimited:true});
  const valid=j?.code===0&&Array.isArray(data?.list)&&[0,1,false,true].includes(data.has_next)&&(!requireTotal||Number.isSafeInteger(data.total)&&data.total>=1);
  const empty=valid&&!data.list.length&&(Boolean(data.has_next)||requireTotal);
  if(valid&&!empty)return data;
  const message=empty?(requireTotal?'哔哩哔哩国区目录中途分页为空':'Chinese index pagination incomplete'):(requireTotal?'哔哩哔哩国区目录返回无效数据':'Chinese index returned invalid data');
  if(attempt===2)throw new SourceError(message);
  console.warn(message+'；稍后重试当前页（'+(attempt+1)+'/2）。');await pause(1500*(attempt+1));
 }
}
