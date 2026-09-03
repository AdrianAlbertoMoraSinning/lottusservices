const $=s=>document.querySelector(s);
let allFindings=[], primaryRepos=[], externalRepos=[], activeInstallationId=null;
let repoMeta=null, totalUnits=8, completedUnits=0, codeCandidates=0, codeScanned=0, rawDetections=0;
let capabilities={openAIConfigured:false}, execution={};

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const severityRank={critical:5,high:4,medium:3,low:2,info:1};
const statusRank={confirmed:3,probable:2,needs_verification:1};

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

function setProgress(p,stageName,detail){
  const value=Math.max(0,Math.min(100,Math.round(p)));
  $("#progressPct").textContent=`${value}%`;
  $("#progressStage").textContent=stageName||"WORKING";
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
function finishStage(name,state,label){
  execution[name]=state;
  stage(name,state,label||(state==="live"?"LIVE":state==="skipped"?"N/A":"ERROR"));
  completedUnits++;
  setProgress(Math.min(99,(completedUnits/totalUnits)*100),state==="error"?"PARTIAL":"ANALYZING",$("#fileProgress").textContent);
}
function resetStages(){
  execution={};
  for(const el of document.querySelectorAll(".stage-grid article")){
    el.classList.remove("running","live","error","skipped");el.querySelector("em").textContent="WAITING";
  }
}
function selected(){
  const option=$("#repoSelect").selectedOptions[0];
  if(!option||!option.dataset.owner)return null;
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
  }else if(r.source==="GITHUB_APP"&&$("#portalUrl").value.includes("pleasewebportal")){
    $("#portalUrl").value="";
  }
  $("#connectionState").textContent=`Selected ${r.owner}/${r.repo} · ${r.branch} · ${r.source==="GITHUB_APP"?"owner-authorized GitHub App":"primary connection"}`;
}

async function loadCapabilities(){
  try{
    const d=await fetchJson("/api/capabilities");
    capabilities=d.capabilities||{};
    $("#researchCapability").textContent=capabilities.openAIConfigured?"AI research available":"AI research N/A · API not configured";
    $("#researchCapability").className=capabilities.openAIConfigured?"badge":"badge neutral";
  }catch{
    capabilities={openAIConfigured:false};
    $("#researchCapability").textContent="AI research status unavailable";
  }
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

function statusFor(f){
  if(["confirmed","probable","needs_verification"].includes(f?.verificationStatus))return f.verificationStatus;
  const c=Number(f?.confidence);
  if(Number.isFinite(c)&&c>=.92)return "confirmed";
  if(Number.isFinite(c)&&c>=.72)return "probable";
  return "needs_verification";
}
function fallbackFingerprint(f){
  const ev=typeof f?.evidence==="string"?f.evidence.replace(/\d+/g,"#").slice(0,180):"";
  return `${f?.dimension||"general"}|${f?.title||"finding"}|${ev}`.toLowerCase();
}
function mergeFinding(incoming){
  if(!incoming)return;
  rawDetections++;
  const f={...incoming};
  f.verificationStatus=statusFor(f);
  f.fingerprint=f.fingerprint||fallbackFingerprint(f);
  f.occurrences=Math.max(1,Number(f.occurrences||1));
  f.affectedFiles=[...new Set([...(Array.isArray(f.affectedFiles)?f.affectedFiles:[]),...(f.file?[f.file]:[])])];
  f.evidenceExamples=[typeof f.evidence==="string"?f.evidence:JSON.stringify(f.evidence||"")].filter(Boolean);
  const existing=allFindings.find(x=>x.fingerprint===f.fingerprint);
  if(!existing){allFindings.push(f);return}
  existing.occurrences=(existing.occurrences||1)+f.occurrences;
  existing.affectedFiles=[...new Set([...(existing.affectedFiles||[]),...(f.affectedFiles||[])])].slice(0,100);
  existing.evidenceExamples=[...new Set([...(existing.evidenceExamples||[]),...(f.evidenceExamples||[])])].slice(0,4);
  existing.sources=[...(existing.sources||[]),...(f.sources||[])].filter((s,i,a)=>{
    const u=s?.url||s;return a.findIndex(x=>(x?.url||x)===u)===i;
  }).slice(0,20);
  if((severityRank[f.severity]||0)>(severityRank[existing.severity]||0))existing.severity=f.severity;
  if((statusRank[f.verificationStatus]||0)>(statusRank[existing.verificationStatus]||0))existing.verificationStatus=f.verificationStatus;
  if(Number(f.confidence)>Number(existing.confidence||0))existing.confidence=f.confidence;
}
function normalizeFindings(list){for(const f of list||[])mergeFinding(f);updateSummary()}
function sortedFindings(rows){
  return [...rows].sort((a,b)=>(severityRank[b.severity]||0)-(severityRank[a.severity]||0)||(statusRank[b.verificationStatus]||0)-(statusRank[a.verificationStatus]||0)||String(a.title).localeCompare(String(b.title)));
}
function updateSummary(){
  const nonInfo=allFindings.filter(f=>f.severity!=="info");
  const confirmed=nonInfo.filter(f=>f.verificationStatus==="confirmed").length;
  const probable=nonInfo.filter(f=>f.verificationStatus==="probable").length;
  const verify=nonInfo.filter(f=>f.verificationStatus==="needs_verification").length;
  const priority=nonInfo.filter(f=>["critical","high"].includes(f.severity)).length;
  $("#summaryUnique").textContent=nonInfo.length;
  $("#summaryConfirmed").textContent=confirmed;
  $("#summaryProbable").textContent=probable;
  $("#summaryVerify").textContent=verify;
  $("#summaryPriority").textContent=priority;
  $("#summaryRaw").textContent=`${rawDetections} raw detection${rawDetections===1?"":"s"} consolidated`;
  $("#openFindings").textContent=nonInfo.length;
}
function render(){
  const severity=$("#severityFilter").value,status=$("#statusFilter").value;
  const rows=sortedFindings(allFindings.filter(f=>(!severity||f.severity===severity)&&(!status||f.verificationStatus===status)));
  if(!rows.length){$("#findingsList").className="empty-state";$("#findingsList").innerHTML="<strong>No findings match this view.</strong><span>Octon does not insert demo findings.</span>";return}
  $("#findingsList").className="";
  $("#findingsList").innerHTML=rows.map(f=>{
    const sources=(f.sources||[]).slice(0,4).map(s=>`<a href="${esc(s.url||s)}" target="_blank" rel="noopener noreferrer">${esc(s.title||s.url||s)}</a>`).join("");
    const files=(f.affectedFiles||[]).join(", ")||f.file||"Not determined";
    const evs=(f.evidenceExamples||[f.evidence]).filter(Boolean).slice(0,3);
    const ev=evs.map(x=>typeof x==="string"?x:JSON.stringify(x)).join(" | ");
    const op=typeof f.operationalImpact==="string"?f.operationalImpact:JSON.stringify(f.operationalImpact||"Not quantified");
    const ci=typeof f.commercialImpact==="string"?f.commercialImpact:JSON.stringify(f.commercialImpact||"Not quantified");
    const rec=typeof f.recommendation==="string"?f.recommendation:JSON.stringify(f.recommendation||"");
    const fix=typeof f.proposedFix==="string"?f.proposedFix:JSON.stringify(f.proposedFix||"To be designed");
    const rb=typeof f.rollback==="string"?f.rollback:JSON.stringify(f.rollback||"Not defined yet");
    const confidence=Number.isFinite(Number(f.confidence))?`${Math.round(Number(f.confidence)*100)}% confidence`:"confidence not scored";
    const occurrences=Number(f.occurrences||1);
    return `<article class="finding"><div class="finding-head"><span class="pill ${esc(f.severity)}">${esc(f.severity)}</span><span class="pill">${esc(f.dimension)}</span><span class="pill status ${esc(f.verificationStatus)}">${esc(String(f.verificationStatus).replace("_"," "))}</span><span class="pill">${esc(confidence)}</span>${occurrences>1?`<span class="pill">${occurrences} detections</span>`:""}${f.requiresHumanReview?'<span class="pill">human review</span>':''}</div><h3>${esc(f.title)}</h3>
    <div class="finding-grid"><div><b>Evidence</b>${esc(ev)}</div><div><b>Operational impact</b>${esc(op)}</div><div><b>Commercial impact</b>${esc(ci)}</div><div><b>Recommendation</b>${esc(rec)}</div><div><b>Proposed fix</b>${esc(fix)}</div><div><b>Tests / rollback</b>${esc(JSON.stringify(f.tests||[]))}<br>${esc(rb)}</div></div>
    <div class="files"><b>Affected files:</b> ${esc(files)}</div>${sources?`<div class="sources"><b>Sources:</b> ${sources}</div>`:""}</article>`;
  }).join("");
}
function scoreReview(pageSpeed){
  const weights={critical:12,high:6,medium:2.5,low:.5,info:0};
  const multipliers={confirmed:1,probable:.72,needs_verification:.38};
  const penalty=allFindings.reduce((n,f)=>n+(weights[f.severity]||0)*(multipliers[f.verificationStatus]||.5),0);
  const evidenceScore=Math.max(35,Math.round(100-Math.min(65,penalty)));
  const psi=[];
  for(const r of pageSpeed?.results||[])if(r.ok)for(const v of Object.values(r.scores||{}))if(Number.isFinite(v))psi.push(v);
  const psiAvg=psi.length?Math.round(psi.reduce((a,b)=>a+b,0)/psi.length):null;
  return psiAvg===null?evidenceScore:Math.round(evidenceScore*.7+psiAvg*.3);
}
async function safeStep(stageName,label,fn){
  stage(stageName,"running","RUNNING");$("#runState").textContent=label;
  try{const result=await fn();finishStage(stageName,"live","LIVE");return result}
  catch(e){finishStage(stageName,"error","ERROR");$("#connectionState").textContent=`${label} error: ${e.message}`;return {ok:false,error:e.message}}
}
function skipStage(name,label="N/A"){
  finishStage(name,"skipped",label);
}
function executionCounts(){
  const vals=Object.values(execution);
  return {executed:vals.filter(x=>x==="live").length,errors:vals.filter(x=>x==="error").length,skipped:vals.filter(x=>x==="skipped").length};
}

async function runReview(){
  const repo=selected();if(!repo)return;
  $("#runReview").disabled=true;allFindings=[];rawDetections=0;render();updateSummary();completedUnits=0;totalUnits=8;codeCandidates=0;codeScanned=0;repoMeta=null;resetStages();
  await loadCapabilities();
  setProgress(1,"STARTING",`Preparing ${repo.owner}/${repo.repo}`);$("#runState").textContent="Starting integrated review…";

  const common={...repo};
  const portalUrl=$("#portalUrl").value.trim(),market=$("#market").value.trim(),jurisdiction=$("#jurisdiction").value.trim();

  await safeStep("repository","Mapping repository…",async()=>{
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
      const d=await fetchJson("/api/code-health-batch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...common,files,treePaths:plan.treePaths,functionNames:plan.functionNames})});
      codeScanned+=d.scanned||0;normalizeFindings(d.findings||[]);
      $("#codeFiles").textContent=codeScanned;$("#codeFilesNote").textContent=`${codeScanned} / ${codeCandidates} planned · ${plan.filesInRepository} total repo files`;
      const codeFraction=codeCandidates?codeScanned/codeCandidates:1;
      setProgress(12.5+12.5*codeFraction,"CODE SCAN",`${codeScanned} / ${codeCandidates} code/text files reviewed · ${plan.filesInRepository} total repository files`);
    }
    finishStage("code","live","LIVE");
  }catch(e){finishStage("code","error","ERROR");$("#connectionState").textContent=`Code Health error: ${e.message}`}

  let pageSpeed=null;
  if(portalUrl){
    await safeStep("runtime","Checking production runtime…",async()=>{
      const d=await fetchJson("/api/runtime-health",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:portalUrl})});normalizeFindings(d.findings);return d;
    });
    await safeStep("seo","Reviewing portal structure and security…",async()=>{
      const d=await fetchJson("/api/portal-snapshot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:portalUrl})});normalizeFindings(d.findings);return d;
    });
    pageSpeed=await safeStep("speed","Running performance and accessibility checks…",async()=>fetchJson("/api/pagespeed-audit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:portalUrl})}));
  }else{
    for(const name of ["runtime","seo","speed"])skipStage(name,"NO URL");
  }

  const researchPayload={name:repo.repo,url:portalUrl||"",business:"web platform",market,jurisdiction};
  if(capabilities.openAIConfigured){
    await safeStep("technical","Researching current technical standards…",async()=>{const d=await fetchJson("/api/research-review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"technical",...researchPayload})});normalizeFindings(d.findings);return d});
    await safeStep("market","Researching market and competition…",async()=>{const d=await fetchJson("/api/research-review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"market",...researchPayload})});normalizeFindings(d.findings);return d});
    await safeStep("regulatory","Researching jurisdictional requirements…",async()=>{const d=await fetchJson("/api/research-review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"compliance",...researchPayload})});normalizeFindings(d.findings);return d});
  }else{
    for(const name of ["technical","market","regulatory"])skipStage(name,"N/A");
  }

  const score=scoreReview(pageSpeed),counts=executionCounts();
  $("#score").textContent=score;
  $("#scoreNote").textContent=`Evidence-based · ${counts.executed} executed · ${counts.skipped} N/A${counts.errors?` · ${counts.errors} error`:""} · ${new Date().toLocaleString()}`;
  updateSummary();
  setProgress(100,"COMPLETE",plan?`${codeScanned} / ${codeCandidates} code/text files reviewed · ${plan.filesInRepository} total repository files`:"Review completed");
  $("#runState").textContent=`Complete · ${allFindings.length} unique finding(s)${counts.skipped?` · ${counts.skipped} module(s) N/A`:""}`;
  if(!capabilities.openAIConfigured)$("#connectionState").textContent="Review complete. AI research stages were marked N/A because OPENAI_API_KEY is not configured; they did not reduce the score.";
  render();$("#runReview").disabled=false;
}

async function configureExternal(){
  $("#externalModal").classList.remove("hidden");
  $("#appConfigState").textContent="Checking GitHub App configuration…";
  try{
    const d=await fetchJson("/api/github-app-config");
    if(!d.enabled){
      $("#appConfigState").textContent="External authorization is not active yet. Configure the Octon GitHub App in Netlify first.";
      $("#installExternal").classList.add("disabled");$("#installExternal").href="#";return;
    }
    const perms=Object.entries(d.permissions||{}).map(([k,v])=>`${k}:${v}`);
    const text=perms.length?perms.join(", "):"live permissions unavailable";
    $("#appConfigState").textContent=`GitHub App ready · permissions from GitHub: ${text}. The owner chooses the repositories.`;
    $("#installExternal").classList.remove("disabled");$("#installExternal").href=d.installUrl;
  }catch(e){$("#appConfigState").textContent=`GitHub App configuration error: ${e.message}`}
}

async function detectInstallationReturn(){
  const qs=new URLSearchParams(location.search),installationId=qs.get("installation_id");
  if(!installationId)return;
  $("#connectionState").textContent="GitHub returned an installation. Octon is verifying it with GitHub…";
  try{
    const d=await fetchJson("/api/github-installation-verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({installationId,state:qs.get("state")||null})});
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
$("#statusFilter").addEventListener("change",render);
$("#externalAccess").addEventListener("click",configureExternal);
$("#closeExternal").addEventListener("click",()=>$("#externalModal").classList.add("hidden"));
$("#externalModal").addEventListener("click",e=>{if(e.target.id==="externalModal")$("#externalModal").classList.add("hidden")});

(async()=>{await loadCapabilities();await loadPrimaryRepos();await restoreExternal();await detectInstallationReturn()})();
