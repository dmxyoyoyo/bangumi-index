export function classifyOrigin({area,type,tags=[],japaneseOriginal=false}={}){
 const classify=value=>{const text=String(value||'');const japan=/日本|japan/i.test(text),china=/中国|中國|台湾|臺灣|香港|澳门|澳門|chinese|china|taiwan|hong kong|macau/i.test(text);return japan&&china?'other':japan?'japan':china?'china':'other';};
 if(area&&String(area).trim())return {category:classify(area),source:'官方制作地区'};
 const countryTags=tags.filter(tag=>/^(日本|日本动画|日本动漫|中国|中国动画|国产|国创|美国|韩国|英国|法国|加拿大|德国|澳大利亚)$/.test(tag));
 if(countryTags.length)return {category:classify(countryTags.map(x=>/国产|国创/.test(x)?'中国':x).join(' ')),source:'Bangumi 国家标签'};
 if(Number(type)===4)return {category:'china',source:'官方国创分类'};
 if(japaneseOriginal)return {category:'japan',source:'日文原名推断'};
 return {category:'other',source:'制作地区待确认'};
}
