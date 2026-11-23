export function contentQueue(items,idField,cache,day,isActive){
 const tracked=new Map(items.filter(item=>Number.isSafeInteger(item[idField])&&item[idField]>0).map(item=>[item[idField],item]));
 const active=[],archived=[];
 for(const [id,item] of tracked)(isActive(item)?active:archived).push(id);
 const attempted=id=>cache[id]?.contentAttemptAt||'';
 const due=archived.filter(id=>attempted(id)!==day).sort((a,b)=>attempted(a).localeCompare(attempted(b))||a-b);
 const retry=archived.filter(id=>attempted(id)===day&&cache[id]?.contentCheckedAt!==day);
 // Each successful scheduled run covers half of the finished seasons, skipping today's earlier batch.
 const queue=[...active,...[...due,...retry].slice(0,Math.ceil(archived.length/2))];
 return {tracked,queue};
}

export function episodeId(episode){
 const id=Number(episode.episode_id||episode.ep_id||episode.id);
 return Number.isSafeInteger(id)&&id>0?id:null;
}

export function episodeIds(episodes){
 return [...new Set(episodes.map(episodeId).filter(Boolean))];
}

export function addedContent(previous,current){
 if(!previous||previous.available===false)return {episodes:0,previews:0};
 const oldIds=new Set(previous.mainEpisodeIds||[]),oldCount=previous.mainCount??previous.episodeCount;
 const episodes=previous.mainEpisodeIds&&current.mainEpisodeIds.length?
  current.mainEpisodeIds.filter(id=>!oldIds.has(id)).length:
  Number.isInteger(oldCount)?Math.max(0,(current.mainCount??current.episodeCount)-oldCount):0;
 const oldPreviews=previous.previews||[],newPreviews=new Set();
 if(previous.contentCheckedAt||previous.previews){
  for(const pv of current.previews||[]){
   if(oldPreviews.some(old=>pv.id&&old.id?pv.id===old.id:pv.asset&&pv.asset===old.asset&&pv.publishedAt===old.publishedAt))continue;
   if(pv.id||pv.asset&&pv.publishedAt)newPreviews.add(pv.id||pv.asset+'@'+pv.publishedAt);
  }
 }
 return {episodes,previews:newPreviews.size};
}

export function contentReview(tracked,cache,day,changes=[],warning=null){
 const states=[...tracked.keys()].map(id=>cache[id]);
 return {day,total:states.length,attempted:states.filter(x=>x?.contentAttemptAt===day).length,
  verified:states.filter(x=>x?.contentCheckedAt===day).length,changes,warning};
}
