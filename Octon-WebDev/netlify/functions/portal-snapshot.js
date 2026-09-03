const {jsonResponse}=require("./_research-lib");
const {safeFetch,assertPublicUrl}=require("./_url-safety");
function meta(html,name){const a=new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`,"i"),b=new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`,"i");return (html.match(a)||html.match(b)||[])[1]||null}
exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="POST")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  let b={};try{b=JSON.parse(event.body||"{}")}catch{}
  const target=String(b.url||process.env.OCTON_PORTAL_URL||"").trim();
  if(!target)return jsonResponse(400,{ok:false,error:"Portal URL is required."});
  try{await assertPublicUrl(target)}catch(err){return jsonResponse(400,{ok:false,error:err.message})}
  const start=Date.now(),r=await safeFetch(target,{headers:{"user-agent":"Octon-Portal-Snapshot/1.4"}}),html=await r.text(),h=Object.fromEntries(r.headers.entries());
  const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.replace(/\s+/g," ").trim()||null;
  const h1=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(x=>x[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()).filter(Boolean);
  const imgs=[...html.matchAll(/<img\b[^>]*>/gi)].map(x=>x[0]),findings=[];
  const add=(severity,dimension,title,evidence,recommendation)=>findings.push({id:`snapshot-${findings.length+1}`,severity,dimension,title,evidence,operationalImpact:null,commercialImpact:null,recommendation,affectedFiles:["index.html"],proposedFix:null,tests:[],rollback:null,confidence:.95,requiresHumanReview:false,sources:[]});
  if(!title)add("high","seo","Missing page title","No <title> detected.","Add a specific title.");
  if(!meta(html,"description"))add("medium","seo","Missing meta description","No meta description detected.","Add a concise page description.");
  if(!h1.length)add("medium","seo","Missing H1","No H1 detected.","Add one primary page heading.");
  const missingAlt=imgs.filter(x=>!/\balt\s*=/i.test(x)).length;if(missingAlt)add("medium","accessibility","Images missing alt",`${missingAlt}/${imgs.length} image(s) lack alt.`,"Add alt attributes.");
  for(const name of ["strict-transport-security","content-security-policy","x-content-type-options","referrer-policy","permissions-policy"])if(!h[name])add("medium","security",`Missing ${name} header`,"Header not present on main response.","Add an appropriate response header and regression test it.");
  return jsonResponse(200,{ok:r.ok,mode:"READ_ONLY",engine:"Octon Portal Snapshot v1.4",status:r.status,finalUrl:r.url,responseMs:Date.now()-start,bytes:Buffer.byteLength(html),
    seo:{title,description:meta(html,"description"),robots:meta(html,"robots"),h1:h1.slice(0,10)},structure:{images:imgs.length,missingAlt,scripts:(html.match(/<script\b/gi)||[]).length,forms:(html.match(/<form\b/gi)||[]).length},
    securityHeaders:Object.fromEntries(["strict-transport-security","content-security-policy","x-content-type-options","referrer-policy","permissions-policy"].map(k=>[k,h[k]||null])),findings,generatedAt:new Date().toISOString()});
};
