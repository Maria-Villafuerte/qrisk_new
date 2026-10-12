# Plan para cerrar el capítulo de Resultados

Guía de ejecución para producir `resultados.tex`, el capítulo que hoy no existe
en la tesis. Se sigue de arriba hacia abajo marcando cada casilla.

**Estado de la plantilla al 11 de octubre:** `main.tex` pasa de
`\input{capitulos}` (metodología) directo a `\input{conclusiones}`, que está
vacío. **No hay capítulo de Resultados.** Este plan lo crea.

**Entregable final:** `resultados.tex` compilando dentro de `main.pdf`, con las
17 métricas del cuadro `tab:metricas` respondidas una por una.

**Regla única de este plan:** cada número que entre al capítulo tiene que venir
de una corrida real, con fecha. Si un dato no se midió, se declara no medido.
Un capítulo de resultados con un número inventado es insalvable en una defensa;
uno con una ausencia bien argumentada, no.

---

## Cómo está organizado

| Fase | Qué produce | Depende de |
|---|---|---|
| **0** | Datos que ya se pueden extraer hoy | Nada |
| **1** | APK instalable | Cuenta de Expo |
| **2** | Mediciones en hardware | Fase 1 + teléfono |
| **3** | Mediciones contra el backend | Backend vivo (Fabi) |
| **4** | Datos de usabilidad | Fase 1 + 5 participantes |
| **5** | `resultados.tex` escrito | Las fases anteriores |

Las fases 0, 1, 2 y 4 **no dependen de Fabi**. Son 13 de las 17 métricas.
Conviene empezar por ellas hoy mismo y no quedarse esperando.

---

## Fase 0 · Lo que ya se puede extraer (sin teléfono, sin backend)

Cuatro métricas salen de correr lo que ya está hecho. Hacer esto primero da
capítulo escrito desde el día uno.

- [x] **0.1 — Cobertura de pruebas unitarias** (criterio ≥ 70 %)

      npm test -- --coverage --collectCoverageFrom='src/services/**/*.ts'

  Anotar los cuatro números y **la fecha**. Medición del 11 de octubre, para
  comparar: 99.72 % statements, 98.13 % branches, 100 % funciones, 100 % líneas.
  Guardar la salida completa: va al anexo.

- [x] **0.2 — Clasificación URL / no-URL** (criterio ≥ 98 %)

      npx jest src/services/qr --verbose

  Contar casos que pasan sobre casos totales en `classifyQr.test.ts`. Son 18.
  Este número es el de la parte automatizada; la prueba 1.4 (fase 2) aporta la
  medición con cámara real, y **en el capítulo van los dos**, separados.

- [x] **0.3 — Persistencia offline del historial** (criterio 100 % recuperable)

      npx jest src/services/storage --verbose

  Anotar cuántos casos cubren guardar, leer, el tope de 20 y el descarte del
  más viejo. La verificación en dispositivo es el bloque B3 de la fase 2.

- [x] **0.4 — Reportes con carga completa** (criterio 100 %)

      npx jest src/services/report --verbose

  Nota obligatoria para el capítulo: se valida que el payload se arme completo
  y anónimo, **no** que llegue al servidor — `/reports` no existe. Es un
  resultado legítimo si se enuncia con esa precisión.

- [x] **0.5 — Guardar la evidencia**

      mkdir -p evidencia/fase0
      npm test -- --coverage > evidencia/fase0/cobertura.txt 2>&1
      npx tsc --noEmit > evidencia/fase0/typecheck.txt 2>&1

  Las salidas van al anexo de la tesis. Un número en una tabla sin la corrida
  que lo produjo es una afirmación; con ella, es un dato.

**Al terminar la fase 0 hay 4 de 17 métricas cerradas.**

---

## Fase 1 · El APK

Sin APK no hay ninguna medición en hardware. Bloquea las fases 2 y 4.

- [x] **1.1 — Cuenta de Expo**

      npx eas login

  La gratuita alcanza para el perfil `preview`.

- [x] **1.2 — Compilar**

      npx eas build -p android --profile preview

  Tarda 10–20 min en la nube. `eas.json` ya está configurado: no hay que
  tocarlo. El build local de Gradle se colgó dos veces en esta máquina, así que
  **no intentarlo**: no es el código, el bundle JS exporta limpio.

- [ ] **1.3 — Instalar**

  El enlace sale de `eas build:list`. **Desinstalar cualquier QRisk anterior
  antes**: si queda la vieja, Android conserva permisos y almacenamiento y no
  se ve el onboarding, que es justo lo que mide el bloque A.

- [ ] **1.4 — Anotar el entorno de prueba**

      Modelo ................ ____________________
      Versión de Android .... ____________________
      RAM ................... ____________________
      Gama .................. [ ] baja  [ ] media  [ ] alta

  Va en el capítulo. Un T_scan sin decir en qué teléfono se midió no es
  reproducible. La métrica T_start ≤ 3 s está definida **sobre gama media**: si
  el teléfono es de gama alta, hay que decirlo y no presentar el número como si
  cumpliera el criterio.

---

## Fase 2 · Mediciones en hardware

Protocolos ya escritos: [prueba_1.4_escaneo.md](prueba_1.4_escaneo.md) y
[prueba_telefono_fisico.md](prueba_telefono_fisico.md). Este plan no los
repite, solo dice en qué orden corren y qué dato se extrae.

### 2.1 Prueba 1.4 — T_scan y TDR · ~90 min

Es un **punto de decisión**, no solo una medición: si no se cumple, hay que
migrar a `react-native-vision-camera` (1–2 días).

- [ ] **Preparar los QRs impresos.** **OJO: el anteproyecto pide más de lo que
      decía el protocolo de pruebas interno.** Los números que manda son los del
      anteproyecto (`Protocolo Majo V_final.md`, Tabla 12):

      | Métrica | Muestra que pide el anteproyecto |
      |---|---|
      | T_scan (p90) | 30 QRs en condiciones controladas |
      | **TDR** | **40 QRs** con variedad de tamaños, ángulos e iluminación |
      | **Clasificación URL/no-URL** | **50 QRs (60 % URL / 40 % no-URL)** = 30 URL + 20 no-URL |

      Lo práctico es imprimir **50 QRs** y usarlos para las tres métricas: los
      50 cubren clasificación, 40 de ellos cubren TDR y 30 cubren T_scan.

      Reparto sugerido de los 50, respetando el 60/40 y la variedad del
      protocolo de pruebas:
      - **30 con URL**: 10 por tamaño (3 pequeños ~2 cm, 4 medianos ~5 cm,
        3 grandes ~15 cm), 10 por ángulo (4 de frente, 3 a 30°, 3 a 45°),
        10 por iluminación (4 de día, 3 en penumbra, 3 en oscuridad con
        linterna).
      - **20 sin URL**: 7 Wi-Fi, 5 texto plano, 4 vCard, 2 mailto, 1 tel,
        1 geo.

- [ ] **Correr con Metro visible.** Cada lectura imprime
      `[T_scan] 842 ms · OK · muestra 1 · android`. Anotar en la tabla del
      protocolo **conforme salen**: las muestras viven en memoria y se pierden
      al recargar.

- [ ] **Anotar los fallos a mano.** Esto es lo que más se olvida:

      import { markScanFailed } from './src/services/qr/scanMetrics';
      markScanFailed();

      Si no se anotan, **el TDR va a dar 100 % y va a estar mal.** Es el único
      dato que la app no puede deducir sola.

- [ ] **Cerrar con el resumen:**

      import { summarizeScanMetrics } from './src/services/qr/scanMetrics';
      summarizeScanMetrics();

- [ ] **Resultado:**

      TDR ................. ______ %   (criterio ≥ 95 %)
      T_scan p90 .......... ______ ms  (criterio ≤ 5000 ms)
      T_scan mediana ...... ______ ms
      Clasificación ....... ______ %   (criterio ≥ 98 %)

      DECISIÓN: [ ] seguir con expo-camera  [ ] migrar a vision-camera

- [ ] **Si no se cumple, descartar lo barato antes de concluir que hay que
      migrar:** ¿falla solo a 45°? ¿solo en penumbra? ¿solo con QRs pequeños a
      distancia? Si el fallo se concentra en **un** eje, es una limitación
      conocida y se documenta como tal. Si está repartido en los tres, la
      migración está justificada. Esta distinción es material de capítulo.

### 2.2 Protocolo en dispositivo · ~50 min

Corre los bloques de [prueba_telefono_fisico.md](prueba_telefono_fisico.md).
De aquí salen tres métricas y una verificación.

- [ ] **Bloque A — onboarding** (5 min). Verifica que corre una sola vez.
- [ ] **Bloque B — geocodificación** (10 min) → métrica ≥ 85 %

      El anteproyecto pide **10 ubicaciones distintas** con permiso concedido, y
      que produzcan **nombre de lugar y ciudad legibles**.

      Lugares legibles ...... ____ de 10
      ¿Sobrevive al reinicio?  [ ] sí  [ ] no

      Al aire libre o junto a una ventana: en interiores el GPS falla y eso no
      es culpa de la app. **B6 es el importante**: confirma que la regresión de
      `locationEnabled` sigue arreglada.

- [ ] **Bloque C — Story Card** (15 min) → métrica ≥ 90 %

      El anteproyecto pide **10 escaneos con distintos resultados** (SEGURO y
      MALICIOSO) e **inspección visual** de que la imagen tiene los **cuatro
      elementos requeridos**: foto de contexto, QR cubierto, ubicación y
      resultado visual.

      Story Cards generadas OK ...... ____ de 10
      ¿Tienen los 4 elementos?         ____ de 10
      ¿El QR cubierto es ilegible?     [ ] sí  [ ] no

      **Divergencia que hay que justificar en el capítulo:** el anteproyecto
      dice "QR blureado" y la app usa **capa opaca**. Es una mejora deliberada
      —un QR borroso sigue siendo escaneable, y eso anularía la protección—,
      pero hay que escribirlo como decisión razonada, no dejarlo pasar. El
      bloque C4 lo demuestra: intentar escanear el QR cubierto con otro
      teléfono.

      **C4 no se puede saltar:** intentar escanear el QR tapado con otro
      teléfono. Si se lee, es un fallo grave de seguridad y es un resultado
      que hay que reportar, no esconder.

- [ ] **Bloque E — teclado y safe area** (5 min). No da métrica numérica pero
      cierra "compatibilidad sin errores críticos".

- [ ] **T_start** (criterio ≤ 3 s, gama media). Cronometrar desde el toque en
      el icono hasta que el escáner acepta un QR. **5 corridas en frío**, con
      la app cerrada por completo entre cada una:

      1: ____ s   2: ____ s   3: ____ s   4: ____ s   5: ____ s
      Mediana: ____ s

- [ ] **Compatibilidad Android ≥ 10.** Anotar la versión probada. Si hay un
      segundo teléfono con otra versión, probarlo: dos puntos de datos sostienen
      mucho mejor una afirmación de compatibilidad que uno.

- [ ] **Capturas de pantalla de cada veredicto.** Las figuras del capítulo
      salen de aquí. Guardarlas en `figuras/` de la plantilla.

**Al terminar la fase 2 hay 4 métricas más cerradas: 8 de 17.**

---

## Fase 3 · Mediciones contra el backend · bloqueada por Fabi

**Estado al 11 de octubre: el backend está caído.** Tres llamadas dieron
HTTP 504 a los 35 s, incluida una URL que el 1 de octubre respondía en 0.3 s
desde caché. La infraestructura responde (403 inmediato en la raíz); la Lambda
no.

- [ ] **3.0 — Confirmar que volvió** antes de cualquier medición:

      curl -s -w "\n[HTTP %{http_code} en %{time_total}s]\n" \
        -X POST "https://z0k9lhdru4.execute-api.us-east-1.amazonaws.com/dev/analyze" \
        -H "Content-Type: application/json" \
        -d '{"url":"https://github.com"}' --max-time 40

  Mientras dé 504, las fases 3.1 a 3.4 no se pueden correr.

- [ ] **3.1 — T_F1 (p90)** (criterio ≤ 5 s). El anteproyecto pide
      **100 URLs de prueba en red 4G**, no 20, y mide *"desde el envío de la URL
      hasta la recepción del veredicto en la app"*.

      **Precisión que hay que tener clara:** T_F1 es el tiempo del **Filtro
      F1**, no de la cascada completa. Medido el 2026-10-11, F1 responde en
      **5.3–5.5 s** cuando concluye — justo en el límite del criterio. La
      cascada completa (24–35 s) es **T_total**, que tiene su propio criterio de
      35 s. Confundirlas haría ver como incumplimiento algo que no lo es.

      Con la app ya instrumentada, cada análisis imprime en consola:

          [T_F1] 5412 ms · SEGURO · safe_browsing

      Anotar los 100 tiempos; calcular mediana y p90. **En red móvil 4G**, no
      en WiFi: así lo especifica el anteproyecto.

      Historial medido: 5.5 s (20/09, Lambda en frío) · 14.2–14.5 s (30/09) ·
      15.3 s (01/10). **El criterio de 5 s no se cumplía ni cuando el backend
      funcionaba.** Hay que reportarlo así y explicar por qué: la captura de
      F2.3 abre un navegador headless y cuesta ~10 s. El tope de la app es
      25 s, que **no** es la métrica: T_F1 mide al backend, no cuándo la app
      se rinde.

- [ ] **3.2 — T_total** (criterio ≤ 35 s para F1 + F2.1 + F2.2). El
      anteproyecto pide **20 URLs de prueba**, medición end-to-end: de escaneo a
      veredicto en pantalla. Incluye T_scan + F1 + F2.1 + F2.2 + render.

      Medido el 2026-10-11 contra el backend: 24–33 s en el camino completo,
      **dentro del criterio**. Pero una de tres URLs nuevas dio HTTP 504 a los
      35.2 s (límite de API Gateway): hay que anotar cuántas de las 20 se
      cortan así, porque es el dato que sostiene el pendiente de backend.

- [ ] **3.3 — Detección de maliciosos** (criterio ≥ 90 %) — **EN ESPERA**

      Decisión tomada: esperar a que Fabi conecte el umbral. Hoy el backend
      nunca devuelve MALICIOSO, ni con 18 motores de VirusTotal marcando el
      sitio, así que la medición daría 0 % por construcción y no por desempeño.
      Tu metodología ya lo declara así (`capitulos.tex`, §Métricas).

      **Mientras se espera, dejar lista la muestra.** El anteproyecto pide
      **50 + 50**, y además el cálculo de **precisión, recall y F1-score**:
      - [ ] **50 URLs maliciosas** verificadas de PhishTank
      - [ ] **50 URLs limpias** de Tranco List
      - [ ] Guardarlas en `RESULTADOS/muestra_deteccion.csv` con su fuente y
            fecha de extracción
      - [ ] La misma muestra de 50 limpias sirve para TFP (punto 3.4)

      **Lo que hay que saber antes de medir:** hoy **solo F1 puede devolver
      MALICIOSO**. F2.1 topa en SOSPECHOSO por su umbral (`score > 60` solo
      concluye SOSPECHOSO), incluso con score 95. Así que la TDM va a medir, en
      la práctica, **cuántas de las 50 URLs de PhishTank están en las listas de
      Google Safe Browsing** — que es una medición legítima y reportable, pero
      hay que enunciarla con esa precisión.

      **Si llega la fecha de entrega sin que se desbloquee**, la salida es
      reportarla como no medible por causa externa documentada, con las trazas
      del backend como evidencia. Es defendible porque la metodología ya lo
      anticipó. Lo que no es defendible es presentar un 0 % como si fuera
      desempeño del sistema.

- [ ] **3.4 — Falsos positivos (TFP)** (criterio ≤ 5 %). Misma muestra: las
      **50 URLs limpias de Tranco**. El anteproyecto define TFP como *"% de URLs
      legítimas que reciben veredicto MALICIOSO"* — **solo MALICIOSO**, no
      SOSPECHOSO. Conviene anotar las dos cifras por separado, porque un
      SOSPECHOSO sobre un sitio legítimo también es información útil aunque no
      cuente para esta métrica.

- [ ] **3.5 — Camino sin conexión** (bloque D del protocolo). **Este sí se
      puede hacer hoy**, con el backend caído: en modo avión la app debe dar
      "incierto" con el aviso de degradación, sin colgarse ni mentir. Es la
      demo que mejor se ve en una defensa, y hoy es gratis de verificar.

---

## Fase 4 · Usabilidad · 5 participantes

Tres métricas. No depende de Fabi, solo del APK y de agendar. **Es lo que tiene
el plazo de calendario más largo: agendar primero, hoy.**

- [ ] **4.1 — Reclutar 5 personas** que no conozcan la app. Anotar edad y
      familiaridad con tecnología, sin nombres.

- [ ] **4.2 — Guion por participante** (~15 min cada uno):

      1. Entregar el teléfono con la app cerrada, sin explicar nada.
      2. Tarea: "escaneá este QR y decime si entrarías al sitio".
      3. **T_learn**: cronometrar hasta que completa su primer escaneo sin
         ayuda (criterio ≤ 60 s).
      4. **Comprensión**: preguntar "¿qué te dijo la app?" y registrar si
         interpretó bien el veredicto (criterio ≥ 90 %).
      5. **Finalización**: registrar si completó el flujo sin intervención
         (criterio ≥ 85 %).
      6. Repetir con un QR sospechoso y uno malicioso.

- [ ] **4.3 — Tabla de registro:**

      | P | Edad | T_learn (s) | ¿Comprendió? | ¿Finalizó? | Observación |
      |---|------|-------------|--------------|------------|-------------|
      | 1 |      |             |              |            |             |
      | 2 |      |             |              |            |             |
      | 3 |      |             |              |            |             |
      | 4 |      |             |              |            |             |
      | 5 |      |             |              |            |             |

- [ ] **4.4 — Resultado:**

      Comprensión ........ ____ de 5 = ____ %   (criterio ≥ 90 %)
      Finalización ....... ____ de 5 = ____ %   (criterio ≥ 85 %)
      T_learn mediana .... ____ s               (criterio ≤ 60 s)

- [ ] **4.5 — Guardar las frases textuales.** Lo que dice una persona al ver
      "sospechoso" vale más en el capítulo que el porcentaje. Con 5
      participantes, un 80 % es 4 de 5: el número tiene poca resolución y hay
      que presentarlo como indicio, no como medición robusta. Las frases son
      el dato cualitativo que lo sostiene.

**Nota metodológica obligatoria:** 5 participantes es una muestra de
exploración, no de validación estadística. Decirlo en el capítulo antes de que
lo pregunte el jurado convierte una debilidad en honestidad metodológica.

---

## Fase 4.5 · Las divergencias con el anteproyecto

Esto **no es una fase de medición**: es material que el capítulo de Resultados
—o el de Limitaciones— tiene que cubrir. Salió de comparar
`Protocolo Majo V_final.md` con lo implementado.

Una divergencia declarada y justificada no resta; una que el comité descubre
antes que vos, sí.

| # | El anteproyecto dice | Lo implementado | Estado |
|---|---|---|---|
| 1 | F1 = Google Safe Browsing + PhishTank + VirusTotal | **Safe Browsing** (app) + **VirusTotal** (en F2.2, backend). PhishTank no | 🟡 justificar |
| 2 | `react-native-vision-camera` v4 + CodeScanner | `expo-camera` | 🟡 la prueba 1.4 decide |
| 3 | `react-native-mmkv`, "almacenamiento cifrado" | `expo-sqlite/kv-store`, **sin cifrar** | 🔴 justificar |
| 4 | Story Card con "QR blureado" | **Capa opaca** | 🟢 es una mejora |
| 5 | iOS y Android | **Solo Android** | 🟢 ya declarado |
| 6 | React Native 0.76+ | 0.86.2 | 🟢 lo supera |

### 1 · F1 y las tres APIs — **resuelto parcialmente el 2026-10-11**

Se implementó Google Safe Browsing en la app
([safeBrowsing.ts](../src/services/analysis/safeBrowsing.ts)), que cierra el
Objetivo Específico 4 en su parte principal.

**Lo que hay que argumentar:** las tres APIs del anteproyecto no son
equivalentes para un cliente móvil.
- **Safe Browsing** tiene `threatMatches:find`, pensado para consulta puntual
  desde un cliente, 10.000/día gratis. Es la única diseñada para este uso.
- **VirusTotal** ya se consulta en F2.2, del lado del backend. Duplicarla
  gastaría dos veces la cuota más estrecha de las tres (500/día, 4/min).
- **PhishTank** no ofrece consulta por URL para clientes móviles: su modelo es
  descargar el volcado completo, que en un teléfono no es viable ni se
  mantendría al día.

**La frase para el capítulo:** las tres fuentes del anteproyecto siguen
participando del sistema, en la capa donde cada una es técnicamente viable.

- [ ] **Conseguir la clave de Safe Browsing** (ver [.env.example](../.env.example))
      y ponerla en `.env.local`. **Sin ella F1 solo usa la lista local**, y la
      métrica TDM quedaría sin medir.
- [ ] Registrarla como secreto de EAS antes del build de pruebas:
      `npx eas secret:create --name EXPO_PUBLIC_SAFE_BROWSING_KEY --value "..."`
- [ ] **Recompilar el APK** después de eso: la clave se inyecta en tiempo de
      build, así que el APK actual (`f1990f37`) no la tiene.

### 3 · El almacenamiento sin cifrar — la que más conviene resolver en papel

El anteproyecto promete *"historial local offline con almacenamiento
cifrado"*. `expo-sqlite/kv-store` **no cifra**.

Dos salidas, y la segunda es la honesta:

- **Cifrar de verdad:** `expo-secure-store` existe, pero está pensado para
  secretos pequeños (tokens), no para 20 registros de análisis. Meterlo a estas
  alturas es riesgo alto por beneficio bajo.
- **Reconocerlo como limitación**, con el argumento de que **el historial no
  contiene datos sensibles**: son URLs que la persona escaneó y veredictos
  públicos. No hay credenciales, ni datos personales, ni coordenadas —el lugar
  se guarda como nombre legible, no como par de coordenadas—. El cifrado
  protegería contra un atacante con acceso físico al teléfono desbloqueado, que
  no está en el modelo de amenaza del trabajo (el quishing).

- [ ] Decidir cuál de las dos y escribirlo en §Limitaciones.

### 2 · La librería de escaneo

Ya estaba previsto: la prueba 1.4 es el punto de decisión. Si `expo-camera`
cumple TDR ≥ 95 % y T_scan p90 ≤ 5 s, se documenta el cambio como decisión
técnica justificada por los resultados. Si no cumple, hay que migrar.

El argumento a favor de `expo-camera`, si cumple: el proyecto usa Expo SDK 57
con prebuild, y `expo-camera` es el módulo de cámara mantenido por ese
ecosistema. Introducir `vision-camera` habría añadido una dependencia nativa
fuera del ciclo de versiones de Expo, con el riesgo de incompatibilidad que ya
se vio con `react-native-worklets` (ver README §2).

- [ ] Correr la prueba 1.4 y escribir la conclusión en cualquiera de los dos
      sentidos.

---

## Fase 5 · Escribir `resultados.tex`

- [ ] **5.1 — Crear el archivo** en la carpeta de la plantilla, junto a
      `capitulos.tex`.

- [ ] **5.2 — Declararlo en `main.tex`.** Va **entre** metodología y
      conclusiones, replicando el patrón de los `\input` que ya están
      (alrededor de la línea 338, después de `\input{capitulos}`):

      \input{resultados}

- [ ] **5.3 — Estructura propuesta:**

      \chapter{Resultados}
      \section{Verificación de la lógica de negocio}      → fase 0
      \section{Mediciones en dispositivo}                  → fase 2
        \subsection{Prueba 1.4: tiempo de escaneo y detección}
        \subsection{Verificación funcional en hardware}
      \section{Desempeño del análisis remoto}              → fase 3
        \subsection{Latencia y política de degradación}
        \subsection{Métricas condicionadas al backend}
      \section{Resultados de usabilidad}                   → fase 4
      \section{Cumplimiento de métricas}                   → tabla resumen
      \section{Limitaciones de los resultados}

- [ ] **5.4 — La tabla resumen es el centro del capítulo.** Replica
      `tab:metricas` de la metodología, con una columna más: el valor obtenido.
      Mismo orden, mismas 17 filas, para que se lean en paralelo.

      | Métrica | Criterio | Obtenido | ¿Cumple? |

      Para las que queden sin medir, poner **"No medible — ver §X"** y no un
      guion suelto: un guion parece un olvido, la nota es una decisión.

- [ ] **5.5 — Escribir §Limitaciones** con lo que ya se sabe:
      - Backend caído durante parte del período de medición, con fechas y
        códigos HTTP.
      - T_F1 no cumple el criterio de 5 s por el costo de la captura F2.3.
      - F2.3 intermitente: apareció el 30/09, ausente en 6 de 6 llamadas
        el 01/10.
      - Detección de maliciosos condicionada al umbral del backend.
      - Usabilidad con muestra de exploración (n=5).
      - Un solo modelo de teléfono, si fue el caso.

- [ ] **5.6 — Compilar y revisar:**

      pdflatex main && bibtex main && pdflatex main && pdflatex main

      Verificar que el capítulo aparece en el índice, que las tablas no se
      desbordan y que las referencias cruzadas resuelven.

- [ ] **5.7 — Llenar `conclusiones.tex`**, que hoy está vacío (0 bytes). Las
      conclusiones se escriben **después** de los resultados y responden a los
      objetivos de `objetivos.tex`, una por una.

---

## Orden recomendado para hoy

Lo que destraba más, primero:

1. **`eas login` y `eas build`** — el APK tarda 20 min en la nube y bloquea dos
   fases enteras. Arrancarlo y seguir con otra cosa mientras compila.
2. **Agendar los 5 participantes** — es calendario, no trabajo; cuanto antes se
   pide, antes se tiene.
3. **Fase 0 completa** — son 4 métricas en media hora, sin depender de nadie.
4. **Escribir a Fabi** con la caída del backend documentada: tres llamadas, los
   504, los tiempos, y que una URL en caché dejó de responder. Un reporte con
   mediciones se atiende; "no anda" se posterga.
5. **Imprimir los 30 QRs** mientras el APK compila.

Con eso, al final del día hay 4 métricas cerradas, el APK listo, la usabilidad
agendada y el backend reportado. Las fases 2 y 4 se corren en cuanto haya
teléfono con la app; la 3, cuando Fabi responda.

---

## Para no perder de vista

- **La app no es el cuello de botella.** 249 tests verdes, typecheck limpio,
  cobertura del 100 % en líneas y funciones. Lo que falta es evidencia, no
  código. No hay que ponerse a programar para avanzar en esto.
- **Un resultado que no cumple el criterio sigue siendo un resultado.** T_F1 no
  va a dar ≤ 5 s, y eso no es un fracaso del trabajo: es un hallazgo sobre el
  costo de F2.3, con una explicación técnica concreta. Los capítulos de
  resultados que solo contienen éxitos no se creen.
- **Las ausencias se declaran, no se rellenan.** Es lo que ya hace tu README y
  es la razón por la que este plan se puede ejecutar: el estado real está
  documentado, no maquillado.
