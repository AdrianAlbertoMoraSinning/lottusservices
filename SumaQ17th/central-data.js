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
  async function signIn(email,password){assertConfigured();const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return data;}
  async function signOut(){if(client)await client.auth.signOut();}
  async function session(){if(!client)return null;const {data}=await client.auth.getSession();return data.session;}
  window.SumaQData={configured,client,catalog,adminCatalog,saveProduct,deleteProduct,callFunction,getRows,updateRow,deleteRow,deleteOlder,orders,uploadProductImage,signIn,signOut,session};
}());
