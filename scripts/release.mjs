export function normalizeOfficialDate(value){
 const text=String(value||'').trim().replaceAll('/','-'),m=text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
 if(!m)return text;
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],month=months.indexOf(m[1].slice(0,3).toLowerCase())+1;
 if(!month)return text;
 const date=m[3]+'-'+String(month).padStart(2,'0')+'-'+m[2].padStart(2,'0'),time=Date.parse(date+'T00:00:00Z');
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===date?date:text;
}
export function normalizePremiereDate(value){
 const date=normalizeOfficialDate(value);
 return ['2098-12-31','2099-01-01'].includes(date)?'':date;
}
export function internationalUpcoming(...metadata){
 return metadata.some(item=>item?.available!==false&&/^(?:coming soon|即将上线|即将开播)$/i.test(item?.indexShow?.trim()||''));
}
export function classifyRelease({date='',day,started=false,finished=false,officialUpcoming=false,episodeEvidence=null,now=Date.now()}){
 date=normalizePremiereDate(date);
 if(started||finished||episodeEvidence?.available===true&&episodeEvidence.mainCount>0&&episodeEvidence.firstPublishedAt>0&&episodeEvidence.firstPublishedAt<=now)return {status:'aired',confirmed:true};
 if(!/^\d{4}(?:-\d{2}){0,2}$/.test(date))return officialUpcoming?{status:'upcoming',confirmed:true}:{status:'unknown',confirmed:false};
 const first=date.length===4?date+'-01-01':date.length===7?date+'-01':date;
 const last=date.length===4?date+'-12-31':date.length===7?date+'-31':date;
 if(first>day)return {status:'upcoming',confirmed:officialUpcoming};
 if(last<day)return {status:'aired',confirmed:false};
 return {status:'unknown',confirmed:false};
}
