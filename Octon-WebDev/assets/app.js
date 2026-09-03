const $=s=>document.querySelector(s);
let allFindings=[], primaryRepos=[], externalRepos=[], activeInstallationId=null;
let repoMeta=null, totalUnits=8, completedUnits=0, codeCandidates=0, codeScanned=0;

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

async function fetchJson(url,options={}){
  const r=await fetch(url,{...options,headers:{accept:"application/json",...(options.headers||{})}});
  const raw=await r.text();
  let data;
  try{data=JSON.parse(raw)}
  catch{
    const preview=raw.replace(/\s+/g," ").slice(0,180);
    throw new Error(`HTTP ${r.status} returned HTML/non-JSON: ${preview}`);
  }
  if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);
  return data;
}

function setProgress(p,stage,detail){
  const value=Math.max(0,Math.min(100,Math.round(p)));
  $("#progressPct").textContent=`${value}%`;
  $("#progressStage").textContent=stage||"WORKING";
  $("#orb").style.setProperty("--p",value);
  $("#progressLine").style.width=`${value}%`;
  if(detail)$("#fileProgress").textContent=detail;
}
function stage(name,state,label){
  const el=document.querySelector(`[data-stage="${name}"]`);
  if(!el)return;
  el.classList.remove("running","live","error","skipped");
  el.classList.add(state);
  el.querySelector("em").textContent=label||state.toUpperCase();
}
function completeStage(name,ok=true,label){
  stage(name,ok?"live":"error",label||(ok?"LIVE":"ERROR"));
  completedUnits++;
  setProgress(Math.min(99,(completedUnits/totalUnits)*100),ok?"ANALYZING":"PARTIAL",$("#fileProgress").textContent);
}
function resetStages(){
  for(const el of document.querySelectorAll(".stage-grid article")){
    el.classList.remove("running","live","error","skipped");el.querySelector("em").textContent="WAITING";
  }
}
function selected(){
  const option=$("#repoSelect").selectedOptions[0];
  if(!option)return null;
  return {
    owner:option.dataset.owner,
    repo:option.dataset.repo,
    branch:option.dataset.branch||"main",
    installationId:option.dataset.installation||null,
    source:option.dataset.source||"PRIMARY_TOKEN"
  };
}
function addOptions(){
  const sel=$("#repoSelect"),all=[...primaryRepos,...externalRepos];
  sel.innerHTML=all.length?all.map(r=>{
    const installation=r.installationId||"";
    const label=`${r.fullName}${r.source==="GITHUB_APP"?" · external authorized":""}${r.private?" · private":""}`;
    return `<option data-owner="${esc(r.owner)}" data-repo="${esc(r.repo)}" data-branch="${esc(r.defaultBranch||"main")}" data-installation="${esc(installation)}" data-source="${esc(r.source||"PRIMARY_TOKEN")}">${esc(label)}</option>`;
  }).join(""):'<option>No authorized repositories found</option>';
  prefillTarget();
}
function prefillTarget(){
  const r=selected();if(!r)return;
  $("#authBadge").textContent=r.source==="GITHUB_APP"?"External owner · GitHub App read-only":"Primary GitHub connection";
  $("#authBadge").className=r.source==="GITHUB_APP"?"badge":"badge neutral";
  const key=`${r.owner}/${r.repo}`.toLowerCase();
  if(key==="adrianalbertomorasinning/please"){
    $("#portalUrl").value="https://pleasewebportal.netlify.app/";
    $("#market").value="Calgary and surrounding areas, Alberta, Canada";
    $("#jurisdiction").value="Alberta, Canada";
  } else if(r.source==="GITHUB_APP") {
    if($("#portalUrl").value.includes("pleasewebportal"))$("#portalUrl").value="";
  }
  $("#connectionState").textContent=`Selected ${r.owner}/${r.repo} · ${r.branch} · ${r.source==="GITHUB_APP"?"owner-authorized GitHub App":"primary connection"}`;
}

async function loadPrimaryRepos(){
  $("#connectionState").textContent="Loading repositories available to Octon…";
  try{
    const d=await fetchJson("/api/github-repositories");
    primaryRepos=d.repositories||[];addOptions();
    $("#connectionState").textContent=`${primaryRepos.length} repository/repositories available through the primary GitHub connection.`;
  }catch(e){
    primaryRepos=[{owner:"AdrianAlbertoMoraSinning",repo:"Please",fullName:"AdrianAlbertoMoraSinning/Please",defaultBranch:"main",source:"PRIMARY_TOKEN"}];
    addOptions();$("#connectionState").textContent=`Repository list error: ${e.message}`;
  }
}
async function verifySelected(){
  const r=selected();if(!r)return;
  $("#testGithub").disabled=true;$("#connectionState").textContent="Verifying read-only repository access…";
  try{
    const d=await fetchJson("/api/github-read",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(r)});
    repoMeta=d;$("#repoFiles").textContent=d.files;$("#repoFilesNote").textContent=`${d.branch} · ${d.authMode}`;
    $("#connectionState").textContent=`Connected: ${d.repository} · ${d.files} files · READ ONLY`;
  }catch(e){$("#connectionState").textContent=`Access verification failed: ${e.message}`}
  finally{$("#testGithub").disabled=false}
}

function normalizeFindings(list){for(const f of list||[])allFindings.push(f)}
function render(){
  const severity=$("#severityFilter").value;
  const rows=allFindings.filter(f=>!severity||f.severity===severity);
  if(!rows.length){$("#findingsList").className="empty-state";$("#findingsList").innerHTML="<strong>No findings match this view.</strong><span>Octon does not insert demo findings.</span>";return}
  $("#findingsList").className="";
  $("#findingsList").innerHTML=rows.map(f=>{
    const sources=(f.sources||[]).slice(0,4).map(s=>`<a href="${esc(s.url||s)}" target="_blank" rel="noopener noreferrer">${esc(s.title||s.url||s)}</a>`).join("");
    const files=(f.affectedFiles||[]).join(", ")||f.file||"Not determined";
    const ev=typeof f.evidence==="string"?f.evidence:JSON.stringify(f.evidence||"");
    const op=typeof f.operationalImpact==="string"?f.operationalImpact:JSON.stringify(f.operationalImpact||"Not quantified");
    const ci=typeof f.commercialImpact==="string"?f.commercialImpact:JSON.stringify(f.commercialImpact||"Not quantified");
    const rec=typeof f.recommendation==="string"?f.recommendation:JSON.stringify(f.recommendation||"");
    const fix=typeof f.proposedFix==="string"?f.proposedFix:JSON.stringify(f.proposedFix||"To be designed");
    const rb=typeof f.rollback==="string"?f.rollback:JSON.stringify(f.rollback||"Not defined yet");
    return `<article class="finding"><div class="finding-head"><span class="pill ${esc(f.severity)}">${esc(f.severity)}</span><span class="pill">${esc(f.dimension)}</span>${f.requiresHumanReview?'<span class="pill">human review</span>':''}</div><h3>${esc(f.title)}</h3>
    <div class="finding-grid"><div><b>Evidence</b>${esc(ev)}</div><div><b>Operational impact</b>${esc(op)}</div><div><b>Commercial impact</b>${esc(ci)}</div><div><b>Recommendation</b>${esc(rec)}</div><div><b>Proposed fix</b>${esc(fix)}</div><div><b>Tests / rollback</b>${esc(JSON.stringify(f.tests||[]))}<br>${esc(rb)}</div></div>
    <div class="files"><b>Affected files:</b> ${esc(files)}</div>${sources?`<div class="sources"><b>Sources:</b> ${sources}</div>`:""}</article>`;
  }).join("");
}
function scoreReview(pageSpeed){
  const weights={critical:20,high:10,medium:4,low:1,info:0};
  const findingScore=Math.max(0,100-Math.min(100,allFindings.reduce((n,f)=>n+(weights[f.severity]||0),0)));
  const psi=[];
  for(const r of pageSpeed?.results||[])if(r.ok)for(const v of Object.values(r.scores||{}))if(Number.isFinite(v))psi.push(v);
  const psiAvg=psi.length?Math.round(psi.reduce((a,b)=>a+b,0)/psi.length):null;
  const codePenalty=allFindings.filter(f=>["security","reliability","frontend","integration","testing","quality"].includes(f.dimension)).reduce((n,f)=>n+(weights[f.severity]||0),0);
  const codeScore=Math.max(0,100-Math.min(100,codePenalty));
  const parts=[findingScore,codeScore];if(psiAvg!==null)parts.push(psiAvg);
  return Math.round(parts.reduce((a,b)=>a+b,0)/parts.length);
}
async function safeStep(stageName,label,fn){
  stage(stageName,"running","RUNNING");$("#runState").textContent=label;
  try{const result=await fn();completeStage(stageName,true);return result}
  catch(e){completeStage(stageName,false);$("#connectionState").textContent=`${label} error: ${e.message}`;return {ok:false,error:e.message}}
}

async function runReview(){
  const repo=selected();if(!repo)return;
  $("#runReview").disabled=true;allFindings=[];render();completedUnits=0;totalUnits=8;codeCandidates=0;codeScanned=0;repoMeta=null;resetStages();
  setProgress(1,"STARTING",`Preparing ${repo.owner}/${repo.repo}`);$("#runState").textContent="Starting integrated review…";

  const common={...repo};
  const portalUrl=$("#portalUrl").value.trim(),market=$("#market").value.trim(),jurisdiction=$("#jurisdiction").value.trim();

  const repoResult=await safeStep("repository","Mapping repository…",async()=>{
    const d=await fetchJson("/api/github-read",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(common)});
    repoMeta=d;$("#repoFiles").textContent=d.files;$("#repoFilesNote").textContent=`${d.branch} · ${d.authMode}`;return d;
  });

  let plan=null;
  stage("code","running","PLANNING");$("#runState").textContent="Planning code scan…";
  try{
    plan=await fetchJson("/api/code-health-plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(common)});
    codeCandidates=plan.plannedFiles||0;$("#codeFilesNote").textContent=`0 / ${codeCandidates} planned code/text files`;
    const batchSize=18;
    for(let i=0;i<plan.candidates.length;i+=batchSize){
      const files=plan.candidates.slice(i,i+batchSize);
      const d=await fetchJson("/api/code-health-batch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        ...common,files,treePaths:plan.treePaths,functionNames:plan.functionNames
      })});
      codeScanned+=d.scanned||0;normalizeFindings(d.findings||[]);
      $("#codeFiles").textContent=codeScanned;$("#codeFilesNote").textContent=`${codeScanned} / ${codeCandidates} planned · ${plan.filesInRepository} total repo files`;
      const codeFraction=codeCandidates?codeScanned/codeCandidates:1;
      const base=12.5,span=12.5;
      setProgress(base+span*codeFraction,"CODE SCAN",`${codeScanned} / ${codeCandidates} code/text files reviewed · ${plan.filesInRepository} total repository files`);
    }
    completedUnits++;stage("code","live","LIVE");
  }catch(e){completedUnits++;stage("code","error","ERROR");$("#connectionState").textContent=`Code Health error: ${e.message}`}

  let runtime=null,snapshot=null,pageSpeed=null,technical=null,marketRes=null,regulatory=null;
  if(portalUrl){
    runtime=await safeStep("runtime","Checking production runtime…",async()=>{
      const d=await fetchJson("/api/runtime-health",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:portalUrl})});normalizeFindings(d.findings);return d;
    });
    snapshot=await safeStep("seo","Reviewing portal structure and security…",async()=>{
      const d=await fetchJson("/api/portal-snapshot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:portalUrl})});normalizeFindings(d.findings);return d;
    });
    pageSpeed=await safeStep("speed","Running performance and accessibility checks…",async()=>{
      return fetchJson("/api/pagespeed-audit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:portalUrl})});
    });
  }else{
    for(const name of ["runtime","seo","speed"]){stage(name,"skipped","NO URL");completedUnits++}
  }

  const researchPayload={name:repo.repo,url:portalUrl||"",business:"web platform",market,jurisdiction};
  technical=await safeStep("technical","Researching current technical standards…",async()=>{
    const d=await fetchJson("/api/research-review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"technical",...researchPayload})});normalizeFindings(d.findings);return d;
  });
  marketRes=await safeStep("market","Researching market and competition…",async()=>{
    const d=await fetchJson("/api/research-review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"market",...researchPayload})});normalizeFindings(d.findings);return d;
  });
  regulatory=await safeStep("regulatory","Researching jurisdictional requirements…",async()=>{
    const d=await fetchJson("/api/research-review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"compliance",...researchPayload})});normalizeFindings(d.findings);return d;
  });

  const score=scoreReview(pageSpeed);$("#score").textContent=score;$("#scoreNote").textContent=`Evidence-based · ${new Date().toLocaleString()}`;
  $("#openFindings").textContent=allFindings.filter(f=>f.severity!=="info").length;
  setProgress(100,"COMPLETE",plan?`${codeScanned} / ${codeCandidates} code/text files reviewed · ${plan.filesInRepository} total repository files`:"Review completed");
  $("#runState").textContent=`Complete · ${allFindings.length} traceable finding(s)`;
  render();$("#runReview").disabled=false;
}

async function configureExternal(){
  $("#externalModal").classList.remove("hidden");
  $("#appConfigState").textContent="Checking secure GitHub App configuration…";
  try{
    const d=await fetchJson("/api/github-app-config");
    if(!d.enabled){
      $("#appConfigState").textContent="External authorization is not active yet. Configure the Octon GitHub App in Netlify first.";
      $("#installExternal").classList.add("disabled");$("#installExternal").href="#";
      return;
    }
    $("#appConfigState").textContent=`GitHub App ready · permissions: ${d.permissions.join(", ")}. The owner chooses the repositories.`;
    $("#installExternal").classList.remove("disabled");$("#installExternal").href=d.installUrl;
  }catch(e){$("#appConfigState").textContent=`GitHub App configuration error: ${e.message}`}
}

async function detectInstallationReturn(){
  const qs=new URLSearchParams(location.search),installationId=qs.get("installation_id");
  if(!installationId)return;
  $("#connectionState").textContent="GitHub returned an installation. Octon is verifying it with GitHub…";
  try{
    const d=await fetchJson("/api/github-installation-verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({installationId})});
    activeInstallationId=installationId;externalRepos=d.repositories||[];
    localStorage.setItem("octonExternalInstallationId",installationId);
    addOptions();
    const first=[...$("#repoSelect").options].find(o=>o.dataset.installation===installationId);if(first){first.selected=true;prefillTarget()}
    $("#connectionState").textContent=`External authorization verified: ${d.account.login} · ${externalRepos.length} repository/repositories · READ ONLY`;
  }catch(e){$("#connectionState").textContent=`External GitHub authorization could not be verified: ${e.message}`}
  history.replaceState({},document.title,location.pathname+location.hash);
}
async function restoreExternal(){
  const installationId=localStorage.getItem("octonExternalInstallationId");if(!installationId)return;
  try{
    const d=await fetchJson("/api/github-installation-verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({installationId})});
    activeInstallationId=installationId;externalRepos=d.repositories||[];addOptions();
  }catch{localStorage.removeItem("octonExternalInstallationId")}
}

$("#repoSelect").addEventListener("change",prefillTarget);
$("#refreshRepos").addEventListener("click",loadPrimaryRepos);
$("#testGithub").addEventListener("click",verifySelected);
$("#runReview").addEventListener("click",runReview);
$("#severityFilter").addEventListener("change",render);
$("#externalAccess").addEventListener("click",configureExternal);
$("#closeExternal").addEventListener("click",()=>$("#externalModal").classList.add("hidden"));
$("#externalModal").addEventListener("click",e=>{if(e.target.id==="externalModal")$("#externalModal").classList.add("hidden")});

(async()=>{await loadPrimaryRepos();await restoreExternal();await detectInstallationReturn()})();
