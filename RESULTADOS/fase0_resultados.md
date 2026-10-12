# Fase 0 — Verificación de la lógica de negocio

**Fecha de medición:** 11 de octubre de 2026, 16:32
**Resultado:** las 4 métricas de esta fase **cumplen** su criterio.

Mediciones obtenidas de corridas reales. La evidencia cruda está en
[`fase0/`](fase0/), un archivo por medición, y va al anexo de la tesis.

---

## Entorno de medición

Se declara para que las mediciones sean reproducibles.

| Componente | Versión |
|---|---|
| Node | v20.20.2 |
| npm | 10.8.2 |
| Sistema operativo | Windows 11 Pro 10.0.26200 |
| Expo SDK | ~57.0.12 |
| React Native | 0.86.2 |
| jest-expo | ~57.0.4 |

Evidencia: [`fase0/0.5_entorno.txt`](fase0/0.5_entorno.txt)

---

## Resumen

| # | Métrica | Criterio | Obtenido | ¿Cumple? |
|---|---|---|---|---|
| 0.1 | Cobertura de pruebas unitarias | ≥ 70 % | **99.72 %** statements · **100 %** líneas | ✅ |
| 0.2 | Clasificación URL / no-URL | ≥ 98 % | **100 %** (18/18 casos) | ✅ |
| 0.3 | Persistencia offline del historial | 100 % recuperable | **100 %** (36/36 casos) | ✅ |
| 0.4 | Reportes con carga completa | 100 % | **100 %** (16/16 casos) | ✅ |

Contexto: la suite completa da **249 tests en 19 suites, todos en verde**, en
3.4 s. `npx tsc --noEmit` termina sin errores.

---

## 0.1 · Cobertura de pruebas unitarias

**Criterio del anteproyecto:** ≥ 70 %
**Instrumento:** informe de cobertura automatizado
**Comando:**

    npm test -- --coverage --collectCoverageFrom='src/services/**/*.ts'

### Resultado

| Dimensión | Obtenido | Criterio |
|---|---|---|
| Statements | **99.72 %** | ≥ 70 % |
| Branches | **98.13 %** | ≥ 70 % |
| Functions | **100 %** | ≥ 70 % |
| Lines | **100 %** | ≥ 70 % |

**Supera el criterio por 29.72 puntos** en statements, y alcanza el 100 % en
líneas y funciones.

### Desglose por módulo

| Módulo | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| `analysis` | 100 % | 100 % | 100 % | 100 % |
| `api` | 98.83 % | 97.56 % | 100 % | 100 % |
| `format` | 100 % | 90.9 % | 100 % | 100 % |
| `location` | 100 % | 100 % | 100 % | 100 % |
| `qr` | 100 % | 97.26 % | 100 % | 100 % |
| `report` | 100 % | 100 % | 100 % | 100 % |
| `storage` | 100 % | 95 % | 100 % | 100 % |

### Nota metodológica

El 0.28 % que falta para el 100 % en statements corresponde a dos líneas de
`errors.ts` (59 y 96) y a los archivos `types.ts` e `index.ts`, que solo
contienen declaraciones de tipos y reexportaciones: no tienen código
ejecutable, de modo que su 0 % es un artefacto del medidor y no una ausencia de
pruebas. Las cinco ramas restantes son guardas defensivas sobre entradas que el
backend no ha producido nunca.

**Alcance declarado:** la medición cubre `src/services`, que es la lógica de
negocio. No cubre los componentes de interfaz, cuya verificación corresponde a
los niveles 2 y 3 de la estrategia de validación.

Evidencia: [`fase0/0.1_cobertura.txt`](fase0/0.1_cobertura.txt)

---

## 0.2 · Clasificación URL / no-URL

**Criterio del anteproyecto:** ≥ 98 %
**Instrumento:** pruebas unitarias (esta fase) y prueba 1.4 en dispositivo (fase 2)
**Comando:**

    npx jest src/services/qr --verbose

### Resultado

**18 de 18 casos aprobados = 100 %** en `classifyQr.test.ts`.

El módulo `qr` completo aporta 50 tests en 3 suites:

| Suite | Tests | Qué cubre |
|---|---|---|
| `classifyQr.test.ts` | **18** | La clasificación propiamente dicha |
| `scanMetrics.test.ts` | 23 | Instrumentación de T_scan y TDR |
| `readmeExamples.test.ts` | 9 | Los ejemplos documentados del README |

La métrica se computa sobre los 18 de `classifyQr`, que es el clasificador. Los
9 de `readmeExamples` verifican además que los casos publicados en la
documentación se comportan como se afirma.

### Formatos verificados

Los 18 casos cubren los ocho formatos que la aplicación distingue:

- **Enlaces:** `https` y `http`, esquema en mayúsculas, con espacios
  alrededor, dominio sin esquema (al que añade `https://`), subdominios,
  puerto y cadena de consulta.
- **No enlaces:** Wi-Fi (con sus cuatro campos, contraseña enmascarada, redes
  abiertas y ocultas, escapes de `;` `:` y `\`), vCard, mailto, tel, geo y
  texto suelto.
- **Casos límite:** no manda texto suelto al análisis, y no confunde un número
  de serie con un dominio.

### Nota metodológica

Este resultado mide el **clasificador sobre cadenas de texto**, no la lectura
de la cámara. La prueba 1.4 (fase 2) aporta la medición con cámara real sobre
30 QRs físicos. **En el capítulo van los dos valores, separados y etiquetados**,
porque miden cosas distintas: uno el parseo, el otro la captación óptica.

Evidencia: [`fase0/0.2_clasificacion.txt`](fase0/0.2_clasificacion.txt) ·
[`fase0/0.2_clasificacion_casos.txt`](fase0/0.2_clasificacion_casos.txt)

---

## 0.3 · Persistencia offline del historial

**Criterio del anteproyecto:** 100 % recuperable
**Instrumento:** pruebas unitarias y protocolo en dispositivo (bloque B3)
**Comando:**

    npx jest src/services/storage --verbose

### Resultado

**36 de 36 casos aprobados = 100 %**, en 3 suites (`historyStorage`,
`locationStorage`, `onboardingStorage`).

### Casos que sostienen la métrica

Los que responden directamente al criterio, citados textualmente de la corrida:

| Caso | Qué demuestra |
|---|---|
| *recupera intacto lo que guardó (sobrevive cerrar la app)* | Recuperabilidad tras cierre completo |
| *guarda el análisis completo, para reabrirlo sin conexión* | Operación sin red |
| *respeta el tope de 20 y descarta el más viejo* | Política de retención |
| *persiste el recorte, no solo el arreglo en memoria* | El recorte llega al disco |
| *pone el más reciente primero* | Orden de presentación |
| *devuelve vacío si el JSON no parsea* | Degradación ante dato corrupto |
| *descarta los registros incompletos y conserva los buenos* | Validación por registro |

### Robustez ante fallo

Siete casos verifican que un fallo de almacenamiento **no propaga el error**:
si el disco no responde, la lectura devuelve vacío y la escritura no lanza. La
aplicación no se cae por un fallo de persistencia.

### Nota metodológica

La medición usa `expo-sqlite/kv-store` **mockeado** (`jest.setup.js`): el módulo
nativo no existe en Node. Se verifica la lógica de persistencia —qué se guarda,
qué se recorta, qué se descarta, qué sobrevive—, **no el driver nativo**. La
verificación del driver real corresponde al bloque B3 del protocolo en
dispositivo, donde se cierra la aplicación por completo y se reabre.

Esta separación es deliberada y es la razón por la que la métrica aparece con
dos instrumentos en el cuadro de la metodología.

Evidencia: [`fase0/0.3_persistencia.txt`](fase0/0.3_persistencia.txt) ·
[`fase0/0.3_persistencia_casos.txt`](fase0/0.3_persistencia_casos.txt)

---

## 0.4 · Reportes con carga completa

**Criterio del anteproyecto:** 100 %
**Instrumento:** pruebas unitarias
**Comando:**

    npx jest src/services/report --verbose

### Resultado

**16 de 16 casos aprobados = 100 %.**

### Qué se verifica

| Grupo | Casos | Qué cubre |
|---|---|---|
| Validación de entrada | 5 | Campos opcionales vacíos, contenido normal, comentario y lugar demasiado largos, el límite exacto |
| Composición del payload | 5 | Incluye lo obligatorio, omite opcionales vacíos en vez de mandar cadenas vacías, recorta espacios, incluye `scanId` solo si el análisis lo trae |
| Envío y fallo | 6 | Devuelve ok al funcionar, no lanza ante fallo de red, marca no reintentable un rechazo del servidor, corta en el tope configurado |

### Dos casos de valor para el capítulo

**Anonimato.** El caso *"es anónimo: no lleva identificador de usuario ni
coordenadas"* verifica por prueba automatizada la regla de minimización de
datos que la metodología declara en su sección de ética. No es una afirmación
de diseño: es una aserción que falla si alguien agrega un identificador.

**Conservación del borrador.** El caso *"conserva lo escrito: el fallo no
destruye el borrador"* verifica una promesa explícita del producto, y es el
comportamiento que el bloque E4 del protocolo en dispositivo confirma a mano.

### Nota metodológica obligatoria

**Lo que esta métrica mide:** que el payload se arme completo, válido y anónimo,
y que un fallo de envío se maneje sin perder lo escrito.

**Lo que NO mide:** que el reporte llegue al servidor. **El endpoint `/reports`
no existe** en el backend, de modo que todo envío falla por construcción. El
cliente está implementado y probado; lo que falta es la contraparte.

Este resultado es legítimo enunciado con esa precisión, y deja de serlo si se
presenta como "los reportes funcionan". La métrica del anteproyecto dice
*"reportes con carga completa"* —la composición del payload—, y eso es
exactamente lo que se verificó.

Evidencia: [`fase0/0.4_reportes.txt`](fase0/0.4_reportes.txt) ·
[`fase0/0.4_reportes_casos.txt`](fase0/0.4_reportes_casos.txt)

---

## 0.5 · Evidencia complementaria

### Suite completa

    npm test

**249 tests, 19 suites, todos aprobados**, en 3.4 s.

Evidencia: [`fase0/0.5_suite_completa.txt`](fase0/0.5_suite_completa.txt)

### Verificación de tipos

    npx tsc --noEmit

Termina con **código de salida 0 y sin mensajes**: no hay errores de tipo en
las 9.182 líneas del proyecto. La salida vacía es el resultado.

Evidencia: [`fase0/0.5_typecheck.txt`](fase0/0.5_typecheck.txt) (vacío, como
corresponde)

---

## Inventario de evidencia

Todo en [`fase0/`](fase0/), listo para el anexo:

| Archivo | Contenido |
|---|---|
| `0.1_cobertura.txt` | Informe de cobertura completo, módulo por módulo |
| `0.2_clasificacion.txt` | Corrida del módulo `qr` |
| `0.2_clasificacion_casos.txt` | Los 18 casos de `classifyQr` por nombre |
| `0.3_persistencia.txt` | Corrida del módulo `storage` |
| `0.3_persistencia_casos.txt` | Los 36 casos por nombre |
| `0.4_reportes.txt` | Corrida del módulo `report` |
| `0.4_reportes_casos.txt` | Los 16 casos por nombre |
| `0.5_suite_completa.txt` | Las 19 suites |
| `0.5_typecheck.txt` | Salida de `tsc` (vacía) |
| `0.5_entorno.txt` | Versiones del entorno |

---

## Estado del plan

**Fase 0 cerrada: 4 de 17 métricas medidas y cumplidas.**

Lo que sigue, según [plan_resultados.md](../TAREAS_POR_HACER/plan_resultados.md):

| Fase | Métricas | Bloqueo |
|---|---|---|
| 1 — APK | habilita 2 y 4 | `eas login` |
| 2 — hardware | 4 | APK + teléfono |
| 4 — usabilidad | 3 | APK + 5 participantes |
| 3 — backend | 4 | Backend caído (de Fabi) |

Las cuatro métricas de esta fase son las únicas que no dependían de hardware,
de terceros ni de participantes. Las trece restantes sí.
