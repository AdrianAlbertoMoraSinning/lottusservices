import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
const root=path.resolve(import.meta.dirname,"..");
const required=[
 "index.html","assets/app.js","assets/style.css","netlify.toml","config/portals.json","config/governance.json",
 "netlify/functions/github-read.js","netlify/functions/code-health.js","netlify/functions/runtime-health.js",
 "netlify/functions/portal-snapshot.js","netlify/functions/pagespeed-audit.js","netlify/functions/research-review.js",
 "netlify/functions/live-review.js","netlify/functions/change-hash.js","netlify/functions/approval-token.js","netlify/functions/github-write.js"
];
for(const f of required){if(!fs.existsSync(path.join(root,f)))throw new Error(`Missing ${f}`)}
const files=fs.readdirSync(path.join(root,"netlify/functions")).filter(x=>x.endsWith(".js"));
for(const f of files)execFileSync(process.execPath,["--check",path.join(root,"netlify/functions",f)],{stdio:"pipe"});
execFileSync(process.execPath,["--check",path.join(root,"assets/app.js")],{stdio:"pipe"});
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
if(!html.includes("Octon <span>v1.2</span>"))throw new Error("Dashboard version marker missing");
if(!html.includes("Run PLEASE review"))throw new Error("Review action missing");
console.log(`Octon v1.2 check passed: ${files.length} Netlify functions validated.`);
