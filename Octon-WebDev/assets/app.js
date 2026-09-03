const $=s=>document.querySelector(s);
let allFindings=[];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function setComponent(key,status){const el=document.querySelector(`[data-key="${key}"]`);if(!el)return;el.classList.remove("live","error","partial");el.classList.add(status==="LIVE"?"live":status==="ERROR"?"error":"partial");}
function render(){
  const filter=$("#severityFilter").value;const rows=allFindings.filter(f=>!filter||f.severity===filter);
  if(!rows.length){$("#findingsList").innerHTML='<div class="findings-empty">No findings match this filter.</div>';return}
  $("#findingsList").innerHTML=rows.map(f=>{
    const src=(f.sources||[]).slice(0,4).map(s=>`<a href="${esc(s.url||s)}" target="_blank" rel="noopener noreferrer">${esc(s.title||s.url||s)}</a>`).join("");
    const files=(f.affectedFiles||[]).join(", ")||f.file||"Not determined";
    return `<article class="finding"><div class="finding-head"><span class="pill ${esc(f.severity)}">${esc(f.severity)}</span><span class="pill">${esc(f.dimension)}</span>${f.requiresHumanReview?'<span class="pill">human review</span>':''}</div>
      <h3>${esc(f.title)}</h3><div class="finding-grid"><div><b>Evidence</b>${esc(typeof f.evidence==="string"?f.evidence:JSON.stringify(f.evidence||""))}</div>
      <div><b>Operational impact</b>${esc(typeof f.operationalImpact==="string"?f.operationalImpact:JSON.stringify(f.operationalImpact||"Not quantified"))}</div>
      <div><b>Commercial impact</b>${esc(typeof f.commercialImpact==="string"?f.commercialImpact:JSON.stringify(f.commercialImpact||"Not quantified"))}</div>
      <div><b>Recommendation</b>${esc(typeof f.recommendation==="string"?f.recommendation:JSON.stringify(f.recommendation||""))}</div>
      <div><b>Proposed fix</b>${esc(typeof f.proposedFix==="string"?f.proposedFix:JSON.stringify(f.proposedFix||"To be designed from this finding"))}</div>
      <div><b>Tests / rollback</b>${esc(JSON.stringify(f.tests||[]))}<br>${esc(typeof f.rollback==="string"?f.rollback:JSON.stringify(f.rollback||"Not defined yet"))}</div></div>
      <div class="files"><b>Affected files:</b> ${esc(files)}</div>${src?`<div class="sources"><b>Sources:</b> ${src}</div>`:""}</article>`;
  }).join("");
}
$("#severityFilter").addEventListener("change",render);

$("#testGithub").addEventListener("click",async()=>{
  const b=$("#testGithub");b.disabled=true;$("#githubState").textContent="Testing GitHub read-only…";
  try{const r=await fetch("/api/github-read");const d=await r.json();if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);
    $("#githubState").textContent=`GitHub connected: ${d.repository} · ${d.files} files · READ ONLY`;
    $("#writeState").textContent=d.writeEnabled?"ON":"OFF";
  }catch(e){$("#githubState").textContent=`GitHub test failed: ${e.message}`}finally{b.disabled=false}
});

$("#runReview").addEventListener("click",async()=>{
  const b=$("#runReview");b.disabled=true;$("#runState").textContent="Running integrated live review…";$("#findingNote").textContent="Analyzing repository + production + live research";
  document.querySelectorAll(".components div").forEach(x=>{x.classList.remove("live","error","partial")});
  try{
    const r=await fetch("/api/live-review",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});const d=await r.json();if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);
    $("#score").textContent=d.score;$("#scoreNote").textContent=`Evidence-based · ${new Date(d.generatedAt).toLocaleString()}`;
    allFindings=d.findings||[];$("#openFindings").textContent=d.openFindings??allFindings.length;$("#findingNote").textContent="Live findings from the latest integrated review";
    $("#writeState").textContent=d.governance?.githubWriteEnabled?"ON":"OFF";
    for(const [k,v] of Object.entries(d.componentStatus||{}))setComponent(k,v);
    const gh=d.components?.github;if(gh?.ok)$("#githubState").textContent=`GitHub connected: ${gh.repository} · ${gh.files} files · READ ONLY`;
    $("#runState").textContent=`Complete · ${allFindings.length} finding(s)`;
    render();
  }catch(e){$("#runState").textContent=`Review failed: ${e.message}`;$("#findingNote").textContent="See error above; no demo result substituted."}
  finally{b.disabled=false}
});
