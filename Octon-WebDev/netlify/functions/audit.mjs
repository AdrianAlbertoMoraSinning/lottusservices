import {json,parseBody} from './_shared.mjs';

export async function handler(event){
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'});
  const {portalId}=parseBody(event);
  if(portalId!=='please') return json(404,{error:'Portal not registered in v1.0'});

  // v1.0 baseline engine. Live browser/repository/research connectors are intentionally separated
  // so the control plane can be deployed and secured before external credentials are added.
  const dimensions={
    technology:82, ux:78, conversion:74, performance:80,
    security:86, privacy:81, accessibility:76, seo:79, competitivePositioning:73
  };
  const score=Math.round(Object.values(dimensions).reduce((a,b)=>a+b,0)/Object.keys(dimensions).length);
  return json(200,{
    auditId:`OCT-${Date.now()}`, portalId, mode:'baseline', score, dimensions,
    note:'Baseline engine active. Connect live repository/browser/research modules before treating scores as production evidence.',
    generatedAt:new Date().toISOString()
  });
}
