// Verificacion de punta a punta: respuesta real del backend -> adaptador.
const https = require('https');
const BASE = 'z0k9lhdru4.execute-api.us-east-1.amazonaws.com';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const t0 = Date.now();
    const req = https.request({ hostname: BASE, path: '/dev' + path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } },
      (res) => { let b = ''; res.on('data', c => b += c);
        res.on('end', () => resolve({ status: res.statusCode, ms: Date.now() - t0, body: b })); });
    req.on('error', reject); req.setTimeout(50000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data); req.end();
  });
}

const CASES = [
  ['F1 SEGURO (lista local)', 'https://github.com', 'SEGURO'],
  ['F1 INCIERTO -> cascada', 'https://ejemplo-nuevo-7731.com/x', 'INCIERTO'],
  ['F2.1 score alto', 'http://paypal.com.verificar-cuenta-segura.top/login', 'INCIERTO'],
  ['F2.2 acortador', 'https://tinyurl.com/2p8x9k3j', 'INCIERTO'],
];

(async () => {
  const out = [];
  for (const [name, url, f1] of CASES) {
    try {
      const r = await post('/analyze', { url, resultadoF1: f1 });
      let d = {};
      try { d = JSON.parse(r.body); } catch { d = { _raw: r.body.slice(0, 120) }; }
      out.push({ name, url, resultadoF1: f1, status: r.status, ms: r.ms,
        veredicto: d.veredicto_final, filtro: d.filtro_decisivo, score: d.score_heuristico,
        criterios: (d.criterios_f2_1 || []).length, indicadores: (d.indicadores_f2_2 || []).length,
        screenshot: !!d.screenshot_url, desde_cache: d.desde_cache, error: d.error || d._raw });
      console.log(`${name.padEnd(28)} HTTP ${r.status} ${String(r.ms).padStart(6)}ms -> ${d.veredicto_final || d.error || '?'} (${d.filtro_decisivo || 'null'}) score=${d.score_heuristico ?? '-'} shot=${!!d.screenshot_url}`);
    } catch (e) { console.log(`${name.padEnd(28)} FALLO: ${e.message}`); out.push({ name, url, error: e.message }); }
  }
  require('fs').writeFileSync('RESULTADOS/fase3/3.0_verificacion_contrato.json', JSON.stringify(out, null, 2));
})();
