const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const toast = (msg) => { const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); };

$$('.nav').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.nav').forEach(x=>x.classList.remove('active')); btn.classList.add('active');
  $$('.view').forEach(x=>x.classList.remove('active-view')); $('#'+btn.dataset.view).classList.add('active-view');
}));

async function loadData(){
  const [portals, findings] = await Promise.all([
    fetch('/config/portals.json').then(r=>r.json()),
    fetch('/data/demo-findings.json').then(r=>r.json())
  ]);
  $('#portalCount').textContent=portals.length;
  $('#findingCount').textContent=findings.length;
  $('#portalTable').innerHTML=portals.map(p=>`<div class="portal-row"><div><strong>${p.name}</strong><div class="muted">${p.publicUrl}</div></div><div>${p.hosting} + ${p.database}</div><div><span class="badge">${p.status}</span></div><div>${p.approvalPolicy}</div></div>`).join('');
  $('#findingList').innerHTML=findings.map(f=>`<div class="finding-row"><div><strong>${f.title}</strong><div class="muted">${f.category} · ${f.id}</div></div><div><span class="badge sev-${f.severity}">${f.severity}</span></div><div>${f.impact} impact</div><div class="muted">${f.summary}</div></div>`).join('');
}

$('#runAudit').addEventListener('click', async ()=>{
  const btn=$('#runAudit'); btn.disabled=true; btn.textContent='Reviewing…';
  try{
    const res=await fetch('/api/audit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({portalId:'please'})});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Audit failed');
    $('#score').textContent=data.score;
    toast(data.mode==='baseline'?'Baseline audit complete. Live research connectors are next.':'Live audit complete.');
  }catch(e){toast(e.message)}finally{btn.disabled=false;btn.textContent='Run PLEASE review'}
});

loadData().catch(()=>toast('Could not load local Octon registry.'));


const githubBtn = $('#testGithub');
if(githubBtn){
  githubBtn.addEventListener('click', async ()=>{
    githubBtn.disabled=true; const old=githubBtn.textContent; githubBtn.textContent='Connecting…';
    try{
      const res=await fetch('/api/github-read',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({portalId:'please'})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.detail||data.error||'GitHub read test failed');
      toast(`GitHub connected: ${data.repository} · ${data.fileCount} files · READ ONLY`);
      console.info('Octon GitHub read-only inspection',data);
    }catch(e){toast(e.message)}finally{githubBtn.disabled=false;githubBtn.textContent=old;}
  });
}
