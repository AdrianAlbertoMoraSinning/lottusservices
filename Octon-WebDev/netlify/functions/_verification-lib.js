function normalizeBaseUrl(input){
  const u=new URL(input);
  u.hash="";
  u.search="";
  if(!u.pathname.endsWith("/"))u.pathname=u.pathname.replace(/[^/]*$/,"/");
  return u;
}

function dedupe(values){return [...new Set(values.filter(Boolean))]}

function candidateUrls(baseUrl,target={}){
  const base=normalizeBaseUrl(baseUrl);
  if(target.type==="netlify_function"){
    const p=String(target.path||`/.netlify/functions/${target.name||""}`).replace(/^\/+/,"");
    return [new URL(`/${p}`,base.origin).toString()];
  }
  if(target.type!=="local_reference")return [];
  const urls=[];
  const resolved=String(target.resolvedPath||"").trim();
  if(resolved)urls.push(new URL(resolved.replace(/^\/+/,""),base).toString());
  const sourceRef=String(target.sourceRef||"").trim();
  const sourcePath=String(target.sourcePath||"").trim();
  if(sourceRef&&sourcePath){
    const sourceUrl=new URL(sourcePath.replace(/^\/+/,""),base);
    urls.push(new URL(sourceRef,sourceUrl).toString());
  }
  return dedupe(urls);
}

function expectedContentFamily(url){
  let pathname="";try{pathname=new URL(url).pathname.toLowerCase()}catch{return null}
  if(/\.(?:png|jpe?g|gif|webp|avif|svg|ico)$/.test(pathname))return "image";
  if(/\.css$/.test(pathname))return "css";
  if(/\.(?:m?js|cjs)$/.test(pathname))return "javascript";
  if(/\.(?:woff2?|ttf|otf|eot)$/.test(pathname))return "font";
  if(/\.json$/.test(pathname)||/\.webmanifest$/.test(pathname))return "json";
  if(/\.html?$/.test(pathname)||!/[.][a-z0-9]{1,8}$/i.test(pathname.split("/").pop()||""))return "html";
  return null;
}

function contentTypeMatches(family,contentType=""){
  const ct=String(contentType||"").toLowerCase();
  if(!family||!ct)return true;
  if(family==="image")return ct.startsWith("image/");
  if(family==="css")return ct.includes("text/css");
  if(family==="javascript")return /javascript|ecmascript/.test(ct);
  if(family==="font")return /font|woff|octet-stream/.test(ct);
  if(family==="json")return /json|manifest/.test(ct);
  if(family==="html")return /html|xhtml/.test(ct);
  return true;
}

function classifyResponse(targetType,status,contentType,url){
  const s=Number(status||0);
  if(s===404||s===410)return {decision:"issue_confirmed",reason:`Production returned HTTP ${s}.`};
  if(targetType==="netlify_function"){
    if(s>=200&&s<600)return {decision:"target_exists",reason:`The function route answered HTTP ${s}, proving the route exists.`};
    return {decision:"inconclusive",reason:`Unexpected HTTP status ${s||"unknown"}.`};
  }
  if(s>=200&&s<400){
    const family=expectedContentFamily(url);
    if(family&&!contentTypeMatches(family,contentType))return {decision:"issue_confirmed",reason:`Production answered HTTP ${s} but content-type ${contentType||"unknown"} does not match the expected ${family} resource.`};
    return {decision:"target_exists",reason:`Production returned HTTP ${s}${contentType?` (${contentType})`:""}.`};
  }
  if([401,403,429].includes(s))return {decision:"inconclusive",reason:`Production returned HTTP ${s}; access controls prevent a definitive missing/existing decision.`};
  if(s>=400&&s<500)return {decision:"issue_confirmed",reason:`Production returned HTTP ${s}.`};
  return {decision:"inconclusive",reason:`Production returned HTTP ${s||"unknown"}.`};
}

function attr(tag,name){
  const re=new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`,`i`);
  return (String(tag||"").match(re)||[])[2]||null;
}

function extractFaviconRefs(html){
  const refs=[];let manifest=null;
  for(const m of String(html||"").matchAll(/<link\b[^>]*>/gi)){
    const tag=m[0],rel=String(attr(tag,"rel")||"").toLowerCase(),href=attr(tag,"href");
    if(!href)continue;
    if(/(?:^|\s)(?:icon|shortcut icon|apple-touch-icon|mask-icon)(?:\s|$)/.test(rel))refs.push({rel,href});
    if(/(?:^|\s)manifest(?:\s|$)/.test(rel)&&!manifest)manifest=href;
  }
  return {icons:refs.slice(0,12),manifest};
}

function applyVerificationPatch(finding,patch){
  return {
    ...finding,
    verificationStatus: patch.decision==="issue_confirmed"?"verified_in_production":finding.verificationStatus,
    confidence: patch.decision==="issue_confirmed"?Math.max(Number(finding.confidence||0),.99):finding.confidence,
    productionVerification:{
      decision:patch.decision,
      url:patch.url||null,
      status:patch.status??null,
      contentType:patch.contentType||null,
      reason:patch.reason||null,
      checkedAt:patch.checkedAt||new Date().toISOString()
    }
  };
}

module.exports={normalizeBaseUrl,candidateUrls,expectedContentFamily,contentTypeMatches,classifyResponse,extractFaviconRefs,applyVerificationPatch};
