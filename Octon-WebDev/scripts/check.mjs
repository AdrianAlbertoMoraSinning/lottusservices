import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
const root=path.resolve(import.meta.dirname,"..");
const required=[
 "index.html","site.webmanifest","assets/app.js","assets/style.css","assets/octon-mark.svg","assets/favicon.svg","assets/favicon-16x16.png","assets/favicon-32x32.png","assets/apple-touch-icon.png","assets/icon-192.png","assets/icon-512.png","netlify.toml",
 "netlify/functions/_github-app-lib.js","netlify/functions/_github-lib.js","netlify/functions/_url-safety.js","netlify/functions/_code-health-lib.js","netlify/functions/_verification-lib.js",
 "netlify/functions/capabilities.js","netlify/functions/github-repositories.js","netlify/functions/github-app-config.js","netlify/functions/github-installation-verify.js",
 "netlify/functions/github-read.js","netlify/functions/code-health-plan.js","netlify/functions/code-health-batch.js","netlify/functions/verification-engine.js",
 "netlify/functions/runtime-health.js","netlify/functions/portal-snapshot.js","netlify/functions/pagespeed-audit.js",
 "netlify/functions/research-review.js","scripts/test-diagnostics.mjs","scripts/test-verification.mjs","docs/V1_5_VERIFICATION_ENGINE.md","UPLOAD_INSTRUCTIONS.txt"
];
for(const f of required){if(!fs.existsSync(path.join(root,f)))throw new Error(`Missing ${f}`)}
const funcs=fs.readdirSync(path.join(root,"netlify/functions")).filter(x=>x.endsWith(".js"));
for(const f of funcs)execFileSync(process.execPath,["--check",path.join(root,"netlify/functions",f)],{stdio:"pipe"});
execFileSync(process.execPath,["--check",path.join(root,"assets/app.js")],{stdio:"pipe"});
execFileSync(process.execPath,[path.join(root,"scripts/test-diagnostics.mjs")],{stdio:"inherit"});
execFileSync(process.execPath,[path.join(root,"scripts/test-verification.mjs")],{stdio:"inherit"});
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
for(const marker of ["Octon v1.5","repoSelect","progressPct","externalAccess","Run selected review","DIAGNOSTIC QUALITY","Production verification","summaryProduction","summaryCleared","verified_in_production"]){
  if(!html.includes(marker))throw new Error(`Missing UI marker: ${marker}`);
}
const app=fs.readFileSync(path.join(root,"assets/app.js"),"utf8");
if(app.includes("response.json()"))throw new Error("Unsafe direct response.json() parsing remains in app.js");
if(!app.includes("/api/verification-engine"))throw new Error("Verification Engine is not integrated into Mission Control");
if(!app.includes("OPENAI_API_KEY is not configured") && !app.includes("AI research stages were marked N/A"))throw new Error("Missing research N/A handling marker");
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
if(pkg.version!=="1.5.0")throw new Error(`Unexpected package version ${pkg.version}`);
console.log(`Octon v1.5 verification passed: ${funcs.length} Netlify functions syntax-checked.`);
