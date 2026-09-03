const {jsonResponse}=require("./_research-lib");
async function timed(url,timeout=12000){
  const c=new AbortController(),started=Date.now(),t=setTimeout(()=>c.abort(),timeout);
  try{const r=await fetch(url,{redirect:"follow",signal:c.signal,headers:{"user-agent":"Octon-Runtime-Health/1.2"}});const text=await r.text();
    return{ok:r.ok,status:r.status,ms:Date.now()-started,url:r.url,headers:Object.fromEntries(r.headers.entries()),bytes:Buffer.byteLength(text),text}}
  finally{clearTimeout(t)}
}
function page(text){return{hasHtml:/<html[\s>]/i.test(text),hasTitle:/<title>[^<]+<\/title>/i.test(text),hasViewport:/<meta[^>]+name=["']viewport["']/i.test(text),
  hasDescription:/<meta[^>]+name=["']description["']/i.test(text),hasH1:/<h1[\s>]/i.test(text),
  obviousError:/(internal server error|application error|function invocation failed|502 bad gateway|503 service unavailable)/i.test(text)}}
exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(!["GET","POST"].includes(event.httpMethod))return jsonResponse(405,{ok:false,error:"Method not allowed"});
  let body={};try{body=event.body?JSON.parse(event.body):{}}catch{}
  const target=body.url||process.env.OCTON_PORTAL_URL||"https://pleasewebportal.netlify.app/";
  let origin;try{origin=new URL(target).origin}catch{return jsonResponse(400,{ok:false,error:"Invalid portal URL"})}
  const paths=(body.paths||String(process.env.OCTON_RUNTIME_PATHS||"/,/service-request.html,/track-request.html").split(",")).slice(0,15);
  const results=[],findings=[];
  for(const p0 of paths){const p=String(p0).trim();if(!p)continue;try{const r=await timed(new URL(p,origin).toString());const pc=page(r.text);
    const ok=r.ok&&!pc.obviousError;results.push({path:p,ok,status:r.status,responseMs:r.ms,bytes:r.bytes,page:pc});
    if(!ok)findings.push({id:`runtime-${findings.length+1}`,severity:"critical",dimension:"runtime",title:"Production route failed",evidence:`${p}: HTTP ${r.status}`,operationalImpact:"A user-facing route may be unavailable.",commercialImpact:"Potential lost requests or trust.",recommendation:"Inspect deploy/function logs and route configuration.",affectedFiles:[],tests:[`GET ${p} returns 2xx and expected content`],rollback:"Revert the deployment that introduced the route failure.",confidence:.95,requiresHumanReview:false,sources:[]});
    if(r.ms>2500)findings.push({id:`runtime-${findings.length+1}`,severity:"medium",dimension:"performance",title:"Slow production response",evidence:`${p}: ${r.ms} ms`,operationalImpact:"Slower user interaction.",commercialImpact:"May reduce conversion.",recommendation:"Profile server/function/network path.",affectedFiles:[],tests:[`Response time for ${p} below agreed threshold`],rollback:"Revert the performance-impacting change.",confidence:.9,requiresHumanReview:false,sources:[]});
  }catch(err){results.push({path:p,ok:false,error:err.message});findings.push({id:`runtime-${findings.length+1}`,severity:"critical",dimension:"runtime",title:"Runtime check failed",evidence:`${p}: ${err.message}`,operationalImpact:"Route could not be verified.",commercialImpact:null,recommendation:"Check DNS, TLS, deploy and function availability.",affectedFiles:[],tests:[`GET ${p}`],rollback:null,confidence:.85,requiresHumanReview:false,sources:[]})}}
  return jsonResponse(200,{ok:results.every(x=>x.ok),mode:"READ_ONLY",engine:"Octon Runtime Health v1.2",target:origin,routesChecked:results.length,results,findings,
    limitations:["Unauthenticated smoke check only; controlled synthetic accounts are required for private workflows."],generatedAt:new Date().toISOString()});
};
