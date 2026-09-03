import crypto from 'node:crypto';

export const json = (statusCode, body) => ({ statusCode, headers:{'content-type':'application/json','cache-control':'no-store'}, body:JSON.stringify(body) });
export const parseBody = (event) => { try{return JSON.parse(event.body||'{}')}catch{return {}} };
export const stableStringify = (obj) => JSON.stringify(obj, Object.keys(obj).sort());
export const changeHash = (change) => crypto.createHash('sha256').update(stableStringify(change)).digest('hex');
export const signApproval = (payload, secret) => {
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig=crypto.createHmac('sha256',secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
};
export const verifyApproval = (token, secret) => {
  const [encoded,sig]=String(token||'').split('.');
  if(!encoded||!sig) throw new Error('Invalid approval token');
  const expected=crypto.createHmac('sha256',secret).update(encoded).digest('base64url');
  if(sig.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) throw new Error('Approval signature mismatch');
  const payload=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
  if(Date.now()>payload.expiresAt) throw new Error('Approval expired');
  return payload;
};
