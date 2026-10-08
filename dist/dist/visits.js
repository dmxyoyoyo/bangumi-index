'use strict';
(()=>{
 const target=document.getElementById('today-visits');
 if(!target||!['www.qianmoqingyu.dpdns.org','qianmoqingyu.dpdns.org'].includes(location.hostname))return;
 const day=new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10);
 const image=new Image();
 image.alt='今日访问量（数字由统计图显示）';image.height=20;
 image.onload=()=>target.replaceChildren(image);
 image.src='https://hits.sh/www.qianmoqingyu.dpdns.org/daily-'+day+'.svg?style=flat-square&label='+encodeURIComponent('今日访问量')+'&color=087faf';
})();
