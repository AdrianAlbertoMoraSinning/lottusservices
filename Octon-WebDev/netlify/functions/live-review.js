const {jsonResponse}=require("./_research-lib");
async function call(origin,path,payload,timeout=125000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{const r=await fetch(new URL(path,origin),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload||{}),signal:c.signal});const raw=await r.text();let d;try{d=JSON.parse(raw)}catch{d={ok:false,error:raw.slice(0,1000)}}return{httpStatus:r.status,...d}}
  catch(err){return{ok:false,error:err.message}}finally{clearTimeout(t)}
}
function w(s){return({critical:20,high:10,medium:4,low:1,info:0})[s]||0}
exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(!["GET","POST"].includes(event.httpMethod))return jsonResponse(405,{ok:false,error:"Method not allowed"});
  let b={};try{b=event.body?JSON.parse(event.body):{}}catch{}
  const origin=process.env.URL||process.env.DEPLOY_PRIME_URL;if(!origin)return jsonResponse(500,{ok:false,error:"Netlify URL environment variable unavailable"});
  const portal={name:b.name||process.env.OCTON_PORTAL_NAME||"P.L.E.A.S.E.",url:b.url||process.env.OCTON_PORTAL_URL||"https://pleasewebportal.netlify.app/",
    business:b.business||process.env.OCTON_PORTAL_BUSINESS||"multi-service local services marketplace and operations portal",market:b.market||process.env.OCTON_PORTAL_MARKET||"Calgary and surrounding areas, Alberta, Canada",
    jurisdiction:b.jurisdiction||process.env.OCTON_PORTAL_JURISDICTION||"Alberta, Canada"};
  const steps={};
  steps.github=await call(origin,"/api/github-read",{},40000);
  steps.codeHealth=await call(origin,"/api/code-health",{},120000);
  steps.runtime=await call(origin,"/api/runtime-health",{url:portal.url},50000);
  steps.snapshot=await call(origin,"/api/portal-snapshot",{url:portal.url},40000);
  steps.pageSpeed=await call(origin,"/api/pagespeed-audit",{url:portal.url},125000);
  steps.technicalResearch=await call(origin,"/api/research-review",{kind:"technical",...portal},125000);
  steps.marketResearch=await call(origin,"/api/research-review",{kind:"market",...portal},125000);
  steps.complianceResearch=await call(origin,"/api/research-review",{kind:"compliance",...portal},125000);

  const findings=[...(steps.codeHealth.findings||[]),...(steps.runtime.findings||[]),...(steps.snapshot.findings||[]),...(steps.technicalResearch.findings||[]),...(steps.marketResearch.findings||[]),...(steps.complianceResearch.findings||[])];
  const dedup=[];const seen=new Set();for(const f of findings){const k=`${f.dimension}|${f.severity}|${f.title}|${f.file||""}`;if(!seen.has(k)){seen.add(k);dedup.push(f)}}
  const penalty=dedup.reduce((n,f)=>n+w(f.severity),0),findingScore=Math.max(0,100-Math.min(100,penalty));
  const psi=[];for(const r of steps.pageSpeed.results||[])if(r.ok)for(const v of Object.values(r.scores||{}))if(Number.isFinite(v))psi.push(v);
  const psiAvg=psi.length?Math.round(psi.reduce((a,c)=>a+c,0)/psi.length):null;
  const code=Number.isFinite(steps.codeHealth.score)?steps.codeHealth.score:null;
  const parts=[findingScore];if(psiAvg!==null)parts.push(psiAvg);if(code!==null)parts.push(code);
  const score=Math.round(parts.reduce((a,c)=>a+c,0)/parts.length);
  const componentStatus=Object.fromEntries(Object.entries(steps).map(([k,v])=>[k,v.ok?"LIVE":(v.error?"ERROR":"PARTIAL")]));
  return jsonResponse(200,{ok:Object.values(steps).some(x=>x.ok),mode:"READ_ONLY",engine:"Octon v1.2 Live Research & Review Engine",version:"1.2",
    portal,score,scoreNote:"Evidence-based composite; not a legal certification or proof of defect-free operation.",findings:dedup,openFindings:dedup.filter(x=>x.severity!=="info").length,
    componentStatus,components:steps,
    governance:{githubWriteEnabled:String(process.env.OCTON_GITHUB_WRITE_ENABLED||"false").toLowerCase()==="true",requiredSafeState:false,autonomousResearch:true,autonomousAudit:true,autonomousCodeGeneration:true,commitPushRequiresExactHumanApproval:true},
    generatedAt:new Date().toISOString()});
};
