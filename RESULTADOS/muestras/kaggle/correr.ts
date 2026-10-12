// @ts-nocheck -- script de Node para RESULTADOS, no es codigo de la app.
// Corre muestras del dataset Kaggle por el CODIGO REAL de la app, no una replica:
//   classifyQr -> f1Verdict (lista local + Safe Browsing + PhishTank) -> POST /analyze -> adaptAnalysisResponse
//
// Uso (desde la raiz del repo):
//   npx tsx RESULTADOS/muestras/kaggle/correr.ts A    # solo F1, 2000 URLs (corrida del 12-10, sin PhishTank)
//   npx tsx RESULTADOS/muestras/kaggle/correr.ts B    # cascada completa, 100 URLs, en serie
//   npx tsx RESULTADOS/muestras/kaggle/correr.ts A2   # A otra vez, ya con PhishTank en F1
//   npx tsx RESULTADOS/muestras/kaggle/correr.ts B2   # B otra vez; solo llama al backend si F1 cambio
//
// A2 y B2 van espaciadas: PhishTank sin clave admite 250 consultas cada 5 min
// por IP. Pasarse convierte sus respuestas en "no se pudo consultar" y ensucia
// la medicion.
//
// B2 no repite la cascada cuando F1 da lo mismo que en B: el backend recibiria
// exactamente la misma peticion, y cada cascada gasta cuota de VirusTotal del
// backend (500/dia, compartida). En ese caso se reutiliza la fila de B
// (`reused: true`).
//
// Escribe resultados_<fase>.jsonl (una linea por URL, se puede reanudar).
import fs from 'fs';
import path from 'path';

const DIR = 'RESULTADOS/muestras/kaggle';
const API = 'https://z0k9lhdru4.execute-api.us-east-1.amazonaws.com/dev';
/**
 * Espacio entre consultas de F1 en A2/B2. 1,3 s respeta el limite declarado
 * (250 cada 300 s), pero las consultas SIN clave tienen otro limite de
 * Cloudflare, no declarado, que corto a las ~66 seguidas (HTTP 429, medido el
 * 2026-10-12). Se puede subir con PT_SPACING_MS.
 */
const PHISHTANK_SPACING_MS = Number(process.env.PT_SPACING_MS ?? 1_300);

// Las claves entran por el mismo camino que en la app: EXPO_PUBLIC_*.
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^\s*(EXPO_PUBLIC_[A-Z_]+)\s*=\s*(.*)$/.exec(line);
  if (m) process.env[m[1]] = m[2].trim();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readJsonl(file: string): any[] {
  return fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
}

async function main() {
  const { classifyQr } = await import('../../../src/services/qr/classifyQr');
  const { f1Verdict } = await import('../../../src/services/analysis/f1Filter');
  const { adaptAnalysisResponse } = await import('../../../src/services/analysis/adaptAnalysis');

  const phase = ['A', 'B', 'A2', 'B2'].includes(process.argv[2]) ? process.argv[2] : 'A';
  const isA = phase.startsWith('A');
  const throttled = phase.endsWith('2');
  let sample: { url: string; label: string }[] = JSON.parse(
    fs.readFileSync(path.join(DIR, isA ? 'muestra_A_f1.json' : 'muestra_B_cascada.json'), 'utf8'),
  );
  // A2_PER_CLASS=N: solo las primeras N de cada clase de la muestra A. Sin
  // clave de PhishTank las 2000 tardarian horas al ritmo que tolera Cloudflare.
  const perClass = Number(process.env.A2_PER_CLASS ?? 0);
  if (phase === 'A2' && perClass > 0) {
    const seen: Record<string, number> = {};
    sample = sample.filter((s) => (seen[s.label] = (seen[s.label] ?? 0) + 1) <= perClass);
  }
  const outFile = path.join(DIR, `resultados_${phase}.jsonl`);
  const done = new Set(readJsonl(outFile).map((r) => r.raw));
  const previousB = new Map(readJsonl(path.join(DIR, 'resultados_B.jsonl')).map((r) => [r.raw, r]));
  const pending = sample.filter((s) => !done.has(s.url));
  console.log(`fase ${phase}: ${pending.length} pendientes de ${sample.length}`);

  async function cascade(row: Record<string, unknown>, url: string, f1: any) {
    const t0 = Date.now();
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 40_000); // timeouts.analyze de la app
      const r = await fetch(`${API}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, resultadoF1: f1.verdict }),
        signal: ac.signal,
      }).finally(() => clearTimeout(timer));
      row.http = r.status;
      row.tTotal = Date.now() - t0 + f1.elapsedMs;
      if (!r.ok) {
        row.verdict = 'incierto'; // degradedResult en la app
        return;
      }
      const body = await r.json();
      const result = adaptAnalysisResponse(body, url, f1);
      row.backend = body.veredicto_final;
      row.decisivo = body.filtro_decisivo;
      row.score = body.score_heuristico;
      row.cache = body.desde_cache;
      row.indicadores = (body.indicadores_f2_2 ?? []).map((i: any) => `${i.indicador}=${i.detalle}`);
      row.criterios = (body.criterios_f2_1 ?? []).map((i: any) => i.criterio);
      row.verdict = result.verdict;
      row.reason = result.verdictReason;
    } catch (e: any) {
      row.http = e?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK';
      row.tTotal = Date.now() - t0 + f1.elapsedMs;
      row.verdict = 'incierto';
    }
  }

  async function one(s: { url: string; label: string }) {
    const row: Record<string, unknown> = { raw: s.url, label: s.label };
    const c = classifyQr(s.url);
    row.kind = c.kind;
    if (c.kind !== 'url') return row;
    row.url = c.url;
    const f1 = await f1Verdict(c.url);
    row.f1 = f1.verdict;
    row.f1Source = f1.source;
    row.tF1 = f1.elapsedMs;
    row.sb = f1.safeBrowsing?.status;
    row.pt = f1.phishTank?.status;
    if (f1.phishTank?.phishId) row.phishId = f1.phishTank.phishId;
    if (isA) return row;

    const prev = previousB.get(s.url);
    if (phase === 'B2' && prev && prev.f1 === f1.verdict) {
      // Misma peticion al backend que en B: se reutiliza su resultado.
      for (const k of ['http', 'tTotal', 'backend', 'decisivo', 'score', 'cache', 'indicadores', 'criterios', 'verdict']) {
        if (k in prev) row[k] = prev[k];
      }
      row.reused = true;
      return row;
    }
    await cascade(row, c.url, f1);
    return row;
  }

  const concurrency = throttled ? 1 : isA ? 8 : 1;
  let i = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (i < pending.length) {
        const s = pending[i++];
        const startedAt = Date.now();
        const row = await one(s);
        fs.appendFileSync(outFile, JSON.stringify(row) + '\n');
        if (!isA && !row.reused) {
          console.log(`${s.label.padEnd(10)} ${String(row.verdict).padEnd(10)} ${row.http} ${row.tTotal}ms ${s.url.slice(0, 70)}`);
        }
        if (throttled) await sleep(Math.max(0, PHISHTANK_SPACING_MS - (Date.now() - startedAt)));
      }
    }),
  );
  console.log('listo');
}

main();
