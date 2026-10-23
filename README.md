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

| Veredicto            | Significado                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| **Seguro**     | Sin señales de riesgo.                                                |
| **Sospechoso** | Señales de riesgo; ábrelo solo si confías en quien puso el código. |
| **Malicioso**  | Peligroso. No abrirlo ni ingresar datos.                               |

Si el análisis no llega a un veredicto (sin internet, servidor caído o sin
conclusión), la app **no muestra resultado**: avisa con un pop-up —sin red,
*"Error, verifica tu conexión a internet"*— y vuelve al escáner. Ese escaneo no
se guarda en el historial.

### Regla de seguridad fundamental

> **La app NUNCA visita la URL por su cuenta.** El análisis ocurre siempre en
> el entorno aislado del backend: el teléfono no carga el sitio para
> analizarlo, ni lo abre en segundo plano, ni lo previsualiza. Hasta que la
> persona lo pida, el enlace es solo texto en pantalla.

Esta regla manda sobre cualquier otra decisión de producto.

**Lo que sí puede hacer la persona: abrir el sitio a propósito.** Después de ver
el veredicto hay un botón para hacerlo, y la fricción escala con el riesgo:

| Veredicto                         | Qué pasa al tocar "Abrir"                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Seguro                            | Abre directo en el navegador del sistema                                                                                     |
| Sospechoso / Malicioso            | Hoja de confirmación con el dominio y cuántas señales de riesgo se encontraron.**"Cancelar" es el botón primario** |

Dos cosas que esto **no** rompe: el análisis nunca dejó de ocurrir en el
sandbox, y el sitio se abre **fuera** de QRisk, en el navegador del sistema —
nunca embebido, donde una página podría hacerse pasar por una pantalla de la
app. La app informa y encarece la decisión riesgosa; no la prohíbe, porque
quien sabe si confía en quien puso el código es la persona, no nosotros.

De la regla se derivan tres más, que explican cosas que de otro modo parecen
arbitrarias:

- **Un aviso de error honesto es mejor que un "seguro" calculado con
  información incompleta.** Un falso "seguro" es el peor resultado posible del
  producto: sin veredicto, la app no inventa uno.
- **Nada de lo que el usuario aporta sale del teléfono.** La foto de contexto de
  la Story Card, su ubicación y su historial se quedan en el dispositivo.
- **El QR de la Story Card se cubre con una capa opaca, no se difumina.** Un QR
  medio borroso sigue siendo escaneable, y eso es justo lo que hay que evitar.

---

## 2. Requisitos y setup

### Versiones verificadas

| Herramienta     | Versión             | Nota                                                            |
| --------------- | -------------------- | --------------------------------------------------------------- |
| Node            | 20.20.2              | 20 o superior                                                   |
| npm             | 10.8.2               |                                                                 |
| Expo SDK        | 57.0.12              | `react-native` 0.86.2, React 19.2.3                           |
| JDK             | 17 (Temurin 17.0.17) | Para Android. El 17 es el que pide Gradle 9                     |
| Gradle          | 9.3.1                | Lo trae el wrapper; no hay que instalarlo                       |
| Android mínimo | API 24 (Android 7.0) | Lo fija Expo SDK 57; lo define`rootProject.ext.minSdkVersion` |
| Xcode           | Última estable      | Solo para iOS,**solo en macOS**                           |

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
  "apiBaseUrl": "https://z0k9lhdru4.execute-api.us-east-1.amazonaws.com/dev"
}
```

Se puede pisar sin tocar el archivo, con una variable de entorno que Expo
inyecta en el bundle:

```bash
EXPO_PUBLIC_API_URL=https://...    # URL base, sin barra final
```

Se lee en [config.ts](src/services/api/config.ts), junto con los topes de
tiempo. Ya no hay `analysisMode`: se eliminó con el mock el 2026-09-20.

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

### Contra qué backend corre

**Siempre contra el real.** El modo mock se eliminó el 2026-09-20, cuando el
endpoint empezó a responder 200: ya no hay implementación de mentira que elegir,
ni interruptor que cambiar.

Para apuntar a otro despliegue (uno local, o el de producción cuando exista):

```bash
EXPO_PUBLIC_API_URL=https://otro-endpoint.com/dev npx expo run:android
```

Sin esa variable se usa `expo.extra.apiBaseUrl` de `app.json`.

> **Consecuencia que conviene tener presente:** si el backend se cae, la app no
> tiene de dónde sacar un veredicto. Muestra un aviso de error —no se rompe—
> pero no hay demo de respaldo. Fue una decisión explícita: el mock era la red
> de seguridad y se quitó a cambio de que la app no pueda mentir.

---

## 4. Build y deploy

### Android

**Opción A — EAS Build (en la nube, recomendado).** No necesita Android Studio.

`eas.json` **ya está en el repo** con tres perfiles, así que **no hace falta
correr `eas build:configure`**:

| Perfil          | Sale               | Para qué                                           |
| --------------- | ------------------ | --------------------------------------------------- |
| `development` | APK con dev client | Desarrollo con Metro                                |
| `preview`     | **APK**      | **Instalar y demostrar.** Es el de la defensa |
| `production`  | **AAB**      | Play Store                                          |

Los tres apuntan al backend real: ya no hay modo que forzar.

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
> | Intento       | Hasta dónde llegó                | Síntoma                                                                  |
> | ------------- | ---------------------------------- | ------------------------------------------------------------------------- |
> | 1º (~35 min) | Arranque                           | Bloqueado en un lock. CPU**~1 s cada 30 s**, cero archivos escritos |
> | 2º (~25 min) | `mergeDebugAssets` y algo de C++ | CPU**~4 s cada 55 s** pero **cero archivos en 12 min**        |
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

| Qué             | Dónde                                                                       |
| ---------------- | ---------------------------------------------------------------------------- |
| Versión visible | `expo.version` (`1.0.0`)                                                 |
| Build Android    | `expo.android.versionCode` (entero, sube en cada envío)                   |
| Build iOS        | `expo.ios.buildNumber` (cadena, sube en cada envío)                       |
| ID de la app     | `expo.android.package` y `expo.ios.bundleIdentifier` (`com.qrisk.app`) |
| Nombre visible   | `expo.name` (`QRisk`)                                                    |
| Ícono y splash  | `expo.icon`, `expo.android.adaptiveIcon`                                 |
| Permisos         | en cada plugin de`expo.plugins`, + `expo.ios.infoPlist`                  |

> El identificador `com.qrisk.app` **se congela al publicar**. Cambiarlo después
> obliga a crear una app nueva en la tienda, perdiendo instalaciones y reseñas.

### Checklist antes de publicar

- [ ] `npx tsc --noEmit` limpio.
- [ ] `npm test` en verde y cobertura ≥ 70%.
- [ ] `versionCode` incrementado (`app.json` → `expo.android.versionCode`).
- [ ] El backend responde 200 (`curl` a `/analyze`). Sin él no hay veredictos.
- [ ] Respaldo del keystore guardado en un lugar seguro (`eas credentials`).
- [ ] Probado en **dispositivo Android físico** (iOS está fuera de alcance).
- [ ] Los permisos piden lo mínimo (`SYSTEM_ALERT_WINDOW` y `RECORD_AUDIO`
  siguen bloqueados en `app.json`).
- [ ] Prueba 1.4 corrida y métricas anotadas (§6).
- [ ] [prueba_telefono_fisico.md](TAREAS_POR_HACER/prueba_telefono_fisico.md)
  corrida: arranque en frío, geocodificación, Story Card, sin conexión.
- [ ] Probado con wifi apagado: debe salir el pop-up "verifica tu conexión a
  internet" y volver al escáner, sin guardar nada en el historial.
- [ ] **El QR de la Story Card no se puede escanear** desde otro teléfono
  (§C4 de la prueba). Es el chequeo de seguridad que no se puede saltar.

---

## 5. Estado de funcionalidades

✅ funciona · 🟡 parcial · ❌ pendiente · ⛔ fuera de alcance

| Funcionalidad                | Estado | Qué falta / qué se necesita para probarlo                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Escaneo de QR                | ✅     | Cámara real con`expo-camera`, antorcha y bloqueo tras la primera lectura. **Falta medir** T_scan y TDR en hardware (§6).                                                                                                                                                                                                                                                                                                                           |
| Clasificación URL / no-URL  | ✅     | `classifyQr` con 18 tests. Cubre https, dominios sin esquema, Wi-Fi, vCard, mailto, tel, geo y texto suelto.                                                                                                                                                                                                                                                                                                                                               |
| Análisis (backend real)     | ✅     | **El endpoint responde HTTP 200 desde el 2026-09-20** y la app corre solo contra él: el mock se eliminó. Devuelve un `score_heuristico` con sus criterios; la app deriva el veredicto de ese puntaje (§5.2). Latencia medida: 5.5 s la primera llamada (arranque en frío de Lambda), 1.6-3.1 s las siguientes.                                                                                                                                   |
| Filtro F2.1 (heurística)    | ✅     | **El backend sí lo implementó.** Devuelve un puntaje 0-100 con los criterios que lo componen, cada uno con su peso y su explicación en español. La app los pinta tal cual en el acordeón de detalle. Criterios verificados: TLD de riesgo (25), host que es una IP (30), sin HTTPS (15), palabra clave sospechosa (15).                                                                                                                           |
| Filtro F2.2 (comportamiento) | ✅     | **Funciona: consulta VirusTotal.** Verificado de nuevo el 2026-10-01 (`malware.wicar.org` → 18 motores lo marcan, `filtro_decisivo: F2.2`). Sus indicadores **se muestran en pantalla desde el 2026-10-01**: hasta entonces el adaptador declaraba `indicadores_f2_2` y no lo leía, así que esa evidencia se perdía y el sitio se veía con una sola alerta. Hoy se pintan junto a los criterios de F2.1 en la misma sección (§5.2). |
| Filtro F2.3 (vista previa)   | 🟡     | **La app la muestra cuando viene, pero es intermitente.** Apareció el 2026-09-30 en `screenshot_url` (URL firmada de S3, PNG real verificado). **El 2026-10-01 ninguna de las seis llamadas la trajo**, incluida una URL nueva de 15.3 s. El código lo maneja: el campo es opcional y la imagen se oculta si falla. Se pinta como **imagen estática, nunca un WebView**. **No contar con ella en la defensa.**                  |
| Resultado simple             | ✅     | Emblema, veredicto, dominio, resumen. La jerarquía de los botones se invierte con el riesgo: en un sitio seguro lo recomendado es abrir; con señales, ver los detalles.                                                                                                                                                                                                                                                                                    |
| Resultado extendido          | ✅     | Medidor de riesgo y el acordeón con los**criterios reales** que devolvió el backend ("Host es una IP: 192.168.1.1"), no texto genérico.                                                                                                                                                                                                                                                                                                             |
| Historial persistente        | ✅     | `expo-sqlite/kv-store`, tope 20, el más viejo se descarta. Guarda el análisis completo, así que una fila reabre **su** veredicto sin red. Probar: escanear, cerrar la app por completo, reabrir.                                                                                                                                                                                                                                                  |
| Reporte de QR malicioso      | 🟡     | Valida, arma el payload anónimo y**no pierde lo escrito si falla la red**. **El endpoint `/report` ya existe** (entrega S11) y la app apunta a él con el payload del contrato (`url`, `motivo`, `analisis_id`). Verificado el 2026-10-11: valida bien (400 con los códigos del contrato) pero **el guardado responde 500**, así que hoy sigue fallando. La app distingue ese caso del fallo de red y lo dice.                  |
| Story Card                   | ✅     | Foto real (cámara o galería), captura con`captureRef`, compartir y guardar en la galería. **Probar en teléfono físico**: los diálogos del sistema no se pueden verificar de otro modo.                                                                                                                                                                                                                                                         |
| Geocodificación inversa     | ✅     | `expo-location` **en el dispositivo**, nunca en el servidor. Si falla, devuelve `null` y la UI oculta la fila. **Probar en teléfono** con GPS.                                                                                                                                                                                                                                                                                              |
| iOS                          | ⛔     | **Fuera del alcance de esta entrega**, que es solo Android. La configuración se conserva por si alguien lo retoma: `bundleIdentifier`, `buildNumber`, los cuatro textos de permiso de `Info.plist`, la safe area y el teclado. No se borró nada.                                                                                                                                                                                               |
| Abrir el sitio analizado     | ✅     | Botón real: abre en el**navegador del sistema**, nunca embebido. En un sitio seguro abre directo; con cualquier señal de riesgo pide confirmación mostrando el dominio y cuántas alertas se hallaron, con "Cancelar" como acción primaria. Ver §1 y §5.1.                                                                                                                                                                                       |

---

### 5.1 Decisión: qué hace "Abrir el sitio"

Estuvo abierta desde el prototipo y se cerró en esta entrega.

**Qué había:** un botón que mostraba un toast *"Abriendo `dominio` en tu
navegador…"* y no abría nada. Prometía y mentía.

**Qué hay ahora:** un botón que abre de verdad, con fricción proporcional al
riesgo.

| Veredicto  | Botón primario       | Al tocar "Abrir"                                           |
| ---------- | --------------------- | ---------------------------------------------------------- |
| Seguro     | **Abrir sitio** | Abre directo en el navegador del sistema                   |
| Sospechoso | Ver más detalles     | *"Abrir con precaución"* → hoja de confirmación       |
| Malicioso  | Ver más detalles     | *"Abrir bajo mi propio riesgo"* → hoja de confirmación |

La hoja repite el dominio y **cuántas señales de riesgo se encontraron** —el
dato concreto, no una advertencia genérica que ya nadie lee— y pone
**"Cancelar" como botón primario**.

**Por qué esta opción y no las otras dos:**

- *No abrir nunca* era coherente, pero convertía en limitación permanente algo
  que el usuario va a hacer igual, solo que copiando la URL a mano y sin ningún
  aviso de por medio. La app se quedaba sin influir justo en el momento que
  importa.
- *Copiar al portapapeles* dejaba a la persona a un pegado de distancia del
  sitio malicioso, con la misma exposición y menos información.

**Dos cosas que no se negociaron:**

1. **El análisis sigue ocurriendo solo en el sandbox del backend.** El teléfono
   nunca carga el sitio para analizarlo. Eso es lo que siempre dijo la regla de
   §1, y sigue intacto.
2. **Se abre en el navegador del sistema, nunca embebido** (`Linking.openURL`).
   Dentro de un WebView, una página de phishing podría hacerse pasar por una
   pantalla de QRisk; fuera, la barra de direcciones del navegador es una
   defensa más.

Si el análisis falló no hay veredicto ni botón de abrir: la app avisa con un
pop-up y vuelve al escáner.

---

### 5.2 Cómo se decide el veredicto (y por qué lo decide la app)

**El backend concluye a veces, y cuando lo hace la app respeta su palabra.**
Estado medido el **2026-09-30**:

| Caso                           | `veredicto_final`          | Qué hace la app                |
| ------------------------------ | ---------------------------- | ------------------------------- |
| VirusTotal reporta detecciones | `SOSPECHOSO` (decide F2.2) | Lo usa tal cual                 |
| F2.1 da puntaje alto           | `SOSPECHOSO` (decide F2.1) | Lo usa tal cual                 |
| Nada reporta nada              | **`PENDIENTE`**      | Deriva el veredicto del puntaje |

El caso `PENDIENTE` sigue siendo el más común —`github.com` y `google.com` caen
ahí— y es el que hace falta cubrir: sin la derivación, esos escaneos terminarían
en un error de "no se pudo analizar".

> **Techo conocido:** hoy el backend **nunca devuelve `MALICIOSO`**, ni con 18
> motores de VirusTotal marcando el sitio. Ver §8.

**Qué evidencia se muestra, y de dónde sale.** El veredicto es una palabra; lo
que convence es el detalle. La app pinta en la misma sección **las dos** listas
que manda el backend, en este orden:

| Campo del backend    | Qué es                        | Ejemplo real                              |
| -------------------- | ------------------------------ | ----------------------------------------- |
| `criterios_f2_1`   | La heurística, con su peso    | *"Host es una IP: 192.168.1.1"*         |
| `indicadores_f2_2` | El comportamiento (VirusTotal) | *"18 motores lo marcan como malicioso"* |

Van juntas y no en dos acordeones porque **el backend no reporta los filtros
como etapas separadas**: manda una sola respuesta plana con todo dentro (por eso
`behavior` sigue apagado en `ENABLED_FILTERS`, §7). Lo que sí sería un error es
no enseñarlas: hasta el 2026-10-01 el adaptador leía solo `criterios_f2_1`, así
que `malware.wicar.org` —con 18 motores marcándolo— se veía con **una sola
alerta**, *"La URL no usa HTTPS"*. Hoy se ven las tres.

> **El veredicto no cambió con esto.** Mostrar más evidencia no es recalcular:
> lo sigue decidiendo el backend cuando concluye, y el puntaje cuando no. El
> medidor sigue siendo el `score_heuristico` tal cual.

Respuesta real del endpoint (verificada el 2026-09-20):

```json
{
  "url": "http://192.168.1.1/login.php",
  "dominio": "192.168.1.1",
  "veredicto_final": "PENDIENTE",
  "score_heuristico": 60,
  "criterios_f2_1": [
    { "criterio": "ip_literal", "peso": 30, "detalle": "Host es una IP: 192.168.1.1" },
    { "criterio": "sin_https",  "peso": 15, "detalle": "La URL no usa HTTPS" },
    { "criterio": "palabra_clave_sospechosa", "peso": 15, "detalle": "Palabra detectada: \"login\"" }
  ],
  "indicadores_f2_2": [],
  "screenshot_url": "https://qrisk-screenshots-….s3.amazonaws.com/….png?X-Amz-Expires=3600"
}
```

**Sobre `screenshot_url` (F2.3):** es una captura real del sitio tomada en el
entorno aislado del backend. Se muestra en el detalle como **imagen estática**,
nunca en un WebView: una página en un WebView podría ejecutar código y hacerse
pasar por una pantalla de la app. La URL **caduca en una hora**, así que
[historyStorage.ts](src/services/storage/historyStorage.ts) la descarta al
guardar — si se persistiera, el historial se llenaría de enlaces muertos.

Así que la app deriva el veredicto del puntaje, con los cortes de
[verdictThresholds.ts](src/services/analysis/verdictThresholds.ts):

| `score_heuristico` | Veredicto            | Por qué ese corte                                                                                                                                    |
| -------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–29                | **seguro**     | Un solo criterio menor (sin HTTPS = 15) no basta: marcar de riesgo todo sitio sin HTTPS daría tantos falsos positivos que la app dejaría de creerse |
| 30–59               | **sospechoso** | 30 es el peso exacto de "el host es una IP", y lo que suman dos criterios menores. Merece advertencia, no condena                                     |
| 60–100              | **malicioso**  | Tres o más señales a la vez (IP + sin HTTPS + "login": el phishing clásico)                                                                        |

> **El veredicto no es inventado.** El puntaje y los criterios son del backend;
> lo único que pone la app son los cortes, alineados con los pesos que él mismo
> usa.

**Esto se desmonta solo.** El adaptador prefiere siempre un `veredicto_final`
real: el día que Fabi conecte su umbral y mande `SEGURO`/`SOSPECHOSO`/
`MALICIOSO`, la derivación deja de actuar **sin tocar una línea**. Ahí se puede
borrar `verdictThresholds.ts`.

---

## 6. Cómo probar

### Tests unitarios

```bash
npm test               # 249 tests, 19 suites
npm run test:coverage  # reporte de cobertura
npm run test:watch     # durante el desarrollo
```

La cobertura se mide **solo sobre `src/services`** (la lógica de negocio que
pide la métrica), con umbral de 70% que **corta el build** si no se cumple.
Las pantallas quedan fuera a propósito: se validan en dispositivo y en las
pruebas de usabilidad.

Estado actual: **249 tests en verde** (19 suites), 99.7% statements, **100% lines**,
98.1% branches, **100% functions**. Muy por encima del umbral de 70% que corta el build.

### Pruebas en teléfono físico

Son dos documentos, pensados para correrse sin tener que pensar:

| Documento                                                              | Qué cubre                                                                     | Cuánto toma |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------ |
| [prueba_1.4_escaneo.md](TAREAS_POR_HACER/prueba_1.4_escaneo.md)         | T_scan y TDR: 30 QRs variando tamaño, ángulo e iluminación                  | ~45 min      |
| [prueba_telefono_fisico.md](TAREAS_POR_HACER/prueba_telefono_fisico.md) | Arranque en frío, geocodificación, Story Card, camino sin conexión, teclado | ~40 min      |

### Medición en hardware (T_scan y TDR)

La instrumentación **ya está en el código**. Cada lectura imprime en la consola
de Metro:

```
[T_scan] 842 ms · OK · muestra 1 · android
```

Y el resumen —**las dos métricas, ya calculadas**— se saca desde el debugger:

```js
import { summarizeScanMetrics } from './src/services/qr/scanMetrics';
summarizeScanMetrics();
// { count, failed, presented, medianMs, p90Ms, maxMs,
//   tdrPct, meetsTarget, meetsTdr }
```

`meetsTarget` aplica el criterio T_scan p90 ≤ 5 s; `meetsTdr`, el de TDR ≥ 95 %.

> **Los QRs que NO se leen hay que anotarlos**: `markScanFailed()` desde el
> debugger cada vez que te rindas con un código. La app no puede saber sola que
> hubo un QR enfrente que nunca decodificó, y sin ese dato el TDR da 100 % y
> miente.

`resetScanSamples()` separa tandas (borra tiempos y fallos). Las muestras viven
en memoria: se pierden al recargar.

> **Por qué p90 y no el promedio ni el máximo:** una sola lectura lenta no debe
> descalificar la app, pero tampoco se puede esconder en un promedio. Hay un
> test que documenta esto: con 9 lecturas de 500 ms y una de 20 s, el p90 sigue
> cumpliendo; hacen falta **dos** lentas para moverlo.

### Qué se verificó (2026-09-20, revisado el 2026-10-01) y qué no

Para que nadie tenga que adivinar el estado real:

| Verificación                                     | Resultado                                                                                                                                                                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                              | ✅ Limpio (reverificado el 2026-10-01)                                                                                                                                                                                                       |
| `npm test`                                      | ✅**249 tests**, 19 suites, todo verde (eran 218; +8 de F2.2, +15 de robustez)                                                                                                                                                         |
| Cobertura de`src/services`                      | ✅ 99.7% statements,**100% lines**, **100% functions** (umbral 70%)                                                                                                                                                              |
| **Indicadores de F2.2 en pantalla**         | ✅ Verificado el 2026-10-01 con la respuesta en vivo de`malware.wicar.org`: la sección muestra **"3 ALERTAS"** con *"18 motores lo marcan como malicioso"*. Antes mostraba 1 alerta y descartaba la evidencia de VirusTotal       |
| `npx expo export --platform android`            | ✅ Exit 0.**El código JS de toda la app compila** para Android                                                                                                                                                                        |
| **Los 3 veredictos contra el backend REAL** | ✅ Verificado pasando las respuestas en vivo por el adaptador:`github.com` → seguro (0), `banco-lndustrial-seguro.top` → sospechoso (40), `192.168.1.1/login.php` → malicioso (60), con sus criterios reales y sin marcar degradado |
| Latencia del endpoint                             | ⚠️ Confirmada el**2026-10-01**: **15.3 s en una URL nueva**, 0.3–2.9 s si está en caché. Coherente con la medida del 2026-09-30 (14.2–14.5 s). El tope de 25 s sigue teniendo margen; la pantalla avisa a los 8 s          |
| Captura de F2.3                                   | ⚠️ Verificada el 2026-09-30 (PNG real, HTTP 200, 70 KB).**El 2026-10-01 el backend no la devolvió en ninguna llamada**: el campo es intermitente. La app no se rompe sin ella                                                       |
| Build nativo (`gradlew assembleDebug`)          | ❌**No se logró.** Dos intentos (~35 y ~25 min), los dos colgados sin producir APK. Es del entorno, no del código — ver la nota de §4. **Usar EAS Build**                                                                    |
| App corriendo en un teléfono                     | ❌**No verificado.** No hay dispositivo ni emulador conectado a esta máquina (`adb devices` vacío)                                                                                                                                 |
| Cámara, GPS, galería, compartir                 | ❌**No verificado.** Requieren hardware: ver [prueba_telefono_fisico.md](TAREAS_POR_HACER/prueba_telefono_fisico.md)                                                                                                                    |

Lo que **sí** garantiza el export de Expo: que no hay imports rotos, rutas mal
declaradas ni errores de sintaxis en ninguna pantalla. Lo que **no** garantiza:
nada de lo que solo se ve corriendo en un teléfono.

### Métricas del anteproyecto

| Métrica                           | Objetivo              | Estado                                                                                                                       |
| ---------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Clasificación URL / no-URL        | ≥ 98%                | ✅ Cubierta por tests                                                                                                        |
| Cobertura de pruebas unitarias     | ≥ 70%                | ✅ 100% statements                                                                                                           |
| Persistencia offline del historial | 100% recuperable      | ✅ Cubierta por tests                                                                                                        |
| Reportes con payload completo      | 100%                  | ✅ Cubierta por tests                                                                                                        |
| T_scan (p90)                       | ≤ 5 s                | ⏳ Instrumentado;**falta correr la prueba 1.4**                                                                        |
| TDR (tasa de detección)           | ≥ 95%                | ⏳ Igual: teléfono físico + 30 QRs                                                                                         |
| T_F1 (p90)                         | ≤ 5 s                | ⏳ Timeout implementado;**necesita backend funcionando**                                                               |
| T_total                            | ≤ 35 s               | ⏳ Igual                                                                                                                     |
| Detección de maliciosos           | ≥ 90%                | ⏳ Necesita backend + muestra de PhishTank/Tranco                                                                            |
| Falsos positivos                   | ≤ 5%                 | ⏳ Igual                                                                                                                     |
| Geocodificación legible           | ≥ 85%                | ⏳ Lógica cubierta; checklist listo en[prueba_telefono_fisico.md](TAREAS_POR_HACER/prueba_telefono_fisico.md) §B            |
| Story Card generada                | ≥ 90%                | ⏳ Checklist listo en[prueba_telefono_fisico.md](TAREAS_POR_HACER/prueba_telefono_fisico.md) §C                              |
| Comprensión del veredicto         | ≥ 90%                | ⏳ Prueba de usabilidad (5 participantes)                                                                                    |
| Finalización del flujo            | ≥ 85%                | ⏳ Igual                                                                                                                     |
| T_learn                            | ≤ 60 s               | ⏳ Igual                                                                                                                     |
| T_start                            | ≤ 3 s                | ⏳ Medir en dispositivo de gama media                                                                                        |
| Compatibilidad Android ≥ 10       | sin errores críticos | ⏳ El bundle JS exporta limpio;**falta el APK y probarlo en teléfono** (§8.2). **iOS: fuera de alcance** (§4) |

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

### QRs para la demostración

Estos son los que hacen falta para enseñar los tres veredictos. **Los puntajes
están verificados contra el endpoint real el 2026-09-20** — no son inventados:

| Contenido del QR                              | Puntaje | Veredicto              | Qué detecta el backend                          |
| --------------------------------------------- | ------- | ---------------------- | ------------------------------------------------ |
| `https://github.com`                        | 0       | 🟢**seguro**     | Nada. Sirve para mostrar el caso limpio          |
| `http://banco-lndustrial-seguro.top/acceso` | 40      | 🟡**sospechoso** | TLD`.top` de riesgo + sin HTTPS                |
| `http://192.168.1.1/login.php`              | 60      | 🔴**malicioso**  | Host que es una IP + sin HTTPS + palabra "login" |

> Los puntajes los calcula el backend en vivo, así que **pueden cambiar** si
> Fabi ajusta los pesos. Conviene volver a pasar estas tres URLs por `curl`
> antes de la defensa:
>
> ```bash
> curl -X POST "$API/analyze" -H "Content-Type: application/json" >   -d '{"url":"http://192.168.1.1/login.php"}'
> ```

**La demo que mejor se ve:** escanear las tres en orden. Cambian el emblema, el
color, el medidor de riesgo y —lo más convincente— los criterios del acordeón,
que son texto real del backend: *"Host es una IP: 192.168.1.1"*.

**La segunda mejor:** apagá el wifi y escaneá. La app muestra el pop-up
*"Error, verifica tu conexión a internet"* y vuelve al escáner, en vez de
colgarse o mentir.

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
    analysis/            Contrato + adaptador + servicio real + umbrales
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

| Qué                          | Dónde                                                           | Por qué síncrono                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Historial (tope 20)           | [historyStorage.ts](src/services/storage/historyStorage.ts)       | Para que la lista no aparezca vacía un instante                                                                                 |
| Si ya se vio el onboarding    | [onboardingStorage.ts](src/services/storage/onboardingStorage.ts) | `app/index.tsx` decide **durante el render** a dónde redirigir; asíncrono daría un parpadeo de la pantalla equivocada |
| Si se concedió la ubicación | [locationStorage.ts](src/services/storage/locationStorage.ts)     | Se lee en el primer render del contexto                                                                                          |

Los tres fallan hacia el lado seguro: si la lectura revienta, el historial sale
vacío, el onboarding se repite y la ubicación queda apagada. Ninguno tumba la app.

> **Por qué la ubicación se persiste.** Al hacer que el onboarding corriera una
> sola vez, `locationEnabled` quedó viviendo solo en memoria: como nadie volvía
> a pasar por la pantalla que lo enciende, tras el primer reinicio el historial
> **dejaba de anotar el lugar para siempre, y en silencio**. Las dos
> persistencias tienen que ir juntas.

### Por qué `AnalysisService` sigue siendo una interfaz

Las pantallas consumen un `AnalysisResult`, no una implementación:

```
app/analysis/loading.tsx
        ↓ remoteAnalysisService.analyze(url)
  AnalysisService  (interfaz, types.ts)
        └── remoteAnalysisService    HTTP + adaptador + degradación
                 ↓
           adaptAnalysis.ts          traduce la respuesta real y
                                     deduce el veredicto del puntaje (§5.2)
```

Hoy hay una sola implementación —el mock se eliminó— así que la interfaz ya no
sirve para elegir entre dos. Se conserva porque sigue haciendo dos cosas: los
tests inyectan dobles sin tocar la red, y el día que haya que cambiar de
proveedor o meter caché, entra ahí sin que ninguna pantalla se entere.

El único lugar donde vive la traducción del backend es
[adaptAnalysis.ts](src/services/analysis/adaptAnalysis.ts): las pantallas nunca
ven la forma cruda de la respuesta.

### Qué filtros se anuncian, y por qué es una lista aparte

[`enabledFilters.ts`](src/services/analysis/enabledFilters.ts) tiene una sola
constante, `ENABLED_FILTERS`, con los filtros que esta versión anuncia **como
etapas**. Hoy solo una; F2.1 y F2.2 están **comentados al lado**, listos para
descomentar.

> **Ojo con el porqué, que cambió.** F2.1 y F2.2 **sí existen** en el backend
> (verificado el 2026-10-01: devuelve `criterios_f2_1` poblados e
> `indicadores_f2_2` con VirusTotal). Siguen apagados porque el backend **no los
> reporta como etapas separadas**: manda una sola respuesta plana. Encenderlos
> pintaría tres acordeones y tres etapas de carga para una única respuesta.
> **Lo que llega de esos filtros no se pierde:** el adaptador junta las dos
> listas en la sección activa (§5.2).

Es deliberado que **no** sea el tipo `AnalysisStageKey`, y la diferencia importa:

|                      | Qué es                                                    | Quién manda               |
| -------------------- | ---------------------------------------------------------- | -------------------------- |
| `AnalysisStageKey` | El**vocabulario**: las claves que la app sabe pintar | El contrato con el backend |
| `ENABLED_FILTERS`  | La**lista activa**: lo que esta versión anuncia     | Una decisión de producto  |

`AnalysisStageKey` es un tipo de **entrada**: tipa lo que el backend manda
(`sections[].key`, `pending[]`). Recortarlo haría que el adaptador rechazara
respuestas válidas, y obligaría a **borrar** el icono y el copy de cada filtro
apagado — justo lo contrario de poder reactivarlos descomentando. Por eso el
union se queda completo y la lista activa vive aparte.

Quién lee la lista:

- `placeholderSections()` en [adaptAnalysis.ts](src/services/analysis/adaptAnalysis.ts)
  → solo rellena "SIN COMPLETAR" para filtros activos.
- [details.tsx](app/analysis/details.tsx) → solo pinta sus acordeones.
- `analysisStages` en [analysisStages.ts](src/services/analysis/analysisStages.ts)
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
> cuarto veredicto, el cambio entra ahí. Hoy `PENDIENTE` e `INCIERTO` no se
> muestran: el adaptador deduce del puntaje y, si no hay, lanza
> `ApiError('INCONCLUSIVE')` y la pantalla de carga avisa con un pop-up.

---

## 7.9 Integración de la cascada completa (2026-10-11)

El backend entregó F1 + F2.1 + F2.2 + F2.3 y el endpoint `/report`
(`qrisk-endpoint-doc.md`). Esto es lo que cambió en la app, y lo que se midió
antes de cambiarlo.

### Lo que devuelve el backend hoy, medido

Cuatro llamadas en vivo el 2026-10-11, no ejemplos de la documentación:

| Caso                         | `veredicto_final` | `filtro_decisivo` | Tiempo          | Captura       |
| ---------------------------- | ------------------- | ------------------- | --------------- | ------------- |
| `resultadoF1: "SEGURO"`    | **SEGURO**    | F1                  | **5.5 s** | no            |
| `resultadoF1: "MALICIOSO"` | **MALICIOSO** | F1                  | 5.3 s           | no            |
| Score 95 (`.top` + login)  | SOSPECHOSO          | F2.1                | 10.6-24.5 s     | no            |
| Acortador + VirusTotal       | SOSPECHOSO          | F2.2                | 27.8 s          | **sí** |
| Score 55                     | PENDIENTE           | null                | 24.2 s          | no            |
| `github.com` sin F1        | PENDIENTE           | null                | 33.2 s          | sí           |

**El techo del veredicto se rompió:** el backend ya devuelve MALICIOSO y
SEGURO, cosa que no hacía. El pendiente nº 1 de §8 está resuelto en su parte
principal.

### F1 vive en la app

El contrato espera que el **cliente** resuelva F1 y mande su conclusión en
`resultadoF1`; con SEGURO o MALICIOSO el backend corta en ~5 s en vez de correr
la cascada completa. El backend implementa el corte, no las listas.

La app lo resuelve con [localF1.ts](src/services/analysis/localF1.ts): una
lista pequeña de dominios de reputación no discutida. **Dos reglas la hacen
segura:**

1. **Coincidencia exacta de dominio**, nunca por substring. `includes()` o un
   `endsWith()` suelto convertirían la whitelist en el agujero que intenta
   cerrar: `google.com.phishing.top` *contiene* "google.com" y `no-github.com`
   *termina* en "github.com". Hay 7 tests que fijan el rechazo de esos casos.
2. **Solo HTTPS.** Un `http://github.com` no se marca seguro: el dominio puede
   ser legítimo y la conexión seguir siendo interceptable.

**No hay lista negra local, a propósito:** quedaría obsoleta el día que se
compila. Esa detección le toca a F2.2, que consulta en vivo.

Ganancia medida: **5.5 s en lugar de 24-35 s** para los dominios de la lista.

### El timeout subió a 40 s, y por qué no a 45

La documentación pide 40-45 s. Se eligieron **40** porque hay un techo que no
depende de esta app: **API Gateway corta a los 35 s con HTTP 504**, con la
Lambda todavía trabajando. Medido el 2026-10-11: de tres URLs nuevas, una
devolvió 504 a los 35.2 s. Por encima de ~36 s no hay nada que esperar.

Con el tope anterior de 25 s, los análisis de 26-35 s —que **sí** completan— se
perdían por culpa del cliente.

El aviso de "esto está tardando" pasó de 8 s a **20 s**: con la cascada
completa salía en casi todos los análisis, y un aviso que aparece siempre deja
de informar.

### Las tres etapas de la cascada ya se anuncian

`ENABLED_FILTERS` pasó de `['reputation']` a las tres. Antes estaban apagadas
porque el backend mandaba una respuesta plana sin decir qué filtro corrió;
ahora informa `filtro_decisivo`, así que las etapas son reales y distinguibles,
con costos distintos (1.2 s / 8 s / 16 s en la pantalla de carga,
proporcionales a lo medido).

**F2.3 no es una etapa:** es un subproducto de F2.2. El backend genera la
captura dentro de esa etapa y la manda cuando pudo. Verificado: un corte por
F2.1 con score alto **no trae captura**, porque la cascada no llegó a F2.2.
Darle etapa propia anunciaría un paso que no siempre ocurre.

### Un bug que salió de verificar contra el backend real

Al pasar las respuestas reales por el adaptador, un **SEGURO de F1** se veía
con el acordeón **"SIN COMPLETAR"** y el texto *"esta parte no pudo
revisarse"*. No era cierto: la cascada no falló, concluyó antes, que es su
objetivo. Peor habría sido en un MALICIOSO de F1, donde sugeriría que la
condena es dudosa siendo la más firme que el sistema emite.

Hoy esos casos explican lo que de verdad pasó
([adaptAnalysis.ts](src/services/analysis/adaptAnalysis.ts),
`earlyVerdictSection`), con 6 tests que lo fijan.

### `verdictThresholds.ts` sigue existiendo, y ahora por otra razón

Ya no suple una ausencia total de veredictos. Suple el tramo que el umbral del
backend deja sin cubrir: F2.1 corta con `score > 60` **estricto**, así que un
score de 55 —TLD de riesgo + sin HTTPS + palabra clave, tres señales
simultáneas— devuelve PENDIENTE. Sin la derivación, esa URL terminaría en un
error de "no se pudo analizar" con la evidencia a la vista.

### Verificación tras la integración

| Verificación                                      | Resultado                                                 |
| -------------------------------------------------- | --------------------------------------------------------- |
| `npx tsc --noEmit`                               | ✅ Limpio                                                 |
| `npm test`                                       | ✅**307 tests**, 20 suites (eran 249 en 19)         |
| Cobertura de`src/services`                       | ✅ 99.75 % statements,**100 % líneas y funciones** |
| `npx expo export --platform android`             | ✅ Exit 0                                                 |
| Los 4 caminos de la cascada contra el backend real | ✅ F1, F2.1, F2.2 y PENDIENTE                             |

Evidencia en [RESULTADOS/fase3/](RESULTADOS/fase3/).

---

## 8. Pendientes conocidos

Por prioridad, con lo que desbloquea cada uno.

1. ~~**El backend nunca devuelve `MALICIOSO`.**~~ **RESUELTO el 2026-10-11.**
   El backend ya devuelve `MALICIOSO` y `SEGURO` cuando F1 concluye (medido:
   5.3 s). La app resuelve F1 con sus listas locales y manda `resultadoF1`
   (§7.9).
   → **Lo que queda:** el umbral de F2.1 es `score > 60` **estricto**, así que
   un puntaje alto por heurística tope en `SOSPECHOSO`, nunca en `MALICIOSO`.
   Un score de 95 devuelve SOSPECHOSO. Para la métrica *"detección de
   maliciosos ≥90%"* eso importa: solo una URL en una lista negra puede dar
   MALICIOSO hoy.
   → **Desbloquea:** Fabi, si se quiere que la heurística también concluya
   MALICIOSO.
2. **El 504 de API Gateway.** Medido el 2026-10-11: **de tres URLs nuevas, una
   devolvió HTTP 504 a los 35.2 s**, con la Lambda todavía trabajando. Es el
   límite duro de API Gateway y **ningún timeout del cliente puede superarlo**.
   El camino normal tarda 24-35 s, así que el margen es escaso.
   → **Mitigado de este lado:** el tope subió a 40 s (no 45: por encima de 36 s
   el 504 ya llegó) y el aviso de espera pasó a los 20 s. Un 504 muestra un
   pop-up de error y vuelve al escáner.
   → **Desbloquea:** Fabi. Devolver el veredicto primero y la captura aparte,
   o subir el límite de Gateway. Es el pendiente de backend más importante que
   queda.
3. **La caché no está funcionando.** El contrato declara TTL de 7 días para
   SOSPECHOSO/MALICIOSO y 24 h para PENDIENTE/SEGURO, con `desde_cache: true`
   en la respuesta. Medido el 2026-10-11: **la segunda consulta de la misma URL
   volvió a tardar 31-35 s y el campo `desde_cache` no apareció en ninguna
   llamada**. La app soporta el campo y nada depende de él.
   → **Impacto:** cada escaneo paga el costo completo, lo que agrava el punto 2.
   → **Desbloquea:** Fabi.
4. **`PENDIENTE` cuando el sitio está limpio.** `github.com` sin `resultadoF1`
   sigue devolviendo PENDIENTE con score 0: cero señales es evidencia de limpio,
   no de desconocido. La app lo suple por dos vías ahora: su lista local de F1
   (que da SEGURO en 5.5 s) y la derivación del puntaje (§5.2).
   → **Desbloquea:** Fabi, para los dominios que no estén en la lista local.
5. **El guardado de `/report` responde 500.** El endpoint **existe** (entrega
   S11) y valida bien: devuelve 400 con los códigos del contrato
   (`INVALID_INPUT`, `URL_INVALIDA`). Pero el guardado falla de forma
   consistente: tres intentos el 2026-10-11, los tres HTTP 500 en ~5 s.
   → **Mitigado de este lado:** la app apunta a `/report` con el payload del
   contrato y **distingue el 500 del fallo de red**, para no mandar a la persona
   a revisar una conexión que está bien.
   → **Desbloquea:** Fabi.
6. ~~**Generar el APK.**~~ **RESUELTO.** Hay ocho builds en EAS, siete
   terminados; el más reciente (`f1990f37`) es del commit actual. El build
   **local** de Gradle sigue colgándose en esta máquina, y eso no cambió: la vía
   es EAS. Ver [RESULTADOS/fase1_resultados.md](RESULTADOS/fase1_resultados.md).
7. **Correr la prueba 1.4** (T_scan y TDR). Es la única métrica de escaneo que
   falta y decide si se sigue con `expo-camera` o se migra a
   `react-native-vision-camera`.
   → **Desbloquea:** 30 QRs impresos. El teléfono ya está: Galaxy A11,
   Android 11 (ver [RESULTADOS/fase1_resultados.md](RESULTADOS/fase1_resultados.md)).
8. **iOS: fuera del alcance de esta entrega.** No es un pendiente — la entrega
   es **solo Android**, por decisión explícita y por no disponer de una Mac.
   Todo lo que no requiere macOS quedó configurado y **no se borró nada**:
   `bundleIdentifier`, `buildNumber`, los cuatro textos de permiso de
   `Info.plist`, la safe area y el teclado. Si alguien lo retoma, los pasos
   están en [ios_en_la_mac.md](TAREAS_POR_HACER/ios_en_la_mac.md) y hacen falta
   una Mac más una cuenta Apple Developer (US$99/año).
9. ~~**Los 8 puntos abiertos del contrato**~~ **CERRADOS.** El contrato
   vigente es [qrisk-endpoint-doc.md](qrisk-endpoint-doc.md), que define una
   sola llamada bloqueante (no polling ni SSE), el TTL de la URL de S3 (1 h) y
   la forma de las dos listas de señales. El adaptador sigue apuntando al
   comportamiento **verificado en vivo**, no solo al papel: donde los dos
   difieren —la caché y `desde_cache`— manda lo medido (punto 3).
   → **Queda un detalle del contrato:** `redireccion_detectada` puede traer en
   `detalle` una categoría en vez de la URL destino. La app lo pinta como texto
   informativo, que es lo que la propia documentación recomienda.
10. **Pruebas de usabilidad** (5 participantes) para comprensión del veredicto,
    finalización del flujo y T_learn.
    → **Desbloquea:** agendar a los participantes.
11. **Conectividad detectada por el fallo de red, no de antemano.** Sin
    internet, la petición al servidor falla con `NETWORK` y la app muestra el
    pop-up *"Error, verifica tu conexión a internet"*; un servidor caído muestra
    otro aviso. Saberlo antes de escanear pediría una dependencia nativa nueva
    (`expo-network`), que quedó fuera del alcance de esta entrega.

### Deuda técnica menor

- **El `fetch` de `jest-expo` es un stub y no sale a la red.** Devuelve
  `undefined` en vez de una respuesta, así que los tests de
  `safeBrowsing.ts` lo mockean, como ya se hacía con `expo-sqlite/kv-store`.
  Se prueba la lógica del cliente (qué manda, cómo interpreta cada respuesta,
  cómo degrada ante cada fallo), no la conectividad real. La verificación contra
  la API en vivo está en
  [RESULTADOS/fase4_5/f1_verificacion_en_vivo.js](RESULTADOS/fase4_5/f1_verificacion_en_vivo.js),
  que corre con Node: **8/8 casos correctos, 72-324 ms**.
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

### Endurecido el 2026-10-01

Cuatro casos que no se habían observado nunca, pero cuyo fallo habría sido
silencioso y en el peor momento. Ninguno cambia lo que se ve hoy:

| Qué                                                                                       | Antes                                                                                                        | Ahora                                                                                                                                      |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Puntaje fuera de 0-100 ([verdictThresholds.ts](src/services/analysis/verdictThresholds.ts)) | Un`-20` daba **"seguro"** y un `150` pintaba el medidor desbordado                                 | Fuera de escala → sin veredicto (aviso de error) o medidor neutro. Un puntaje así significa que el backend cambió de escala, no que el sitio sea inofensivo |
| `sections[]` sin validar ([adaptAnalysis.ts](src/services/analysis/adaptAnalysis.ts))     | Se confiaba en un`as`: un `findings` que no fuera arreglo rompía la pantalla de detalle                 | Se valida la forma mínima y se descarta lo que no se puede pintar, igual que`isHistoryEntry` con lo que sale del disco                  |
| Cancelar ≠ timeout ([httpClient.ts](src/services/api/httpClient.ts))                       | Salir de la pantalla reportaba*"El análisis tardó demasiado"*, marcado reintentable                      | Código`CANCELLED` propio, no reintentable: nadie espera ya esa respuesta                                                                |
| Atrás desde el historial ([result.tsx](app/analysis/result.tsx))                           | `replace('/scanner')` **destruía** el historial: abrir una fila y tocar atrás dejaba en la cámara | `back()` vuelve a donde se vino. Desde el escáner se comporta igual que antes                                                           |

> **Por qué estos y no otros.** El criterio fue el mismo en los cuatro: el fallo
> sería invisible hasta que ocurre, y entonces se ve como un veredicto
> equivocado o una pantalla rota justo después de escanear. Los cuatro tienen
> tests que fijan el comportamiento nuevo.

Decisiones conscientes de **no** arreglar en esta entrega:

- **Sin detección de conectividad.** Ver el punto 9 de §8. Añadir `netinfo` a horas de la
  entrega, para mejorar un mensaje de error que ya es honesto, tenía peor
  relación riesgo/beneficio que documentarlo.
- ~~**`addScan` escribe a disco dentro de un updater de `setState`**~~
  **Arreglado el 2026-10-01** ([AppStateContext.tsx](src/store/AppStateContext.tsx)).
  `appendScan` hacía dos cosas —calcular la lista nueva y persistirla— y se
  llamaba dentro del updater, donde React puede invocar la función más de una
  vez. Ahora el updater es puro: `withScanAppended` calcula, y el disco se toca
  **una sola vez**, fuera. Se usó un `useRef` como espejo del historial en vez
  de un `useEffect` para que la escritura siga siendo síncrona y junto a la
  acción que la causa, como el resto del almacenamiento (§7).
- **`timeouts.total` (35 s) está definido y nunca se usa.** El presupuesto por
  petición (25 s) sí se aplica; el de la cascada completa no tiene sentido hasta
  que haya más de un filtro corriendo.
- **`paddingBottom: 24` fijo en el pie de las 7 pantallas**, que se suma al
  `insets.bottom` que ya aplica `Screen`. En un Android con navegación por
  gestos el pie queda un poco más holgado de lo que dice el mockup. Es un patrón
  consistente en toda la app, no un descuido suelto: tocarlo cambia el layout de
  las siete pantallas a la vez y no hay teléfono donde verificarlo hoy.
- **Los umbrales de veredicto los pone el frontend** (§5.2). Es una
  responsabilidad que pertenece al backend, y está así porque él no concluye.
  Aislado en un archivo propio y se desmonta solo cuando Fabi lo conecte.
- **Sin respaldo si el backend se cae.** Al eliminar el mock, la app depende por
  completo del endpoint. Muestra un aviso de error en vez de romperse, pero
  no hay demo alternativa. Fue una decisión explícita.
- **El `timeout` de análisis es de 25 s, no de los 5 s de la métrica T_F1.** No
  es lo mismo: T_F1 mide lo que tarda el backend, no cuándo la app se rinde. El
  backend tarda 14.5 s en una URL nueva (§8.2), así que cortar antes convertiría
  análisis buenos en errores. Hay que bajarlo cuando Fabi mejore la latencia.
