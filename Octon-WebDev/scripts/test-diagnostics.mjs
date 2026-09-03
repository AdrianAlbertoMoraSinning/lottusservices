import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {analyze,localRef,staticNetlifyFunctionRefs}=require("../netlify/functions/_code-health-lib.js");

function assert(condition,message){if(!condition)throw new Error(message)}

assert(localRef("index.html","sms:+15870000000")===null,"sms: must not be treated as a local file");
assert(localRef("index.html","mailto:test@example.com")===null,"mailto: must not be treated as a local file");
assert(localRef("pages/agenda.html","../images/favicon.png")==="images/favicon.png","relative paths must resolve from the source file directory");
assert(localRef("agenda.html","agenda.css")==="agenda.css","root-relative source path calculation failed");

assert(staticNetlifyFunctionRefs('fetch(`/.netlify/functions/provider-${action}`)').length===0,"dynamic Netlify function references must not be treated as static endpoints");
assert(staticNetlifyFunctionRefs('fetch("/.netlify/functions/provider-login")')[0]==="provider-login","static Netlify function reference should be detected");

const tree=new Set(["index.html","images/logo.png","netlify/functions/provider-login.js"]);
const fns=new Set(["provider-login"]);
const findings=[];
analyze("index.html",`<!doctype html><a href="sms:+15870000000">SMS</a><img src="images/logo.png" alt="Logo"><script>fetch(\`/.netlify/functions/provider-${'${action}'}\`)</script>`,tree,fns,findings);
assert(!findings.some(f=>/sms:/i.test(String(f.evidence))),"sms: false positive survived analysis");
assert(!findings.some(f=>f.title==="Referenced Netlify Function not found"),"dynamic function false positive survived analysis");

const secret=["sk","proj","1234567890abcdefghijklmnop"].join("-");
const secretFindings=[];
analyze("server.js",`const token="${secret}";`,new Set(["server.js"]),new Set(),secretFindings);
const credential=secretFindings.find(f=>f.title==="Possible hard-coded credential");
assert(credential,"strong credential pattern should be detected");
assert(!JSON.stringify(credential).includes(secret),"credential value must never be returned in finding evidence");
assert(credential.verificationStatus==="needs_verification","credential finding must require verification before action");

console.log("Octon v1.5 diagnostic self-tests passed.");
