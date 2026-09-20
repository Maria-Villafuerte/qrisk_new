# QRisk

App móvil que escanea códigos QR y advierte si el enlace es peligroso **sin
abrirlo nunca en el teléfono**.

Trabajo de graduación · María José Villafuerte (22129) · Frontend

---

## 1. Qué es QRisk

Un QR impreso no se puede leer a simple vista. Pegar un código falso encima del
de un parqueo, un menú o un recibo es un ataque barato y muy efectivo: la
persona apunta la cámara y ya está en el sitio del atacante.

QRisk se pone en medio. Lee el código, muestra **a dónde apunta de verdad**, lo
analiza en un entorno aislado y devuelve un veredicto en lenguaje llano:

| Veredicto | Significado |
|---|---|
| **Seguro** | Sin señales de riesgo. |
| **Sospechoso** | Señales de riesgo; ábrelo solo si confías en quien puso el código. |
| **Malicioso** | Peligroso. No abrirlo ni ingresar datos. |
| **Incierto** | No se pudo completar el análisis. Tratarlo con precaución. |

### Regla de seguridad fundamental

> **La app NUNCA abre la URL analizada.** Solo la muestra como texto.
> Toda visita al sitio ocurre en el entorno aislado del backend.

Esta regla manda sobre cualquier otra decisión de producto. De ella se derivan
tres más, que explican cosas que de otro modo parecen arbitrarias:

- **Un "incierto" honesto es mejor que un "seguro" calculado con información
  incompleta.** Un falso "seguro" es el peor resultado posible del producto.
- **Nada de lo que el usuario aporta sale del teléfono.** La foto de contexto de
  la Story Card, su ubicación y su historial se quedan en el dispositivo.
- **El QR de la Story Card se cubre con una capa opaca, no se difumina.** Un QR
  medio borroso sigue siendo escaneable, y eso es justo lo que hay que evitar.

---

## 2. Requisitos y setup

### Versiones verificadas

| Herramienta | Versión | Nota |
|---|---|---|
| Node | 20.20.2 | 20 o superior |
| npm | 10.8.2 | |
| Expo SDK | 57.0.12 | `react-native` 0.86.2, React 19.2.3 |
| JDK | 17 (Temurin 17.0.17) | Para Android. El 17 es el que pide Gradle 9 |
| Gradle | 9.3.1 | Lo trae el wrapper; no hay que instalarlo |
| Android mínimo | API 24 (Android 7.0) | Lo fija Expo SDK 57; lo define `rootProject.ext.minSdkVersion` |
| Xcode | Última estable | Solo para iOS, **solo en macOS** |

### Instalación

```bash
git clone <repo>
cd qrisk-app
npm install
```

> **`overrides` en `package.json` — no los quites.** Expo SDK 57 tiene una
> incompatibilidad interna: `expo-router` arrastra
> `react-native-worklets@0.12.x` (vía `@expo/ui` y `reanimated@4.6`), pero
> `expo-modules-core@57.0.10` solo soporta hasta `0.10.x`. En la 0.12
> desapareció el método C++ `executeSync()`, y el build nativo de Android falla
> con `no member named 'executeSync' in 'worklets::WorkletRuntime'`. El proyecto
> fija `worklets@0.10.4` + `reanimated@4.5.0`, que es el par coherente para
> ambos lados. **`npm test` y `tsc` pasan igual sin el pin**: el fallo solo
> aparece al compilar para un dispositivo.
>
> **Si cambiás la versión de una librería nativa**, limpiá las cachés de C++ o
> el build falla con `libX.so ... missing and no known rule to make it` (los
> módulos quedan apuntando a rutas de la compilación anterior):
>
> ```bash
> rm -rf node_modules/react-native-*/android/.cxx node_modules/react-native-*/android/build
> rm -rf node_modules/expo-modules-core/android/.cxx node_modules/expo-modules-core/android/build
> rm -rf android/app/build android/build android/.gradle
> ```

> **En Windows: `Access is denied` o `Unable to delete directory` al compilar.**
> Gradle lo dice claro — *"a process has files open"*. Procesos de Metro o de
> builds anteriores quedan reteniendo archivos en `node_modules`, y el error va
> saltando de módulo en módulo a medida que limpiás carpetas. **El orden importa:**
>
> ```bash
> cd android && ./gradlew.bat --stop     # cerrar daemons ORDENADAMENTE
> cd .. && rm -rf android/app/build android/build android/.gradle
> find node_modules -maxdepth 4 -type d -name build -path "*/android/*" -exec rm -rf {} +
> ```
>
> **No uses `taskkill /F /IM java.exe`.** Mata también el daemon que Gradle va a
> usar y el build siguiente falla con *"Gradle build daemon disappeared
> unexpectedly"*. Si tras dos intentos el error persiste, **reiniciá la
> computadora**: Windows libera los handles de archivo solo así, y sale más
> barato que perseguir el mismo error carpeta por carpeta.

> **Si `npm install` falla con `ERESOLVE`:** el proyecto fija `react@19.2.3` y
> `react-dom@19.2.3`, que son las versiones que Expo SDK 57 especifica. Si el
> lockfile se desincroniza, borrá la entrada de `react-dom` de
> `package-lock.json` y repetí `npm install`. **No usés `--force` ni
> `--legacy-peer-deps`**: esconden el problema en vez de resolverlo.

### Configuración

Todo vive en `app.json` → `expo.extra`:

```json
{
  "analysisMode": "mock",
  "apiBaseUrl": "https://z0k9lhdru4.execute-api.us-east-1.amazonaws.com/dev"
}
```

Se puede pisar sin tocar el archivo, con variables de entorno que Expo inyecta
en el bundle:

```bash
EXPO_PUBLIC_ANALYSIS_MODE=remote   # mock | remote
EXPO_PUBLIC_API_URL=https://...    # URL base, sin barra final
```

Los dos se leen en [config.ts](src/services/api/config.ts), que es el único
lugar donde se decide mock ↔ real.

---

## 3. Correr en desarrollo

### Android

```bash
npx expo run:android
```

**Expo Go no sirve.** La app tiene código nativo que Expo Go no incluye
(`expo-camera`, `expo-sqlite`, `expo-location`, `expo-image-picker`,
`expo-media-library`, `react-native-view-shot`). Hay que compilar el dev build.

La carpeta `android/` está en `.gitignore` porque es **generada**. Si no existe
después de clonar:

```bash
npx expo prebuild -p android
```

Tras cambiar permisos o identificadores en `app.json`, hay que regenerarla
(`--clean`) y conviene **desinstalar la app** del teléfono, para que Android no
conserve los permisos viejos.

### iOS — fuera del alcance

**Esta entrega es solo Android** (ver §4). La configuración de iOS se conserva
intacta por si alguien retoma la plataforma, pero no se compila ni se prueba.
Si se retoma, los pasos están en
[ios_en_la_mac.md](TAREAS_POR_HACER/ios_en_la_mac.md) y hace falta una Mac: el
prebuild genera un proyecto de Xcode y corre CocoaPods, que no existen en
Windows.

### Apuntar al backend real vs. al mock

Por defecto la app corre **en modo mock**, porque el endpoint real todavía no
funciona (ver §5). Para apuntar al real:

```bash
EXPO_PUBLIC_ANALYSIS_MODE=remote npx expo run:android
```

El mock **no es un parche temporal**: es el modo de desarrollo. Permite recorrer
los cuatro veredictos sin red y es lo que usan las pruebas.

---

## 4. Build y deploy

### Android

**Opción A — EAS Build (en la nube, recomendado).** No necesita Android Studio.

`eas.json` **ya está en el repo** con tres perfiles, así que **no hace falta
correr `eas build:configure`**:

| Perfil | Sale | `analysisMode` | Para qué |
|---|---|---|---|
| `development` | APK con dev client | el de `app.json` | Desarrollo con Metro |
| `preview` | **APK** | forzado a `mock` | **Instalar y demostrar.** Funciona aunque el backend siga caído |
| `production` | **AAB** | forzado a `remote` | Play Store. El mock no puede llegar a producción |

```bash
npm install -g eas-cli
eas login                                   # cuenta gratuita de Expo
eas build -p android --profile preview      # APK, para instalar y probar
eas build -p android --profile production   # AAB, para Play Store
```

**Qué credenciales hacen falta:**

1. Una **cuenta de Expo** (gratuita) para `eas login`. Es lo único
   imprescindible para sacar el APK de `preview`.
2. El **keystore de firma**: EAS lo genera y lo guarda solo, la primera vez. No
   hay que crearlo a mano.
3. Para publicar en Play Store, además: cuenta de **Google Play Developer**
   (US$25, pago único).

> **Hacé `eas credentials` y descargá un respaldo del keystore.** Si se pierde,
> no se puede volver a actualizar la app publicada: hay que publicar una nueva,
> perdiendo instalaciones y reseñas.

**Opción B — build local.** Requiere Android Studio y el SDK.

```bash
cd android && ./gradlew assembleRelease   # APK en app/build/outputs/apk/release/
cd android && ./gradlew bundleRelease     # AAB en app/build/outputs/bundle/release/
```

El build local usa la firma de debug salvo que configures un keystore en
`android/app/build.gradle`. Para publicar, usá EAS o configurá la firma.

> **⚠️ El build local se cuelga en esta máquina.** Verificado el 2026-09-20 con
> **dos intentos**, ninguno llegó a producir un APK:
>
> | Intento | Hasta dónde llegó | Síntoma |
> |---|---|---|
> | 1º (~35 min) | Arranque | Bloqueado en un lock. CPU **~1 s cada 30 s**, cero archivos escritos |
> | 2º (~25 min) | `mergeDebugAssets` y algo de C++ | CPU **~4 s cada 55 s** pero **cero archivos en 12 min** |
>
> El segundo llegó más lejos tras `./gradlew.bat --stop` (que libera el lock),
> pero se volvió a detener. Hay además un volcado fatal previo de la JVM en
> `android/hs_err_pid4048.log` (2026-09-10): el problema es anterior a estos
> cambios y es del entorno, no del código — **el bundle JS compila limpio**
> (`npx expo export --platform android`, exit 0).
>
> **Cómo distinguir "colgado" de "lento":** mirar los **archivos escritos**, no
> la CPU. Un Gradle atascado puede seguir quemando CPU sin producir nada.
>
> ```bash
> find android/app/build android/app/.cxx -newermt '-10 minutes' -type f | wc -l
> # 0 durante 10+ min = colgado, aunque haya java.exe consumiendo CPU
> ```
>
> **Cómo salir** (el orden importa, está en §2):
>
> ```bash
> cd android && ./gradlew.bat --stop    # NUNCA taskkill /F /IM java.exe
> ```
>
> **Qué hacer en su lugar:** usar **EAS Build** (opción A). Compila en la nube,
> evita el problema por completo y es el camino recomendado para la entrega.
> Antes de pelearse con Gradle otra vez, vale la pena probar lo barato: borrar
> las cachés como indica §2 y reiniciar la computadora (Windows solo libera los
> handles de archivo así).

### iOS — fuera del alcance

**Esta entrega es solo Android.** No hay build de iOS y no se planea uno.

La configuración que no requiere macOS **se conserva intacta** por si alguien
retoma la plataforma: `bundleIdentifier`, `buildNumber`, los cuatro textos de
permiso de `Info.plist`, la safe area y el teclado. No se borró nada.

Retomarlo pediría una **Mac** para el prebuild y una cuenta **Apple Developer**
(US$99/año). Los pasos están en
[ios_en_la_mac.md](TAREAS_POR_HACER/ios_en_la_mac.md).

### Dónde se configura cada cosa

Todo en **`app.json`** — es la fuente de verdad. `android/` e `ios/` son
generadas y cualquier edición manual ahí se pierde en el próximo prebuild.

| Qué | Dónde |
|---|---|
| Versión visible | `expo.version` (`1.0.0`) |
| Build Android | `expo.android.versionCode` (entero, sube en cada envío) |
| Build iOS | `expo.ios.buildNumber` (cadena, sube en cada envío) |
| ID de la app | `expo.android.package` y `expo.ios.bundleIdentifier` (`com.qrisk.app`) |
| Nombre visible | `expo.name` (`QRisk`) |
| Ícono y splash | `expo.icon`, `expo.android.adaptiveIcon` |
| Permisos | en cada plugin de `expo.plugins`, + `expo.ios.infoPlist` |

> El identificador `com.qrisk.app` **se congela al publicar**. Cambiarlo después
> obliga a crear una app nueva en la tienda, perdiendo instalaciones y reseñas.

### Checklist antes de publicar

- [ ] `npx tsc --noEmit` limpio.
- [ ] `npm test` en verde y cobertura ≥ 70%.
- [ ] `versionCode` incrementado (`app.json` → `expo.android.versionCode`).
- [ ] `analysisMode` en `remote` (el mock no puede llegar a producción). El
      perfil `production` de `eas.json` ya lo fuerza.
- [ ] Respaldo del keystore guardado en un lugar seguro (`eas credentials`).
- [ ] Probado en **dispositivo Android físico** (iOS está fuera de alcance).
- [ ] Los permisos piden lo mínimo (`SYSTEM_ALERT_WINDOW` y `RECORD_AUDIO`
      siguen bloqueados en `app.json`).
- [ ] Prueba 1.4 corrida y métricas anotadas (§6).
- [ ] [prueba_telefono_fisico.md](TAREAS_POR_HACER/prueba_telefono_fisico.md)
      corrida: arranque en frío, geocodificación, Story Card, sin conexión.
- [ ] Probado con wifi apagado: debe dar "incierto", no fallar.
- [ ] **El QR de la Story Card no se puede escanear** desde otro teléfono
      (§C4 de la prueba). Es el chequeo de seguridad que no se puede saltar.

---

## 5. Estado de funcionalidades

✅ funciona · 🟡 parcial · ❌ pendiente · ⛔ fuera de alcance

| Funcionalidad | Estado | Qué falta / qué se necesita para probarlo |
|---|---|---|
| Escaneo de QR | ✅ | Cámara real con `expo-camera`, antorcha y bloqueo tras la primera lectura. **Falta medir** T_scan y TDR en hardware (§6). |
| Clasificación URL / no-URL | ✅ | `classifyQr` con 18 tests. Cubre https, dominios sin esquema, Wi-Fi, vCard, mailto, tel, geo y texto suelto. |
| Análisis F1 (reputación) | 🟡 | El cliente, el adaptador y la degradación están hechos y testeados. **El endpoint real responde HTTP 500 a toda URL válida.** El servidor tarda ~16 s en fallar, pero la app **corta a los 5 s** (`timeouts.analyze`) y degrada a "incierto": el usuario nunca espera esos 16 s. Para probarlo de verdad: que el backend devuelva 200. |
| Filtro F2.1 (heurística) | ❌ | No existe en el backend (su propio mensaje dice "F2.1 aún no implementado"). **Apagado en el frontend a propósito**: anunciarlo pintaba un acordeón "SIN COMPLETAR" que nunca se completa y una etapa de carga que mentía. Para reactivarlo: descomentar `'heuristics'` en `ENABLED_FILTERS` ([enabledFilters.ts](src/services/analysis/enabledFilters.ts)) **y** su etapa en `analysisStages` ([analysisService.ts](src/services/analysis/analysisService.ts)). El copy, el icono y los datos de ejemplo siguen escritos. |
| Filtro F2.2 (comportamiento) | ❌ | Igual que F2.1, y se reactiva igual: descomentar `'behavior'` en `ENABLED_FILTERS` y su etapa en `analysisStages`. |
| Filtro F2.3 (vista previa) | ❌ | **Quitado de la app a propósito.** Anunciaba una captura que no existe (la etapa "Generando vista previa segura…" y un acordeón "DISPONIBLE" siempre vacío). Para reactivarlo: agregar `'preview'` a `AnalysisStageKey`, la etapa en `analysisStages` y la entrada en `sectionIcons`; luego renderizar la imagen honrando `expiresAt`. Requiere el endpoint y la URL firmada de S3. |
| Resultado simple | ✅ | Emblema, veredicto, dominio, resumen. **No hay botón para abrir el sitio**, por decisión de producto (§5.1): la pantalla explica por qué. |
| Resultado extendido | ✅ | Medidor de riesgo y la sección del filtro activo en acordeón. Solo se pintan los filtros de `ENABLED_FILTERS`, así que hoy es una sola y llega abierta. |
| Historial persistente | ✅ | `expo-sqlite/kv-store`, tope 20, el más viejo se descarta. Guarda el análisis completo, así que una fila reabre **su** veredicto sin red. Probar: escanear, cerrar la app por completo, reabrir. |
| Reporte de QR malicioso | 🟡 | Valida, arma el payload anónimo y **no pierde lo escrito si falla la red**. **El endpoint `/reports` no existe**: hoy falla y ofrece reintentar. |
| Story Card | ✅ | Foto real (cámara o galería), captura con `captureRef`, compartir y guardar en la galería. **Probar en teléfono físico**: los diálogos del sistema no se pueden verificar de otro modo. |
| Geocodificación inversa | ✅ | `expo-location` **en el dispositivo**, nunca en el servidor. Si falla, devuelve `null` y la UI oculta la fila. **Probar en teléfono** con GPS. |
| iOS | ⛔ | **Fuera del alcance de esta entrega**, que es solo Android. La configuración se conserva por si alguien lo retoma: `bundleIdentifier`, `buildNumber`, los cuatro textos de permiso de `Info.plist`, la safe area y el teclado. No se borró nada. |
| Abrir el sitio analizado | ✅ | **Decidido: la app no abre enlaces, y lo dice.** Antes había un botón que mostraba "Abriendo… en tu navegador" y no abría nada: prometía y mentía sobre la regla fundamental. Ahora el resultado explica por qué no se abre y sugiere escribir la dirección a mano. Ver §5.1. |

---

### 5.1 Decisión: qué hace "Abrir el sitio"

Estaba pendiente desde el prototipo y se cerró en esta entrega.

**Qué había:** un botón que mostraba un toast *"Abriendo `dominio` en tu
navegador…"* y no abría nada.

**Qué hay ahora:** no hay botón. El resultado explica que QRisk no abre enlaces
y sugiere escribir la dirección a mano si la persona insiste. El copy cambia
según el veredicto: en uno seguro explica la regla, en uno riesgoso además
recomienda no hacerlo.

**Por qué.** Las tres opciones se evaluaron así:

| Opción | Coste | Riesgo en la defensa |
|---|---|---|
| Navegador externo con advertencia | ~2 h | **Alto.** Contradice de frente la regla que el README declara por encima de cualquier otra decisión de producto. Invita a la pregunta *"¿entonces para qué sirve la app?"*. |
| Copiar al portapapeles | ~1 h | **Medio.** No viola la regla, pero deja al usuario a un pegado de distancia del sitio malicioso. |
| **Deshabilitado y explicado** ← elegida | ~1 h | **Bajo.** Es coherente con la regla fundamental y se defiende en una frase: *no lo abrimos, ese es el punto*. |

El toast era la peor de las cuatro posibilidades, porque a la contradicción le
sumaba el engaño: decía que abría y no abría.

Si alguna vez se decide lo contrario, el lugar es
[result.tsx](app/analysis/result.tsx) — y hay que cambiar antes la regla
fundamental de §1, no al revés.

---

## 6. Cómo probar

### Tests unitarios

```bash
npm test               # 169 tests, 17 suites
npm run test:coverage  # reporte de cobertura
npm run test:watch     # durante el desarrollo
```

La cobertura se mide **solo sobre `src/services`** (la lógica de negocio que
pide la métrica), con umbral de 70% que **corta el build** si no se cumple.
Las pantallas quedan fuera a propósito: se validan en dispositivo y en las
pruebas de usabilidad.

Estado actual: **169 tests en verde** (17 suites), 99.4% statements, **100% lines**,
96.9% branches. Muy por encima del umbral de 70% que corta el build.

### Pruebas en teléfono físico

Son dos documentos, pensados para correrse sin tener que pensar:

| Documento | Qué cubre | Cuánto toma |
|---|---|---|
| [prueba_1.4_escaneo.md](TAREAS_POR_HACER/prueba_1.4_escaneo.md) | T_scan y TDR: 30 QRs variando tamaño, ángulo e iluminación | ~45 min |
| [prueba_telefono_fisico.md](TAREAS_POR_HACER/prueba_telefono_fisico.md) | Arranque en frío, geocodificación, Story Card, camino sin conexión, teclado | ~40 min |

### Medición en hardware (T_scan y TDR)

La instrumentación **ya está en el código**. Cada lectura imprime en la consola
de Metro:

```
[T_scan] 842 ms · OK · muestra 1 · android
```

Y el resumen se saca desde el debugger:

```js
import { summarizeScanMetrics } from './src/services/qr/scanMetrics';
summarizeScanMetrics();
// { count, medianMs, p90Ms, maxMs, meetsTarget }
```

`meetsTarget` aplica el criterio de ≤ 5 s al p90. `resetScanSamples()` separa
tandas. Las muestras viven en memoria: se pierden al recargar.

> **Por qué p90 y no el promedio ni el máximo:** una sola lectura lenta no debe
> descalificar la app, pero tampoco se puede esconder en un promedio. Hay un
> test que documenta esto: con 9 lecturas de 500 ms y una de 20 s, el p90 sigue
> cumpliendo; hacen falta **dos** lentas para moverlo.

### Qué se verificó el 2026-09-20 y qué no

Para que nadie tenga que adivinar el estado real:

| Verificación | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpio |
| `npm test` | ✅ 171 tests, 17 suites, todo verde |
| Cobertura de `src/services` | ✅ 99.4% statements, **100% lines** (umbral 70%) |
| `npx expo export --platform android` | ✅ Exit 0, bundle de 3.2 MB. **El código JS de toda la app compila** para Android |
| Build nativo (`gradlew assembleDebug`) | ❌ **No se logró.** Dos intentos (~35 y ~25 min), los dos colgados sin producir APK. Es del entorno, no del código — ver la nota de §4. **Usar EAS Build** |
| App corriendo en un teléfono | ❌ **No verificado.** No hay dispositivo ni emulador conectado a esta máquina (`adb devices` vacío) |
| Cámara, GPS, galería, compartir | ❌ **No verificado.** Requieren hardware: ver [prueba_telefono_fisico.md](TAREAS_POR_HACER/prueba_telefono_fisico.md) |

Lo que **sí** garantiza el export de Expo: que no hay imports rotos, rutas mal
declaradas ni errores de sintaxis en ninguna pantalla. Lo que **no** garantiza:
nada de lo que solo se ve corriendo en un teléfono.

### Métricas del anteproyecto

| Métrica | Objetivo | Estado |
|---|---|---|
| Clasificación URL / no-URL | ≥ 98% | ✅ Cubierta por tests |
| Cobertura de pruebas unitarias | ≥ 70% | ✅ 100% statements |
| Persistencia offline del historial | 100% recuperable | ✅ Cubierta por tests |
| Reportes con payload completo | 100% | ✅ Cubierta por tests |
| T_scan (p90) | ≤ 5 s | ⏳ Instrumentado; **falta correr la prueba 1.4** |
| TDR (tasa de detección) | ≥ 95% | ⏳ Igual: teléfono físico + 30 QRs |
| T_F1 (p90) | ≤ 5 s | ⏳ Timeout implementado; **necesita backend funcionando** |
| T_total | ≤ 35 s | ⏳ Igual |
| Detección de maliciosos | ≥ 90% | ⏳ Necesita backend + muestra de PhishTank/Tranco |
| Falsos positivos | ≤ 5% | ⏳ Igual |
| Geocodificación legible | ≥ 85% | ⏳ Lógica cubierta; checklist listo en [prueba_telefono_fisico.md](TAREAS_POR_HACER/prueba_telefono_fisico.md) §B |
| Story Card generada | ≥ 90% | ⏳ Checklist listo en [prueba_telefono_fisico.md](TAREAS_POR_HACER/prueba_telefono_fisico.md) §C |
| Comprensión del veredicto | ≥ 90% | ⏳ Prueba de usabilidad (5 participantes) |
| Finalización del flujo | ≥ 85% | ⏳ Igual |
| T_learn | ≤ 60 s | ⏳ Igual |
| T_start | ≤ 3 s | ⏳ Medir en dispositivo de gama media |
| Compatibilidad Android ≥ 10 | sin errores críticos | ⏳ El bundle JS exporta limpio; **falta el APK y probarlo en teléfono** (§8.2). **iOS: fuera de alcance** (§4) |

### QRs de ejemplo

Generalos en cualquier generador online con estos contenidos:

```
https://menu.cafeaurora.com/es          -> debe ir a análisis
cafeaurora.com/menu                     -> análisis (le agrega https://)
WIFI:T:WPA2;S:MiRed;P:clave123;;        -> pantalla de contenido, no análisis
mailto:hola@ejemplo.com                 -> contenido, etiqueta CORREO
tel:+50255512346                        -> contenido, etiqueta TELÉFONO
geo:14.6349,-90.5069                    -> contenido, etiqueta UBICACIÓN
BEGIN:VCARD\nFN:Maria\nEND:VCARD        -> contenido, etiqueta CONTACTO
Mesa 12                                 -> contenido, NO debe ir a análisis
```

En modo mock, el veredicto sale de los cuatro casos de ejemplo de
[fixtures.ts](src/services/mock/fixtures.ts). Para ver un veredicto concreto,
generá un QR con la URL exacta de ese caso (por ejemplo
`https://pagos-multas-gt.info/pago` para *sospechoso*).

**La demo que mejor se ve:** apagá el wifi y escaneá en modo `remote`. La app
devuelve "incierto" con el aviso de degradación, en vez de colgarse o mentir.

---

## 7. Arquitectura

```
app/                     Pantallas (expo-router, una por archivo)
  onboarding/            Permisos de cámara y ubicación
  analysis/              loading · result · details
  qr/non-url.tsx         QR que no es enlace
  history.tsx  report.tsx  story-card.tsx  scanner.tsx

src/
  design-system/         ~20 componentes + tokens. Sin librerías de UI
  features/              Piezas compartidas de pantalla
  services/
    analysis/            Contrato + mock + adaptador + servicio real
    api/                 Cliente HTTP, config, traducción de errores
    qr/                  Clasificación y métrica T_scan (lógica pura)
    storage/             Historial, onboarding y ubicación en disco
    location/            Geocodificación en el dispositivo
    report/              Envío del reporte
    format/              Fechas relativas
  store/                 AppStateContext
```

### Cómo fluye el estado

Un solo contexto, [AppStateContext](src/store/AppStateContext.tsx):

1. `scanner` lee el QR → `classifyQr` decide si es enlace.
2. Si es enlace → `analysis/loading` llama a `analysisService.analyze()` y **en
   paralelo** resuelve el lugar (la ubicación no puede retrasar el veredicto).
3. Al resolver: guarda el resultado, **registra el escaneo en el historial** y
   navega al resultado.
4. `result`, `details`, `report` y `story-card` leen ese resultado del contexto.

El historial se carga del disco **de forma síncrona** en el primer render
(`getItemSync` de `expo-sqlite/kv-store`), así nunca aparece vacío un instante.

### Qué sobrevive al reinicio

Tres cosas, las tres en el mismo kv-store síncrono y cada una con su clave
versionada:

| Qué | Dónde | Por qué síncrono |
|---|---|---|
| Historial (tope 20) | [historyStorage.ts](src/services/storage/historyStorage.ts) | Para que la lista no aparezca vacía un instante |
| Si ya se vio el onboarding | [onboardingStorage.ts](src/services/storage/onboardingStorage.ts) | `app/index.tsx` decide **durante el render** a dónde redirigir; asíncrono daría un parpadeo de la pantalla equivocada |
| Si se concedió la ubicación | [locationStorage.ts](src/services/storage/locationStorage.ts) | Se lee en el primer render del contexto |

Los tres fallan hacia el lado seguro: si la lectura revienta, el historial sale
vacío, el onboarding se repite y la ubicación queda apagada. Ninguno tumba la app.

> **Por qué la ubicación se persiste.** Al hacer que el onboarding corriera una
> sola vez, `locationEnabled` quedó viviendo solo en memoria: como nadie volvía
> a pasar por la pantalla que lo enciende, tras el primer reinicio el historial
> **dejaba de anotar el lugar para siempre, y en silencio**. Las dos
> persistencias tienen que ir juntas.

### Por qué `AnalysisService` es una interfaz

Las pantallas consumen un `AnalysisResult`, no una implementación. Eso permite:

- Desarrollar sin backend (y, hoy, **a pesar** del backend).
- Testear sin red.
- Cambiar mock ↔ real **sin tocar ninguna pantalla**.

```
app/analysis/loading.tsx
        ↓ analysisService.analyze(url)
  AnalysisService  (interfaz, types.ts)
        ├── mockAnalysisService      setTimeout + fixtures
        └── remoteAnalysisService    HTTP + adaptador + degradación
```

El cambio se decide en [config.ts](src/services/api/config.ts), no en las
pantallas.

### Qué filtros se anuncian, y por qué es una lista aparte

[`enabledFilters.ts`](src/services/analysis/enabledFilters.ts) tiene una sola
constante, `ENABLED_FILTERS`, con los filtros que esta versión muestra. Hoy solo
F1; F2.1 y F2.2 están **comentados al lado**, listos para descomentar.

Es deliberado que **no** sea el tipo `AnalysisStageKey`, y la diferencia importa:

| | Qué es | Quién manda |
|---|---|---|
| `AnalysisStageKey` | El **vocabulario**: las claves que la app sabe pintar | El contrato con el backend |
| `ENABLED_FILTERS` | La **lista activa**: lo que esta versión anuncia | Una decisión de producto |

`AnalysisStageKey` es un tipo de **entrada**: tipa lo que el backend manda
(`sections[].key`, `pending[]`). Recortarlo haría que el adaptador rechazara
respuestas válidas, y obligaría a **borrar** el icono y el copy de cada filtro
apagado — justo lo contrario de poder reactivarlos descomentando. Por eso el
union se queda completo y la lista activa vive aparte.

Quién lee la lista:

- `placeholderSections()` en [adaptAnalysis.ts](src/services/analysis/adaptAnalysis.ts)
  → solo rellena "SIN COMPLETAR" para filtros activos.
- [details.tsx](app/analysis/details.tsx) → solo pinta sus acordeones.
- `analysisStages` en [analysisService.ts](src/services/analysis/analysisService.ts)
  → la pantalla de carga. **Este es el único que no se ajusta solo**: sus etapas
  llevan copy y tiempos, así que están comentadas en su sitio y hay que
  descomentarlas aparte.

El adaptador sigue **sin filtrar**: si el backend manda una sección de un filtro
apagado, la conserva en el `AnalysisResult`. Solo la pantalla decide no pintarla.

### Puntos de extensión para los demás filtros

- **Formas de respuesta** →
  [adaptAnalysis.ts](src/services/analysis/adaptAnalysis.ts). Acepta **las dos**
  formas: la real en español (`dominio`, `veredicto_final`) y la del contrato en
  inglés (`domain`, `verdict`, `sections`). Cuando el backend se alinee,
  funciona sin cambios.
- **Secciones nuevas (F2.1/F2.2/F2.3)** → el backend las manda en `sections[]`
  con su `key`. El **adaptador** sigue sin filtrar nada: respeta tal cual lo que
  llega, incluidas las claves que esta versión no conoce. Lo que sí decide el
  frontend es **cuáles se pintan**: `details.tsx` muestra solo los filtros de
  [`ENABLED_FILTERS`](src/services/analysis/enabledFilters.ts), para no anunciar
  un filtro que el backend no responde. Reactivar uno es descomentar su línea
  ahí y su etapa en `analysisStages`; el orden y los criterios los sigue
  poniendo el backend.
- **Códigos de error nuevos** → `CODE_ALIASES` en
  [errors.ts](src/services/api/errors.ts).
- **Polling de la cascada** → `AnalysisResult` ya tiene `pending` y `degraded`.
  Falta `status` si se implementa el polling.

> **Nota de diseño:** `VerdictKey` vive en `design-system/tokens.ts`, así que el
> servicio depende del design system y no al revés. Si el backend agrega un
> quinto veredicto, el cambio entra ahí. Hoy `PENDIENTE` se traduce a
> `incierto` en el adaptador para no romper la app en tiempo de ejecución.

---

## 8. Pendientes conocidos

Por prioridad, con lo que desbloquea cada uno.

1. **El endpoint real devuelve HTTP 500 a toda URL válida.** Su validación sí
   funciona (400 con URL inválida, con `ftp://`, sin `url`), pero la ruta feliz
   crashea tras ~16 s. Verificado el 2026-09-09 contra cuatro dominios. La app
   no espera ese rato: corta a los 5 s (`timeouts.analyze` en
   [config.ts](src/services/api/config.ts)) y degrada a "incierto".
   → **Desbloquea:** Fabi. Con el 500 arreglado, basta cambiar `analysisMode` a
   `remote`. Conviene pasarle el detalle: la validación le anda, la ruta feliz no.
   Cuando además entregue F2.1 o F2.2, hay un segundo paso: descomentar su línea
   en [`ENABLED_FILTERS`](src/services/analysis/enabledFilters.ts) y su etapa en
   `analysisStages`.

2. **Generar el APK.** El build local de Gradle se cuelga en esta máquina (dos
   intentos el 2026-09-20, ninguno produjo artefacto; ver la nota de §4). No es
   del código: el bundle JS exporta limpio. `eas.json` ya está configurado, así
   que el camino es `eas build -p android --profile preview`.
   → **Desbloquea:** una cuenta de Expo (gratuita) para `eas login`. Es el único
   requisito para el APK de `preview`.

3. **Correr la prueba 1.4** (T_scan y TDR). Es la única métrica de escaneo que
   falta y decide si se sigue con `expo-camera` o se migra a
   `react-native-vision-camera`.
   → **Desbloquea:** un teléfono Android físico y 30 QRs impresos.

4. **iOS: fuera del alcance de esta entrega.** No es un pendiente — la entrega
   es **solo Android**, por decisión explícita y por no disponer de una Mac.
   Todo lo que no requiere macOS quedó configurado y **no se borró nada**:
   `bundleIdentifier`, `buildNumber`, los cuatro textos de permiso de
   `Info.plist`, la safe area y el teclado. Si alguien lo retoma, los pasos
   están en [ios_en_la_mac.md](TAREAS_POR_HACER/ios_en_la_mac.md) y hacen falta
   una Mac más una cuenta Apple Developer (US$99/año).

5. **El endpoint `/reports` no existe.** El cliente está hecho y testeado.
   → **Desbloquea:** Fabi.

6. **Los 8 puntos abiertos del contrato** (`endpoints_api.txt`): un endpoint por
   filtro o uno bloqueante, quién compone `badgeText`, TTL de la URL de S3,
   polling o SSE, etc. Mientras no se cierren, el adaptador apunta al
   comportamiento **real observado**, no al contrato en papel.
   → **Desbloquea:** la reunión del hito M1.

7. **Reponer la vista previa (F2.3)** cuando exista el backend. Hoy está quitada
   de la app a propósito: anunciaba una captura inexistente. Volverla a poner son
   tres pasos (ver la fila de F2.3 en §5) más renderizar la imagen honrando
   `expiresAt`, o un vacío elegante si venció. El contrato sigue vigente en
   `TAREAS_POR_HACER/endpoints_api.txt` §1.5.
   → **Desbloquea:** que el backend mande la URL firmada.

8. **Pruebas de usabilidad** (5 participantes) para comprensión del veredicto,
   finalización del flujo y T_learn.
   → **Desbloquea:** agendar a los participantes.

9. **Sin detección de conectividad.** La app no distingue "modo avión" de
   "servidor caído": las dos degradan a `incierto` con el mismo mensaje
   genérico. Es honesto pero poco específico. Distinguirlas pide una dependencia
   nueva (`@react-native-community/netinfo`), que quedó fuera del alcance de
   esta entrega.
   → **Desbloquea:** decidir si vale la dependencia.

### Deuda técnica menor

- `expo-sqlite/kv-store` se mockea en los tests (`jest.setup.js`): el módulo
  nativo no existe en Node. Se prueba la lógica del historial, no el driver.
- `react-dom@19.2.3` está fijado como devDependency para mantener el lockfile
  alineado con lo que Expo SDK 57 especifica. Solo afecta a web.
- **`overrides` de `react-native-worklets@0.10.4` y `react-native-reanimated@4.5.0`**
  (ver §2). Es el arreglo de una incompatibilidad interna de Expo SDK 57, no una
  preferencia. Se podrán quitar cuando `expo-modules-core` soporte worklets 0.12
  (o cuando Expo alinee lo que arrastra `expo-router`). Revisar al subir de SDK.
- `jest-expo` fijado en `~57.0.4`: el `57.0.5` exige
  `@react-native/jest-preset@^0.86.3` y el proyecto usa `react-native@0.86.2`.
- `userInterfaceStyle` en `app.json` no tiene efecto en Android sin
  `expo-system-ui` (el prebuild lo avisa). No se instaló porque la app es de
  tema claro fijo.

Decisiones conscientes de **no** arreglar en esta entrega:

- **Sin detección de conectividad.** Ver el punto 9 de §8. Añadir `netinfo` a horas de la
  entrega, para mejorar un mensaje de error que ya es honesto, tenía peor
  relación riesgo/beneficio que documentarlo.
- **`addScan` escribe a disco dentro de un updater de `setState`**
  ([AppStateContext.tsx](src/store/AppStateContext.tsx)). Funciona y está
  probado, pero React puede invocar un updater más de una vez en modo
  concurrente o bajo StrictMode, y entonces la escritura se repetiría. Lo
  correcto es un `useEffect` sobre `history`. No se tocó porque es el camino por
  el que pasa **todo** escaneo y el riesgo de romperlo hoy supera al del bug,
  que nadie ha observado.
- **`analysisService.ts` está excluido de la cobertura**
  ([jest.config.js](jest.config.js)) con una justificación ya vencida — dice que
  "es todavía el mock", y desde entonces existe `remoteAnalysisService`. El
  efecto real es que la línea que elige mock ↔ remoto no está cubierta. Se deja
  anotado en vez de cambiar el alcance de la métrica de cobertura el día de la
  entrega.
- **`timeouts.total` (35 s) está definido y nunca se usa.** El presupuesto por
  petición (5 s) sí se aplica; el de la cascada completa no tiene sentido hasta
  que haya más de un filtro corriendo.
- **`paddingBottom: 24` fijo en el pie de las 7 pantallas**, que se suma al
  `insets.bottom` que ya aplica `Screen`. En un Android con navegación por
  gestos el pie queda un poco más holgado de lo que dice el mockup. Es un patrón
  consistente en toda la app, no un descuido suelto: tocarlo cambia el layout de
  las siete pantallas a la vez y no hay teléfono donde verificarlo hoy.
- **Los fixtures del mock traen las tres secciones** aunque la app pinte una.
  Es deliberado: son copy aprobado del mockup, y son justamente lo que
  demuestra que el filtro de `ENABLED_FILTERS` funciona.
