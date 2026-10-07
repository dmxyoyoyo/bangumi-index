export function classifyRelease({date='',day,started=false,finished=false,officialUpcoming=false}){
 if(started||finished)return {status:'aired',confirmed:true};
 if(!/^\d{4}(?:-\d{2}){0,2}$/.test(date))return {status:'unknown',confirmed:false};
 const first=date.length===4?date+'-01-01':date.length===7?date+'-01':date;
 const last=date.length===4?date+'-12-31':date.length===7?date+'-31':date;
 if(first>day)return {status:'upcoming',confirmed:officialUpcoming};
 if(last<day)return {status:'aired',confirmed:false};
 return {status:'unknown',confirmed:false};
}
