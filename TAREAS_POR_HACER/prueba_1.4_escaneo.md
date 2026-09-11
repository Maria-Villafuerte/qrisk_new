# Prueba 1.4 — Medición de T_scan y TDR en dispositivo real

Protocolo para la tarea 1.4 de la orden de trabajo. Es el **punto de decisión**
del Bloque 1: de aquí sale si se sigue con expo-camera o se migra a
react-native-vision-camera.

Fecha de la prueba: ____________  Dispositivo: ____________  Android: ______

---

## Antes de empezar

1. Teléfono Android con depuración USB activada (tarea 1.0).
2. Gama media, no el mejor teléfono disponible — la métrica T_start ≤ 3s está
   definida sobre gama media y conviene medir sobre algo representativo.
3. Compilar e instalar:

       npx expo run:android

   No sirve Expo Go: el proyecto usa código nativo generado por prebuild.

4. Dejar la consola de Metro visible. Cada lectura imprime una línea:

       [T_scan] 842 ms · OK · muestra 1 · android

   Esa línea es el dato que se anota. Sale de `src/services/qr/scanMetrics.ts`
   y solo se imprime en desarrollo (`__DEV__`).

---

## Qué se mide

| Métrica | Criterio | De dónde sale |
|---|---|---|
| **TDR** (tasa de detección) | ≥ 95 % | QRs detectados ÷ QRs presentados |
| **T_scan** | ≤ 5 s en p90 | línea `[T_scan]` de la consola |
| **Clasificación** | ≥ 98 % | que cada QR abra la pantalla correcta |

El cronómetro arranca cuando la pantalla del escáner queda lista y se detiene
cuando la cámara entrega un código. No incluye el análisis posterior: eso es
T_F1, que se mide en la tarea 6.4.

---

## La muestra: 30 QRs

Hay que variar las tres condiciones que el parqueo impone en la vida real.

**Por tamaño (10)**
- 3 pequeños (~2 cm de lado) — típico de una etiqueta o un ticket
- 4 medianos (~5 cm) — el caso normal, un volante o un menú
- 3 grandes (~15 cm o más) — un cartel a distancia

**Por ángulo (10)**
- 4 de frente
- 3 inclinados ~30°
- 3 inclinados ~45° — aquí es donde suele caerse la detección

**Por iluminación (10)**
- 4 con luz de día
- 3 en penumbra
- 3 en oscuridad **con la linterna encendida** — prueba también que
  `enableTorch` funciona en hardware

**Contenido:** que la muestra incluya al menos
- 20 QRs con URL (van al análisis)
- 5 QRs de Wi-Fi (`WIFI:T:WPA2;S:red;P:clave;;`) → pantalla de contenido
- 5 QRs de texto plano o contacto → pantalla de contenido genérica

Los últimos 10 son los que validan la métrica de clasificación ≥ 98 %.
La lógica ya está probada en frío (14/14 casos), así que aquí se está
comprobando la lectura de la cámara, no el parseo.

---

## Tabla de registro

| # | Tamaño | Ángulo | Luz | Contenido | ¿Detectó? | T_scan (ms) | Pantalla correcta |
|---|--------|--------|-----|-----------|-----------|-------------|-------------------|
| 1 |        |        |     |           |           |             |                   |
| 2 |        |        |     |           |           |             |                   |

(30 filas. Si un QR no se detecta en 10 segundos, se anota **NO** y se pasa al
siguiente: ese fallo cuenta contra el TDR.)

---

## Cómo se calculan los resultados

**TDR** = detectados ÷ 30 × 100

**T_scan p90**: ordenar los tiempos de menor a mayor y tomar el que deja al
90 % por debajo. Con 30 muestras es el valor en la posición 27.

En vez de calcularlo a mano, desde el depurador de Metro:

```js
import { summarizeScanMetrics } from './src/services/qr/scanMetrics';
summarizeScanMetrics();
// { count, medianMs, p90Ms, maxMs, meetsTarget }
```

`meetsTarget` aplica directamente el criterio de ≤ 5 s.

Para separar tandas de prueba: `resetScanSamples()`.

Nota: las muestras viven en memoria y se pierden al recargar la app. Conviene
anotar los tiempos en la tabla conforme salen, no confiar en leerlos al final.

---

## Criterio de corte

- **TDR ≥ 95 % y T_scan p90 ≤ 5 s** → seguir con expo-camera. Se anota el
  resultado y se cierra el Bloque 1.
- **No se alcanza** → migrar a react-native-vision-camera, como especifica el
  anteproyecto original. Son 1–2 días de trabajo.

Antes de concluir que hay que migrar, conviene descartar lo barato:

1. ¿Falla solo en ángulos de 45°? Puede ser cuestión de agrandar el área de
   escaneo, no de la librería.
2. ¿Falla solo en penumbra? Probar con la linterna: si con ella cumple, la
   solución puede ser sugerirla en la interfaz cuando hay poca luz.
3. ¿Falla solo con QRs pequeños a distancia? Es una limitación de enfoque, no
   de decodificación.

Si el fallo se concentra en un solo eje, se documenta como limitación conocida.
Si está repartido en los tres, la migración está justificada.

---

## Resultado

    TDR ................. ______ %      (criterio ≥ 95 %)
    T_scan p90 .......... ______ ms     (criterio ≤ 5000 ms)
    T_scan mediana ...... ______ ms
    Clasificación ....... ______ %      (criterio ≥ 98 %)

    DECISIÓN:  [ ] seguir con expo-camera   [ ] migrar a vision-camera

Observaciones (en qué condiciones falló, si hubo un patrón):
