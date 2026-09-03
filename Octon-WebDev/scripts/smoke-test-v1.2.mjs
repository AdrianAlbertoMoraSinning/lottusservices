const base = process.argv[2] || "http://localhost:8888";
const paths = ["/.netlify/functions/code-health", "/.netlify/functions/runtime-health"];
for (const p of paths) {
  const r = await fetch(base + p);
  const body = await r.text();
  console.log(`${p}: ${r.status}`);
  console.log(body.slice(0, 1200));
  if (!r.ok) process.exitCode = 1;
}
