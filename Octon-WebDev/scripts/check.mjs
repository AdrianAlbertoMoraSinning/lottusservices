import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
const root=path.resolve(import.meta.dirname,"..");
const required=[
 "index.html","assets/app.js","assets/style.css","netlify.toml",
 "netlify/functions/_github-app-lib.js","netlify/functions/_github-lib.js","netlify/functions/_url-safety.js",
 "netlify/functions/github-repositories.js","netlify/functions/github-app-config.js","netlify/functions/github-installation-verify.js",
 "netlify/functions/github-read.js","netlify/functions/code-health-plan.js","netlify/functions/code-health-batch.js",
 "netlify/functions/runtime-health.js","netlify/functions/portal-snapshot.js","netlify/functions/pagespeed-audit.js",
 "netlify/functions/research-review.js"
];
for(const f of required){if(!fs.existsSync(path.join(root,f)))throw new Error(`Missing ${f}`)}
const funcs=fs.readdirSync(path.join(root,"netlify/functions")).filter(x=>x.endsWith(".js"));
for(const f of funcs)execFileSync(process.execPath,["--check",path.join(root,"netlify/functions",f)],{stdio:"pipe"});
execFileSync(process.execPath,["--check",path.join(root,"assets/app.js")],{stdio:"pipe"});
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
for(const marker of ["Octon v1.3","repoSelect","progressPct","externalAccess","Run selected review"]){
  if(!html.includes(marker))throw new Error(`Missing UI marker: ${marker}`);
}
const app=fs.readFileSync(path.join(root,"assets/app.js"),"utf8");
if(app.includes("response.json()"))throw new Error("Unsafe direct response.json() parsing remains in app.js");
console.log(`Octon v1.3 verification passed: ${funcs.length} Netlify functions syntax-checked.`);
