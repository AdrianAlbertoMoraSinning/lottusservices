(function(){
  const cfg=window.RBM_SUPABASE||{};
  const configured=()=>/^https:\/\/.+\.supabase\.co$/i.test(cfg.url||'') && cfg.anonKey && !/PASTE_/i.test(cfg.anonKey);
  const baseHeaders=(token)=>({apikey:cfg.anonKey,Authorization:`Bearer ${token||cfg.anonKey}`,'Content-Type':'application/json'});
  async function request(path,{method='GET',body,token,headers={}}={}){
    if(!configured()) throw new Error('SUPABASE_NOT_CONFIGURED');
    const res=await fetch(cfg.url+path,{method,headers:{...baseHeaders(token),...headers},body:body===undefined?undefined:JSON.stringify(body)});
    let payload=null; const text=await res.text(); if(text){try{payload=JSON.parse(text)}catch{payload=text}}
    if(!res.ok){const err=new Error(payload?.message||payload?.error_description||payload?.hint||`Request failed (${res.status})`);err.status=res.status;err.payload=payload;throw err}
    return payload;
  }
  const rpc=(name,params={},token)=>request(`/rest/v1/rpc/${name}`,{method:'POST',body:params,token});
  const table={
    get:(name,query='',token)=>request(`/rest/v1/${name}${query?`?${query}`:''}`,{token}),
    post:(name,body,token,prefer='return=representation')=>request(`/rest/v1/${name}`,{method:'POST',body,token,headers:{Prefer:prefer}}),
    patch:(name,query,body,token)=>request(`/rest/v1/${name}?${query}`,{method:'PATCH',body,token,headers:{Prefer:'return=representation'}}),
    del:(name,query,token)=>request(`/rest/v1/${name}?${query}`,{method:'DELETE',token,headers:{Prefer:'return=representation'}})
  };
  async function signIn(email,password){
    if(!configured()) throw new Error('SUPABASE_NOT_CONFIGURED');
    return request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
  }
  async function me(token){return request('/auth/v1/user',{token});}
  window.RBMData={configured,request,rpc,table,signIn,me,config:cfg};
})();
