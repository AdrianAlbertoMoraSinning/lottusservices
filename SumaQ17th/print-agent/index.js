const net=require('net');
const API=process.env.SUMAQ_PRINT_API_URL||'https://lottusservices.ca/.netlify/functions/sumaq-print-agent';
const TOKEN=process.env.SUMAQ_PRINT_AGENT_TOKEN||'';
const HOST=process.env.PRINTER_HOST||'';
const PORT=Number(process.env.PRINTER_PORT||9100);
const AGENT=process.env.AGENT_NAME||'Sumaq-Kitchen-1';
const DRY=/^(1|true|yes)$/i.test(process.env.DRY_RUN||'false');
const POLL=Math.max(2000,Number(process.env.POLL_MS||4000));
if(!TOKEN){console.error('Missing SUMAQ_PRINT_AGENT_TOKEN');process.exit(1)}if(!DRY&&!HOST){console.error('Missing PRINTER_HOST (or set DRY_RUN=true)');process.exit(1)}
const ascii=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E\n]/g,'?');
const line=(l='',r='',w=42)=>{l=ascii(l);r=ascii(r);const n=Math.max(1,w-l.length-r.length);return (l+' '.repeat(n)+r).slice(0,w)};
function ticket(o){const src=o.source_channel==='uber_eats'?'UBER EATS':o.source_channel==='skip'?'SKIP':'PICKUP';let t='\x1b@\x1bE\x01'+src+'\n'+ascii(o.public_id)+'\x1bE\x00\n';t+=line(o.pickup_date||'',o.pickup_time||'ASAP')+'\n';t+='------------------------------------------\n';for(const i of o.items||[])t+=`${i.quantity} x ${ascii(i.product_name)}\n`;if(o.notes)t+='\n\x1bE\x01NOTES: '+ascii(o.notes)+'\x1bE\x00\n';t+='------------------------------------------\n';t+=ascii(o.customer_name||'Guest')+'\n';if(o.phone)t+=ascii(o.phone)+'\n';t+=line('TOTAL',Number(o.total||0).toLocaleString('en-CA',{style:'currency',currency:'CAD'}))+'\n';t+=ascii(o.payment_status||'')+'\n\n\n\x1dV\x00';return Buffer.from(t,'binary')}
async function api(action,payload={}){const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','X-Sumaq-Print-Agent-Token':TOKEN},body:JSON.stringify({action,payload})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j.data}
function send(buf){if(DRY){console.log('\n--- DRY RUN TICKET ---\n'+buf.toString('binary').replace(/[\x00-\x1f]/g,c=>c==='\n'?'\n':''));return Promise.resolve()}return new Promise((resolve,reject)=>{const s=net.createConnection({host:HOST,port:PORT,timeout:5000},()=>s.end(buf));s.on('close',resolve);s.on('timeout',()=>s.destroy(new Error('Printer timeout')));s.on('error',reject)})}
async function cycle(){let job;try{job=await api('poll',{agentName:AGENT});if(!job)return;try{await send(ticket(job.order));await api('ack',{jobId:job.jobId,ok:true});console.log(new Date().toISOString(),'printed',job.order.public_id)}catch(e){await api('ack',{jobId:job.jobId,ok:false,error:e.message});console.error('print failed',e.message)}}catch(e){console.error(new Date().toISOString(),e.message)}}
console.log(`Sumaq Print Agent ${AGENT} started. ${DRY?'DRY RUN':`${HOST}:${PORT}`}`);cycle();setInterval(cycle,POLL);
