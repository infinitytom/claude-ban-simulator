/* Optional BYOK adapter. Credentials live only in this closure, never in game storage. */
(function(global){
 'use strict';
 const providers=Object.freeze({
  shared:{name:'站点默认 · 硅基流动',url:'https://claude-ban-simulator.dh103502.chatgpt.site/api/chat',model:'Qwen/Qwen2.5-7B-Instruct',label:'站点提供'},
  siliconflow:{name:'硅基流动',url:'https://api.siliconflow.cn/v1/chat/completions',model:'Qwen/Qwen2.5-7B-Instruct',label:'Qwen 2.5 7B'},
  openrouter:{name:'OpenRouter',url:'https://openrouter.ai/api/v1/chat/completions',model:'openrouter/free',label:'免费模型路由'},
  custom:{name:'自定义接口',url:'',model:'',label:'自定义模型'}
 });
 let config=null,activeController=null,sharedReady=false;
 class ServiceError extends Error{constructor(code,message){super(message);this.code=code;this.name='ServiceError'}}
 const errors={401:'密钥无效或已失效，请在 AI 服务设置中重新连接。',402:'当前账号额度不足。没有自动切换付费模型。',403:'服务拒绝访问，请确认账号权限和服务可用地区。',404:'所选模型暂不可用，请稍后重试或更换免费服务。',429:'免费服务额度或请求频率已达上限，请稍后重试。'};
 function status(){return config?{connected:true,sharedAvailable:sharedReady,provider:config.provider,name:providers[config.provider].name,label:config.model||providers[config.provider].label,model:config.model||providers[config.provider].model,url:config.url||providers[config.provider].url,maxTokens:config.maxTokens||900,temperature:config.temperature??.7,stream:config.stream!==false}:{connected:false,sharedAvailable:sharedReady,name:'未连接',label:'离线助手'}}
 function endpoint(value){let u;try{u=new URL(String(value).trim())}catch{throw new ServiceError('url','请输入完整的接口地址。')}if(u.username||u.password||u.search||u.hash)throw new ServiceError('url','接口地址不能包含账号、密码、查询参数或片段。');if(u.protocol!=='https:')throw new ServiceError('url','请使用 HTTPS 接口，避免浏览器拦截或泄露密钥。');const path=u.pathname.replace(/\/$/,'');if(!path)u.pathname='/v1/chat/completions';else if(/\/v\d+$/.test(path))u.pathname=path+'/chat/completions';return u.href}
 function connect(provider,key,consent,options={}){if(!providers[provider]||provider==='shared')throw new ServiceError('provider','不支持该服务。');if(!consent)throw new ServiceError('consent','请先确认数据发送和费用说明。');if(typeof key!=='string'||/\s/.test(key.trim())||(provider!=='custom'&&key.trim().length<12))throw new ServiceError('key','请输入有效的 API Key。');const url=endpoint(options.url||providers[provider].url),model=String(options.model||providers[provider].model).trim(),maxTokens=Number(options.maxTokens??900),temperature=Number(options.temperature??.7);if(!model||model.length>200)throw new ServiceError('model','请输入有效的模型 ID。');if(!Number.isInteger(maxTokens)||maxTokens<1||maxTokens>8192)throw new ServiceError('tokens','输出长度须为 1–8192 的整数。');if(!Number.isFinite(temperature)||temperature<0||temperature>2)throw new ServiceError('temperature','温度须为 0–2。');disconnect();config={provider,key:key.trim(),url,model,maxTokens,temperature,stream:options.stream!==false};return status()}
 function cancel(){activeController?.abort();activeController=null}
 function disconnect(){cancel();config=sharedReady?{provider:'shared'}:null}
 function offline(){cancel();config=null}
 function useShared(){if(!sharedReady)throw new ServiceError('not_ready','站点默认 AI 尚未启用。');cancel();config={provider:'shared'};return status()}
 async function initializeShared(){try{const response=await fetch('https://claude-ban-simulator.dh103502.chatgpt.site/api/config',{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});if(!response.ok)return status();const result=await response.json();sharedReady=result.sharedAvailable===true;if(sharedReady&&!config)config={provider:'shared'}}catch{}return status()}

 function messages(history){const list=history.filter(m=>['user','assistant'].includes(m.role)&&m.text&&!m.error).slice(-16).map(m=>({role:m.role,content:String(m.text).slice(0,4000)}));let remaining=24000;const clipped=[];for(let i=list.length-1;i>=0&&remaining>0;i--){const m=list[i];m.content=m.content.slice(-remaining);remaining-=m.content.length;clipped.unshift(m)}return [{role:'system',content:'你是一个友善、诚实的中文助手，为用户解答问题、写作和编程。优先沿用用户的语言。你不是 Anthropic Claude，不要声称自己是 Claude 或 Anthropic 的产品。不要声称能查看真实账号状态、IP、地理位置或执行本机操作。只输出最终回答，不输出内部推理过程。'},...clipped]}
 async function complete(history,onChunk){if(!config)throw new ServiceError('not_connected','尚未连接真实 AI 服务。');const snapshot=config,p=providers[snapshot.provider];cancel();const controller=new AbortController();activeController=controller;const timeout=setTimeout(()=>controller.abort(),90000);let text='';
  try{
   const response=await fetch(snapshot.url||p.url,{method:'POST',headers:{'Content-Type':'application/json',...(snapshot.provider==='shared'||!snapshot.key?{}:{'Authorization':'Bearer '+snapshot.key})},body:JSON.stringify({model:snapshot.model||p.model,messages:messages(history),stream:snapshot.stream!==false,max_tokens:snapshot.maxTokens||900,temperature:snapshot.temperature??.7}),signal:controller.signal,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok)throw new ServiceError(response.status,errors[response.status]||'AI 服务暂时不可用（'+response.status+'），请稍后重试。');
   if(!(response.headers.get('content-type')||'').includes('text/event-stream')){const data=await response.json();if(data.error)throw new ServiceError('upstream','AI 服务返回错误，请稍后重试。');const content=data.choices?.[0]?.message?.content;if(typeof content!=='string'||!content.trim())throw new ServiceError('empty','AI 服务没有返回可显示的内容。');onChunk?.(content);return content}
   if(!response.body)throw new ServiceError('stream','当前浏览器无法接收服务响应。');const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',doneMarker=false;
   function event(raw){for(const line of raw.split('\n')){if(!line.startsWith('data:'))continue;const payload=line.slice(5).trim();if(payload==='[DONE]'){doneMarker=true;continue}if(!payload)continue;let data;try{data=JSON.parse(payload)}catch{throw new ServiceError('parse','服务响应格式异常，请重试。')}if(data.error||data.choices?.[0]?.finish_reason==='error')throw new ServiceError(data.error?.code||'upstream','AI 服务在生成过程中中断，请稍后重试。');const delta=data.choices?.[0]?.delta?.content;if(typeof delta==='string'){text+=delta;if(text.length>24000)throw new ServiceError('size','回答过长，已停止生成。');onChunk?.(text)}}}
   while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});buffer=buffer.replace(/\r\n/g,'\n');let ix;while((ix=buffer.indexOf('\n\n'))!==-1){event(buffer.slice(0,ix));buffer=buffer.slice(ix+2)}if(doneMarker){await reader.cancel();break}if(buffer.length>100000)throw new ServiceError('parse','服务响应过大。')}
   buffer+=decoder.decode();if(buffer.trim())event(buffer);if(!text.trim())throw new ServiceError('empty','AI 服务未返回最终回答，请稍后重试。');return text;
  }catch(error){if(error instanceof ServiceError)throw error;if(error?.name==='AbortError')throw new ServiceError('cancelled','生成已停止或请求超时，可以重试。');throw new ServiceError('network','无法连接 AI 服务，请检查网络、接口地址及 CORS 跨域配置。')}
  finally{clearTimeout(timeout);if(activeController===controller)activeController=null}
 }
 global.ChatEngine=Object.freeze({status,connect,disconnect,offline,useShared,initializeShared,cancel,complete});
})(window);
