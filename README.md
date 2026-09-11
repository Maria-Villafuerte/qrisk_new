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

### iOS

```bash
npx expo prebuild -p ios   # solo en macOS
npx expo run:ios           # simulador
npx expo run:ios --device  # iPhone físico
```

Requiere macOS: el prebuild genera un proyecto de Xcode y corre CocoaPods, que
no existen en Windows. Los pasos completos, con checklist de verificación en el
dispositivo, están en
[TAREAS_POR_HACER/ios_en_la_mac.md](TAREAS_POR_HACER/ios_en_la_mac.md).

El **simulador no tiene cámara real**: el escaneo solo se prueba en un iPhone
físico. El resto de la app sí funciona ahí.

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

```bash
npm install -g eas-cli
eas login                      # cuenta gratuita de Expo
eas build:configure
eas build -p android --profile preview      # APK, para instalar y probar
eas build -p android --profile production   # AAB, para Play Store
```

Credenciales: EAS genera y guarda el *keystore* de firma la primera vez.
**Hacé `eas credentials` y descargá un respaldo**: si se pierde, no se puede
actualizar la app publicada y hay que publicar una nueva.

**Opción B — build local.** Requiere Android Studio y el SDK.

```bash
cd android && ./gradlew assembleRelease   # APK en app/build/outputs/apk/release/
cd android && ./gradlew bundleRelease     # AAB en app/build/outputs/bundle/release/
```

El build local usa la firma de debug salvo que configures un keystore en
`android/app/build.gradle`. Para publicar, usá EAS o configurá la firma.

### iOS

```bash
eas build -p ios --profile production
```

**Bloqueado hoy** por dos cosas que no dependen del código:

1. Una **Mac** para el prebuild (o EAS Build, que compila iOS en la nube sin
   Mac, pero igual pide el paso 2).
2. Una cuenta **Apple Developer** (US$99/año) para firmar y publicar. La cuenta
   gratuita alcanza para instalar en tu propio iPhone.

Ya está listo todo lo que no requiere Mac: `bundleIdentifier`, `buildNumber`,
los cuatro textos de permiso de `Info.plist`, la safe area y el teclado.

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
- [ ] `versionCode` / `buildNumber` incrementados.
- [ ] `analysisMode` en `remote` (el mock no puede llegar a producción).
- [ ] Respaldo del keystore guardado en un lugar seguro.
- [ ] Probado en **dispositivo físico**, Android y iOS.
- [ ] Los permisos piden lo mínimo (`SYSTEM_ALERT_WINDOW` y `RECORD_AUDIO`
      siguen bloqueados en `app.json`).
- [ ] Prueba 1.4 corrida y métricas anotadas (§6).
- [ ] Probado con wifi apagado: debe dar "incierto", no fallar.

---

## 5. Estado de funcionalidades

✅ funciona · 🟡 parcial · ❌ pendiente

| Funcionalidad | Estado | Qué falta / qué se necesita para probarlo |
|---|---|---|
| Escaneo de QR | ✅ | Cámara real con `expo-camera`, antorcha y bloqueo tras la primera lectura. **Falta medir** T_scan y TDR en hardware (§6). |
| Clasificación URL / no-URL | ✅ | `classifyQr` con 18 tests. Cubre https, dominios sin esquema, Wi-Fi, vCard, mailto, tel, geo y texto suelto. |
| Análisis F1 (reputación) | 🟡 | El cliente, el adaptador y la degradación están hechos y testeados. **El endpoint real responde HTTP 500 a toda URL válida** (~16 s de espera). Para probarlo: que el backend devuelva 200. |
| Filtro F2.1 (heurística) | ❌ | No existe en el backend (su propio mensaje dice "F2.1 aún no implementado"). El frontend ya pinta la sección en cuanto llegue. |
| Filtro F2.2 (comportamiento) | ❌ | Igual que F2.1: la UI está lista, el backend no. |
| Filtro F2.3 (vista previa) | ❌ | **Quitado de la app a propósito.** Anunciaba una captura que no existe (la etapa "Generando vista previa segura…" y un acordeón "DISPONIBLE" siempre vacío). Para reactivarlo: agregar `'preview'` a `AnalysisStageKey`, la etapa en `analysisStages` y la entrada en `sectionIcons`; luego renderizar la imagen honrando `expiresAt`. Requiere el endpoint y la URL firmada de S3. |
| Resultado simple | ✅ | Emblema, veredicto, dominio, resumen. La jerarquía de botones se invierte según el riesgo y abrir un sitio riesgoso exige confirmación. |
| Resultado extendido | ✅ | Medidor de riesgo y las 4 secciones en acordeón. |
| Historial persistente | ✅ | `expo-sqlite/kv-store`, tope 20, el más viejo se descarta. Guarda el análisis completo, así que una fila reabre **su** veredicto sin red. Probar: escanear, cerrar la app por completo, reabrir. |
| Reporte de QR malicioso | 🟡 | Valida, arma el payload anónimo y **no pierde lo escrito si falla la red**. **El endpoint `/reports` no existe**: hoy falla y ofrece reintentar. |
| Story Card | ✅ | Foto real (cámara o galería), captura con `captureRef`, compartir y guardar en la galería. **Probar en teléfono físico**: los diálogos del sistema no se pueden verificar de otro modo. |
| Geocodificación inversa | ✅ | `expo-location` **en el dispositivo**, nunca en el servidor. Si falla, devuelve `null` y la UI oculta la fila. **Probar en teléfono** con GPS. |
| iOS | 🟡 | Identificadores, permisos, safe area y teclado listos y verificados. **Falta** `npx expo prebuild -p ios` y correr en iPhone: **necesita una Mac**. |
| Abrir el sitio analizado | 🟡 | Es un toast a propósito. Abrir de verdad toca la regla fundamental y merece una decisión de producto explícita (¿navegador externo? ¿con qué advertencia?). |

---

## 6. Cómo probar

### Tests unitarios

```bash
npm test               # 142 tests, 14 suites
npm run test:coverage  # reporte de cobertura
npm run test:watch     # durante el desarrollo
```

La cobertura se mide **solo sobre `src/services`** (la lógica de negocio que
pide la métrica), con umbral de 70% que **corta el build** si no se cumple.
Las pantallas quedan fuera a propósito: se validan en dispositivo y en las
pruebas de usabilidad.

Estado actual: **142 tests en verde**, 100% statements, 100% lines, 96% branches.

### Medición en hardware (T_scan y TDR)

El protocolo completo está en
[TAREAS_POR_HACER/prueba_1.4_escaneo.md](TAREAS_POR_HACER/prueba_1.4_escaneo.md):
30 QRs variando tamaño, ángulo e iluminación.

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
| Geocodificación legible | ≥ 85% | ⏳ Lógica cubierta; **falta probar en campo** |
| Story Card generada | ≥ 90% | ⏳ Falta probar en teléfono físico |
| Comprensión del veredicto | ≥ 90% | ⏳ Prueba de usabilidad (5 participantes) |
| Finalización del flujo | ≥ 85% | ⏳ Igual |
| T_learn | ≤ 60 s | ⏳ Igual |
| T_start | ≤ 3 s | ⏳ Medir en dispositivo de gama media |
| Compatibilidad iOS ≥ 15 / Android ≥ 10 | sin errores críticos | ⏳ Android pendiente de probar; iOS necesita Mac |

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
    storage/             Historial en disco
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

### Puntos de extensión para los demás filtros

- **Formas de respuesta** →
  [adaptAnalysis.ts](src/services/analysis/adaptAnalysis.ts). Acepta **las dos**
  formas: la real en español (`dominio`, `veredicto_final`) y la del contrato en
  inglés (`domain`, `verdict`, `sections`). Cuando el backend se alinee,
  funciona sin cambios.
- **Secciones nuevas (F2.1/F2.2/F2.3)** → el backend las manda en `sections[]`
  con su `key`, y `details.tsx` las pinta tal como llegan. El frontend **no
  decide** qué criterios mostrar ni en qué orden.
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
   crashea tras ~16 s. Verificado el 2026-09-09 contra cuatro dominios.
   → **Desbloquea:** Fabi. Con el 500 arreglado, basta cambiar `analysisMode` a
   `remote`. Conviene pasarle el detalle: la validación le anda, la ruta feliz no.

2. **Correr la prueba 1.4** (T_scan y TDR). Es la única métrica de escaneo que
   falta y decide si se sigue con `expo-camera` o se migra a
   `react-native-vision-camera`.
   → **Desbloquea:** un teléfono Android físico y 30 QRs impresos.

3. **iOS en dispositivo.** Todo lo configurable está hecho; falta el prebuild.
   → **Desbloquea:** una Mac. Pasos en
   [ios_en_la_mac.md](TAREAS_POR_HACER/ios_en_la_mac.md).

4. **El endpoint `/reports` no existe.** El cliente está hecho y testeado.
   → **Desbloquea:** Fabi.

5. **Los 8 puntos abiertos del contrato** (`endpoints_api.txt`): un endpoint por
   filtro o uno bloqueante, quién compone `badgeText`, TTL de la URL de S3,
   polling o SSE, etc. Mientras no se cierren, el adaptador apunta al
   comportamiento **real observado**, no al contrato en papel.
   → **Desbloquea:** la reunión del hito M1.

6. **Reponer la vista previa (F2.3)** cuando exista el backend. Hoy está quitada
   de la app a propósito: anunciaba una captura inexistente. Volverla a poner son
   tres pasos (ver la fila de F2.3 en §5) más renderizar la imagen honrando
   `expiresAt`, o un vacío elegante si venció. El contrato sigue vigente en
   `TAREAS_POR_HACER/endpoints_api.txt` §1.5.
   → **Desbloquea:** que el backend mande la URL firmada.

7. **Pruebas de usabilidad** (5 participantes) para comprensión del veredicto,
   finalización del flujo y T_learn.
   → **Desbloquea:** agendar a los participantes.

8. **Decidir qué hace "Abrir el sitio".** Hoy es un toast. Toca la regla
   fundamental del producto y merece una decisión explícita, no una
   implementación por inercia.
   → **Desbloquea:** una decisión de producto.

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
