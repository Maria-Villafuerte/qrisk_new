# Hallazgo: qué cubre cada filtro, medido contra amenazas activas

**Fecha:** 12 de octubre de 2026
**Fuente de las URLs:** URLhaus (abuse.ch), feed `csv_recent`, descargado ese día.
17.271 URLs maliciosas marcadas como `online`, varias reportadas horas antes.

Esto salió de preparar la muestra para TDM y es, en sí, un resultado del
trabajo: **no todos los filtros cubren las mismas amenazas**, y eso justifica
que el sistema sea una cascada y no un solo filtro.

---

## Lo que se midió

22 URLs maliciosas **activas** consultadas contra Google Safe Browsing (F1):

| Tipo de URL | Cantidad | Detectadas por F1 |
|---|---|---|
| IP literal con puerto alto (`http://186.149.204.12:37018/bin.sh`) | 10 | **0** |
| Dominio con carga maliciosa (`.ps1`, `.exe`, `.png` con payload) | 12 | **0** |
| **Total** | **22** | **0** |

Se amplió la consulta a los cuatro tipos de amenaza que ofrece la API
(`MALWARE`, `SOCIAL_ENGINEERING`, `UNWANTED_SOFTWARE`,
`POTENTIALLY_HARMFUL_APPLICATION`) y el resultado no cambió.

### La consulta no estaba mal

Control ejecutado en la misma sesión, con la misma clave:

| URL de control | Resultado |
|---|---|
| `http://testsafebrowsing.appspot.com/s/phishing.html` | **DETECTADA** |
| `http://malware.testing.google.test/testing/malware/` | **DETECTADA** |

Así que el 0/22 es un hecho sobre la cobertura de Safe Browsing, no un error de
integración.

---

## Por qué Safe Browsing no las ve

Las 22 URLs no son phishing: son **infraestructura de distribución de
malware**. Dos patrones:

1. **Botnet sobre IP literal.** `http://186.149.204.12:37018/bin.sh` — una IP
   con puerto alto sirviendo un script de shell. Safe Browsing indexa
   principalmente sitios web que un navegador visitaría; una IP efímera que
   sirve payloads a dispositivos infectados no entra en esas listas.

2. **Carga alojada en dominio comprometido.** `twejamaica.org/.../secured_stub.ps1`
   — un sitio legítimo al que le subieron un script de PowerShell. El *dominio*
   no es malicioso, así que no está en listas; el *archivo* sí lo es.

Safe Browsing está optimizado para proteger a una persona que **navega**. Estas
URLs no se navegan: las descarga malware ya instalado.

---

## Lo que esto demuestra sobre la cascada

Las mismas URLs contra el resto de los filtros:

| URL | F1 | F2.1 (heurística) | F2.2 (VirusTotal/URLScan) |
|---|---|---|---|
| `http://186.149.204.12:37018/bin.sh` | no | **`ip_literal` = 30 pts** | 504 (no completó) |
| `twejamaica.org/.../secured_stub.ps1` | no | score 0 | 504 (no completó) |
| `summitcapitalpatners.ink/img_063332.png` | no | score 0 | **SOSPECHOSO** ✅ |

Tres conclusiones, cada una verificable:

**1. F2.1 cubre lo que F1 no ve.** La IP literal pesa 30 puntos en la
heurística. F1 no la conoce, F2.1 la marca sin consultar nada externo.

**2. F2.2 cubre lo que ni F1 ni F2.1 ven.** La tercera URL tiene puntaje
heurístico **0** —un `.png` en un dominio de aspecto normal— y Safe Browsing no
la conoce. VirusTotal sí. **Con un solo filtro, esa URL habría pasado como
benigna.**

**3. Ningún filtro sobra.** No hay una sola URL de las tres que se detecte por
más de una vía. Esto es el argumento empírico de por qué el anteproyecto
especifica una cascada.

---

## Consecuencia para la métrica TDM

El anteproyecto define TDM como *"% de URLs maliciosas verificadas que reciben
veredicto MALICIOSO"*, criterio ≥ 90 %.

**Hay que enunciarla con precisión, porque el número depende de qué se mida:**

- Hoy **solo F1 puede devolver MALICIOSO**. F2.1 y F2.2 topan en SOSPECHOSO por
  el umbral del backend (`score > 60` solo concluye SOSPECHOSO).
- Y F1 solo conoce lo que está en Safe Browsing.

Así que una TDM medida sobre malware de distribución daría **cerca de 0 %**, y
eso no sería un fallo de detección: el sistema **sí detecta** esas URLs, pero
las etiqueta SOSPECHOSO, no MALICIOSO.

### Qué conviene reportar

**Dos métricas en vez de una:**

| Métrica | Qué mide | Dónde está el techo |
|---|---|---|
| **TDM estricta** | % que recibe `MALICIOSO` | El umbral del backend |
| **Tasa de advertencia** | % que recibe `MALICIOSO` **o** `SOSPECHOSO` | La detección real |

La segunda es la que mide si el producto cumple su propósito: advertir a la
persona antes de que entre. Para un usuario, "sospechoso" y "malicioso" llevan
a la misma decisión —no entrar—; la diferencia de etiqueta es interna.

### Y qué muestra usar

**Para phishing** (lo que el anteproyecto nombra): PhishTank u OpenPhish, URLs
reportadas en los últimos días. Es lo que Safe Browsing sí cubre.

**No** usar malware de distribución (URLhaus) para TDM: mide otra cosa. Sirve,
en cambio, para este hallazgo de cobertura, que es un resultado por derecho
propio.

---

## Nota sobre el dataset de Kaggle

`sid321axn/malicious-urls-dataset`: 651.191 URLs (428.103 benignas, 96.457
defacement, 94.111 phishing, 32.520 malware), licencia **CC0 dominio público**,
curado de ISCX-URL-2016, Malware Domain Blacklist, PhishTank y PhishStorm.

**Es un dataset de entrenamiento, no de medición en vivo.** Sus URLs son de
2016-2021, así que la mayoría ya no existe y Safe Browsing las habrá purgado.
Medir TDM con él arrojaría un número bajo que reflejaría la antigüedad del
dataset, no la capacidad del sistema.

**Uso recomendado:** como control histórico junto a una muestra viva. El
contraste entre ambas —detección sobre amenazas vigentes vs. amenazas
extintas— es en sí un resultado que vale reportar, y de paso explica por qué
las listas de reputación tienen que consultarse en línea y no empaquetarse en
la app (ver la decisión de no incluir lista negra local en
[localF1.ts](../../src/services/analysis/localF1.ts)).

---

## Un dato operativo: el 504 otra vez

De las tres URLs probadas contra la cascada completa, **dos dieron HTTP 504** a
los 35 s. Es el límite de API Gateway, ya documentado (README §8.2). Para una
medición de 50 URLs hay que contar cuántas se cortan así y reportarlo: es el
dato que sostiene ese pendiente del backend.
