# Fase 1 — Compilación del APK

**Fecha de verificación:** 11 de octubre de 2026, 17:33
**Resultado:** el APK **existe y corresponde al código actual**. No hubo que
compilar nada.

Esta fase no produce métricas del anteproyecto. Produce el artefacto que
habilita las fases 2 y 4, que juntas aportan 7 de las 17 métricas.

---

## Hallazgo: el APK ya estaba construido

El plan asumía que había que compilar, porque el README afirmaba que el APK
nunca se había logrado: *"El build local de Gradle se cuelga en esta máquina
(dos intentos el 2026-09-20, ninguno produjo artefacto)."*

Esa afirmación es correcta **sobre el build local de Gradle**, pero quedó
desactualizada respecto de EAS. Al consultar el servicio aparecieron **ocho
builds terminados**, el más reciente de hoy.

**Conclusión:** el pendiente nº 4 del README («Generar el APK») está resuelto.
La vía fue EAS Build, tal como el propio README recomendaba.

---

## 1.1 · Sesión de EAS

**Estado:** ✅ ya autenticada, no hizo falta `eas login`.

| Campo | Valor |
|---|---|
| Cuenta | `majo30840931@gmail.com` |
| Organización | `majov4015` (rol: Owner) |
| Organización secundaria | `majov4015s-team` (rol: Owner) |
| eas-cli | 24.7.0 |

Evidencia: [`fase1/1.1_sesion_eas.txt`](fase1/1.1_sesion_eas.txt)

---

## 1.2 · El APK

**Estado:** ✅ compilado y disponible.

### Build vigente

| Campo | Valor |
|---|---|
| ID | `f1990f37-2cfa-43e6-98b1-8eb938281bde` |
| Plataforma | Android |
| Estado | **finished** |
| Perfil | `preview` |
| Distribución | internal |
| SDK | 57.0.0 |
| Versión | 1.0.0 (version code 1) |
| **Commit** | **`dedce06`** |
| Fingerprint | `23b6b19c58de00a8ff83a92cc9752980f9a9982f` |
| Iniciado | 11/10/2026, 16:57:28 |
| Terminado | 11/10/2026, 17:10:53 |
| **Duración** | **13 min 25 s** |

**Enlace del APK:**
`https://expo.dev/artifacts/eas/lZ0qCOCTD9quB3JAOHzkRjNcodG1VYEP_0FYd3RC-Ig.apk`

**Registro del build:**
`https://expo.dev/accounts/majov4015/projects/qrisk/builds/f1990f37-2cfa-43e6-98b1-8eb938281bde`

### Correspondencia con el código

Verificación hecha hoy:

    git rev-parse HEAD
    → dedce0664842c4d95d201b27f1de4f76ca983975

    Commit del build f1990f37
    → dedce0664842c4d95d201b27f1de4f76ca983975

**Coinciden.** Además, `git status --porcelain` no reporta cambios sin
confirmar. El APK corresponde **exactamente** al código medido en la fase 0 y
al publicado en el repositorio.

Esto importa para el capítulo: permite afirmar que las mediciones de hardware
se hicieron sobre la misma versión del código que la verificación automatizada,
sin un *"se probó una versión parecida"* de por medio.

### Historial de compilaciones

Ocho builds del perfil `preview`, todos para Android:

| Estado | Cantidad |
|---|---|
| finished | 7 |
| canceled | 1 |

Que siete de ocho terminen bien, incluido el del código actual, es evidencia de
que **el proyecto compila de forma reproducible** en un entorno limpio. El
fallo del build local de Gradle quedó así circunscrito a esta máquina y no al
proyecto, que es lo que el README sostenía sin poder demostrarlo.

Evidencia: [`fase1/1.2_build_apk.txt`](fase1/1.2_build_apk.txt) ·
[`fase1/1.2_historial_builds.txt`](fase1/1.2_historial_builds.txt) ·
[`fase1/1.2_eas_config.json`](fase1/1.2_eas_config.json)

---

## 1.3 · Instalación

**Estado:** ⏳ pendiente, requiere el teléfono físico.

El APK se descarga del enlace de arriba. Antes de instalarlo:

- [ ] **Desinstalar cualquier QRisk anterior.** No es opcional: Android
      conserva permisos y almacenamiento del paquete, y el onboarding no
      volvería a aparecer. El bloque A del protocolo mide precisamente que el
      onboarding corre una sola vez, de modo que una instalación sucia
      invalidaría esa medición.

- [ ] **Instalar el APK** descargado.

- [ ] **Verificar la versión instalada** para dejar constancia:

      adb shell dumpsys package com.qrisk.app | grep versionName

### Advertencia sobre residuos

En el emulador detectado hoy conviven **dos paquetes**:

    com.qrisk.app            ← el identificador actual
    com.anonymous.qriskapp   ← residuo de una versión anterior

Si el teléfono de pruebas tiene el mismo residuo, hay que desinstalar **los
dos**. El paquete viejo no interfiere técnicamente, pero confunde al verificar
qué versión se está probando.

---

## 1.4 · Entorno de prueba

**Estado:** ✅ capturado el 11 de octubre de 2026, 19:15.

### Dispositivo de prueba

Samsung Galaxy A11, conectado por USB y leído con `adb`:

| Propiedad | Valor |
|---|---|
| Modelo comercial | **SM-A115M** (Galaxy A11) |
| Fabricante | samsung |
| Serial | `R9JR504E9VK` |
| **Android** | **11** (API 30) |
| Parche de seguridad | 2022-03-01 |
| Build | `RP1A.200720.012.A115MUBU2BVB2` |
| SoC | Qualcomm `msm8953` (Snapdragon 450), 8 núcleos |
| ABI | `armeabi-v7a` |
| **RAM** | **1.8 GB** (1 853 856 kB) |
| Almacenamiento | 16 GB libres de 23 GB |
| Pantalla | 720 × 1560 @ 280 dpi |
| Hardware real | sí (`ro.kernel.qemu = 0`) |

### Hardware relevante para las pruebas

| Capacidad | Estado | Para qué importa |
|---|---|---|
| Cámara | ✅ con **autofocus** | Prueba 1.4. El autofocus condiciona los QRs pequeños a distancia |
| Flash / linterna | ✅ | Los 3 QRs en oscuridad de la prueba 1.4 (`enableTorch`) |
| GPS | ✅ (gps + network) | Geocodificación, bloque B |

### Estado previo a la instalación

**El teléfono está limpio: no hay ningún paquete de QRisk instalado.**

Se verificó con `adb shell pm list packages | grep qrisk`, sin resultados. Esto
importa porque el bloque A del protocolo mide que el onboarding corra una sola
vez, y una instalación previa habría conservado permisos y almacenamiento,
invalidando esa medición. **No hay que desinstalar nada.**

### Clasificación de gama — precisión necesaria

El Galaxy A11 es un teléfono **de gama baja o de entrada**, lanzado en 2020:
Snapdragon 450, 1.8 GB de RAM y pantalla HD+. **No es gama media.**

Esto tiene una consecuencia directa sobre una métrica y conviene anticiparla:

**T_start ≤ 3 s está definido sobre gama media.** Medido en este dispositivo,
el resultado será **más desfavorable** que sobre el hardware para el que se
definió el criterio. Hay dos lecturas posibles y las dos son defendibles si se
enuncian bien:

- **Si cumple los 3 s en un Galaxy A11**, el resultado es más fuerte que el
  criterio: cumplir en gama baja implica cumplir en gama media. Es un argumento
  a favor, no una concesión.
- **Si no cumple**, no se puede concluir que la aplicación incumple el criterio,
  porque se midió sobre hardware inferior al especificado. Se reporta el valor,
  se declara la gama y se señala que la medición sobre gama media queda
  pendiente.

Lo que **no** es admisible es presentar el número sin declarar la gama. La
ficha de arriba va al capítulo por esa razón.

**Para el resto de las métricas, el dispositivo es adecuado y hasta
conveniente:** T_scan, TDR, geocodificación y Story Card no están definidas
sobre una gama concreta, y medirlas en hardware modesto produce un resultado
más conservador —y por tanto más creíble— que medirlas en un teléfono de gama
alta.

Evidencia: [`fase1/1.4_ficha_telefono.txt`](fase1/1.4_ficha_telefono.txt)

---

### Nota: el emulador detectado antes

`adb devices` encontró un dispositivo, pero **es un emulador**:

| Propiedad | Valor |
|---|---|
| Modelo | `sdk_gphone64_x86_64` |
| Android | 13 (API 33) |
| RAM | 2.0 GB |
| `ro.kernel.qemu` | 1 → **emulador** |

**Para qué sirve y para qué no.** El emulador permite verificar navegación,
historial, formularios, safe area y el camino sin conexión. **No** sirve para
las mediciones centrales de la fase 2:

- **T_scan y TDR (prueba 1.4):** el emulador no tiene cámara real. Una medición
  de tiempo de escaneo sobre una cámara simulada no es un dato sobre el
  desempeño de la aplicación.
- **T_start (≤ 3 s):** el criterio está definido sobre un dispositivo de gama
  media. Un emulador con 2 GB sobre hardware de escritorio no representa
  ninguna gama de teléfono.
- **Geocodificación:** necesita GPS real al aire libre.
- **Story Card:** los diálogos de cámara, galería y compartir son del sistema
  operativo del teléfono.

**Conclusión:** el emulador no sustituye al teléfono para ninguna de las cuatro
métricas de la fase 2. Quedó registrado solo para constancia de lo que había
antes de conectar el dispositivo real, que es el que se usa de aquí en
adelante.

Evidencia: [`fase1/1.4_dispositivos_detectados.txt`](fase1/1.4_dispositivos_detectados.txt)

---

## Resumen de la fase

| Paso | Estado | Nota |
|---|---|---|
| 1.1 — Cuenta de Expo | ✅ | Ya autenticada como `majov4015` |
| 1.2 — Compilar | ✅ | Build `f1990f37` del commit `dedce06`, 13 min 25 s |
| 1.3 — Instalar | 🟡 | APK descargándose en el teléfono. Nada que desinstalar: está limpio |
| 1.4 — Entorno de prueba | ✅ | Galaxy A11 (SM-A115M), Android 11, 1.8 GB |

**Lo que esta fase desbloqueó:** el artefacto instalable existe y corresponde
al código actual, y hay un dispositivo real conectado con cámara con autofocus,
flash y GPS. Las fases 2 y 4 ya no están bloqueadas por infraestructura: solo
falta instalar el APK, imprimir los 30 QRs y convocar a los participantes.

### Verificación del enlace de descarga

El enlace de artefactos se comprobó el 11 de octubre:

    HTTP/1.1 200 OK
    Content-Type: application/octet-stream
    Content-Length: 136960358        (≈ 137 MB)

Nota operativa: el enlace de Expo redirige a una URL firmada de S3 que **caduca
en 15 minutos** (`X-Amz-Expires=900`). Hay que usar siempre el enlace corto de
`expo.dev/artifacts/eas/…`, que genera una firma nueva en cada descarga; copiar
la URL larga de S3 produce un enlace que deja de funcionar.

---

## Inventario de evidencia

Todo en [`fase1/`](fase1/):

| Archivo | Contenido |
|---|---|
| `1.1_sesion_eas.txt` | Cuenta y organizaciones de EAS |
| `1.2_build_apk.txt` | Ficha completa del build vigente |
| `1.2_historial_builds.txt` | Los ocho builds, con estado y commit |
| `1.2_eas_config.json` | Copia de `eas.json` usado |
| `1.4_ficha_telefono.txt` | **Ficha completa del Galaxy A11** |
| `1.4_dispositivos_detectados.txt` | Emulador detectado antes de conectar el teléfono |

---

## Corrección al README

El pendiente nº 4 de §8 («Generar el APK») y la fila *"Build nativo
(`gradlew assembleDebug`) — ❌ No se logró"* del cuadro de verificaciones
describen un estado superado. Conviene actualizarlos para que el README no
subestime lo que hay:

- El build **local con Gradle** sigue sin funcionar en esta máquina. Eso es
  cierto y vale documentarlo.
- El build **en EAS funciona** y produjo ocho artefactos, el último del commit
  actual. Eso falta decirlo.

La distinción importa: *"no se pudo compilar"* y *"no se pudo compilar
localmente, pero sí en la nube"* son afirmaciones muy distintas ante un jurado.
