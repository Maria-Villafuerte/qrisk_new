# Prueba con el dataset Kaggle `sid321axn/malicious-urls-dataset`

**Fecha:** 12 de octubre de 2026
**Código:** el real de la app (`classifyQr` → `f1Verdict` → `POST /analyze` →
`adaptAnalysisResponse`), ejecutado con `tsx` desde `correr.ts`. No es una réplica.
**Muestras:** `muestrear.py`, semilla 42. Reproducibles.

> **No usar este dataset para la métrica TDM/TFP del informe.** Es viejo (en
> buena parte ISCX-URL-2016) y tiene etiquetas ruidosas. Ver "Validez" abajo.

---

## Fase A — F1 a escala (2.000 URLs, 500 por clase)

| Clase | F1 → MALICIOSO | F1 → SEGURO | INCIERTO |
|---|---|---|---|
| phishing (496 URL) | 6 (1,2 %) | 5 | 485 |
| malware (500) | 0 | **4** | 496 |
| defacement (500) | 0 | 0 | 500 |
| benign (499) | 1 | 17 | 481 |

- **T_F1: p50 137 ms · p90 214 ms · máx 699 ms** (PC con red fija, no 4G). Ningún timeout.
- La "benigna" marcada MALICIOSA es `paypal.com.us.sys-cgi.dispatch-login…`:
  phishing mal etiquetado. TFP real de F1: 0.
- **Hallazgo:** las 4 de malware marcadas SEGURO son APKs/descargas en
  `drive.google.com` y `gitlab.com/.../-/raw/...apk`. La lista local acepta
  cualquier subdominio de `google.com` y `gitlab.com`, incluidos servicios con
  contenido subido por usuarios (Drive, Forms, Sites). Con SEGURO, el backend
  corta la cascada sin correr F2.

## Fase B — cascada completa (100 URLs: 50 maliciosas + 50 legítimas, en serie)

| | n | malicioso | sospechoso | seguro | incierto |
|---|---|---|---|---|---|
| phishing | 20 | 5 | 2 | 6 | 7 |
| malware | 15 | 8 | 2 | 1 | 4 |
| defacement | 15 | 0 | 1 | 11 | 3 |
| benign | 49 + 1 no-URL | 3 | 0 | 15 | 31 |

Métricas tal como las define `detectionMetrics.ts`, **sin corregir etiquetas**:

| Métrica | Valor | Objetivo |
|---|---|---|
| TDM estricta (malicioso) | 26,0 % | ≥ 90 % |
| Tasa de advertencia (malicioso + sospechoso) | 36,0 % | — |
| Falso "seguro" en maliciosas | 36,0 % | — |
| TFP estricta (legítimas → malicioso) | 6,0 % | ≤ 5 % |

### El hallazgo principal: 45 % de 504

| HTTP | n |
|---|---|
| 200 | 54 |
| **504** | **45** |

Casi la mitad de los análisis llegan a los 35 s de API Gateway y se cortan; la app
los muestra como "incierto". Es la causa principal del 62 % de "incierto" en las
legítimas y del 28 % en las maliciosas. **No es de la app.**

- **T_total (solo respuestas 200): p50 26,8 s · p90 31,3 s · máx 34,9 s.**
  Cumple ≤ 35 s, pero solo porque lo que pasa de 35 s ya no llega.
- Quién decidió (respuestas 200): PENDIENTE 32 · SOSPECHOSO por F2.2 18 ·
  SEGURO por F1 3 · MALICIOSO por F1 1.

## Validez: por qué estas cifras no miden la detección

Revisadas a mano las URLs que contaron como error:

- **Las 3 "legítimas" marcadas MALICIOSAS son phishing real mal etiquetado:**
  `hcsolutionscr.com/signin.ebay.com/index.htm` (3 motores de VT),
  `https.observ.paypal.objects.net.secure-update-all…` (Safe Browsing),
  `fundacioncharlot.com/.../wp-content/uploads/2011/.pa…` (4 motores).
  **TFP real: 0 %.**
- **Varias "phishing" marcadas SEGURO son sitios legítimos:** `zoho.com/projects`,
  `tools.ietf.org/html/rfc2598`, `old.scriptmeridian.org/projects/regex/`.
- **Los 11 defacement marcados SEGURO** son sitios Joomla desfigurados hacia 2016;
  hoy probablemente están restaurados. La etiqueta describe el pasado.
- 92 % de las `benign` no traen esquema y 100 % de las `defacement` sí: el
  formato delata la etiqueta.

**Conclusión:** para TDM/TFP del informe hace falta una muestra fresca (URLhaus u
OpenPhish del día + Tranco), etiquetada en la fecha de la prueba. Este dataset
sirve para dos cosas: medir **T_F1** y **la tasa de 504**, que no dependen de la
etiqueta.

Nota: la fase B corrió con el adaptador anterior al desglose por filtro del
12-10-2026. Los veredictos no cambian con ese desglose (solo cambia cómo se
explican).

---

## Con PhishTank en F1 (12 de octubre de 2026, tarde)

### A2 — F1 sobre 400 URLs (100 por clase, primeras de la muestra A)

| Clase | F1 → MALICIOSO sin PhishTank | con PhishTank | PhishTank respondió | PhishTank la confirma |
|---|---|---|---|---|
| phishing | 2 | **14** | 76 de 99 | 12 (15,8 % de las respondidas) |
| malware | 0 | 0 | 74 de 96 | 0 |
| defacement | 0 | 0 | 71 de 100 | 0 |
| benign | 0 | 0 | 70 de 100 | 0 |

- **Detección de F1 en phishing: de 2 % a 14 %** (7×). Safe Browsing y PhishTank no se
  solaparon en ninguna URL: cubren casos distintos.
- **Cero falsos positivos** de PhishTank en las 70 benignas que respondió.
- PhishTank no detecta malware ni defacement: es una base de phishing.
- **T_F1: p50 406 ms · p90 488 ms · máx 1.106 ms** (antes, solo Safe Browsing: p90 214 ms).
  Sigue muy por debajo de los 5 s.
- Los `phish_id` confirmados son de 2013–2020: PhishTank conserva como `valid` un
  phishing viejo aunque el sitio ya esté caído o limpio.

**Limitación de la medición:** sin `app_key`, Cloudflare corta a PhishTank con HTTP 429
tras ~66 consultas seguidas (límite no declarado, distinto del de 250/5 min de sus
cabeceras). Aun espaciando hasta 30 s, 104 de 400 consultas (26 %) quedaron sin
respuesta. Las tasas de arriba se calculan sobre las respondidas. En la app, cada 429
se mostró como "No se pudo consultar PhishTank" y el análisis siguió (degradación
verificada con fallos reales).

### B2 — cascada completa (100 URLs; solo se volvió a llamar al backend donde F1 cambió)

| | sin PhishTank | con PhishTank |
|---|---|---|
| Maliciosas → malicioso | 13 / 50 (26 %) | **14 / 50 (28 %)** |
| Legítimas → malicioso | 3* | 3* |

\* Phishing mal etiquetado en el dataset (ver arriba).

PhishTank confirmó 3 URLs que Safe Browsing no conocía; con eso el backend corta en F1
en ~6 s en lugar de correr la cascada (~30 s), sin gastar VirusTotal ni arriesgar un 504.
PhishTank respondió en 98 de 99.
