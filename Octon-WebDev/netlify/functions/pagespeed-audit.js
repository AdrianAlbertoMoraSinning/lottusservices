const {jsonResponse}=require("./_research-lib");
const {assertPublicUrl}=require("./_url-safety");
function score(lh,k){const x=lh?.categories?.[k]?.score;return Number.isFinite(x)?Math.round(x*100):null}
function metric(a,id){const x=a?.[id];return x?{id,title:x.title,displayValue:x.displayValue||null,numericValue:x.numericValue??null,score:x.score??null}:null}
exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="POST")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  let b={};try{b=JSON.parse(event.body||"{}")}catch{}
  const target=String(b.url||process.env.OCTON_PORTAL_URL||"").trim();
  if(!target)return jsonResponse(400,{ok:false,error:"Portal URL is required."});
  let u;try{u=await assertPublicUrl(target)}catch(err){return jsonResponse(400,{ok:false,error:err.message})}
  const key=process.env.GOOGLE_PAGESPEED_API_KEY||"",results=[];
  for(const strategy of ["mobile","desktop"]){
    const qs=new URLSearchParams({url:u.toString(),strategy});
    for(const c of ["performance","accessibility","best-practices","seo"])qs.append("category",c);
    if(key)qs.set("key",key);
    try{
      const r=await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${qs}`),raw=await r.text();
      if(!r.ok){results.push({strategy,ok:false,status:r.status,error:raw.slice(0,700)});continue}
      const data=JSON.parse(raw),lh=data.lighthouseResult||{},a=lh.audits||{};
      results.push({strategy,ok:true,lighthouseVersion:lh.lighthouseVersion||null,fetchedAt:data.analysisUTCTimestamp||new Date().toISOString(),
        scores:{performance:score(lh,"performance"),accessibility:score(lh,"accessibility"),bestPractices:score(lh,"best-practices"),seo:score(lh,"seo")},
        metrics:["first-contentful-paint","largest-contentful-paint","cumulative-layout-shift","interaction-to-next-paint","total-blocking-time","speed-index"].map(id=>metric(a,id)).filter(Boolean),
        opportunities:Object.values(a).filter(x=>x?.details?.type==="opportunity").map(x=>({id:x.id,title:x.title,displayValue:x.displayValue||null,savingsMs:x.details?.overallSavingsMs??null,score:x.score??null})).sort((a,b)=>(b.savingsMs||0)-(a.savingsMs||0)).slice(0,20)});
    }catch(err){results.push({strategy,ok:false,error:err.message})}
  }
  return jsonResponse(200,{ok:results.some(x=>x.ok),mode:"READ_ONLY",engine:"Octon PageSpeed Live Audit v1.4",target:u.toString(),results,generatedAt:new Date().toISOString()});
};
