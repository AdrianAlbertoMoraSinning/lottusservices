(function(){
  'use strict';
  const cfg=window.SUMAQ_SUPABASE||{};
  const configured=Boolean(cfg.url&&cfg.anonKey&&!cfg.url.includes('YOUR_PROJECT')&&!cfg.anonKey.includes('YOUR_'));
  const client=configured&&window.supabase?window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  function assertConfigured(){if(!client)throw new Error('Central database is not configured. Complete supabase-config.js and Netlify environment variables.');}
  function normalizeProduct(row){return {id:row.slug||row.id,name:row.name,category:row.category,description:row.description||'',price:Number(row.price),unit:row.unit||'unit',image:row.image_url||'',active:row.active!==false,sortOrder:row.sort_order||0,dbId:row.id};}
  async function catalog(type){assertConfigured();const table=type==='shop'?'shop_products':'menu_items';const {data,error}=await client.from(table).select('*').eq('active',true).order('sort_order',{ascending:true}).order('name',{ascending:true});if(error)throw error;return (data||[]).map(normalizeProduct);}
  async function adminCatalog(type){assertConfigured();const table=type==='shop'?'shop_products':'menu_items';const {data,error}=await client.from(table).select('*').order('sort_order',{ascending:true}).order('name',{ascending:true});if(error)throw error;return (data||[]).map(normalizeProduct);}
  async function saveProduct(type,item){assertConfigured();const table=type==='shop'?'shop_products':'menu_items';const row={slug:item.id,name:item.name,category:item.category,description:item.description,price:Number(item.price),unit:item.unit,image_url:item.image,active:item.active!==false,sort_order:Number(item.sortOrder||0),updated_at:new Date().toISOString()};const {data,error}=await client.from(table).upsert(row,{onConflict:'slug'}).select().single();if(error)throw error;return normalizeProduct(data);}
  async function deleteProduct(type,slug){assertConfigured();const table=type==='shop'?'shop_products':'menu_items';const {error}=await client.from(table).delete().eq('slug',slug);if(error)throw error;}
  async function callFunction(action,payload){const response=await fetch('/.netlify/functions/sumaq-data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload})});const json=await response.json().catch(()=>({}));if(!response.ok)throw new Error(json.error||'The central data service could not complete the request.');return json.data;}
  async function getRows(table){assertConfigured();const {data,error}=await client.from(table).select('*').order('created_at',{ascending:false});if(error)throw error;return data||[];}
  async function updateRow(table,id,patch){assertConfigured();const {data,error}=await client.from(table).update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data;}
  async function deleteRow(table,id){assertConfigured();const {error}=await client.from(table).delete().eq('id',id);if(error)throw error;}
  async function deleteOlder(table,before,statuses){assertConfigured();let q=client.from(table).delete().lt('created_at',before);if(statuses&&statuses.length)q=q.in('status',statuses);const {error}=await q;if(error)throw error;}
  async function orders(){assertConfigured();const {data,error}=await client.from('orders').select('*,order_items(*)').order('created_at',{ascending:false});if(error)throw error;return data||[];}
  async function uploadProductImage(file,slug){assertConfigured();const ext=(file.name.split('.').pop()||'webp').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`${Date.now()}-${slug}.${ext}`;const {error}=await client.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;const {data}=client.storage.from('product-images').getPublicUrl(path);return data.publicUrl;}
  function jwtIssuedAtFuture(error){return /jwt\s+issued\s+at\s+future|issued\s+at\s+future/i.test(String(error&&error.message||error||''));}
  async function signIn(email,password){assertConfigured();const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return data;}
  async function signOut(){
    if(!client)return;
    try{
      const {error}=await client.auth.signOut({scope:'local'});
      if(error)throw error;
    }catch(error){
      /* A broken/invalid access token must never trap the admin in a bad cached session. */
      try{await client.auth.signOut();}catch(_){/* local auth storage is cleared by the scoped attempt in supported clients */}
    }
  }
  async function session(){if(!client)return null;const {data,error}=await client.auth.getSession();if(error)throw error;return data.session;}
  async function refreshSession(){
    assertConfigured();
    const {data,error}=await client.auth.refreshSession();
    if(error)throw error;
    if(!data||!data.session)throw new Error('Your admin session could not be renewed. Please sign in again.');
    return data.session;
  }
  async function clearInvalidSession(){
    if(!client)return;
    try{await client.auth.signOut({scope:'local'});}catch(_){try{await client.auth.signOut();}catch(__){}}
  }
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function ensureFreshSession(){
    const current=await session();
    if(!current)return null;
    /* Validate the cached session first. Do not mint a new token on every page load. */
    const {error}=await client.auth.getUser();
    if(!error)return current;
    try{
      const renewed=await refreshSession();
      /* Allow for small clock differences between Auth and the database gateway. */
      await wait(1200);
      return renewed;
    }catch(refreshError){
      await clearInvalidSession();
      if(jwtIssuedAtFuture(error)||jwtIssuedAtFuture(refreshError))return null;
      throw refreshError;
    }
  }
  async function withAuthRetry(task){
    try{return await task();}
    catch(error){
      if(!jwtIssuedAtFuture(error))throw error;
      /* A tiny Auth/PostgREST clock skew can clear by itself without replacing the token. */
      await wait(1800);
      try{return await task();}catch(secondError){
        if(!jwtIssuedAtFuture(secondError))throw secondError;
      }
      try{await refreshSession();await wait(1200);}
      catch(refreshError){await clearInvalidSession();throw refreshError;}
      return await task();
    }
  }
  window.SumaQData={configured,client,catalog,adminCatalog,saveProduct,deleteProduct,callFunction,getRows,updateRow,deleteRow,deleteOlder,orders,uploadProductImage,signIn,signOut,session,refreshSession,clearInvalidSession,ensureFreshSession,withAuthRetry,jwtIssuedAtFuture};
}());
