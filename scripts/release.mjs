export function normalizeOfficialDate(value){
 const text=String(value||'').trim().replaceAll('/','-'),m=text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
 if(!m)return text;
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],month=months.indexOf(m[1].slice(0,3).toLowerCase())+1;
 if(!month)return text;
 const date=m[3]+'-'+String(month).padStart(2,'0')+'-'+m[2].padStart(2,'0'),time=Date.parse(date+'T00:00:00Z');
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===date?date:text;
}
export function classifyRelease({date='',day,started=false,finished=false,officialUpcoming=false}){
 date=normalizeOfficialDate(date);
 if(started||finished)return {status:'aired',confirmed:true};
 if(!/^\d{4}(?:-\d{2}){0,2}$/.test(date))return {status:'unknown',confirmed:false};
 const first=date.length===4?date+'-01-01':date.length===7?date+'-01':date;
 const last=date.length===4?date+'-12-31':date.length===7?date+'-31':date;
 if(first>day)return {status:'upcoming',confirmed:officialUpcoming};
 if(last<day)return {status:'aired',confirmed:false};
 return {status:'unknown',confirmed:false};
}
