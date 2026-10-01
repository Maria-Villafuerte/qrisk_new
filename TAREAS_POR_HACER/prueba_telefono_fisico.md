# Pruebas en teléfono físico

Todo lo que no se puede verificar desde la computadora: diálogos del sistema,
GPS real, la galería, y el análisis contra el backend de verdad. **~50 min** en
una sentada, siguiendo el orden de abajo.

| Bloque | Qué cubre | Tiempo |
|---|---|---|
| **A** | Arranque en frío y onboarding | 5 min |
| **A2** | Los tres veredictos, timeout, vista previa, abrir el sitio | 10 min |
| **B** | Geocodificación (métrica ≥ 85 %) | 10 min |
| **C** | Story Card (métrica ≥ 90 %) | 15 min |
| **D** | Camino sin conexión | 5 min |
| **E** | Teclado y safe area | 5 min |

**Antes de empezar:**

1. **Desinstalá cualquier QRisk anterior.** No es opcional: si queda la vieja,
   Android conserva permisos y almacenamiento, y no vas a ver el onboarding.
2. Instalá el APK nuevo (el enlace lo da `eas build:list`).
3. **Necesitás conexión a internet.** Ya no hay modo mock: todos los veredictos
   salen del backend real.

> Si algún paso falla, anotá **cuál** y **qué viste**. Un paso que falla con el
> dato de qué pasó vale más que diez marcados en verde.

---

## A · Arranque en frío y onboarding (5 min)

Esto valida el cambio más nuevo del repo: el onboarding corre **una sola vez**.

| # | Paso | Qué debe pasar | ✓ |
|---|------|----------------|---|
| A1 | Abrir la app recién instalada | Aparece el onboarding de **cámara**, paso 1 | |
| A2 | Conceder cámara | Diálogo del sistema; pasa a **ubicación**, paso 2 | |
| A3 | Conceder ubicación | Diálogo del sistema; entra al **escáner** | |
| A4 | **Cerrar la app por completo** (no minimizar) y reabrir | Entra **directo al escáner**, sin onboarding | |
| A5 | Repetir A4 una vez más | Igual: directo al escáner | |

> Si en A4 vuelve a salir el onboarding, la marca no se guardó:
> `onboardingStorage.ts`. Es el fallo que hay que reportar.

---

## A2 · El análisis real (10 min)

Esto es lo más nuevo de la app y nada de ello se ha probado en hardware.
**Necesitás conexión**: ya no hay modo mock, todo sale del backend.

Generá estos tres QR (cualquier generador online) y escanealos **en orden**:

| # | QR | Veredicto esperado | Qué mirar además | ✓ |
|---|----|--------------------|------------------|---|
| V1 | `https://github.com` | 🟢 **Seguro** | Acordeón "SIN ALERTAS". Botón **"Abrir sitio"** arriba | |
| V2 | `http://banco-lndustrial-seguro.top/acceso` | 🟡 **Sospechoso** | "2 ALERTAS": TLD `.top`, sin HTTPS | |
| V3 | `http://192.168.1.1/login.php` | 🔴 **Malicioso** | "3 ALERTAS": IP, sin HTTPS, "login" | |

> Si alguno da **"incierto"**, anotá **cuál y cuánto tardó**. Puede ser el
> backend sin concluir (conocido) o un timeout.

### El arreglo del timeout

| # | Paso | Qué debe pasar | ✓ |
|---|------|----------------|---|
| T1 | Escanear un QR de un sitio **que nadie haya escaneado antes** (tu blog, una noticia cualquiera) | Completa y da veredicto. **No** "incierto" | |
| T2 | Mirar el reloj mientras tanto | Puede tardar ~15 s. A los **8 s** debe aparecer *"Esto está tardando un poco más de lo normal…"* | |
| T3 | Escanear **el mismo** QR otra vez | Ahora responde en ~1 s (el backend lo tiene en caché) | |

> T1 es el arreglo de hoy: antes **todo sitio nuevo se cortaba a los 12 s** y
> daba "incierto". Si vuelve a pasar, el backend empeoró y hay que medirlo.

### La vista previa (F2.3)

| # | Paso | Qué debe pasar | ✓ |
|---|------|----------------|---|
| P1 | En cualquier resultado, **Ver más detalles** | Bajo el medidor sale **VISTA PREVIA** con una captura del sitio | |
| P2 | Mirar la captura | Es una **imagen fija**, no una página navegable. No se puede tocar ni hacer scroll dentro | |
| P3 | Abrir esa misma fila **desde el Historial** | La captura **no** aparece (su enlace caduca en 1 h). El resto se ve bien, **sin** imagen rota | |

> P3 es a propósito: la URL de la captura caduca, así que no se guarda.

### Abrir el sitio

| # | Paso | Qué debe pasar | ✓ |
|---|------|----------------|---|
| O1 | En el resultado **seguro** (V1), tocar **"Abrir sitio"** | Abre en el navegador del sistema. **Se ve la barra de direcciones** | |
| O2 | Volver a la app | El resultado sigue ahí | |
| O3 | En el **malicioso** (V3), tocar **"Abrir bajo mi propio riesgo"** | Sale una hoja con el dominio y **"3 señales de riesgo"** | |
| O4 | Mirar la hoja | **"Cancelar" es el botón destacado**, arriba | |
| O5 | Tocar Cancelar | Se cierra. **No** abre nada | |
| O6 | Volver a abrir y tocar "Abrir de todos modos" | Ahora sí abre, en el navegador | |

> O1: que se vea la barra de direcciones **no es un detalle**. Si la página se
> abriera dentro de la app, un sitio de phishing podría hacerse pasar por una
> pantalla de QRisk.

---

## B · Geocodificación inversa (10 min)

Mide la métrica **"geocodificación legible ≥ 85 %"**. Requiere GPS activo y
estar **al aire libre o junto a una ventana**: en interiores el GPS tarda o
falla, y eso no es culpa de la app.

| # | Paso | Qué debe pasar | ✓ |
|---|------|----------------|---|
| B1 | Escanear un QR de URL | Análisis → resultado | |
| B2 | Ir a **Historial** | La fila muestra **un nombre de lugar legible** (colonia, zona o ciudad), no coordenadas | |
| B3 | **Cerrar la app por completo y reabrir** → Historial | El lugar **sigue ahí** | |
| B4 | Repetir B1–B2 en **3 sitios distintos** | Al menos 3 de 4 dan un nombre legible (≥ 85 %) | |
| B5 | Apagar el GPS y escanear | La fila aparece **sin** lugar. La app **no** se cae ni muestra un error | |

### B6 · La regresión que hay que confirmar arreglada

Esto es lo más importante de esta prueba. Antes fallaba en silencio.

| # | Paso | Qué debe pasar | ✓ |
|---|------|----------------|---|
| B6 | Después de A4 (con la app ya reiniciada al menos una vez), escanear de nuevo y mirar el Historial | El lugar **sigue apareciendo** | |

> Si tras reiniciar la app el lugar deja de aparecer para siempre, volvió la
> regresión de `locationEnabled`: ver `locationStorage.ts`.

**Anotar:**

    Lugares legibles ...... ____ de ____     (criterio ≥ 85 %)
    ¿Sobrevive al reinicio?  [ ] sí  [ ] no

---

## C · Story Card (15 min)

Mide **"Story Card generada ≥ 90 %"**. Los diálogos de compartir y de galería
son del sistema operativo: es la única forma de verificarlos.

| # | Paso | Qué debe pasar | ✓ |
|---|------|----------------|---|
| C1 | Desde un resultado, tocar **Crear Story Card** | Abre la pantalla de Story Card | |
| C2 | Tomar una foto **con la cámara** | Diálogo de permiso (1ª vez); la foto aparece de fondo | |
| C3 | Mirar el QR de la tarjeta | Está cubierto con una **capa opaca**, NO difuminado | |
| C4 | **Intentar escanear ese QR** con otro teléfono | **No se puede leer.** Si se lee, es un fallo grave de seguridad | |
| C5 | Elegir una foto **de la galería** | Diálogo de permiso; la foto aparece de fondo | |
| C6 | **Compartir** | Abre la hoja de compartir del sistema; mandarla a WhatsApp o Telegram | |
| C7 | Ver la imagen recibida | Se ve completa, legible, con el veredicto y el dominio | |
| C8 | **Guardar en galería** | Diálogo de permiso; aparece en Fotos | |
| C9 | Repetir C1–C8 con un veredicto **distinto** (seguro y malicioso) | Los colores y el texto cambian con el veredicto | |

> **C4 es el que no se puede saltar.** La regla del README dice que el QR se
> cubre con capa opaca justo porque un QR medio borroso sigue siendo escaneable.

**Anotar:**

    Story Cards generadas OK ...... ____ de ____   (criterio ≥ 90 %)
    ¿El QR cubierto es ilegible?     [ ] sí  [ ] no

---

## D · Camino sin conexión (5 min)

Es **la demo que mejor se ve** en la defensa.

| # | Paso | Qué debe pasar | ✓ |
|---|------|----------------|---|
| D1 | Activar **modo avión** | | |
| D2 | Escanear un QR de URL | Da **"incierto"** con el aviso de degradación. **No** se cuelga ni miente | |
| D3 | Ver el **Historial** | Se ve completo, sin conexión | |
| D4 | Abrir una fila del historial | Reabre **su** veredicto, sin red | |
| D5 | Quitar el modo avión y escanear otra vez | Vuelve a funcionar normal | |

> En modo `mock` (el de por defecto) D2 da el veredicto del fixture aunque no
> haya red. Para ver la degradación real hay que correr con
> `EXPO_PUBLIC_ANALYSIS_MODE=remote`.

---

## E · Teclado y safe area (5 min)

| # | Paso | Qué debe pasar | ✓ |
|---|------|----------------|---|
| E1 | Desde un resultado, **Reportar QR** | Abre el formulario | |
| E2 | Tocar el último campo de texto | El teclado **no tapa** el campo | |
| E3 | Con el teclado abierto, tocar **Enviar** | Responde **al primer toque** | |
| E4 | Enviar sin conexión | Muestra el error y **conserva lo escrito** | |
| E5 | Reintentar | El botón vuelve a estar activo | |
| E6 | Revisar todas las pantallas | Nada queda bajo la barra de estado ni bajo la barra de gestos | |

> E4 es una promesa explícita del producto: `/reports` no existe en el backend,
> así que **siempre** va a fallar. Que no pierda lo escrito es lo que se
> demuestra.
