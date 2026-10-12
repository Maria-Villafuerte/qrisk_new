# QRisk — Documentación de Endpoints (Backend)

Estado actual: **F1 (integración) + F2.1 + F2.2 + F2.3 implementados. Endpoint de reportes implementado (S11).**

---

## `POST /analyze`

```
POST https://<tu-invoke-url>/dev/analyze
Content-Type: application/json
```

⚠️ **Timing:** cuando F1 e F2.1 no son concluyentes, el request puede tardar **varios
segundos hasta ~35s** (F2.2 hace polling contra URLScan.io y VirusTotal en paralelo,
con presupuesto de tiempo compartido). Configura el timeout de red del cliente HTTP
en **al menos 40-45s** para esta ruta específica.

### Request Body

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `url` | string | Sí | La URL extraída del código QR. |
| `resultadoF1` | string | No | Veredicto del Filtro F1 (blacklists). Valores válidos: `"SEGURO"`, `"MALICIOSO"`, `"INCIERTO"`. Si se omite o viene un valor inválido, se asume `"INCIERTO"`. |

**Ejemplo:**
```json
{
  "url": "https://ejemplo.com",
  "resultadoF1": "INCIERTO"
}
```

### Cómo funciona la cascada (por dentro)

1. Se valida que `url` exista y sea un string → si no, `400`.
2. Se normaliza la URL (RFC 3986).
3. Si `resultadoF1` es `SEGURO` o `MALICIOSO` → **corte anticipado**, ese es el veredicto final.
4. Si `resultadoF1` es `INCIERTO` → se busca si ya existe un análisis reciente para
   esa misma URL (caché con TTL: 7 días si el veredicto anterior fue
   `SOSPECHOSO`/`MALICIOSO`, 24h si fue `PENDIENTE`/`SEGURO`). Si hay uno vigente,
   se devuelve directo (`desde_cache: true`), sin volver a correr el análisis.
5. Si no hay caché vigente, corre el motor heurístico F2.1 (13 criterios).
   - Score > 60 → veredicto `SOSPECHOSO`, corte anticipado.
   - Score ≤ 60 → **corre F2.2**.
6. F2.2 consulta URLScan.io y VirusTotal en paralelo, con degradación progresiva.
   - Si cualquiera de las dos da veredicto malicioso → `SOSPECHOSO`.
   - Si URLScan.io **elimina** el scan tras analizarlo (contenido confirmado como
     malicioso) → también cuenta como `SOSPECHOSO` (`urlscan_scan_eliminado`).
   - Si ninguna fuente es concluyente → sigue a F2.3.
7. F2.3 corre siempre que F2.2 haya producido un screenshot — sube a S3 propio y
   devuelve una URL firmada de 1h. Si falla, se degrada sin screenshot.

### Respuestas

**200 — Corte por F1:**
```json
{
  "url": "https://ejemplo.com",
  "dominio": "ejemplo.com",
  "veredicto_final": "MALICIOSO",
  "filtro_decisivo": "F1"
}
```

**200 — Resuelto por F2.1 (score > 60):**
```json
{
  "url": "http://mi-banco-verificacion.xyz/login?token=abc",
  "dominio": "mi-banco-verificacion.xyz",
  "veredicto_final": "SOSPECHOSO",
  "filtro_decisivo": "F2.1",
  "score_heuristico": 70,
  "criterios_f2_1": [
    { "criterio": "tld_riesgo", "peso": 25, "detalle": "TLD sospechoso: .xyz" }
  ]
}
```

**200 — Resuelto por F2.2, con vista previa:**
```json
{
  "url": "https://tinyurl.com/2p8x9k3j",
  "dominio": "tinyurl.com",
  "veredicto_final": "SOSPECHOSO",
  "filtro_decisivo": "F2.2",
  "score_heuristico": 20,
  "criterios_f2_1": [
    { "criterio": "acortador_url_conocido", "peso": 20, "detalle": "Dominio es un acortador de URL conocido: tinyurl.com" }
  ],
  "indicadores_f2_2": [
    { "indicador": "virustotal_motores_maliciosos", "detalle": "2 motores lo marcan como malicioso" }
  ],
  "screenshot_url": "https://qrisk-screenshots-22787.s3.us-east-1.amazonaws.com/screenshots/<uuid>.png?X-Amz-...(firmada, expira en 1h)"
}
```

Posibles valores de `indicadores_f2_2[].indicador`: `urlscan_verdict_malicioso`,
`urlscan_scan_eliminado`, `redireccion_detectada`, `categorias_riesgo`,
`virustotal_motores_maliciosos`, `virustotal_motores_sospechosos`.

⚠️ **Nota sobre `redireccion_detectada`:** el campo `detalle` de este indicador
puede no contener una URL real (a veces URLScan.io devuelve una categoría en vez
del destino). Muéstralo como texto informativo genérico por ahora — ajuste pendiente
del lado del backend.

**200 — Resuelto desde caché (misma URL analizada recientemente):**
```json
{
  "url": "https://tinyurl.com/2p8x9k3j",
  "dominio": "tinyurl.com",
  "veredicto_final": "SOSPECHOSO",
  "filtro_decisivo": "F2.2",
  "score_heuristico": 20,
  "criterios_f2_1": [ { "criterio": "acortador_url_conocido", "peso": 20, "detalle": "..." } ],
  "indicadores_f2_2": [ { "indicador": "virustotal_motores_maliciosos", "detalle": "..." } ],
  "screenshot_url": "https://.../screenshots/<uuid>.png?...(URL firmada nueva, regenerada en cada respuesta)",
  "desde_cache": true
}
```
Útil para mostrar en la UI que el resultado ya se conocía, en vez de "analizando ahora".

**200 — Pendiente:**
```json
{
  "url": "https://sitio-normal.com/pagina",
  "dominio": "sitio-normal.com",
  "veredicto_final": "PENDIENTE",
  "filtro_decisivo": null,
  "score_heuristico": 15,
  "criterios_f2_1": [],
  "indicadores_f2_2": [],
  "mensaje": "F1, F2.1 y F2.2 no concluyentes"
}
```
(`screenshot_url` puede aparecer también aquí si F2.2 alcanzó a generar uno.)

**400 / 500:** mismos formatos que antes —
```json
{ "error": "INVALID_INPUT", "message": "..." }
{ "error": "URL_INVALIDA", "message": "..." }
{ "error": "INTERNAL_ERROR", "message": "..." }
```

### Valores posibles

| `veredicto_final` | Significado |
|---|---|
| `SEGURO` | F1: whitelist / confiable. |
| `MALICIOSO` | F1: blacklist. |
| `SOSPECHOSO` | F2.1 (score > 60), o F2.2 (URLScan/VT maliciosos, o scan eliminado). |
| `PENDIENTE` | Ninguna capa concluyente. |

`filtro_decisivo`: `"F1"`, `"F2.1"`, `"F2.2"`, o `null`.

---

## `POST /report` — nuevo (S11)

```
POST https://<tu-invoke-url>/dev/report
Content-Type: application/json
```

Guarda un reporte de QR/URL malicioso enviado por el usuario desde la pantalla de
resultado. Responde rápido (no depende de ninguna API externa).

⚠️ **Limitación conocida, para que la tengas presente si la UI la menciona:**
PhishTank no ofrece una API pública de envío de URLs (solo de consulta), así que
este endpoint **no reenvía automáticamente** el reporte a blacklists colaborativas
externas — lo guarda en nuestra propia base de datos como fuente de verdad interna.

### Request Body

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `url` | string | Sí | La URL que se está reportando. |
| `motivo` | string | No | Texto libre del usuario explicando por qué la reporta. |
| `analisis_id` | integer | No | El `id` del análisis previo de esta URL, si existe (para vincular el reporte al análisis original). Si se envía y no corresponde a un análisis real, responde `400`. |

**Ejemplo:**
```json
{
  "url": "https://ejemplo-malicioso.xyz",
  "motivo": "Formulario pidiendo credenciales bancarias"
}
```

### Respuestas

**200 — Reporte guardado:**
```json
{
  "reporte_id": 1,
  "url": "https://ejemplo-malicioso.xyz/",
  "recibido_en": "2026-09-30T00:15:45.478Z",
  "mensaje": "Reporte recibido. Gracias por ayudar a mejorar la detección."
}
```

**400 — Error de entrada:**
```json
{ "error": "INVALID_INPUT", "message": "El campo \"url\" es requerido y debe ser un string." }
```
```json
{ "error": "URL_INVALIDA", "message": "La URL no es válida o usa un esquema no soportado (solo http/https)." }
```
```json
{ "error": "ANALISIS_ID_INVALIDO", "message": "El \"analisis_id\" proporcionado no corresponde a ningún análisis existente." }
```

**500 — Error interno:**
```json
{ "error": "INTERNAL_ERROR", "message": "No se pudo guardar el reporte en este momento." }
```

---

## Ejemplos con curl

```bash
curl -X POST https://<tu-invoke-url>/dev/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ejemplo.com", "resultadoF1": "INCIERTO"}'

curl -X POST https://<tu-invoke-url>/dev/report \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ejemplo-malicioso.xyz", "motivo": "Formulario pidiendo credenciales"}'
```

Para forzar el camino hasta F2.2/F2.3 en `/analyze`, usa una URL con dominio de
acortador conocido (ej. `tinyurl.com/...`).
