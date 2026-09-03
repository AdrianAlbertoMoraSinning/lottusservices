const {jsonResponse}=require("./_research-lib");
const {safeFetch,assertPublicUrl}=require("./_url-safety");

async function timed(url,timeout=12000){
  const c=new AbortController(),started=Date.now(),t=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await safeFetch(url,{signal:c.signal,headers:{"user-agent":"Octon-Runtime-Health/1.3"}});
    const text=await r.text();
    return{ok:r.ok,status:r.status,ms:Date.now()-started,url:r.url,headers:Object.fromEntries(r.headers.entries()),bytes:Buffer.byteLength(text),text}
  }finally{clearTimeout(t)}
}
function page(text){return{
  hasHtml:/<html[\s>]/i.test(text),hasTitle:/<title>[^<]+<\/title>/i.test(text),
  hasViewport:/<meta[^>]+name=["']viewport["']/i.test(text),hasDescription:/<meta[^>]+name=["']description["']/i.test(text),
  hasH1:/<h1[\s>]/i.test(text),obviousError:/(internal server error|application error|function invocation failed|502 bad gateway|503 service unavailable)/i.test(text)
}}
exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="POST")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  let b={};try{b=JSON.parse(event.body||"{}")}catch{}
  const target=String(b.url||process.env.OCTON_PORTAL_URL||"").trim();
  if(!target)return jsonResponse(400,{ok:false,error:"Portal URL is required for runtime checks."});
  let origin;try{origin=(await assertPublicUrl(target)).origin}catch(err){return jsonResponse(400,{ok:false,error:err.message})}
  const rawPaths=Array.isArray(b.paths)?b.paths:String(process.env.OCTON_RUNTIME_PATHS||"/").split(",");
  const paths=rawPaths.map(x=>String(x).trim()).filter(Boolean).slice(0,12),results=[],findings=[];
  for(const p of paths){
    try{
      const r=await timed(new URL(p,origin).toString()),pc=page(r.text),ok=r.ok&&!pc.obviousError;
      results.push({path:p,ok,status:r.status,responseMs:r.ms,bytes:r.bytes,page:pc});
      if(!ok)findings.push({id:`runtime-${findings.length+1}`,severity:"critical",dimension:"runtime",title:"Production route failed",evidence:`${p}: HTTP ${r.status}`,operationalImpact:"A user-facing route may be unavailable.",commercialImpact:"Potential lost requests or trust.",recommendation:"Inspect deployment, routing and function logs.",affectedFiles:[],proposedFix:null,tests:[`GET ${p} returns expected 2xx content`],rollback:"Revert the deployment that introduced the route failure.",confidence:.95,requiresHumanReview:false,sources:[]});
      if(r.ms>2500)findings.push({id:`runtime-${findings.length+1}`,severity:"medium",dimension:"performance",title:"Slow production response",evidence:`${p}: ${r.ms} ms`,operationalImpact:"Slower user interaction.",commercialImpact:"May reduce conversion.",recommendation:"Profile server/function/network path.",affectedFiles:[],proposedFix:null,tests:[`Response time for ${p} below agreed threshold`],rollback:"Revert the performance-impacting change.",confidence:.9,requiresHumanReview:false,sources:[]});
    }catch(err){results.push({path:p,ok:false,error:err.message});findings.push({id:`runtime-${findings.length+1}`,severity:"critical",dimension:"runtime",title:"Runtime check failed",evidence:`${p}: ${err.message}`,operationalImpact:"Route could not be verified.",commercialImpact:null,recommendation:"Check DNS, TLS, routing and deployment availability.",affectedFiles:[],proposedFix:null,tests:[`GET ${p}`],rollback:null,confidence:.85,requiresHumanReview:false,sources:[]})}
  }
  return jsonResponse(200,{ok:results.every(x=>x.ok),mode:"READ_ONLY",engine:"Octon Runtime Health v1.3",target:origin,routesChecked:results.length,results,findings,generatedAt:new Date().toISOString()});
};
