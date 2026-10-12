// Verificacion en vivo de F1: replica exacta de la logica de
// safeBrowsing.ts + f1Filter.ts, corriendo sobre el fetch real de Node.
const fs = require('fs');
const KEY = fs.readFileSync('.env.local','utf8').replace(/.*KEY=/,'').trim();
const TRUSTED = ['github.com','gitlab.com','google.com','wikipedia.org','uvg.edu.gt','expo.dev'];
const TIMEOUT = 4000;

function domainFromUrl(url){
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(url.trim());
  const host = m?.[1] ?? url.trim().split(/[/?#]/)[0];
  return host.replace(/^[^@]*@/,'').replace(/:\d+$/,'');
}
function localF1(url){
  const t = url.trim();
  if (!/^https:\/\//i.test(t)) return 'INCIERTO';
  const host = domainFromUrl(t).toLowerCase().replace(/^www\./,'');
  if (!host) return 'INCIERTO';
  return TRUSTED.some(d => host === d || host.endsWith('.'+d)) ? 'SEGURO' : 'INCIERTO';
}
async function checkSafeBrowsing(url){
  if (!KEY) return 'INCIERTO';
  const t = url.trim(); if (!t) return 'INCIERTO';
  const ac = new AbortController();
  const timer = setTimeout(()=>ac.abort(), TIMEOUT);
  try {
    const r = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(KEY)}`,{
      method:'POST', headers:{'Content-Type':'application/json'}, signal: ac.signal,
      body: JSON.stringify({client:{clientId:'qrisk',clientVersion:'1.0.0'},threatInfo:{
        threatTypes:['MALWARE','SOCIAL_ENGINEERING'],platformTypes:['ANY_PLATFORM'],
        threatEntryTypes:['URL'],threatEntries:[{url:t}]}}),
    });
    if (!r.ok) return 'INCIERTO';
    const d = await r.json();
    return Array.isArray(d.matches) && d.matches.length>0 ? 'MALICIOSO' : 'INCIERTO';
  } catch { return 'INCIERTO'; } finally { clearTimeout(timer); }
}
async function f1Verdict(url){
  const t0 = Date.now();
  const local = localF1(url);
  const remote = await checkSafeBrowsing(url);
  if (remote === 'MALICIOSO') return {verdict:'MALICIOSO', source:'safe_browsing', elapsedMs:Date.now()-t0};
  if (local === 'SEGURO') return {verdict:'SEGURO', source:'lista_local', elapsedMs:Date.now()-t0};
  return {verdict:'INCIERTO', source:'ninguna', elapsedMs:Date.now()-t0};
}

const CASES = [
  ['malware (prueba oficial de Google)','http://testsafebrowsing.appspot.com/s/malware.html','MALICIOSO'],
  ['phishing (prueba oficial de Google)','http://testsafebrowsing.appspot.com/s/phishing.html','MALICIOSO'],
  ['dominio de la lista local','https://github.com/usuario/repo','SEGURO'],
  ['subdominio de la lista local','https://mail.google.com/x','SEGURO'],
  ['dominio limpio fuera de la lista','https://es.wikipedia.org/wiki/QR','SEGURO'],
  ['dominio sin reportar','https://sitio-nuevo-8821.example/x','INCIERTO'],
  ['dominio confiable SIN https','http://github.com','INCIERTO'],
  ['dominio parecido (evasion)','https://google.com.phishing.top/x','INCIERTO'],
];

(async () => {
  const lines = [];
  let fallos = 0;
  for (const [name,url,expected] of CASES) {
    const o = await f1Verdict(url);
    const ok = o.verdict === expected;
    if (!ok) fallos++;
    const line = `${ok?'OK ':'FALLA'} ${name.padEnd(38)} ${String(o.elapsedMs).padStart(5)} ms  ${o.verdict.padEnd(10)} (${o.source.padEnd(13)}) esperado=${expected}`;
    lines.push(line); console.log(line);
  }
  console.log(`\n${CASES.length - fallos}/${CASES.length} casos correctos`);
  fs.writeFileSync('RESULTADOS/fase4_5/f1_verificacion_en_vivo.txt',
    'Filtro F1 contra Google Safe Browsing - verificacion en vivo\n'+
    '11 de octubre de 2026\n'+
    'Logica identica a safeBrowsing.ts + f1Filter.ts, sobre el fetch de Node\n'+
    '(el fetch de jest-expo es un stub y no sale a la red)\n\n'+
    lines.join('\n')+`\n\n${CASES.length-fallos}/${CASES.length} casos correctos\n`);
})();
