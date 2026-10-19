/* Fictional story cues, not nationality detection or real account enforcement. No IP or location API is used. */
(function(global){
 'use strict';
 function detect(text){const t=String(text||'').trim();if(/假设|假如|如果|举例|翻译|引文|引用|这句话|他说|她说|台词|小说|角色|是否|会不会/.test(t))return [];
  const result=[];
  if(/我是(?:一个|一名)?中国人/.test(t))result.push('identity');
  if(/我(?:并)?不(?:是|在|住在|身处)/.test(t))return result.filter(k=>k!=='identity');
  const region='(?:中国大陆|大陆地区|国内|上海|北京|杭州|深圳|广州|成都|南京|武汉|嘉善|浙江|江苏|中国)';
  if(new RegExp('我(?:现在|目前|一直|最近|就|正|本人)?(?:在|住在|身处|位于)'+region).test(t)||new RegExp('我在'+region+'.{0,8}(?:生活|工作|上学|读书|上大学)').test(t))result.push('location');
  if(new RegExp('我(?:的)?(?:学校|大学|公司|工作单位)(?:就)?在'+region).test(t))result.push('institution');
  if(/\bI\s+(?:(?:am|currently|now)\s+)?(?:live|living|work|working|study|studying|am)\s+in\s+(?:mainland China|Shanghai|Beijing|Hangzhou|Shenzhen)\b/i.test(t))result.push('location');
  return [...new Set(result)];
 }
 function score(cues,seen){const previous=new Set(seen||[]),added=cues.filter(c=>!previous.has(c));return {added,points:added.reduce((sum,c)=>sum+(c==='location'?50:c==='institution'?30:0),0)}}
 global.StoryContext=Object.freeze({detect,score});
})(window);
