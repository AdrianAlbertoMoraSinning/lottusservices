import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {candidateUrls,classifyResponse,extractFaviconRefs,contentTypeMatches}=require("../netlify/functions/_verification-lib.js");
function assert(x,msg){if(!x)throw new Error(msg)}

const urls=candidateUrls("https://example.com/",{type:"local_reference",sourcePath:"pages/agenda.html",sourceRef:"../assets/agenda.css",resolvedPath:"assets/agenda.css"});
assert(urls.includes("https://example.com/assets/agenda.css"),"resolved production asset URL missing");
assert(classifyResponse("local_reference",404,"text/html","https://example.com/missing.css").decision==="issue_confirmed","404 must verify missing target");
assert(classifyResponse("local_reference",200,"text/html","https://example.com/assets/app.js").decision==="issue_confirmed","HTML fallback must not clear a JavaScript asset warning");
assert(classifyResponse("local_reference",200,"text/css","https://example.com/assets/app.css").decision==="target_exists","matching CSS target should clear warning");
assert(classifyResponse("netlify_function",405,"text/plain","https://example.com/.netlify/functions/login").decision==="target_exists","405 proves a function route exists");
assert(contentTypeMatches("image","image/svg+xml"),"SVG image content type should match");
const fav=extractFaviconRefs('<link rel="icon" href="/favicon.svg"><link href="/site.webmanifest" rel="manifest"><link rel="apple-touch-icon" href="/apple.png">');
assert(fav.icons.length===2,"favicon parser should find icon declarations");
assert(fav.manifest==="/site.webmanifest","manifest parser failed");
console.log("Octon v1.5 production-verification self-tests passed.");
