# Los filtros de QRisk — guía para aprendérselos

Guía de estudio para explicar el sistema oralmente. Todo lo que dice está
verificado contra el backend real el 11 de octubre de 2026; donde un número
viene de una medición, se indica.

**Cómo usar este documento:** leer la §1 (la idea de fondo) y la §2 (el recorrido
de un QR). Con esas dos se puede explicar el sistema entero. Las §3 a §6 son el
detalle de cada filtro, para cuando pregunten. La §8 son las preguntas difíciles
con su respuesta.

---

## 1. La idea de fondo: por qué una cascada y no un solo análisis

El sistema **no** analiza todo con todo. Aplica los filtros **en orden, de más
barato a más caro, y se detiene en cuanto uno concluye.**

Esa es la palabra clave: **cascada**. Si la entendés, entendés el sistema.

### Por qué importa

Hay dos razones, y conviene decir las dos:

**Costo.** Los filtros no cuestan lo mismo. Medido el 11 de octubre:

| Si decide… | Tarda |
|---|---|
| F1 (listas) | **~5 s** |
| F2.1 (heurística) | ~10–24 s |
| F2.2 (fuentes externas) | ~28 s |
| Nadie decide | ~33 s, y a veces se corta |

Correr siempre todo significaría 33 s por cada QR, incluso para `github.com`.
Con la cascada, `github.com` responde en 5.5 s.

**Exposición.** Cada filtro adicional implica más contacto con el sitio
sospechoso. F1 y F2.1 no lo tocan: trabajan sobre el texto de la URL. F2.2 sí
lo visita, pero **desde el servidor, nunca desde el teléfono**. Si F1 ya sabe
que el dominio es malicioso, no hay razón para que nadie lo visite.

### La regla que domina sobre todo lo demás

> **La aplicación nunca visita la URL analizada.**

El teléfono solo manda la cadena de texto. Todo contacto con el sitio ocurre en
el entorno aislado del backend. Esto no es un detalle de implementación: es la
regla de mayor jerarquía del producto y tiene consecuencia metodológica directa
—ninguna medición de este trabajo expone la IP del dispositivo ni revela que
una persona concreta está por entrar a una URL concreta.

---

## 2. El recorrido completo de un QR, paso a paso

Esto es lo que hay que poder contar de memoria.

```
  [1] La persona escanea un QR
            |
  [2] ¿Es una URL?  --- NO --->  pantalla de contenido (WiFi, contacto,
            |                     texto…). NO se analiza nada.
           SÍ
            |
  [3] F1 en el teléfono: ¿el dominio está en mi lista local?
            |
      +-----+-----------------------------+
      |                                   |
   SÍ, confiable                     no lo sé
   (y es HTTPS)                     (el caso normal)
      |                                   |
  manda SEGURO                      manda INCIERTO
      |                                   |
      +------------> [4] POST /analyze <--+
                           |
  [5] El backend recibe `resultadoF1`
            |
      ¿vale SEGURO o MALICIOSO?
            |
       SÍ --+--> CORTE. Veredicto final. ~5 s. Fin.
            |
           NO (INCIERTO)
            |
  [6] F2.1 heurística: puntúa la URL sobre 100
            |
      ¿score > 60?
            |
       SÍ --+--> SOSPECHOSO. Corte. Fin.
            |
           NO
            |
  [7] F2.2 comportamiento: consulta URLScan.io + VirusTotal
            |
      ¿alguna reporta algo malo?
            |
       SÍ --+--> SOSPECHOSO. Fin.
            |
           NO
            |
  [8] PENDIENTE: ninguna capa concluyó
            |
  [9] La app deriva el veredicto del score (ver §6)
            |
  [10] Pantalla de resultado con el veredicto y la evidencia
```

**F2.3 (la captura) no es un paso de la cascada.** Se genera dentro de F2.2
cuando esa etapa alcanzó a producirla, y viaja en la respuesta. Por eso un corte
en F2.1 **no trae captura**: la cascada nunca llegó a F2.2. Verificado el
11 de octubre.

### Lo mínimo que hay que saber decir

> «El sistema aplica cuatro filtros en cascada, del más barato al más caro, y se
> detiene en cuanto uno concluye. F1 son listas de reputación y vive en el
> teléfono. F2.1 es una heurística sobre la estructura de la URL. F2.2 consulta
> fuentes externas. F2.3 es una captura del sitio que se genera dentro de F2.2.
> La aplicación nunca visita la URL: todo contacto ocurre en el servidor.»

---

## 3. F1 — Listas de reputación

| | |
|---|---|
| **Qué hace** | Pregunta si el dominio ya se conoce como confiable o como malicioso |
| **Dónde vive** | **En el teléfono** (listas locales) + el corte en el backend |
| **Visita el sitio** | No |
| **Costo medido** | ~5.3–5.5 s cuando concluye |
| **Qué puede concluir** | SEGURO, MALICIOSO, o INCIERTO (no sé) |

### El reparto de responsabilidades, que es lo que suelen preguntar

El backend implementa **el corte**, no las listas. El contrato de `/analyze`
acepta un campo `resultadoF1` y **espera que el cliente se lo mande**:

- Si recibe `SEGURO` o `MALICIOSO` → corta de inmediato, ese es el veredicto.
- Si recibe `INCIERTO` (o nada) → sigue a F2.1.

Por eso las listas están en la app: [localF1.ts](../src/services/analysis/localF1.ts).

### Las dos reglas que hacen que la lista no sea una vulnerabilidad

**Esto es lo más importante de F1 y lo más probable que te pregunten.**

**Regla 1 — Coincidencia exacta de dominio, nunca por substring.**

Si la comparación se hiciera con `includes()`, la whitelist se convertiría en
el agujero que intenta cerrar:

| URL del atacante | ¿Pasaría con `includes()`? | ¿Pasa en QRisk? |
|---|---|---|
| `google.com.phishing.top` | **sí** (contiene "google.com") | no |
| `no-github.com` | **sí** (termina en "github.com") | no |
| `googlecom.evil.top` | sí | no |
| `github.com@sitio-malo.top` | sí | no |
| `github.com.co` | sí | no |

Se compara el host completo, o un subdominio **con el punto delante**:
`mail.google.com` sí (es subdominio real), `googlecom.evil.top` no.

Hay **7 tests** dedicados exactamente a estos casos. Si alguno empezara a dar
SEGURO, la lista dejó de ser un atajo y pasó a ser un riesgo.

**Regla 2 — Solo HTTPS.**

`http://github.com` **no** se marca seguro. El dominio puede ser legítimo y la
conexión seguir siendo interceptable, y un QR que apunta a la versión sin cifrar
de un sitio conocido es justo lo que haría un ataque en red local.

### Por qué no hay lista negra local

Una blacklist en el teléfono quedaría obsoleta el día que se compila la app: los
dominios maliciosos se crean y mueren en horas. Esa detección le toca a F2.2,
que consulta en vivo.

**Es una decisión, no un olvido.** Conviene decirlo así.

### Ganancia medida

**5.5 s en lugar de 24–35 s** para los dominios de la lista.

---

## 4. F2.1 — Heurística sobre la estructura de la URL

| | |
|---|---|
| **Qué hace** | Puntúa la URL de 0 a 100 según rasgos sospechosos de su forma |
| **Dónde vive** | Backend |
| **Visita el sitio** | **No.** Solo mira el texto de la URL |
| **Costo medido** | ~10–24 s |
| **Qué puede concluir** | SOSPECHOSO si `score > 60`; si no, pasa a F2.2 |

### Cómo funciona la mecánica

Cada criterio que se cumple **suma su peso**. La suma es el `score_heuristico`.
No es una media ni un promedio: es una **acumulación**.

### Criterios confirmados en vivo el 11 de octubre

| Criterio | Peso | Qué detecta | Ejemplo del `detalle` real |
|---|---|---|---|
| `posible_suplantacion_marca` | **30** | Una marca conocida en un dominio que no le pertenece | *Contiene "paypal" pero el dominio raíz es "verificacion-segura-banco.tk"* |
| `ip_literal` | **30** | El host es una IP en vez de un nombre | *Host es una IP: 192.168.1.1* |
| `tld_riesgo` | **25** | Dominio de primer nivel asociado a abuso | *TLD sospechoso: .tk* |
| `acortador_url_conocido` | **20** | Un acortador que oculta el destino real | *Dominio es un acortador de URL conocido: tinyurl.com* |
| `sin_https` | **15** | La URL no va cifrada | *La URL no usa HTTPS* |
| `palabra_clave_sospechosa` | **15** | Palabras típicas de phishing | *Palabra detectada: "login"* |
| `dominio_largo` | **10** | Nombre de dominio inusualmente largo | *Longitud: 39 caracteres* |
| `subdominios_excesivos` | **10** | Demasiados niveles de subdominio | *(verificado con `a.b.c.d.e.f.sitio.com`)* |

La documentación del backend declara **13 criterios**; estos 8 son los que se
observaron en vivo. Los otros 5 existen pero no se activaron con las URLs de
prueba. **Para la tesis conviene decir "13 según el contrato, 8 verificados
empíricamente"** y no inventar los cinco restantes.

### Un ejemplo completo, medido

URL: `http://paypal.com.verificacion-segura-banco.tk/login/signin/account/verify`

| Criterio | Peso |
|---|---|
| `posible_suplantacion_marca` | 30 |
| `tld_riesgo` (.tk) | 25 |
| `sin_https` | 15 |
| `palabra_clave_sospechosa` ("login") | 15 |
| `dominio_largo` (39 caracteres) | 10 |
| **Total** | **95** |

95 > 60 → **SOSPECHOSO, corte en F2.1.** Respondió en 10.6 s y **sin captura**,
porque no llegó a F2.2.

### El detalle del umbral que hay que tener claro

El corte es **`score > 60`, estricto**. Consecuencias medidas:

- Un score de **55** (TLD de riesgo 25 + sin HTTPS 15 + palabra clave 15) →
  **PENDIENTE**. Tres señales simultáneas que el backend no convierte en
  veredicto.
- Un score de **60 exacto** tampoco concluye, por el `>`.

Esto es la razón de que la app tenga su propia tabla de cortes (§6).

**Y es importante para una métrica:** como F2.1 solo puede concluir
`SOSPECHOSO`, **la heurística nunca produce `MALICIOSO`**, ni con score 95. Solo
F1 (lista negra) puede dar MALICIOSO hoy.

---

## 5. F2.2 — Comportamiento: fuentes externas

| | |
|---|---|
| **Qué hace** | Consulta dos servicios que sí visitan el sitio |
| **Dónde vive** | Backend |
| **Visita el sitio** | **Sí, pero desde el servidor**, nunca desde el teléfono |
| **Costo medido** | ~28 s |
| **Qué puede concluir** | SOSPECHOSO si alguna fuente reporta algo |

### Las dos fuentes

**URLScan.io** — carga la página en un entorno aislado y observa qué hace:
a dónde redirige, qué recursos pide, qué categoría tiene.

**VirusTotal** — agrega el veredicto de decenas de motores antivirus.

**Corren en paralelo**, con un presupuesto de tiempo compartido y degradación
progresiva: si una no responde, se usa lo que haya dado la otra.

### Los indicadores que devuelve

A diferencia de F2.1, **los indicadores de F2.2 no tienen peso**: no puntúan,
**concluyen**. Si VirusTotal dice que 2 motores marcan el sitio, eso no suma 20
puntos — decide el veredicto.

| Indicador | Qué significa |
|---|---|
| `virustotal_motores_maliciosos` | N motores lo marcan como malicioso |
| `virustotal_motores_sospechosos` | N motores lo marcan como sospechoso |
| `urlscan_verdict_malicioso` | URLScan concluyó que es malicioso |
| `urlscan_scan_eliminado` | **El más interesante**: ver abajo |
| `redireccion_detectada` | El sitio redirige a otro lugar |
| `categorias_riesgo` | Categorías de riesgo asignadas |

### `urlscan_scan_eliminado`, que merece explicación aparte

Si URLScan **elimina** un análisis después de haberlo hecho, suele ser porque
confirmó que el contenido era malicioso. Así que **la desaparición del informe
es, en sí misma, una señal de riesgo.**

Es un detalle elegante y buen material de defensa: muestra que el sistema no
solo lee veredictos, interpreta el comportamiento de la fuente.

### Un ejemplo completo, medido

URL: `https://tinyurl.com/2p8x9k3j`

1. F1 → INCIERTO (no está en la lista local).
2. F2.1 → score **20** (`acortador_url_conocido`). 20 < 60, **no concluye**.
3. F2.2 → VirusTotal: *«2 motores lo marcan como malicioso»* → **SOSPECHOSO**.
4. F2.3 → captura generada. Respondió en 27.8 s.

**Este caso demuestra para qué sirve la cascada:** la heurística no veía nada
grave (un acortador es sospechoso pero no condenable), y la consulta externa sí.
Sin F2.2 esa URL habría pasado como benigna.

---

## 6. F2.3 — La vista previa, y por qué no es un filtro

| | |
|---|---|
| **Qué hace** | Una captura de pantalla del sitio |
| **Dónde vive** | Backend, **dentro de F2.2** |
| **Qué concluye** | **Nada.** No produce veredicto |

**No es un filtro, es evidencia visual.** El backend la genera cuando F2.2
alcanzó a producirla, y la manda en `screenshot_url`.

### Tres cosas que hay que saber decir

**1. Es una imagen estática, nunca un WebView.** Una página dentro de un WebView
podría ejecutar código y hacerse pasar por una pantalla de QRisk. Una imagen no.

**2. La URL caduca en 1 hora.** Es una URL firmada de S3. Por eso el historial
**la descarta al guardar**: si se persistiera, las filas viejas mostrarían
imágenes rotas.

**3. No siempre viene, y su ausencia no es un fallo.** Si la cascada cortó en
F1 o F2.1, no hay captura porque nunca se llegó a F2.2. Verificado el 11 de
octubre: el corte por F2.1 con score 95 **no trajo captura**.

---

## 7. Lo que hace la app con el resultado

### Cuándo la app deriva el veredicto

El backend puede responder cuatro valores: `SEGURO`, `MALICIOSO`, `SOSPECHOSO`
y `PENDIENTE`. Los tres primeros son conclusiones y **la app los respeta tal
cual**. `PENDIENTE` significa "ninguna capa concluyó".

Ante un `PENDIENTE` **con un score**, la app aplica sus propios cortes
([verdictThresholds.ts](../src/services/analysis/verdictThresholds.ts)):

| Score | Veredicto | Por qué ese corte |
|---|---|---|
| 0–29 | **seguro** | Un solo criterio menor (sin HTTPS = 15) no basta. Marcar de riesgo todo sitio sin HTTPS daría tantos falsos positivos que la app dejaría de creerse |
| 30–59 | **sospechoso** | 30 es el peso exacto de "el host es una IP", y lo que suman dos criterios menores. Merece advertencia, no condena |
| 60–100 | **malicioso** | Tres o más señales a la vez (IP + sin HTTPS + "login": el phishing clásico) |

**La frase que responde la objeción obvia:** el puntaje y los criterios son del
backend; lo único que pone la app son los cortes, alineados con los pesos que el
propio backend usa.

**Y se desmonta solo:** el adaptador prefiere siempre un veredicto real del
backend. El día que el backend conecte su umbral sobre el puntaje, esta tabla
deja de actuar sin tocar una línea de código.

### Un detalle de seguridad: el score fuera de escala

Si llega un score de `-20` o `150`, la app **no** lo interpreta: devuelve
"incierto" y el medidor neutro.

Un `-20` no significa "muy seguro": significa que el backend cambió de escala y
que estos cortes ya no significan lo que creemos. Antes, un `-20` daba
**"seguro"** — un falso "seguro" es el peor resultado posible de este producto.

---

## 8. Las preguntas difíciles, con su respuesta

**«¿La aplicación visita el sitio malicioso?»**
No, nunca. El teléfono manda solo la cadena de texto. F1 y F2.1 trabajan sobre
el texto. F2.2 sí carga el sitio, pero en el entorno aislado del backend. Ni la
IP del dispositivo ni el hecho de que una persona concreta esté por entrar
llegan al atacante.

**«¿No se están inventando el veredicto en la app?»**
No. El puntaje y los criterios los calcula el backend. La app solo pone los
cortes de score→veredicto, y solo cuando el backend responde PENDIENTE, es
decir cuando declara que no concluyó. Los cortes están alineados con los pesos
del propio backend. Y el código está hecho para desmontarse solo cuando el
backend conecte su umbral.

**«¿Por qué la whitelist no es un riesgo de seguridad?»**
Por dos reglas: coincidencia exacta de dominio (nunca substring) y solo HTTPS.
Hay siete tests dedicados a dominios de atacante que deben rechazarse, como
`google.com.phishing.top` y `no-github.com`. Y es una lista pequeña, de
infraestructura de uso masivo, sin banca.

**«¿Por qué tarda hasta 35 segundos?»**
Porque F2.2 consulta dos servicios externos que cargan el sitio de verdad, y
F2.3 genera una captura con un navegador headless. Es el costo de no confiar
solo en la forma de la URL. La cascada existe precisamente para pagar ese costo
solo cuando hace falta: un dominio conocido responde en 5.5 s.

**«¿Qué pasa si el análisis falla?»**
La app degrada a "incierto" con un aviso explícito, nunca a "seguro". En una
aplicación de seguridad, la falta de información no se pinta de verde.

**«¿Por qué F2.3 no tiene su propia etapa?»**
Porque no siempre ocurre: es un subproducto de F2.2. Anunciarla como etapa
propia prometería un paso que no se da cuando la cascada corta antes.

**«¿El sistema detecta sitios maliciosos?»**
Con precisión: hoy solo F1 con lista negra puede devolver MALICIOSO. La
heurística topa en SOSPECHOSO por diseño del umbral del backend (`score > 60`
solo concluye SOSPECHOSO), incluso con score 95. Esto es una limitación conocida
y documentada, no un fallo de detección.

---

## 9. Tarjetas de repaso

Tapar la columna derecha.

| Pregunta | Respuesta |
|---|---|
| ¿Cuántos filtros hay? | Cuatro: F1, F2.1, F2.2 y F2.3 — aunque F2.3 no concluye nada |
| ¿Qué es una cascada? | Filtros en orden de costo creciente, que se detienen en cuanto uno concluye |
| ¿Dónde vive F1? | En el teléfono (las listas) + el corte en el backend |
| ¿Cuánto tarda F1? | ~5 s |
| ¿F2.1 visita el sitio? | No. Solo mira el texto de la URL |
| ¿Cómo puntúa F2.1? | Suma el peso de cada criterio que se cumple, sobre 100 |
| ¿Umbral de F2.1? | `score > 60`, estricto → SOSPECHOSO |
| ¿Peso de "el host es una IP"? | 30 |
| ¿Peso de "sin HTTPS"? | 15 |
| ¿Qué consulta F2.2? | URLScan.io y VirusTotal, en paralelo |
| ¿Los indicadores de F2.2 puntúan? | No. Concluyen |
| ¿Qué es `urlscan_scan_eliminado`? | URLScan borró el informe, lo que sugiere contenido malicioso confirmado |
| ¿Qué es F2.3? | Una captura del sitio, generada dentro de F2.2. No concluye nada |
| ¿Por qué no es un WebView? | Una página en WebView podría ejecutar código y hacerse pasar por QRisk |
| ¿Cuánto dura la URL de la captura? | 1 hora. Por eso el historial la descarta |
| ¿Cuándo deriva la app el veredicto? | Solo si el backend dice PENDIENTE y manda un score |
| ¿Cortes de la app? | 0–29 seguro · 30–59 sospechoso · 60–100 malicioso |
| ¿Y si el score viene en −20? | Incierto y medidor neutro: la escala cambió, no es "muy seguro" |
| ¿Qué filtro puede dar MALICIOSO? | Solo F1 con lista negra. La heurística topa en SOSPECHOSO |
| La regla que domina todo | La app nunca visita la URL analizada |

---

## 10. De dónde sale cada afirmación

Para poder citar en la tesis.

| Tema | Archivo |
|---|---|
| F1, listas locales y sus dos reglas | [localF1.ts](../src/services/analysis/localF1.ts) |
| Los 7 tests de dominios engañosos | [localF1.test.ts](../src/services/analysis/__tests__/localF1.test.ts) |
| Envío de `resultadoF1` | [remoteAnalysisService.ts](../src/services/analysis/remoteAnalysisService.ts) |
| Traducción de la respuesta | [adaptAnalysis.ts](../src/services/analysis/adaptAnalysis.ts) |
| Cortes score→veredicto | [verdictThresholds.ts](../src/services/analysis/verdictThresholds.ts) |
| Las etapas y sus tiempos | [analysisStages.ts](../src/services/analysis/analysisStages.ts) |
| Qué filtros se anuncian | [enabledFilters.ts](../src/services/analysis/enabledFilters.ts) |
| Timeouts y su justificación | [config.ts](../src/services/api/config.ts) |
| Contrato del backend | [qrisk-endpoint-doc.md](../qrisk-endpoint-doc.md) |
| Mediciones en vivo | [fase3/](fase3/) |
