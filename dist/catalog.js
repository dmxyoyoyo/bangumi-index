(function(root){
'use strict';
const countries={BN:'文莱',KH:'柬埔寨',ID:'印度尼西亚',LA:'老挝',MY:'马来西亚',MM:'缅甸',PH:'菲律宾',SG:'新加坡',TH:'泰国',TL:'东帝汶',VN:'越南'};
const origins={all:'全部',japan:'日本',china:'中国',other:'其他'};
function clean(text){return String(text||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();}
function chineseLink(item){return Number.isSafeInteger(item.cnId)&&item.cnId>0?'https://www.bilibili.com/bangumi/play/ss'+item.cnId:null;}
function filter(items,options={}){
 const q=clean(options.query),ss=q.match(/(?:^ss|\/ss)(\d+)/),sea=q.match(/bilibili\.tv\/(?:[a-z]{2}\/)?(?:play|media)\/(\d+)/);
 const result=items.filter(item=>{
  if(options.origin&&options.origin!=='all'&&item.originCategory!==options.origin)return false;
  if(options.region&&!(item.regions||[]).includes(options.region))return false;
  if(options.mappedOnly&&!chineseLink(item))return false;
  if(options.status==='unmapped'&&chineseLink(item))return false;
  if(['upcoming','aired','unknown'].includes(options.status)&&item.release?.status!==options.status)return false;
  if(ss)return item.cnId===Number(ss[1]);
  if(sea)return item.intlId===Number(sea[1]);
  return !q||clean([item.title,item.seaTitle,item.japaneseTitle,item.originalName,item.officialTitle,...item.aliases||[],item.intlId,item.cnId].filter(Boolean).join(' ')).includes(q);
 });
 const sort=options.sort||'mapped';
 return result.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title,'zh-CN'):sort==='id-asc'?(a.intlId??Number.MAX_SAFE_INTEGER)-(b.intlId??Number.MAX_SAFE_INTEGER):sort==='id-desc'?(b.intlId??-1)-(a.intlId??-1):Number(Boolean(chineseLink(b)))-Number(Boolean(chineseLink(a)))||a.title.localeCompare(b.title,'zh-CN'));
}
function validate(items){
 const intl=new Set(),cn=new Set();
 for(const item of items){
  if(item.intlId!==null&&(!Number.isSafeInteger(item.intlId)||item.intlId<=0||intl.has(item.intlId)))throw new Error('Invalid or duplicate international ID');
  if(item.intlId!==null)intl.add(item.intlId);
  if(item.cnId!==null&&item.cnId!==undefined){if(!chineseLink(item)||cn.has(item.cnId))throw new Error('Invalid or duplicate Chinese ID');cn.add(item.cnId);}
  if(item.intlId===null&&!chineseLink(item))throw new Error('Record needs at least one known ID');
  if(item.originCategory!==undefined&&!['japan','china','other'].includes(item.originCategory))throw new Error('Invalid production country category');
  if(!item.title||!Array.isArray(item.regions))throw new Error('Missing title or region list');
 }
 return true;
}
const api={countries,origins,filter,chineseLink,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Catalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);


