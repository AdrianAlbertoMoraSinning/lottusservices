const {jsonResponse}=require("./_github-lib");
const {safeFetch,assertPublicUrl}=require("./_url-safety");
const {candidateUrls,classifyResponse,extractFaviconRefs,applyVerificationPatch}=require("./_verification-lib");

function boundedInt(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback}
async function inspect(url,targetType,timeoutMs){
  let response;
  try{
    response=await safeFetch(url,{method:"HEAD",signal:AbortSignal.timeout(timeoutMs),headers:{"user-agent":"Octon-Verification/1.5","accept":"*/*"}});
    if([405,501].includes(response.status)){
      try{response.body?.cancel?.()}catch{}
      response=await safeFetch(url,{method:"GET",signal:AbortSignal.timeout(timeoutMs),headers:{"user-agent":"Octon-Verification/1.5","accept":"*/*","range":"bytes=0-2047"}});
    }
    const status=response.status,contentType=response.headers.get("content-type")||"";
    const result=classifyResponse(targetType,status,contentType,response.url||url);
    try{response.body?.cancel?.()}catch{}
    return {...result,url:response.url||url,status,contentType,checkedAt:new Date().toISOString()};
  }catch(err){
    return {decision:"inconclusive",url,status:null,contentType:null,reason:`Verification request failed: ${err.message}`,checkedAt:new Date().toISOString()};
  }
}
async function readTextLimited(response,maxBytes=900000){
  if(!response.body)return "";
  const reader=response.body.getReader();const chunks=[];let size=0;
  try{
    while(true){
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;if(size>maxBytes)throw new Error("HTML response exceeded verification read limit.");
      chunks.push(Buffer.from(value));
    }
  }finally{try{reader.releaseLock()}catch{}}
  return Buffer.concat(chunks).toString("utf8");
}
function productionFinding({id,title,evidence,recommendation,targetUrl}){
  return {
    id,fingerprint:`production|${id}|${targetUrl||"portal"}`,severity:"medium",dimension:"branding",title,evidence,
    operationalImpact:"The deployed portal is not serving a complete icon identity to browsers/devices.",
    commercialImpact:"Missing or broken browser/app identity can reduce polish and brand recognition.",
    recommendation,affectedFiles:["index.html","site.webmanifest"],proposedFix:"Declare reachable favicon and app-icon assets and verify them after deployment.",
    tests:["Load the production document and verify each declared icon returns the expected image content type."],
    rollback:"Restore the previous icon declarations if a new asset causes compatibility problems.",confidence:.99,verificationStatus:"verified_in_production",requiresHumanReview:false,occurrences:1,sources:[],
    productionVerification:{decision:"issue_confirmed",url:targetUrl||null,status:null,contentType:null,reason:evidence,checkedAt:new Date().toISOString()}
  };
}

exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="POST")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  let body={};try{body=JSON.parse(event.body||"{}")}catch{return jsonResponse(400,{ok:false,error:"Invalid JSON"})}
  const portalUrl=String(body.url||"").trim();
  if(!portalUrl)return jsonResponse(400,{ok:false,error:"Production URL is required."});
  try{await assertPublicUrl(portalUrl)}catch(err){return jsonResponse(400,{ok:false,error:err.message})}
  const maxTargets=boundedInt(process.env.OCTON_VERIFY_MAX_TARGETS,40,1,80);
  const timeoutMs=boundedInt(process.env.OCTON_VERIFY_TIMEOUT_MS,7000,1500,15000);
  const input=Array.isArray(body.findings)?body.findings:[];
  const candidates=input.filter(f=>f&&f.fingerprint&&f.verificationTarget).slice(0,maxTargets);
  const verified=[],cleared=[],inconclusive=[];let requests=0;

  for(const finding of candidates){
    const target=finding.verificationTarget||{},urls=candidateUrls(portalUrl,target).slice(0,2);
    if(!urls.length){inconclusive.push({fingerprint:finding.fingerprint,decision:"inconclusive",reason:"No safe production URL could be derived from the finding target."});continue}
    const observations=[];
    for(const url of urls){
      const result=await inspect(url,target.type,timeoutMs);requests++;observations.push(result);
      if(result.decision==="target_exists")break;
    }
    const exists=observations.find(x=>x.decision==="target_exists");
    if(exists){cleared.push({fingerprint:finding.fingerprint,...exists});continue}
    const confirmed=observations.find(x=>x.decision==="issue_confirmed");
    if(confirmed){verified.push(applyVerificationPatch(finding,confirmed));continue}
    const last=observations[observations.length-1]||{decision:"inconclusive",reason:"No observation available.",checkedAt:new Date().toISOString()};
    inconclusive.push({fingerprint:finding.fingerprint,...last});
  }

  // Production favicon / manifest identity check.
  const productionFindings=[];const favicon={declared:0,reachable:0,broken:0,manifest:null,notes:[]};
  try{
    const home=await safeFetch(portalUrl,{method:"GET",signal:AbortSignal.timeout(timeoutMs),headers:{"user-agent":"Octon-Verification/1.5","accept":"text/html,*/*;q=0.8"}});requests++;
    const ct=home.headers.get("content-type")||"";
    if(home.ok&&/html|xhtml/.test(ct)){
      const html=await readTextLimited(home);const refs=extractFaviconRefs(html);favicon.declared=refs.icons.length;favicon.manifest=refs.manifest||null;
      if(!refs.icons.length){
        productionFindings.push(productionFinding({id:"favicon-missing",title:"No favicon declared in production",evidence:"The deployed HTML contains no rel=icon/apple-touch-icon declaration.",recommendation:"Declare an SVG/PNG favicon and Apple touch icon in the document head.",targetUrl:home.url||portalUrl}));
      }else{
        for(const icon of refs.icons.slice(0,8)){
          let iconUrl;try{iconUrl=new URL(icon.href,home.url||portalUrl).toString()}catch{continue}
          const result=await inspect(iconUrl,"local_reference",timeoutMs);requests++;
          if(result.decision==="target_exists")favicon.reachable++;
          else if(result.decision==="issue_confirmed"){
            favicon.broken++;
            productionFindings.push(productionFinding({id:`favicon-broken-${favicon.broken}`,title:"Favicon asset is not reachable in production",evidence:`${icon.rel}: ${iconUrl} — ${result.reason}`,recommendation:"Correct the favicon href or deploy the missing icon asset.",targetUrl:iconUrl}));
          }else favicon.notes.push(`${iconUrl}: ${result.reason}`);
        }
      }
      if(refs.manifest){
        try{const manifestUrl=new URL(refs.manifest,home.url||portalUrl).toString();const mr=await inspect(manifestUrl,"local_reference",timeoutMs);requests++;favicon.manifest={url:manifestUrl,decision:mr.decision,status:mr.status};
          if(mr.decision==="issue_confirmed")productionFindings.push(productionFinding({id:"manifest-broken",title:"Web manifest is not reachable in production",evidence:`${manifestUrl} — ${mr.reason}`,recommendation:"Correct the manifest href or deploy the missing web manifest.",targetUrl:manifestUrl}));
        }catch(err){favicon.notes.push(`Manifest verification failed: ${err.message}`)}
      }
    }else{try{home.body?.cancel?.()}catch{};favicon.notes.push(`Homepage did not return HTML (${home.status} ${ct||"unknown content type"}).`)}
  }catch(err){favicon.notes.push(`Favicon verification skipped: ${err.message}`)}

  return jsonResponse(200,{
    ok:true,mode:"READ_ONLY",engine:"Octon Production Verification v1.5",target:portalUrl,
    examined:candidates.length,requests,verified,cleared,inconclusive,productionFindings,favicon,
    limits:{maxTargets,timeoutMs},generatedAt:new Date().toISOString()
  });
};
