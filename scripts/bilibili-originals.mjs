import OpenCC from 'opencc-js';
const simplify=OpenCC.Converter({from:'tw',to:'cn'});
const key=text=>simplify(String(text||'')).normalize('NFKC').toLowerCase().replace(/\s/gu,'');
const workName=text=>String(text||'').replace(/[（(【\[]\s*(?:[僅仅]限|只限|[僅仅]在|只在|[僅仅])[^()（）【】\[\]]+(?:[)）】\]]|$)/g,'').trim().replace(/\s*(?:[（(【\[]\s*)?(?:中配(?:版)?|中文配音(?:版)?|普通话(?:版|配音版)?|国语(?:配音)?版|粤配版|粵配版|粤语(?:配音)?版|粵語(?:配音)?版|英文配音版|英语配音版|日语(?:配音)?版|日語(?:配音)?版)\s*[)）】\]]?\s*$/,'').trim();
export function fillBilibiliOriginals(items,entries,originals,{references=[],overrides={}}={}){
 const byName=new Map(),byMedia=new Map(),sources=new Map();
 for(const entry of entries){const previous=sources.get(entry.id);sources.set(entry.id,{...previous,...entry,mediaId:entry.mediaId||previous?.mediaId});}
 function add(name,record){const k=key(workName(name));if(!k||!record.japaneseTitle)return;const found=byName.get(k)||new Map();found.set(key(record.japaneseTitle),record);byName.set(k,found);}
 for(const ref of originals){const record={japaneseTitle:ref.name,sourceUrl:ref.subjectId?'https://bgm.tv/subject/'+ref.subjectId:'https://github.com/bangumi-data/bangumi-data'};for(const name of [ref.name,...ref.aliases||[]])add(name,record);for(const id of ref.mediaIds||[]){const found=byMedia.get(id)||new Map();found.set(key(ref.name),record);byMedia.set(id,found);}}
 for(const ref of references)for(const name of ref.names||[])add(name,ref);
 function save(item,ref){item.japaneseTitle=ref.japaneseTitle.trim();item.originalTitle=item.japaneseTitle;item.japaneseTitleSource=ref.sourceUrl;for(const name of [item.officialTitle,...item.aliases||[]])add(name,{japaneseTitle:item.japaneseTitle,sourceUrl:item.japaneseTitleSource});}
 // Media IDs identify editions; a shared media ID cannot select the last cour.
 for(const item of items){if(item.originCategory!=='japan'||item.japaneseTitle)continue;const entry=sources.get(item.id),override=overrides[item.id];if(override&&key(override.title)===key(item.officialTitle)){save(item,override);continue;}const media=byMedia.get(entry?.mediaId);if(media?.size===1)save(item,[...media.values()][0]);}
 for(const item of items)if(item.japaneseTitle)for(const name of [item.officialTitle,...item.aliases||[]])add(name,{japaneseTitle:item.japaneseTitle,sourceUrl:item.japaneseTitleSource||item.url});
 // Only remove dubbing labels. Punctuation, seasons, films and OVA/SP remain distinct.
 for(const item of items){if(item.originCategory!=='japan'||item.japaneseTitle)continue;const found=byName.get(key(workName(item.officialTitle)));if(found?.size===1)save(item,[...found.values()][0]);}
}
