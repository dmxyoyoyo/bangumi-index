'use strict';
function appendAnimeCover(cell,url){
 const details=document.createElement('div');details.className='anime-details';details.append(...cell.childNodes);
 const summary=document.createElement('div');summary.className='anime-summary';
 const cover=document.createElement('div');cover.className='anime-cover';
 const placeholder=document.createElement('span');placeholder.textContent=url?'封面加载中':'暂无封面';cover.append(placeholder);
 if(url){const image=document.createElement('img');image.alt='';image.width=72;image.height=102;image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';image.addEventListener('load',()=>{placeholder.hidden=true;});image.addEventListener('error',()=>{image.remove();placeholder.textContent='封面暂不可用';});image.src=url;cover.append(image);}
 summary.append(cover,details);cell.append(summary);
}
