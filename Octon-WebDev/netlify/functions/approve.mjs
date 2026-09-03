import {json,parseBody,changeHash,signApproval} from './_shared.mjs';

export async function handler(event){
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'});
  const secret=process.env.OCTON_APPROVAL_SECRET;
  if(!secret || secret.length<24) return json(503,{error:'Approval signing is not configured'});
  const {approvedBy,change}=parseBody(event);
  if(!approvedBy || !change?.portalId || !change?.repo || !change?.path || typeof change?.content!=='string')
    return json(400,{error:'approvedBy and complete change payload are required'});
  const now=Date.now();
  const payload={
    approvalId:`APP-${now}`,
    approvedBy,
    changeHash:changeHash(change),
    portalId:change.portalId,
    repo:change.repo,
    path:change.path,
    issuedAt:now,
    expiresAt:now+(30*60*1000)
  };
  return json(200,{approvalId:payload.approvalId,approvalToken:signApproval(payload,secret),expiresAt:new Date(payload.expiresAt).toISOString(),changeHash:payload.changeHash});
}
