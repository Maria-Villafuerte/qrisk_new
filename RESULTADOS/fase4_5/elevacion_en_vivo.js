// Efecto de la elevacion sobre respuestas REALES del backend.
const https = require('https');
const BASE='z0k9lhdru4.execute-api.us-east-1.amazonaws.com';
const UMBRAL=3;
const DECISIVOS=['urlscan_verdict_malicioso','urlscan_scan_eliminado'];

function post(body){return new Promise((res,rej)=>{const d=JSON.stringify(body);
 const r=https.request({hostname:BASE,path:'/dev/analyze',method:'POST',headers:{'Content-Type':'application/json','Content-Length':d.length}},
 x=>{let b='';x.on('data',c=>b+=c);x.on('end',()=>res({status:x.statusCode,body:b}));});
 r.on('error',rej);r.setTimeout(50000,()=>{r.destroy();rej(new Error('timeout'));});r.write(d);r.end();});}

function motores(t){const m=/(\d+)/.exec(t||'');return m?parseInt(m[1],10):0;}
function eleva(inds){if(!Array.isArray(inds))return null;
 for(const i of inds){const k=(i.indicador||'').trim();if(!k)continue;
  if(DECISIVOS.includes(k))return{indicator:k};
  if(k==='virustotal_motores_maliciosos'){const n=motores(i.detalle);if(n>=UMBRAL)return{indicator:k,engines:n};}}
 return null;}

const URLS=[
 ['acortador (2 motores)','https://tinyurl.com/2p8x9k3j'],
 ['bit.ly','https://bit.ly/3xK9mPq'],
 ['malware.wicar.org','http://malware.wicar.org/data/eicar.com'],
 ['png con payload','https://summitcapitalpatners.ink/img_063332.png'],
 ['falso paypal (F2.1 score 95)','http://paypal.com.verificacion-cuenta-segura.tk/login/signin?user=x'],
];

(async()=>{
 const rows=[];
 for(const [name,url] of URLS){
  try{
   const r=await post({url,resultadoF1:'INCIERTO'});
   if(r.status!==200){rows.push([name,`HTTP ${r.status}`,'-','-','-']);console.log(`${name.padEnd(30)} HTTP ${r.status}`);continue;}
   const d=JSON.parse(r.body);
   const inds=(d.indicadores_f2_2||[]).map(i=>`${i.indicador}=${i.detalle}`).join(' | ');
   const e=eleva(d.indicadores_f2_2);
   const antes=d.veredicto_final;
   const despues=(antes==='SOSPECHOSO'&&e)?'MALICIOSO':antes;
   rows.push([name,antes,despues,e?`${e.indicator}${e.engines?' ('+e.engines+')':''}`:'-',inds]);
   const flag=antes!==despues?'  <== ELEVADO':'';
   console.log(`${name.padEnd(30)} ${String(antes).padEnd(11)} -> ${String(despues).padEnd(11)}${flag}`);
   if(inds)console.log(`${''.padEnd(30)}   evidencia: ${inds}`);
  }catch(err){console.log(`${name.padEnd(30)} FALLO: ${err.message}`);rows.push([name,'error','-','-','-']);}
 }
 const fs=require('fs');
 fs.writeFileSync('RESULTADOS/fase4_5/elevacion_en_vivo.txt',
  'Efecto de la elevacion por evidencia de F2.2, sobre respuestas reales\n'+
  '12 de octubre de 2026 · umbral: '+UMBRAL+' motores\n\n'+
  rows.map(r=>`${r[0].padEnd(30)} ${String(r[1]).padEnd(12)} -> ${String(r[2]).padEnd(12)} motivo=${r[3]}\n   ${r[4]}`).join('\n')+'\n');
})();
