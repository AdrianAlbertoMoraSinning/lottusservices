const {jsonResponse,webResearch,normalizeFinding}=require("./_research-lib");
function prompt(kind,c){
  const common=`You are Octon, a supervised web-development research and review agent.
Current date: ${new Date().toISOString().slice(0,10)}
Portal: ${c.name}
URL: ${c.url}
Business: ${c.business}
Market: ${c.market}
Jurisdiction: ${c.jurisdiction}

Research CURRENT information on the web. Prefer primary and official sources for standards, law, regulation and platform documentation. Never invent evidence, competitors, laws, standards or defects. Distinguish fact from inference. Any legal/compliance item must set requiresHumanReview=true. This is issue spotting, not legal advice.

Return ONLY valid JSON:
{"summary":"...","findings":[{"severity":"high|medium|low|critical|info","title":"...","evidence":"...","operationalImpact":"...","commercialImpact":"...","recommendation":"...","affectedFiles":[],"proposedFix":"...","tests":[],"rollback":"...","confidence":0.0,"requiresHumanReview":false,"sources":[{"url":"...","title":"..."}]}],"coverage":[],"limitations":[]}.`;
  if(kind==="technical")return common+`\nFocus on current web engineering standards, resilience, observability, testing, performance, accessibility, SEO, security/privacy engineering and serverless deployment safety. Produce measurable engineering findings only.`;
  if(kind==="market")return common+`\nResearch current competitors and customer-experience/conversion practices in this market. Focus on trust signals, service presentation, lead capture, local search, differentiation and capabilities that can improve sales or customer problem-solving. Do not copy protected content.`;
  if(kind==="compliance")return common+`\nResearch potentially applicable privacy/data-handling, electronic commerce/consumer disclosure, accessibility, marketing consent, cybersecurity/data-breach and sector-specific requirements in the stated jurisdiction. Use official regulator/government sources wherever possible.`;
  throw new Error("Unknown research kind");
}
exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(!["GET","POST"].includes(event.httpMethod))return jsonResponse(405,{ok:false,error:"Method not allowed"});
  let b={};try{b=event.body?JSON.parse(event.body):{}}catch{}
  const kind=b.kind||event.queryStringParameters?.kind||"technical";
  if(!["technical","market","compliance"].includes(kind))return jsonResponse(400,{ok:false,error:"kind must be technical, market or compliance"});
  const c={name:b.name||process.env.OCTON_PORTAL_NAME||"P.L.E.A.S.E.",url:b.url||process.env.OCTON_PORTAL_URL||"https://pleasewebportal.netlify.app/",
    business:b.business||process.env.OCTON_PORTAL_BUSINESS||"multi-service local services marketplace and operations portal",
    market:b.market||process.env.OCTON_PORTAL_MARKET||"Calgary and surrounding areas, Alberta, Canada",
    jurisdiction:b.jurisdiction||process.env.OCTON_PORTAL_JURISDICTION||"Alberta, Canada"};
  try{
    const res=await webResearch(prompt(kind,c)),p=res.parsed||{},findings=(p.findings||[]).map(f=>normalizeFinding(f,kind,res.sources));
    return jsonResponse(200,{ok:true,mode:"READ_ONLY",engine:"Octon Live Web Research v1.4",kind,portal:c,summary:p.summary||res.text.slice(0,1500),findings,sources:res.sources,coverage:p.coverage||[],limitations:p.limitations||[],generatedAt:new Date().toISOString()});
  }catch(err){return jsonResponse(500,{ok:false,mode:"READ_ONLY",kind,error:err.message})}
};
