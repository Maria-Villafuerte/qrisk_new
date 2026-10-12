
**Desarrollo de un prototipo de aplicación móvil de análisis automatizado de URLs extraídos de códigos QR mediante análisis aislado:** Módulo de escaneo y diseño de interfaz de usuario con filtro de consulta estática a APIs de detección de amenazas

María José Villafuerte Arredondo



UNIVERSIDAD DEL VALLE DE GUATEMALA

Facultad de Ingeniería

![](Aspose.Words.48f2eeed-dfdd-413e-81c7-4239ad8a417f.001.png)


Desarrollo de un prototipo de aplicación móvil de análisis automatizado de URLs extraídos de códigos QR mediante análisis aislado: Módulo de escaneo y diseño de interfaz de usuario con filtro de consulta estática a APIs de detección de amenazas



Trabajo de graduación en modalidad de trabajo profesional presentado por María José Villafuerte Arredondo para optar al grado académico de Licenciado en Ingeniería en Ciencias de la Computación y Tecnologías de la Información


Guatemala

2026
# <a name="_toc230972414"></a>Índice general 


[Descripción general del trabajo	6](#_toc230972415)

[Definición del problema	7](#_toc230972416)

[Justificación	9](#_toc230972417)

[Objetivos	10](#_toc230972418)

[1.	Objetivo General	10](#_toc230972419)

[2.	Objetivos específicos	10](#_toc230972420)

[Marco teórico	11](#_toc230972421)

[3.	Amenazas de Seguridad en el entorno móvil	11](#_toc230972422)

[3.1	Phishing: Definición, Evolución y Estado del Arte	11](#_toc230972423)

[3.2	Quishing: El Phishing Mediante Códigos QR	11](#_toc230972424)

[3.3	Ingeniería Social y Susceptibilidad del Usuario Móvil	12](#_toc230972425)

[3.4	Análisis de URLs Maliciosas: Técnicas y Desafíos	12](#_toc230972426)

[4.	Estándar QR y su explotación como vector de ataque	13](#_toc230972427)

[4.1	Fundamentos Técnicos del Código QR (ISO/IEC 18004)	13](#_toc230972428)

[4.2	Tipos de Contenido Codificable y su Relevancia en la Detección	14](#_toc230972429)

[4.3	QR como Vector de Ataque: Superficie, Motivación y Anatomía	14](#_toc230972430)

[5.	Sistemas de detección y clasificación de amenazas	15](#_toc230972431)

[5.1	Listas Negras y Sistemas de Reputación de URLs	15](#_toc230972432)

[5.2	Threat Intelligence: Plataformas Colaborativas y Enriquecimiento de Datos	16](#_toc230972433)

[5.3	Análisis Heurístico de URLs	16](#_toc230972434)

[5.4	Machine Learning Aplicado a la Detección de URLs Maliciosas	17](#_toc230972435)

[5.5	Métricas de Evaluación de Clasificadores Binarios	18](#_toc230972436)

[6.	Escaneo y procesamiento nativo en dispositivos móviles	18](#_toc230972437)

[6.1	APIs Nativas de Detección de Códigos de Barras: Apple Vision y Google ML Kit	19](#_toc230972438)

[6.2	react-native-vision-camera y el Módulo CodeScanner	19](#_toc230972439)

[6.3	Decodificación de QR en Tiempo Real: Latencia y Rendimiento	20](#_toc230972440)

[7.	Desarrollo móvil multiplataforma con React Native	20](#_toc230972441)

[7.1	Arquitectura de React Native: Bridge, JSI y la New Architecture	20](#_toc230972442)

[7.2	Desarrollo Cross-Platform para iOS y Android desde una Sola Base de Código	21](#_toc230972443)

[8.	Seguridad en aplicaciones móviles	21](#_toc230972444)

[8.1	OWASP Mobile Application Security Verification Standard (MASVS)	22](#_toc230972445)

[8.2	Seguridad de Red en iOS: App Transport Security (ATS)	22](#_toc230972446)

[8.3	Seguridad de Red en Android: Network Security Configuration	23](#_toc230972447)

[8.4	Almacenamiento Local Seguro: MMKV	23](#_toc230972448)

[9.	Apis De Threat Intelligence Integradas En El Filtro F1	24](#_toc230972449)

[9.1	Google Safe Browsing API	24](#_toc230972450)

[9.2	VirusTotal API	24](#_toc230972451)

[9.3	PhishTank	25](#_toc230972452)

[9.4	URLhaus (abuse.ch)	25](#_toc230972453)

[9.5	MISP: Plataforma de Intercambio de Indicadores de Compromiso	26](#_toc230972454)

[10.	Geolocalización Y Servicios De Contexto	26](#_toc230972455)

[10.1	Geolocalización y Geocodificación Inversa en Plataformas Móviles	26](#_toc230972456)

[11.	Usabilidad y seguridad centrada en el usuario	27](#_toc230972457)

[11.1	Usable Security: Fundamentos y Modelo de Razonamiento	27](#_toc230972458)

[11.2	Efectividad de Advertencias de Seguridad en Dispositivos Móviles	28](#_toc230972459)

[12.	Arquitectura de backend en la nube	28](#_toc230972460)

[12.1	Arquitectura Serverless para el Backend del Filtro F1	28](#_toc230972461)

[Metodología	30](#_toc230972462)

[13.	Enfoque del trabajo	30](#_toc230972463)

[1.1.	Tipo de proyecto	30](#_toc230972464)

[1.2.	Justificación del enfoque seleccionado	30](#_toc230972465)

[14.	Metodología seleccionada	31](#_toc230972466)

[1.3.	Metodología adoptada	31](#_toc230972467)

[1.4.	Justificación técnica	31](#_toc230972468)

[15.	Las fases del proyecto	31](#_toc230972469)

[1.5.	Fase 1 — Diseño y Configuración de Entorno (Semanas 1–2)	32](#_toc230972470)

[1.6.	Fase 2 — Escaneo, F1 y Arquitectura Base del Frontend (Semanas 3–6)	32](#_toc230972471)

[1.7.	Fase 3 — Pantallas de Resultado Extendido: Filtro F2.1 (Semanas 7–9)	33](#_toc230972472)

[1.8.	Fase 4 — Pantallas F2.2 y F2.3 + Features Adicionales (Semanas 10–12)	34](#_toc230972473)

[1.9.	Fase 5 — Pruebas, Refinamiento y Documentación (Semanas 13–15)	34](#_toc230972474)

[1.10.	Fase de cierre — Preparación y Defensa (Semanas 16–17)	35](#_toc230972475)

[16.	Recursos necesarios	36](#_toc230972476)

[1.11.	Recursos humanos	36](#_toc230972477)

[1.12.	Recursos tecnológicos	36](#_toc230972478)

[1.13.	Recursos externos	38](#_toc230972479)

[1.14.	Estrategias para garantizar disponibilidad	38](#_toc230972480)

[17.	Viabilidad del proyecto	38](#_toc230972481)

[1.15.	Análisis de viabilidad técnica	38](#_toc230972482)

[1.16.	Viabilidad temporal	39](#_toc230972483)

[1.17.	Riesgos y estrategias de mitigación	39](#_toc230972484)

[18.	Métricas e indicadores para evaluar los resultados	40](#_toc230972485)

[1.18.	Métricas del Módulo de Escaneo (Frontend)	40](#_toc230972486)

[1.19.	Métricas del Filtro F1 — Reputación (Frontend + Backend)	41](#_toc230972487)

[1.20.	Métricas de Usabilidad (Frontend)	41](#_toc230972488)

[1.21.	Métricas de Funcionalidades Secundarias (Frontend)	42](#_toc230972489)

[1.22.	Métricas de Calidad Técnica General	43](#_toc230972490)

[19.	Trazabilidad metodológica	44](#_toc230972491)

[20.	Coherencia entre Problema, Objetivos, Metodología y Métricas	45](#_toc230972492)

[Definición y alcance	46](#_toc230972493)

[21.	Definición del alcance	46](#_toc230972494)

[22.	Delimitación Funcional y Técnica	46](#_toc230972495)

[1.23.	Funcionalidades incluidas	46](#_toc230972496)

[1.24.	Stack tecnológico fijo	47](#_toc230972497)

[23.	Restricciones	47](#_toc230972498)

[24.	Exclusiones explícitas	47](#_toc230972499)

[Plan de trabajo	49](#_toc230972500)

[25.	Distribución de Fases	49](#_toc230972501)

[26.	Diagrama de Gantt mensual	49](#_toc230972502)

[27.	Cronograma semanal	51](#_toc230972503)

[Referencias:	53](#_toc230972504)




# Índice de tablas 


[Tabla 1: Activades principales de fase 1	33](#_toc230973132)

[Tabla 2: Activades principales de fase 2	34](#_toc230973133)

[Tabla 3: Activades principales de fase 3	34](#_toc230973134)

[Tabla 4: Activades principales de fase 4	35](#_toc230973135)

[Tabla 5: Activades principales de fase 5	36](#_toc230973136)

[Tabla 6: Activades principales de fase de cierre	37](#_toc230973137)

[Tabla 7: Recursos humanos	37](#_toc230973138)

[Tabla 8: Recursos tecnológicos	38](#_toc230973139)

[Tabla 9: Stack tecnológico	38](#_toc230973140)

[Tabla 10: Apis Externas	38](#_toc230973141)

[Tabla 11: Herramientas compartidas	39](#_toc230973142)

[Tabla 12: Riesgos y estrategias de mitigación	41](#_toc230973143)

[Tabla 13: Métricas del Módulo de Escaneo	42](#_toc230973144)

[Tabla 14: Métricas del Filtro F1	42](#_toc230973145)

[Tabla 15: Métricas de Usabilidad	43](#_toc230973146)

[Tabla 16: Métricas de funcionalidades secundarias	44](#_toc230973147)

[Tabla 17: Métricas de Calidad Técnica General	45](#_toc230973148)

[Tabla 18: Trazabilidad metodológica	46](#_toc230973149)

[Tabla 19: Delimitación Funcional y Técnica	47](#_toc230973150)

[Tabla 20: Stack tecnológico fijo	48](#_toc230973151)

[Tabla 21: Plan de trabajo, distribución de fases	50](#_toc230973152)

[Tabla 22: Plan de trabajo, diagrama de Gantt mensual	50](#_toc230973153)

[Tabla 23: Plan de trabajo, Cronograma semanal	52](#_toc230973154)





CAPÍTULO 1

# <a name="_toc230972415"></a>Descripción general del trabajo


El presente trabajo profesional de graduación consiste en el diseño, desarrollo y validación de una interfaz móvil multiplataforma para la detección de amenazas de quishing en códigos QR. El sistema forma parte de una aplicación móvil orientada a la seguridad del usuario durante el escaneo de códigos QR, donde el frontend actúa como punto único de interacción entre el usuario y el motor de análisis del sistema.

` 	`El módulo implementa el flujo completo de experiencia de usuario: desde la decodificación nativa del código QR en tiempo real mediante las APIs de visión por computadora de iOS y Android, hasta la presentación del veredicto de seguridad en dos niveles de detalle —simple y extendido— adaptados al perfil del usuario. El frontend integra de extremo a extremo el Filtro F1 de reputación de URLs, que consolida en tiempo real los veredictos de Google Safe Browsing, PhishTank y VirusTotal mediante consultas en paralelo al backend serverless, con degradación ante fallos parciales y tiempo de respuesta objetivo inferior a cinco segundos. Adicionalmente, el módulo incorpora funcionalidades secundarias de historial local offline con almacenamiento cifrado, reporte de QR malicioso al backend y generación de una Story Card compartible con geocodificación inversa de la ubicación del escaneo.

` 	`El entregable principal del proyecto es un prototipo funcional del frontend móvil integrado con el motor de análisis backend desarrollado en paralelo. Como productos concretos se incluyen: código fuente del módulo React Native, flujo de navegación completo demostrable en dispositivos físicos iOS y Android, integración operativa con el Filtro F1, implementación de las funcionalidades secundarias, y resultados de pruebas funcionales, de rendimiento y de usabilidad con usuarios.

` 	`El proyecto se desarrolla en el contexto de la creciente proliferación de ataques de quishing, variante del phishing que utiliza códigos QR para ocultar URLs maliciosas y redirigir usuarios hacia sitios fraudulentos sin exponer el enlace antes del escaneo. En este entorno, la interfaz propuesta busca cerrar la ventana de vulnerabilidad que caracteriza al quishing: el intervalo entre el momento en que el usuario escanea el código y el momento en que el sistema operativo abre el navegador, introduciendo una capa automatizada de análisis que traduce el resultado técnico en una decisión comprensible y oportuna para el usuario final.



CAPÍTULO 2

# <a name="_toc230972416"></a>Definición del problema 


El código QR (Quick Response) fue desarrollado originalmente en 1994 [11] para el rastreo de componentes en la industria automotriz, pero **su adopción en la cotidianidad se aceleró durante la pandemia de COVID-19 [42] debido a la necesidad de interacción sin contacto, convirtiéndose en un mecanismo rápido y conveniente de acceso a información digital.** Hoy en día, los códigos QR son un mecanismo de acceso a contenido digital presente en restaurantes, comercios, transporte público, plataformas gubernamentales y sistemas de pago electrónico, reconocido por su simplicidad de uso tanto para emisores como para receptores de información.

Sin embargo, tal simplicidad introduce una vulnerabilidad clave: el proceso de escaneo no expone al usuario el destino del enlace antes de la redirección. A diferencia de un hipervínculo en pantalla, donde la URL puede inspeccionarse antes de hacer clic, el contenido en un QR permanece oculto hasta el momento del escaneo. La mayoría de los sistemas operativos móviles redirigen automáticamente al usuario sin aplicar ningún análisis de seguridad sobre la URL codificada, trasladando toda la carga de detección al criterio del usuario final [3], [4]. 

Esta dinámica ha sido aprovechada por actores maliciosos mediante el denominado *quishing* (QR phishing), técnica que emplea códigos QR manipulados para redirigir a usuarios hacia sitios fraudulentos, descargar software malicioso o capturar credenciales [5]. A diferencia del phishing tradicional, el enlace no es visible antes del escaneo, lo que reduce la capacidad del usuario para identificar señales de alerta. Además, elude los filtros de seguridad en correos electrónicos que procesan texto, pero no imágenes, y puede desplegarse fácilmente en entornos físicos mediante pegatinas, folletos o carteles superpuestos sobre QR legítimos [3].

La magnitud del problema ha escalado de forma preocupante. Insikt Group [6] documentó un crecimiento aproximado del 248 % en menciones a quishing en fuentes de inteligencia de alta fidelidad entre el tercer y cuarto trimestre de 2023, y registró su integración en plataformas de phishing-as-a-service como Tycoon 2FA y Greatness, lo que indica una profesionalización y democratización del ataque. Este fenómeno no es, por tanto, una amenaza marginal o experimental, sino una modalidad consolidada dentro del ecosistema de la ciberdelincuencia.

Las deficiencias del ecosistema actual pueden identificarse en dos niveles complementarios. **A nivel del usuario**, existe una percepción generalizada de los códigos QR como elementos neutros o inherentemente seguros, lo que reduce la vigilancia ante posibles manipulaciones [3]. **A nivel tecnológico**, los sistemas operativos móviles y las aplicaciones nativas de escaneo no incorporan mecanismos de análisis dinámico del contenido antes de ejecutar la redirección, lo que deja al usuario sin una capa de protección automatizada en el momento del escaneo.

En el mercado internacional existen aplicaciones móviles que intentan abordar parcialmente el problema del quishing. Herramientas como *Safe QR Scan – Secure QR Scanner* y *SafeQR Reader · Block Scams*, disponibles en el App Store de Apple, ofrecen funciones básicas de verificación de URLs previas a la redirección. Su mecanismo central consiste en contrastar el enlace extraído del código QR contra bases de datos de dominios maliciosos conocidos, es decir, operan bajo el modelo de listas negras (blacklists).

Sin embargo, este enfoque presenta limitaciones técnicas documentadas. Las aplicaciones de detección de enlaces QR existentes utilizan mayoritariamente el método de lista negra para identificar URLs maliciosas, lo cual no constituye el método óptimo para detectar sitios web nuevos [7]. Esta limitación es particularmente crítica en el contexto del quishing, donde los atacantes registran dominios específicos para cada campaña. Las listas negras de dominios son una de las técnicas más antiguas empleadas en la detección de phishing y han sido superadas por enfoques más modernos y precisos, tanto en la práctica como en la investigación [8]. 

Un análisis de datos de phishing recopilados entre 2013 y 2022 demostró que aproximadamente el 78% de los ataques de phishing confirmados fueron alojados en dominios únicos [8], lo que implica que la mayoría de los dominios utilizados en ataques nunca habían aparecido previamente en ninguna lista negra. En consecuencia, se identifica una limitación significativa en los mecanismos actuales de detección, particularmente frente a dominios maliciosos de reciente creación que operan en el contexto del escaneo de códigos QR. 



CAPÍTULO 3

# <a name="_toc230972417"></a>Justificación 


Ante esta problemática, resulta necesario fortalecer los mecanismos de protección frente a ataques de quishing, una modalidad que explota la interacción entre el entorno físico y digital y que actualmente carece de soluciones accesibles y suficientemente robustas para el usuario común.

Desde una perspectiva teórica, el trabajo contribuye al estudio de vectores de ataque emergentes en ciberseguridad, particularmente aquellos que utilizan interfaces no tradicionales como los códigos QR. Este campo presenta oportunidades de investigación en contextos latinoamericanos, donde la adopción tecnológica ha avanzado más rápido que el desarrollo de prácticas de seguridad asociadas.

Para los usuarios finales, el prototipo ofrecerá una herramienta funcional de verificación previa al escaneo, reduciendo su exposición a ataques de quishing en contextos cotidianos como comercios, transporte público e instituciones gubernamentales. Dado que el quishing afecta a cualquier usuario de teléfono inteligente con independencia de su nivel técnico [5], contar con una solución accesible y automatizada representa una contribución concreta a la seguridad digital del usuario común.

Para la universidad, este trabajo representa una contribución original al campo de la ciberseguridad aplicada, un área con producción académica local aún limitada en la región. Genera un precedente investigativo que puede servir de base para futuros proyectos en seguridad móvil, análisis de amenazas emergentes y educación digital. El Foro Económico Mundial [9] y la OCDE [10] (2023) señalan que la escasez de programas académicos especializados en ciberseguridad es uno de los factores que más limita la capacidad de respuesta de los países en desarrollo ante amenazas emergentes; proyectos de este tipo contribuyen directamente a cerrar esa brecha desde el ámbito universitario.

Para los integrantes del equipo, el proyecto implica el desarrollo de competencias técnicas en seguridad informática, desarrollo móvil multiplataforma y análisis de amenazas, así como experiencia en investigación aplicada con implicaciones éticas reales.

Para la comunidad en general, el trabajo contribuye a visibilizar una amenaza que afecta a cualquier usuario de teléfono inteligente. Al documentar el problema y proponer una solución tecnológica evaluable, este proyecto sienta bases concretas para que instituciones públicas, empresas y organizaciones educativas puedan tomar decisiones informadas en materia de seguridad digital.



CAPÍTULO 4

# <a name="_toc230972418"></a>Objetivos


1. ## <a name="_toc230972419"></a>**Objetivo General** 
Reducir el riesgo de acceso a sitios maliciosos codificados en códigos QR por usuarios móviles, mediante el desarrollo de una interfaz multiplataforma en React Native que integra el flujo completo de escaneo, presentación de resultados y consulta a las APIs de threat intelligence del primer filtro.
1. ## <a name="_toc230972420"></a>**Objetivos específicos** 
- Implementar el módulo de escaneo de códigos QR con extracción de URL en menos de 5 segundos y clasificación del tipo de contenido, mediante `react-native-vision-camera` con CodeScanner nativo en iOS y Android. 
- Desarrollar el flujo de interacción principal entre el escaneo y la presentación del veredicto, mediante la implementación de la pantalla de carga con animación skeleton/shimmer y la pantalla de resultado con dos niveles de detalle (simple y extendido). 
- Implementar las funcionalidades secundarias de historial offline, reporte y alerta social, mediante almacenamiento local sin cuenta de usuario, integración con el endpoint de reportes y generación de Story Card con geocodificación inversa. 
- Integrar el filtro F1 de consulta a listas de reputación con tiempo de respuesta inferior a 5 segundos, mediante la conexión con las APIs de Google Safe Browsing, PhishTank y VirusTotal como primer filtro de análisis.



CAPÍTULO 5

# <a name="_toc230972421"></a>Marco teórico 


1. ## <a name="_toc230972422"></a>**Amenazas de Seguridad en el entorno móvil** 
Este bloque contextualiza el problema de seguridad que motiva el proyecto: el phishing y su variante vehiculada a través de códigos QR (quishing). Se examinan las técnicas de ingeniería social que hacen susceptible al usuario móvil y se revisan los enfoques computacionales disponibles para detectar URLs maliciosas, estableciendo así la justificación técnica y empírica del sistema de filtrado propuesto.
1. ### <a name="_toc230972423"></a>**Phishing: Definición, Evolución y Estado del Arte**
El phishing es una forma de ingeniería social en la que un atacante suplanta la identidad de una entidad de confianza para inducir a la víctima a revelar credenciales, datos financieros u otra información sensible, o bien para dirigirla hacia contenido malicioso. La denominación proviene de la analogía con la pesca (fishing): el atacante lanza un "anzuelo" —generalmente un mensaje o enlace falsificado— y aguarda a que la víctima "muerda". Aunque el phishing existe desde la década de 1990, su sofisticación y volumen han aumentado sostenidamente, adaptándose a cada nuevo canal de comunicación que adoptan los usuarios.

El Anti-Phishing Working Group (APWG) registró más de un millón de ataques de phishing únicos en el primer trimestre de 2024, con una tendencia al alza que se mantiene en 2025 [4][9]. El informe Data Breach Investigations Report de Verizon de 2024 señala el phishing como uno de los vectores de acceso inicial más frecuentes en incidentes de seguridad a nivel global [1]. Este contexto cuantifica el problema que motiva la presente investigación: la prevalencia del phishing como amenaza real y activa.

El prototipo desarrollado en este trabajo constituye una herramienta de primera línea contra una variante específica del phishing vehiculada a través de códigos QR. La comprensión del ecosistema del phishing —sus motivaciones, vectores, infraestructura y ciclo de vida— es indispensable para diseñar correctamente los filtros de análisis, interpretar los resultados de las APIs de reputación y comunicar el veredicto de forma comprensible para el usuario final.
1. ### <a name="_toc230972424"></a>**Quishing: El Phishing Mediante Códigos QR**
El término quishing (contracción de QR y phishing) designa los ataques de phishing que utilizan códigos QR como vector de distribución del enlace malicioso. A diferencia del phishing tradicional, en el que la URL fraudulenta es visible en el cuerpo del mensaje, el quishing oculta la URL dentro del patrón visual del código QR, imposibilitando su inspección directa por parte del usuario [7][10].

La anatomía de un ataque de quishing típico comprende: (1) generación de un QR que codifica una URL bajo control del atacante, (2) distribución del QR en un canal con alta tasa de confianza implícita —correo electrónico corporativo, cartel físico, factura, menú de restaurante, etc.—, (3) escaneo por parte de la víctima con la cámara nativa del teléfono, y (4) apertura automática del navegador sin que el usuario haya evaluado la URL destino [8].

Investigaciones de Recorded Future [7] y Palo Alto Networks Unit 42 [10] documentan el crecimiento exponencial de campañas de quishing a partir de 2023, atribuido en parte a la proliferación de generadores de QR gratuitos y a la adopción masiva de QR en contextos de confianza (pagos, menús, accesos, verificación de identidad). Vidas et al. [8] demostraron en un estudio empírico que los usuarios de smartphones son significativamente más susceptibles a ataques de QR phishing que al phishing por URL directa, precisamente porque el QR elimina la señal de advertencia visual que representa una URL sospechosa.

El quishing es el problema específico que la aplicación resuelve. Todo el diseño del flujo —escaneo, extracción de URL, análisis multicapa y presentación del veredicto— responde directamente a la anatomía de este tipo de ataque. La solución introduce un punto de inspección entre el momento en que el usuario escanea el QR y el momento en que el navegador abre la URL, cerrando la ventana de vulnerabilidad que caracteriza al quishing.
1. ### <a name="_toc230972425"></a>**Ingeniería Social y Susceptibilidad del Usuario Móvil**
La ingeniería social comprende el conjunto de técnicas psicológicas y comunicativas mediante las cuales un atacante manipula a personas para que divulguen información confidencial o ejecuten acciones que comprometan la seguridad de sistemas. A diferencia de los ataques puramente técnicos, la ingeniería social explota sesgos cognitivos humanos: urgencia, autoridad, reciprocidad y confianza. En el contexto del quishing, el código QR actúa como un artefacto que aprovecha la confianza contextual del entorno físico en que aparece: un QR en el mostrador de un banco proyecta la misma autoridad que el banco mismo.

Vidas et al. [8] y Krombholz et al. [3] identificaron que el contexto de uso móvil agrava la susceptibilidad del usuario frente a ataques de ingeniería social vía QR: el flujo de escaneo → apertura de URL es casi reflejo, la pantalla pequeña dificulta la revisión de la URL en la barra del navegador, y el comportamiento habitual de los usuarios ante un QR no incluye la verificación del destino. La susceptibilidad del usuario no es simplemente un fallo individual, sino un componente estructural del problema que la solución técnica debe compensar.

La comprensión de los mecanismos de ingeniería social informa el diseño de la interfaz de usuario del prototipo: el momento, el tono y el formato en que se presenta el veredicto de seguridad deben contrarrestar el impulso de continuar navegando cuando la evaluación indica riesgo. Este tema conecta directamente con el Bloque IX (Usable Security) y sustenta las decisiones de diseño de las pantallas de advertencia.
1. ### <a name="_toc230972426"></a>**Análisis de URLs Maliciosas: Técnicas y Desafíos**
El análisis de URLs maliciosas abarca el conjunto de técnicas computacionales que permiten determinar si una URL representa un riesgo de seguridad para el usuario. Sahoo, Liu y Hoi [5] clasifican estas técnicas en tres categorías principales: (1) blacklist-based, que consultan bases de datos de URLs conocidas como maliciosas; (2) heuristic-based, que evalúan características estructurales y léxicas de la URL (longitud, entropía, presencia de IP literal, TLD sospechoso, edad del dominio, etc.); y (3) machine learning-based, que extraen features de la URL y del contenido del sitio para clasificarla mediante modelos estadísticos o de aprendizaje profundo.

Cada categoría presenta compromisos distintos entre cobertura, velocidad de respuesta, tasa de falsos positivos y capacidad de detectar amenazas de zero-day (URLs maliciosas aún no registradas en ninguna lista). Las blacklists tienen alta precisión pero latencia de incorporación; los enfoques heurísticos y de ML pueden detectar amenazas nuevas pero con mayor riesgo de falsos positivos.

Ma et al. [17] y Le et al. [18] demostraron que los modelos basados en features léxicas de la URL alcanzan alta precisión sin necesidad de visitar el sitio destino, lo que los hace particularmente adecuados para un contexto móvil donde la privacidad y la latencia son restricciones críticas. Sheng et al. [6] documentaron las limitaciones de los enfoques exclusivamente basados en blacklists, con tasas de cobertura iniciales bajas para URLs recién creadas. Esta evidencia justifica el diseño multicapa del sistema, donde el Filtro F1 (blacklists) es el primero de varios mecanismos complementarios.

La arquitectura de filtros del prototipo —F1 (listas de reputación), F2 (heurística de URL), F3 (sandbox), F4 (browser isolation)— es una implementación directa de la taxonomía de técnicas de análisis de URLs maliciosas. Aunque en el alcance de este trabajo solo se implementa completamente el F1, el diseño de las pantallas para los filtros F2 a F4 requiere comprender los principios técnicos de cada enfoque para representar sus resultados de manera precisa y significativa.

1. ## <a name="_toc230972427"></a>**Estándar QR y su explotación como vector de ataque**
Este bloque analiza el estándar técnico ISO/IEC 18004 que rige los códigos QR, los tipos de contenido que pueden codificar y la forma en que los actores maliciosos explotan estas capacidades para distribuir URLs de phishing. Comprender la estructura del QR como artefacto es prerequisito para diseñar correctamente la lógica de clasificación del contenido y el punto de intervención de la herramienta.
1. ### <a name="_toc230972428"></a>**Fundamentos Técnicos del Código QR (ISO/IEC 18004)**
El código QR (Quick Response Code) es una simbología de código de barras bidimensional estandarizada por ISO/IEC 18004 [11][12]. A diferencia de los códigos de barras unidimensionales, un QR puede codificar hasta 4.296 caracteres alfanuméricos o 7.089 dígitos numéricos en una cuadrícula de módulos blancos y negros. La especificación define cuatro modos de codificación (numérico, alfanumérico, byte y kanji), cuatro niveles de corrección de errores (L, M, Q, H con redundancias del 7 % al 30 %), y cuarenta versiones de tamaño que determinan la capacidad de datos y la densidad de la cuadrícula.

La edición vigente ISO/IEC 18004:2024 [12] introduce mejoras de conformidad y clarificaciones respecto a la edición de 2015, pero mantiene la compatibilidad hacia atrás. La robustez del estándar, junto con su capacidad para codificar URLs completas en patrones compactos que cualquier cámara de teléfono puede leer, explica tanto su adopción masiva como su explotación por actores maliciosos.

El dominio del estándar QR es fundamental para dos aspectos del proyecto: (1) comprender qué tipos de datos puede contener un QR y cuáles requieren análisis de seguridad (solo las URLs representan riesgo de phishing; los QR de tipo texto, WiFi o vCard no), y (2) diseñar la lógica de clasificación del contenido que bifurca el flujo de usuario en la aplicación (URL → análisis vs. no-URL → pantalla informativa).

La clasificación del contenido decodificado del QR —Objetivo Específico 1 del trabajo— está directamente condicionada por la estructura de datos definida en ISO/IEC 18004. El módulo de escaneo debe distinguir entre los diferentes tipos de contenido codificables para determinar si procede el análisis de seguridad o si se muestra la pantalla informativa de contenido no aplicable.
1. ### <a name="_toc230972429"></a>**Tipos de Contenido Codificable y su Relevancia en la Detección**
Aunque el estándar ISO/IEC 18004 define la codificación a nivel de bytes, en la práctica los generadores de QR siguen convenciones ampliamente aceptadas para tipos de contenido específicos. Los tipos más comunes incluyen: URL (https://, http://), texto plano, información de contacto vCard, credenciales WiFi (WIFI:T:WPA;S:...;P:...;;), eventos de calendario (vCalendar), y datos de pago. Cada tipo tiene una firma de prefijo reconocible en el contenido decodificado.

Desde la perspectiva de la seguridad, no todos los tipos de contenido QR representan el mismo nivel de riesgo. Las URLs son el principal vector del quishing; los datos WiFi exponen credenciales de red; las vCards pueden contener información de contacto falsificada. Krombholz et al. [3] realizaron una taxonomía de los vectores de ataque posibles a través de QR, identificando las URLs como el vector de mayor impacto y prevalencia.

La lógica de clasificación de contenido implementada en el módulo de escaneo determina el flujo de la aplicación: si el contenido es una URL, se activa el pipeline de análisis hacia el backend; si es otro tipo, se muestra la pantalla informativa. Esta bifurcación es uno de los componentes centrales del Objetivo Específico 1.
1. ### <a name="_toc230972430"></a>**QR como Vector de Ataque: Superficie, Motivación y Anatomía**
La superficie de ataque del quishing es particularmente amplia porque los códigos QR aparecen en entornos de alta confianza: facturas corporativas, señalética de establecimientos, materiales de marketing, correos electrónicos institucionales y páginas de autenticación de dos factores. Un atacante puede reemplazar un QR legítimo con uno malicioso mediante una etiqueta adhesiva encima del original, o distribuirlo digitalmente en campañas de correo electrónico de spear phishing. La motivación principal es evadir los filtros de URL de los clientes de correo electrónico y los proxies corporativos, que inspeccionan el texto del mensaje pero no el contenido codificado de una imagen.

Palo Alto Networks Unit 42 [10] documentó que las plataformas de correo electrónico —incluyendo Microsoft 365 y Google Workspace— no escanean automáticamente el contenido de los QR embebidos en correos, lo que convierte al quishing en una técnica efectiva de evasión. Recorded Future [7] reportó un aumento del 587 % en ataques de quishing entre el segundo semestre de 2023 y el primero de 2024.

Comprender la anatomía del ataque y sus vectores de distribución es esencial para enmarcar la propuesta de valor del prototipo: la aplicación interviene precisamente en el único punto del ciclo del ataque que aún no cuenta con protección automatizada, que es el momento del escaneo desde el dispositivo móvil del usuario.

El diseño del flujo de usuario —y en particular la decisión de interceptar la navegación antes de que el sistema operativo abra el navegador— responde directamente a la mecánica del ataque descrita aquí. Sin esta comprensión, no sería posible justificar la pertinencia del punto de inserción de la herramienta en el ciclo del ataque.

1. ## <a name="_toc230972431"></a>**Sistemas de detección y clasificación de amenazas**
Este bloque presenta las categorías de técnicas computacionales empleadas para identificar URLs maliciosas —listas negras, análisis heurístico y aprendizaje automático—, así como las plataformas colaborativas de threat intelligence que las alimentan y las métricas estadísticas para evaluar su eficacia. Este marco técnico sustenta la arquitectura de filtros multicapa del prototipo.
1. ### <a name="_toc230972432"></a>**Listas Negras y Sistemas de Reputación de URLs**
Una lista negra de URLs (URL blacklist) es una base de datos que contiene URLs, dominios o direcciones IP identificadas como maliciosas, fraudulentas o asociadas a actividad de phishing, malware o spam. Los sistemas de reputación de URLs extienden el concepto de lista negra al asignar a cada URL o dominio una puntuación de reputación derivada de múltiples señales: historial de actividad maliciosa, asociación con infraestructura conocida de amenazas, características del registro del dominio y análisis de contenido.

Sheng et al. [6] evaluaron la cobertura y la latencia de diversas blacklists en un estudio empírico de 2009, encontrando que las listas más grandes cubrían aproximadamente el 20 % de los sitios de phishing activos en el momento de creación de la URL, con cobertura creciente conforme el sitio maduraba en los sistemas de denuncia colaborativa. Esta limitación en la cobertura de amenazas recientes (zero-hour phishing) es uno de los argumentos que justifican el diseño multicapa del sistema.

Es importante contextualizar que el estudio de Sheng et al. [6] fue realizado en 2009, cuando los sistemas de reputación eran significativamente menos maduros. Las plataformas modernas como Google Safe Browsing mantienen bases de datos actualizadas en intervalos de minutos mediante análisis automatizado a escala masiva. No obstante, los informes de APWG de 2024 y 2025 [4][9] documentan que el zero-hour phishing —sitios maliciosos activos durante menos de una hora antes de ser indexados— sigue representando una fracción significativa de los ataques activos, lo que confirma que la limitación estructural de las blacklists persiste independientemente de su velocidad de actualización. Esta realidad refuerza la validez del argumento multicapa incluso ante el avance tecnológico de las plataformas de reputación.

Las listas de reputación constituyen el Filtro F1 del prototipo, el primero y más rápido de los mecanismos de análisis. Su eficiencia (respuesta en milisegundos para URLs conocidas), su amplia cobertura acumulada y su bajo costo computacional las convierten en el primer punto de decisión ideal en un sistema de análisis en tiempo real con restricciones de latencia.

El Objetivo Específico 4 del trabajo establece la integración del Filtro F1 con tiempo de respuesta inferior a 5 segundos. Las tres APIs seleccionadas —Google Safe Browsing [19], PhishTank [21] y VirusTotal [20]— son implementaciones representativas del estado del arte en listas de reputación, y su integración en el backend del prototipo constituye el componente funcional central del trabajo de graduación.
1. ### <a name="_toc230972433"></a>**Threat Intelligence: Plataformas Colaborativas y Enriquecimiento de Datos**
La threat intelligence (inteligencia de amenazas) es la disciplina que consiste en recolectar, analizar y compartir información sobre amenazas de seguridad —actores, tácticas, técnicas, procedimientos e indicadores de compromiso (IOC)— con el propósito de anticipar o responder a ataques. En el contexto de la detección de URLs maliciosas, los IOC relevantes son dominios, URLs, direcciones IP y hashes de archivos vinculados a campañas de phishing, malware o infraestructura de comando y control.

Las plataformas colaborativas de threat intelligence operan sobre el principio de que ninguna organización puede observar el panorama completo de amenazas de forma aislada; al compartir datos de incidentes, la comunidad construye una inteligencia colectiva más robusta. MISP [23] y URLhaus [22] son ejemplos de plataformas de código abierto para este propósito. VirusTotal [20] agrega los resultados de más de 70 motores antivirus y herramientas de análisis, funcionando como una plataforma de enriquecimiento de datos.

La naturaleza colaborativa de las fuentes de datos que alimentan el Filtro F1 es un componente clave del diseño: cada vez que un usuario reporta un QR malicioso desde la aplicación (Feature 5.2), esa información puede retroalimentar las blacklists colaborativas (PhishTank, URLhaus), convirtiendo a los usuarios del prototipo en participantes activos del ecosistema de threat intelligence.

La funcionalidad de reporte de QR malicioso (Objetivo Específico 3) es una implementación concreta del modelo de threat intelligence colaborativa: el prototipo no solo consume inteligencia de amenazas, sino que también la genera y la aporta al ecosistema mediante el envío de URLs reportadas a las blacklists correspondientes.

1. ### <a name="_toc230972434"></a>**Análisis Heurístico de URLs**
El análisis heurístico de URLs evalúa la estructura léxica y semántica de una URL para estimar su probabilidad de ser maliciosa, sin necesidad de consultar bases de datos externas ni visitar el sitio. Las heurísticas más utilizadas incluyen: longitud anómala de la URL, presencia de dirección IP literal en lugar de nombre de dominio, uso de subdominios excesivos o engañosos (typosquatting), TLD poco convencionales, presencia de caracteres especiales y patrones de ofuscación, uso de acortadores de URL, ausencia de HTTPS, y señales del registro del dominio como la edad (dominios recién registrados son más sospechosos).

Le et al. [18] desarrollaron PhishDef, un sistema de clasificación basado exclusivamente en características léxicas de la URL con una precisión superior al 95 %. Ma et al. [17] demostraron que features derivadas solo del nombre del dominio alcanzan una precisión de clasificación del 99 % para URLs de phishing conocidas, con la ventaja de no requerir el acceso al contenido del sitio.

El Filtro F2 del prototipo está basado en análisis heurístico. Aunque el backend del F2 no se implementa en este trabajo de graduación, el diseño de su pantalla de resultados —que muestra el desglose de criterios activados (edad del dominio, TLD sospechoso, estructura de URL, HTTPS)— requiere una comprensión precisa de las heurísticas que evalúa, para que la representación visual sea técnicamente correcta y no induzca a error.

El diseño de la pantalla de resultado del F2 (score de riesgo con desglose de criterios) es una interfaz para los resultados del análisis heurístico. Los criterios visualizados en la pantalla corresponden directamente a las features heurísticas documentadas en la literatura [17][18], lo que garantiza que la interfaz refleje fielmente lo que el análisis técnico produce.

1. ### <a name="_toc230972435"></a>**Machine Learning Aplicado a la Detección de URLs Maliciosas**
Los enfoques de machine learning para la detección de URLs maliciosas formulan el problema como una clasificación binaria (benigna / maliciosa) o multiclase (phishing, malware, spam, benigna), donde cada URL se representa como un vector de features que puede incluir características léxicas de la URL, datos del WHOIS del dominio, features de contenido HTML de la página y registros DNS. Los algoritmos más empleados en la literatura incluyen Random Forest, Gradient Boosting, Support Vector Machines y, más recientemente, redes neuronales recurrentes y transformadores de texto [5][17][18].

Aunque el alcance de este trabajo no incluye el entrenamiento ni el despliegue de modelos propios, el análisis heurístico del F2 es, en su forma más avanzada, un modelo de clasificación basado en features de la URL. La comprensión de los principios de ML aplicados a este dominio permite contextualizar correctamente las capacidades y limitaciones del F2 y justificar por qué un sistema de análisis multicapa —que combina blacklists, heurística y sandbox— ofrece una cobertura superior a cualquier técnica individual.

En el contexto de las futuras fases del proyecto, el F2 podría evolucionar de un conjunto de reglas heurísticas a un modelo de ML entrenado sobre datasets de URLs etiquetadas. Los conjuntos de datos más empleados en la literatura para este fin incluyen el ISCX-URL-2016 Dataset del Canadian Institute for Cybersecurity, con más de 30.000 URLs etiquetadas en cinco categorías (benignas, spam, phishing, malware y defacement); y el PHIUSIIL Phishing URL Dataset, disponible en el UCI Machine Learning Repository, con más de 235.000 instancias etiquetadas. El conocimiento de estos recursos orienta tanto la evaluación empírica del Filtro F1 como el diseño del F2 en fases posteriores del proyecto. El marco teórico documenta esta trayectoria evolutiva para facilitar la extensión del trabajo.

1. ### <a name="_toc230972436"></a>**Métricas de Evaluación de Clasificadores Binarios**
La evaluación del rendimiento de un sistema de clasificación binaria —como el que determina si una URL es maliciosa o no— requiere métricas que vayan más allá de la exactitud (accuracy) simple, especialmente cuando las clases están desbalanceadas (las URLs maliciosas son una fracción pequeña del total de URLs). Las métricas principales en este dominio son: precisión (precision), exhaustividad o sensibilidad (recall), especificidad (specificity), puntuación F1 (F1-score) y el área bajo la curva ROC (AUC-ROC). Sokolova y Lapalme [39] ofrecen un análisis sistemático de estas métricas y sus relaciones, identificando cuándo cada una es más apropiada.

En el contexto de seguridad, el coste asimétrico de los errores es especialmente relevante: un falso negativo (no detectar una URL maliciosa) tiene consecuencias más graves para el usuario que un falso positivo (bloquear una URL legítima), lo que guía las decisiones de umbral de clasificación hacia maximizar el recall a costa de reducir la precisión.

Para evaluar la efectividad del Filtro F1 implementado en este trabajo —y para contextualizar los resultados reportados por las APIs integradas— es necesario comprender qué significan las tasas de detección que estas APIs reportan y cuáles son sus limitaciones documentadas.

Las métricas de clasificación son el marco conceptual para evaluar si el Filtro F1 cumple con los objetivos de calidad del prototipo. La presentación del veredicto al usuario (SEGURO / SOSPECHOSO / MALICIOSO) implica implícitamente un umbral de clasificación cuyas consecuencias para el usuario (falso positivo vs. falso negativo) deben estar fundamentadas en este marco teórico.

Para la evaluación del Filtro F1 implementado en este trabajo, el protocolo de validación consiste en someter un conjunto de URLs de prueba —obtenidas de fuentes públicas como el feed de PhishTank, el dataset de OpenPhish [40] o el ISCX-URL-2016— a las tres APIs integradas (Google Safe Browsing, PhishTank y VirusTotal), comparando los veredictos retornados con la etiqueta conocida de cada URL. Este protocolo permite calcular las métricas de precisión, exhaustividad y F1-score del sistema de filtrado compuesto, proporcionando evidencia empírica sobre su efectividad y sobre las tasas de falsos positivos y falsos negativos que determinan la experiencia de usuario en los escenarios críticos.

1. ## <a name="_toc230972437"></a>**Escaneo y procesamiento nativo en dispositivos móviles**
Este bloque describe las APIs nativas de visión por computadora que permiten decodificar códigos QR directamente en el dispositivo sin dependencia de servicios externos, la biblioteca react-native-vision-camera que las abstrae para React Native y las consideraciones de latencia que determinan el presupuesto de tiempo disponible para el análisis de seguridad.

1. ### <a name="_toc230972438"></a>**APIs Nativas de Detección de Códigos de Barras: Apple Vision y Google ML Kit**
Los sistemas operativos modernos proveen APIs de visión por computadora a nivel de sistema para la detección y decodificación de códigos de barras y QR directamente en el hardware del dispositivo, sin dependencia de servicios en la nube. En iOS, el framework Vision expone VNDetectBarcodesRequest [14], que utiliza el motor de visión de Apple para detectar y decodificar simbología QR, Aztec, PDF417 y otros formatos, con aceleración por hardware mediante el chip Neural Engine.

En Android, Google ML Kit Barcode Scanning [15] provee funcionalidad equivalente mediante el paquete com.google.mlkit:barcode-scanning, que opera completamente on-device sin necesidad de conectividad, con soporte para más de diez simbologías incluyendo QR, Data Matrix y EAN.

La selección de estas APIs nativas para el módulo de escaneo —en lugar de soluciones de terceros— garantiza el menor overhead de procesamiento, la máxima compatibilidad con el hardware de cada plataforma y el cumplimiento con las políticas de privacidad de iOS y Android, que restringen el acceso de terceros a los frames de la cámara. El Objetivo Específico 1 establece una latencia de escaneo inferior a 5 segundos, un requisito que solo es alcanzable con procesamiento on-device.

react-native-vision-camera [16] —la biblioteca seleccionada para el módulo de escaneo— utiliza exactamente estas APIs nativas como backend de procesamiento: VNDetectBarcodesRequest en iOS y ML Kit en Android. La comprensión de las capacidades y limitaciones de estas APIs fundamenta las decisiones de implementación del módulo de cámara.
1. ### <a name="_toc230972439"></a>**react-native-vision-camera y el Módulo CodeScanner**
react-native-vision-camera [16] es una biblioteca de código abierto desarrollada por Marc Rousavy que expone el acceso completo a la cámara del dispositivo desde React Native, con soporte para el procesamiento de frames a alta velocidad mediante frame processors escritos en JavaScript o en código nativo (Swift/Kotlin) a través de JSI (JavaScript Interface). Su módulo CodeScanner es una abstracción sobre las APIs nativas de detección de códigos de barras de iOS y Android, optimizada para la detección en tiempo real en el stream de video de la cámara.

La arquitectura del módulo permite la decodificación de múltiples simbologías en tiempo real a velocidades de hasta 60 fps, con notificación mediante callback al componente React Native cada vez que se detecta y decodifica exitosamente un código. El módulo retorna, junto con los datos decodificados, metadatos sobre el tipo de simbología y la posición del código en el frame.

La selección de esta biblioteca para el Objetivo Específico 1 responde a sus ventajas documentadas frente a alternativas como react-native-camera (deprecated) o expo-camera: mayor rendimiento al usar JSI en lugar del bridge de React Native, acceso directo a las APIs nativas de escaneo, compatibilidad con la New Architecture de React Native [24], y mantenimiento activo del proyecto.

react-native-vision-camera con CodeScanner es el componente de software responsable de la adquisición y decodificación del QR en el prototipo. Su comprensión técnica (ciclo de vida del componente, manejo de permisos, configuración del scanner, extracción del payload decodificado) es prerequisito directo para la implementación del Objetivo Específico 1.

1. ### <a name="_toc230972440"></a>**Decodificación de QR en Tiempo Real: Latencia y Rendimiento**
La latencia de decodificación en tiempo real es el intervalo de tiempo entre el momento en que el código QR entra al campo de visión de la cámara y el momento en que el sistema extrae el payload decodificado. Este intervalo depende de factores como: velocidad de captura del sensor, resolución del frame analizado, versión y densidad del QR, condiciones de iluminación, capacidad de cómputo del dispositivo y eficiencia de la implementación del decodificador.

Para una aplicación de análisis de seguridad en tiempo real, la latencia de decodificación es el primer componente del presupuesto de latencia total (decodificación + transmisión al backend + consultas a APIs + retorno de resultados). El Objetivo Específico 1 fija un objetivo de menos de 5 segundos para el ciclo completo, lo que requiere que la decodificación ocurra en fracciones de segundo.

El uso de las APIs nativas de visión (Apple Vision, ML Kit) a través de react-native-vision-camera garantiza tiempos de decodificación inferiores a 100 ms en hardware moderno, dejando el margen de latencia disponible para la fase de análisis de red. Esta comprensión del presupuesto de latencia informa las decisiones de diseño de la pantalla de carga con animación skeleton/shimmer (Objetivo Específico 2).

El diseño de la experiencia de usuario durante el análisis (pantalla de carga con skeleton/shimmer) asume implícitamente un modelo de latencia: la animación debe durar lo suficiente para cubrir el tiempo real de análisis sin generar la percepción de lentitud ni precipitar al usuario a cancelar la operación antes de obtener el resultado.

1. ## <a name="_toc230972441"></a>**Desarrollo móvil multiplataforma con React Native** 
Este bloque fundamenta la elección de React Native como plataforma de desarrollo, describiendo la evolución de su arquitectura interna —del bridge clásico a la New Architecture con JSI y Fabric— y las implicaciones técnicas y de seguridad de construir una sola base de código para iOS y Android.
1. ### <a name="_toc230972442"></a>**Arquitectura de React Native: Bridge, JSI y la New Architecture**
React Native es un framework de desarrollo de aplicaciones móviles multiplataforma que permite escribir componentes de interfaz de usuario en JavaScript/TypeScript que se renderizan como componentes nativos de iOS y Android. La arquitectura histórica de React Native utilizaba un bridge asíncrono basado en serialización JSON para la comunicación entre el hilo de JavaScript y los módulos nativos, lo que introducía latencia y limitaciones en operaciones de alta frecuencia.

La New Architecture de React Native [24], introducida de forma estable en la versión 0.71 y habilitada por defecto desde la versión 0.76, reemplaza el bridge por tres componentes fundamentales: (1) JSI (JavaScript Interface), que permite llamadas síncronas entre JavaScript y código nativo; (2) Fabric, el nuevo motor de renderizado que permite composición de UI en múltiples hilos; y (3) TurboModules, que reemplazan a los Native Modules con un sistema de carga diferida y tipado fuerte. Esta arquitectura es prerequisito para el uso de react-native-vision-camera v4.

El prototipo se desarrolla sobre la New Architecture de React Native, lo que habilita el uso de frame processors en react-native-vision-camera y garantiza el rendimiento necesario para el procesamiento en tiempo real del stream de la cámara. La comprensión de esta arquitectura es indispensable para razonar sobre el rendimiento, los límites del sistema y las estrategias de depuración.

La selección de la pila tecnológica del prototipo —React Native con New Architecture, react-native-vision-camera v4, react-native-mmkv— solo puede justificarse plenamente en el contexto de las capacidades que habilita la New Architecture. Este tema proporciona esa justificación técnica.
1. ### <a name="_toc230972443"></a>**Desarrollo Cross-Platform para iOS y Android desde una Sola Base de Código**
El desarrollo cross-platform es una estrategia de ingeniería de software que busca maximizar la reutilización de código entre plataformas distintas (iOS, Android, web) mediante abstracciones compartidas sobre las APIs nativas subyacentes. React Native implementa esta estrategia compilando componentes JavaScript a vistas nativas específicas de cada plataforma, a diferencia de frameworks como Flutter (que dibuja en un canvas propio) o aplicaciones web progresivas (PWA).

Las implicaciones de seguridad del enfoque cross-platform son significativas: las políticas de privacidad, los requisitos de permisos, los modelos de almacenamiento y las restricciones de red de iOS y Android difieren sustancialmente. El prototipo adopta las políticas de Apple como estándar de compliance más restrictivo, garantizando que el cumplimiento con iOS implique automáticamente cumplimiento con Android.

La decisión de usar React Native en lugar de desarrollo nativo independiente (Swift + Kotlin) es una decisión de arquitectura con implicaciones en rendimiento, mantenibilidad, acceso a APIs nativas y ciclos de publicación. Documentar esta decisión en el marco teórico fundamenta la elección tecnológica del proyecto.

La viabilidad del prototipo —desarrollado por una sola persona para dos plataformas— descansa directamente en los beneficios de productividad del desarrollo cross-platform. Asimismo, los desafíos específicos de este enfoque (diferencias en permisos, comportamiento de la cámara, políticas de App Store vs. Google Play) son parte del contexto técnico que el marco teórico debe documentar.

1. ## <a name="_toc230972444"></a>**Seguridad en aplicaciones móviles**
Este bloque establece el marco normativo y los mecanismos técnicos que garantizan que el prototipo sea, en sí mismo, una aplicación segura. Se cubren el estándar MASVS de OWASP, las políticas de seguridad de red de iOS y Android, y las opciones de almacenamiento local cifrado, todos elementos que aplican directamente a la implementación del prototipo.
1. ### <a name="_toc230972445"></a>**OWASP Mobile Application Security Verification Standard (MASVS)**
El Mobile Application Security Verification Standard (MASVS) [2] es un estándar publicado por la OWASP Foundation que define los requisitos de seguridad que una aplicación móvil debe cumplir. La versión 2.1, publicada en 2024, organiza los controles en cinco categorías: MASVS-STORAGE (almacenamiento seguro de datos), MASVS-CRYPTO (uso correcto de criptografía), MASVS-AUTH (autenticación y autorización), MASVS-NETWORK (seguridad de comunicaciones) y MASVS-PLATFORM (interacción segura con el sistema operativo y otras aplicaciones). Cada categoría define controles en dos niveles de madurez (L1: recomendado para todas las apps, L2: para aplicaciones que manejan datos sensibles).

Una aplicación de seguridad que pretende proteger a los usuarios de amenazas externas debe ser, a su vez, una aplicación segura. Las categorías más relevantes para el prototipo son MASVS-NETWORK (comunicaciones TLS con las APIs de threat intelligence), MASVS-STORAGE (almacenamiento local del historial de escaneos) y MASVS-PLATFORM (gestión de permisos de cámara y geolocalización).

El MASVS proporciona el marco normativo para las decisiones de seguridad tomadas en el diseño del prototipo: uso de HTTPS para todas las comunicaciones, almacenamiento cifrado del historial local, y mínimo privilegio en la solicitud de permisos. Estas decisiones se justifican explícitamente contra los controles del estándar.

La protección de las credenciales de las APIs externas del Filtro F1 —las API keys de Google Safe Browsing y VirusTotal— es un requisito cubierto por MASVS-STORAGE-2, que prohíbe el almacenamiento de credenciales en texto plano en el código fuente o en almacenamiento no cifrado del dispositivo. En el prototipo, estas credenciales residen exclusivamente en el entorno de ejecución del backend serverless (variables de entorno de AWS Lambda), nunca en el cliente móvil, eliminando el riesgo de extracción mediante ingeniería inversa de la aplicación. Adicionalmente, MASVS-NETWORK-2 exige que la aplicación valide el certificado TLS del servidor en todas las conexiones de red. El certificate pinning —que fija el certificado o la clave pública esperada del backend en el código de la aplicación— impide ataques de intermediario (MITM) incluso cuando el atacante presenta un certificado firmado por una autoridad certificadora de confianza del sistema, y debe ser evaluado para las comunicaciones entre la aplicación y el backend propio del prototipo.

1. ### <a name="_toc230972446"></a>**Seguridad de Red en iOS: App Transport Security (ATS)**
App Transport Security (ATS) [26] es un mecanismo de seguridad de Apple introducido en iOS 9 que, por defecto, requiere que todas las conexiones de red de una aplicación utilicen HTTPS con TLS 1.2 o superior, con certificados válidos y cifrado fuerte. Las excepciones a ATS deben declararse explícitamente en el archivo Info.plist de la aplicación y son revisadas por Apple durante el proceso de revisión de la App Store. Apple Platform Security [25] documenta en detalle el modelo de seguridad de la plataforma iOS, incluyendo el aislamiento de procesos, la firma de código y el sandboxing de aplicaciones.

Las comunicaciones del prototipo con las APIs de threat intelligence (Google Safe Browsing, VirusTotal, PhishTank) y con el backend AWS deben cumplir con los requisitos de ATS. La comprensión de ATS es indispensable para el diseño de la capa de red del prototipo en iOS.

Todos los endpoints de API integrados en el Filtro F1 son HTTPS, por lo que cumplen con ATS por defecto. Sin embargo, el manejo de URLs de usuario que pueden ser HTTP (el payload del QR) requiere una consideración especial: la URL extraída del QR se envía al backend para análisis, no se abre directamente en la app, lo que evita la necesidad de exenciones de ATS.

1. ### <a name="_toc230972447"></a>**Seguridad de Red en Android: Network Security Configuration**
Android provee un mecanismo análogo a ATS denominado Network Security Configuration [27], que permite a los desarrolladores definir mediante un archivo XML el comportamiento de las conexiones de red: qué autoridades certificadoras se aceptan, si se permiten conexiones de texto plano (HTTP), y cómo se manejan los certificados de depuración. A partir de Android 9 (API 28), el tráfico de texto plano está deshabilitado por defecto para todas las aplicaciones.

La configuración de seguridad de red de Android complementa las políticas de ATS de iOS en el diseño de la capa de red del prototipo, garantizando que las comunicaciones sean seguras en ambas plataformas. La consistencia entre las dos configuraciones es parte del enfoque de "política de Apple como estándar de compliance" adoptado por el proyecto.

La configuración de red del prototipo en Android debe ser coherente con la de iOS: todas las conexiones hacia las APIs y el backend deben usar HTTPS, y no se deben declarar exenciones innecesarias de texto plano. Este requisito informa directamente la configuración del archivo res/xml/network\_security\_config.xml del proyecto.

1. ### <a name="_toc230972448"></a>**Almacenamiento Local Seguro: MMKV**
react-native-mmkv [30] es una biblioteca de almacenamiento clave-valor para React Native basada en el framework MMKV de WeChat, que ofrece operaciones de lectura y escritura síncronas con cifrado AES integrado y un rendimiento significativamente superior al de AsyncStorage (el almacenamiento predeterminado de React Native). Benchmarks documentados por el autor [29] muestran que MMKV es hasta 30 veces más rápido que AsyncStorage en operaciones de lectura, con soporte para encriptación nativa en iOS (Keychain) y Android (KeyStore).

El historial de escaneos del prototipo (Objetivo Específico 3) se almacena localmente en el dispositivo sin necesidad de cuenta de usuario. Este historial contiene URLs escaneadas —incluyendo URLs maliciosas— que deben almacenarse de forma segura y accesible offline. La combinación de rendimiento y cifrado nativo hace de MMKV la opción más adecuada para este caso de uso, en cumplimiento con los controles MASVS-STORAGE.

MMKV es la tecnología de almacenamiento seleccionada para el historial offline del prototipo. Su justificación técnica —rendimiento, cifrado, compatibilidad con la New Architecture— es parte del fundamento teórico de las decisiones de implementación del Objetivo Específico 3.

1. ## <a name="_toc230972449"></a>**Apis De Threat Intelligence Integradas En El Filtro F1**
Este bloque describe en detalle cada una de las fuentes de datos de reputación y amenazas que componen el Filtro F1 del prototipo —Google Safe Browsing, VirusTotal, PhishTank, URLhaus y MISP—, detallando sus capacidades técnicas, limitaciones operacionales y el rol específico que desempeña cada una dentro del sistema de análisis multicapa.
1. ### <a name="_toc230972450"></a>**Google Safe Browsing API**
La Google Safe Browsing API [19] es un servicio de Google que permite a clientes (navegadores, aplicaciones, servidores) consultar si una URL aparece en las listas de amenazas mantenidas por Google, que incluyen phishing, malware, software no deseado y amenazas de ingeniería social. La versión 5 de la API (Safe Browsing Lookup API v5) permite la consulta en tiempo real de URLs individuales contra estas listas, con una latencia de respuesta típica inferior a 200 ms. Google mantiene estas listas con actualizaciones continuas provenientes del análisis automatizado de miles de millones de URLs.

Google Safe Browsing es la base de datos de URLs maliciosas más grande del mundo por volumen de URLs indexadas, y es la misma fuente que utiliza Chrome, Safari y Firefox para mostrar advertencias de sitios peligrosos. Su integración como primera consulta del Filtro F1 garantiza cobertura sobre el universo de URLs ya identificadas como peligrosas en navegadores de escritorio, extendiendo esa protección al contexto móvil de uso del QR.

Google Safe Browsing es una de las tres APIs del Filtro F1. Su configuración, autenticación (API key), formato de solicitud y estructura de respuesta son componentes directos de la implementación del Objetivo Específico 4.
1. ### <a name="_toc230972451"></a>**VirusTotal API**
VirusTotal [20] es una plataforma de análisis de archivos, URLs y dominios que agrega los resultados de más de 70 motores antivirus, escáneres de URL y herramientas de análisis de comportamiento. La VirusTotal API v3 permite enviar una URL para análisis y recuperar el veredicto agregado de todos los motores integrados, así como metadatos adicionales sobre el dominio (WHOIS, DNS, certificados TLS, etc.). El plan gratuito permite hasta 4 consultas por minuto y 500 por día.

La fortaleza de VirusTotal radica en la agregación: una URL que evade la detección de un motor individual puede ser detectada por otros, y el veredicto final es la síntesis de múltiples perspectivas independientes. Esta diversidad de fuentes reduce la probabilidad de falsos negativos en comparación con una sola fuente de datos.

VirusTotal es la tercera API del Filtro F1. Los resultados que retorna —incluyendo el número de motores que detectaron la URL como maliciosa y el tipo de amenaza identificado— son parte del detalle extendido que el prototipo puede mostrar al usuario en la pantalla de resultado avanzado.
1. ### <a name="_toc230972452"></a>**PhishTank**
PhishTank [21], operado por Cisco Talos, es una base de datos colaborativa de URLs de phishing construida a partir de reportes de usuarios verificados. Cualquier usuario puede reportar una URL de phishing; la comunidad vota para confirmar o rechazar el reporte; las URLs confirmadas pasan a formar parte de la base de datos pública. PhishTank provee una API gratuita que permite consultar si una URL aparece en su base de datos de phishing verificado, con actualizaciones de la base de datos cada hora.

PhishTank complementa a Google Safe Browsing con cobertura especializada en phishing, incluyendo campañas recientes que pueden no haber sido indexadas aún por los sistemas automáticos de Google. Su modelo colaborativo es coherente con el ecosistema de threat intelligence que el prototipo busca enriquecer mediante la funcionalidad de reporte de QR malicioso.

PhishTank es la segunda API del Filtro F1. Adicionalmente, cuando un usuario reporta un QR malicioso desde el prototipo (Feature 5.2), el backend puede enviar la URL a PhishTank para que sea verificada por la comunidad, cerrando el ciclo de retroalimentación de threat intelligence.

Nota de estado operacional: A partir de finales de 2023, Cisco Talos redujo significativamente su soporte activo a PhishTank, resultando en interrupciones periódicas del servicio y menor frecuencia de actualización de la base de datos. Para garantizar la resiliencia del Filtro F1, la implementación debe contemplar el manejo explícito de errores y tiempos de espera (timeouts) ante la indisponibilidad de esta API. OpenPhish [40] constituye una alternativa activa y mantenida que cataloga URLs de phishing con actualizaciones en tiempo real mediante análisis automatizado, y puede considerarse como fuente complementaria o de respaldo del Filtro F1.
1. ### <a name="_toc230972453"></a>**URLhaus (abuse.ch)**
URLhaus [22] es una plataforma de abuse.ch especializada en el seguimiento de URLs utilizadas para la distribución de malware. A diferencia de PhishTank (enfocado en phishing), URLhaus cataloga URLs que sirven exploits, payloads de ransomware, botnets y otros tipos de malware. Provee una API pública que permite la consulta de URLs y dominios contra su base de datos, con actualizaciones en tiempo real a partir de reportes de la comunidad de investigación de seguridad.

Los códigos QR no solo se utilizan para distribuir phishing, sino también para dirigir a las víctimas hacia páginas que sirven malware directamente. URLhaus amplía la cobertura del Filtro F1 más allá del phishing hacia la detección de URLs de distribución de malware.

URLhaus queda fuera del alcance de la implementación del Filtro F1 en este trabajo de graduación, cuyo alcance se limita a las tres APIs ya descritas (Google Safe Browsing, PhishTank y VirusTotal). Su inclusión en el marco teórico responde a que los códigos QR no solo distribuyen phishing sino también malware directo, y URLhaus es la fuente de datos más especializada para ese vector. Su integración como cuarta fuente del Filtro F1 constituye una línea natural de trabajo futuro, especialmente relevante para el contexto de quishing corporativo donde los atacantes pueden distribuir ransomware mediante QR embebidos en documentos de empresa.
1. ### <a name="_toc230972454"></a>**MISP: Plataforma de Intercambio de Indicadores de Compromiso**
MISP (Malware Information Sharing Platform) [23] es una plataforma de código abierto para compartir, almacenar y correlacionar indicadores de compromiso (IOC) de incidentes de ciberseguridad. MISP permite a organizaciones y comunidades de seguridad compartir información estructurada sobre amenazas mediante un formato estándar (MISP format), con soporte para taxonomías, galerías de malware, feeds de threat intelligence y correlación automática de IOC entre eventos. Su arquitectura federada permite que múltiples instancias de MISP compartan información de forma controlada entre comunidades de confianza.

MISP representa el estado del arte en infraestructura de threat intelligence colaborativa. Su comprensión es relevante para el proyecto en dos dimensiones: (1) como contexto del ecosistema en el que operan las APIs integradas (muchas de las cuales consumen feeds compatibles con MISP), y (2) como modelo arquitectónico para una futura evolución del backend del sistema hacia una plataforma de intercambio de IOC de quishing.

Aunque MISP no se integra directamente en el prototipo, la funcionalidad de reporte de QR malicioso (Feature 5.2) implementa el principio central de MISP a escala reducida: los usuarios contribuyen IOC (URLs maliciosas) que se redistribuyen al ecosistema de threat intelligence. El marco teórico de MISP contextualiza esta funcionalidad dentro del paradigma de threat intelligence colaborativa.

La pertinencia de MISP en el marco teórico se justifica adicionalmente porque varias de las APIs integradas en el Filtro F1 consumen o generan datos en formatos compatibles con el estándar MISP: VirusTotal exporta sus resultados en MISP format y PhishTank genera feeds que múltiples instancias MISP importan automáticamente. Comprender MISP como infraestructura subyacente al ecosistema de threat intelligence es, por tanto, condición necesaria para entender plenamente cómo operan las fuentes de datos del F1 y su posición dentro del panorama más amplio del intercambio de inteligencia sobre amenazas.

1. ## <a name="_toc230972455"></a>**Geolocalización Y Servicios De Contexto**
Este bloque cubre los servicios de localización geográfica del dispositivo y la geocodificación inversa, funcionalidades auxiliares que el prototipo utiliza para enriquecer el registro de escaneos con el nombre del lugar donde se capturó el código QR, y las implicaciones de privacidad que conlleva su implementación.
1. ### <a name="_toc230972456"></a>**Geolocalización y Geocodificación Inversa en Plataformas Móviles**
Los dispositivos móviles modernos determinan la ubicación geográfica del usuario mediante la combinación de señales GPS, Wi-Fi, Bluetooth y datos de torres celulares, gestionadas por los frameworks de localización del sistema operativo: Core Location en iOS [33] y la API de localización de Android [34]. Ambas plataformas implementan un modelo de permisos granular que requiere consentimiento explícito del usuario para el acceso a la ubicación, con distinción entre uso en primer plano y en segundo plano, y entre precisión aproximada y precisa.

La geocodificación inversa (reverse geocoding) es el proceso de convertir coordenadas geográficas (latitud, longitud) en una descripción de ubicación legible por humanos: nombre del establecimiento, dirección, ciudad, país. En iOS, CLGeocoder [31] es la clase nativa que provee esta funcionalidad consultando los servidores de Apple Maps, mientras que Mapbox [32] ofrece una API REST alternativa con mayor granularidad y soporte para nombres de lugares de interés (POI).

La funcionalidad de Story Card del prototipo (Feature 5.3, clasificada como feature auxiliar del objetivo central de detección) incluye la geocodificación inversa de la ubicación donde se tomó el QR para mostrar el nombre del lugar en la tarjeta compartible —por ejemplo, "Restaurante El Portal, Ciudad de Guatemala"—. Esto requiere acceso a la ubicación en el momento del escaneo y geocodificación inversa de alta precisión, capaz de distinguir el nombre de un establecimiento dentro de una misma dirección. La selección entre CLGeocoder y la API de Mapbox [32] impacta la privacidad (datos de ubicación enviados a servidores de terceros), la precisión del resultado y el costo del servicio; el marco teórico documenta ambas opciones y sus compromisos.

El Objetivo Específico 3 incluye la geocodificación inversa para la Story Card. La solicitud de permisos de localización, el acceso a las coordenadas GPS y la invocación del servicio de geocodificación son componentes directos de esta funcionalidad auxiliar, cuya implementación correcta requiere el conocimiento de las APIs de localización documentadas en [33][34].
1. ## <a name="_toc230972457"></a>**Usabilidad y seguridad centrada en el usuario**
Este bloque aborda los principios de diseño de sistemas de seguridad que los usuarios puedan comprender y emplear eficazmente, con énfasis en la efectividad de las advertencias de seguridad en dispositivos móviles. Estos fundamentos informan directamente las decisiones de diseño de la interfaz de resultados del prototipo.
1. ### <a name="_toc230972458"></a>**Usable Security: Fundamentos y Modelo de Razonamiento**
Usable Security es una subdisciplina de la interacción persona-computadora (HCI) que estudia cómo diseñar sistemas de seguridad que los usuarios puedan emplear de manera efectiva, eficiente y satisfactoria. Cranor [36] propuso un marco de razonamiento sobre la participación humana en los sistemas de seguridad, identificando tres componentes del comportamiento seguro: (1) el usuario debe notar la señal de seguridad, (2) debe entender su significado, y (3) debe actuar en consecuencia. Un sistema de seguridad que falla en cualquiera de estos tres pasos es inefectivo independientemente de su solidez técnica.

En el contexto del quishing, la usabilidad es un factor crítico: si el prototipo presenta el veredicto de riesgo de forma confusa, tardía o demasiado técnica, el usuario puede ignorarlo o malinterpretarlo, anulando el beneficio de seguridad de la herramienta.

Las decisiones de diseño de interfaz del prototipo —la paleta de colores del veredicto (verde/amarillo/rojo), la presentación en dos niveles de detalle (simple y extendido), el texto del veredicto ("SEGURO / SOSPECHOSO / MALICIOSO"), la posición y el tamaño de los botones de acción— están todas al servicio de facilitar el comportamiento seguro del usuario según el marco de Cranor [36]. Sin esta base teórica, las decisiones de diseño serían puramente estéticas.

El Objetivo Específico 2 —desarrollar el flujo de interacción entre el escaneo y la presentación del veredicto— es fundamentalmente un problema de Usable Security. La pantalla de resultado del prototipo está diseñada para maximizar la probabilidad de que el usuario note, entienda y actúe correctamente ante el veredicto de seguridad, lo que requiere aplicar los principios documentados en [36][37][38].
1. ### <a name="_toc230972459"></a>**Efectividad de Advertencias de Seguridad en Dispositivos Móviles**
La efectividad de las advertencias de seguridad es el grado en que una advertencia logra modificar el comportamiento del usuario hacia una respuesta más segura. Egelman, Cranor y Hong [37] realizaron un estudio empírico sobre la efectividad de las advertencias de phishing en navegadores web, encontrando que las advertencias más efectivas son aquellas que interrumpen el flujo de la tarea del usuario, son visualmente prominentes, usan lenguaje concreto (no técnico) y se presentan en el momento de mayor relevancia contextual. Akhawe y Felt [38] extendieron este análisis a gran escala con datos reales de Chrome, encontrando que el 70 % de los usuarios proceden a través de advertencias de SSL, pero solo el 25 % ignoran las advertencias de malware —lo que indica que el tipo y la severidad percibida de la amenaza modula la respuesta.

El prototipo es, en esencia, un sistema de advertencias de seguridad en tiempo real. La literatura sobre efectividad de advertencias proporciona principios de diseño basados en evidencia para el diseño de las pantallas de resultado: cuándo interrumpir el flujo, cómo describir la amenaza, qué opciones ofrecer al usuario y cómo formular la llamada a la acción.

Los dos niveles de detalle de la pantalla de resultado (Objetivo Específico 2) —vista simple para el usuario casual, vista extendida para el usuario técnico— aplican el principio de progressive disclosure documentado en la literatura de Usable Security: la advertencia primaria debe ser comprensible para cualquier usuario; los detalles técnicos están disponibles para quienes los necesiten, sin sobrecargar al usuario promedio. La paleta de colores y el texto del veredicto reflejan los hallazgos de [37][38] sobre prominencia visual y lenguaje concreto.
1. ## <a name="_toc230972460"></a>**Arquitectura de backend en la nube**
Este bloque describe el modelo de despliegue serverless adoptado para el backend del Filtro F1, incluyendo los componentes de AWS Lambda y API Gateway, las implicaciones del cold start en el presupuesto de latencia del sistema y las capacidades de seguridad que la capa de API Gateway aporta al diseño.
1. ### <a name="_toc230972461"></a>**Arquitectura Serverless para el Backend del Filtro F1**
La arquitectura serverless o de cómputo sin servidor es un modelo de despliegue en la nube en el que el proveedor gestiona automáticamente la infraestructura subyacente, asignando recursos de cómputo de forma dinámica en respuesta a cada solicitud. El backend del Filtro F1 adopta este modelo sobre AWS Lambda [41], un servicio de Amazon Web Services que ejecuta funciones en respuesta a eventos HTTP gestionados por Amazon API Gateway. Las funciones Lambda se activan por solicitud, escalan automáticamente ante variaciones de carga y no incurren en costo cuando no se ejecutan, lo que las hace idóneas para un backend de análisis de seguridad con patrones de tráfico variables.

Una consideración crítica de rendimiento en arquitecturas serverless es el cold start: cuando una función Lambda no ha recibido solicitudes en un período determinado, el proveedor desasigna los recursos y la primera solicitud subsiguiente debe inicializar el entorno de ejecución, introduciendo una latencia adicional de entre 200 ms y 1.000 ms dependiendo del runtime y el tamaño del paquete de despliegue. Para el Objetivo Específico 4 (tiempo de respuesta total inferior a 5 segundos), el cold start representa el riesgo de latencia más relevante en el lado del servidor y debe ser mitigado mediante técnicas como provisioned concurrency —que mantiene instancias de la función pre-inicializadas— o mediante solicitudes de calentamiento periódicas.

El uso de API Gateway como capa de gestión de solicitudes HTTP entre la aplicación móvil y las funciones Lambda introduce capacidades adicionales relevantes para la seguridad: throttling de solicitudes para prevenir abuso de la API, autenticación mediante API keys o tokens JWT, y control de CORS para restringir los orígenes permitidos. Estas capacidades son complementarias a los controles de seguridad implementados en el cliente móvil (MASVS-NETWORK, Sección 3.18) y constituyen la capa de defensa en profundidad del lado del servidor.

La arquitectura serverless del backend define el presupuesto de latencia del sistema: a los tiempos de decodificación del QR (< 100 ms, Sección 3.15) se suman el tiempo de transmisión de la solicitud HTTP al backend, el posible cold start de Lambda, y los tiempos de respuesta paralelos de las APIs de threat intelligence. La comprensión de cada componente de este presupuesto es indispensable para justificar el objetivo de latencia del Objetivo Específico 4 y para diseñar la pantalla de carga con animación skeleton/shimmer (Objetivo Específico 2) con una duración adecuada que cubra el tiempo real de análisis sin generar la percepción de lentitud.



CAPÍTULO 6

# <a name="_toc230972462"></a>Metodología


1. ## <a name="_toc230972463"></a>**Enfoque del trabajo**
   1. ### <a name="_toc230972464"></a>**Tipo de proyecto**
El presente trabajo profesional de graduación constituye un proyecto de desarrollo de software, cuyo producto final es una aplicación móvil orientada al escaneo de códigos QR y a la presentación del análisis de seguridad de las URLs que estos contienen. A diferencia de proyectos de investigación de corte exploratorio o descriptivo, este proyecto tiene una naturaleza aplicada: su objetivo central es la construcción de un artefacto tecnológico funcional que resuelva un problema de seguridad informática concreto, mediante el desarrollo de una interfaz multiplataforma que integra el flujo completo de escaneo, la presentación del veredicto y la consulta al primer filtro de análisis de reputación.

El desarrollo se estructura en torno a un sistema funcional experimental que abarca tanto la interfaz móvil como su integración con el motor de análisis backend, lo que lo enmarca dentro de la modalidad de prototipado de software, apropiada para proyectos donde los requisitos técnicos se refinan iterativamente a medida que se validan componentes del sistema.

Aunque el sistema completo incluye un backend de análisis desarrollado en paralelo, el presente protocolo se centra específicamente en el diseño, implementación y evaluación del frontend móvil y de la integración del Filtro F1 de reputación de URLs.
1. ### <a name="_toc230972465"></a>**Justificación del enfoque seleccionado**
La elección del desarrollo de software como enfoque metodológico responde a la naturaleza intrínsecamente técnica del problema abordado. El quishing, modalidad de phishing ejecutada mediante códigos QR, se materializa en el momento en que un usuario escanea un código con la cámara de su dispositivo móvil y accede a la URL resultante. Este vector de ataque opera, por definición, en el contexto de la movilidad puesto que los códigos QR son leídos predominantemente a través de las aplicaciones de cámara o lectores integrados en teléfonos inteligentes, lo que convierte al dispositivo móvil en el punto crítico de intervención.

Desarrollar la solución como aplicación móvil permite interceptar y analizar la URL en el mismo instante y entorno en que el riesgo se produce, reduciendo la fricción entre la detección de la amenaza y la acción preventiva del usuario. La interfaz móvil es, por tanto, el componente que materializa el valor del sistema frente al usuario final: traduce el resultado del análisis en una decisión comprensible y oportuna. Una solución de escritorio o basada exclusivamente en servicios web no replicaría esta inmediatez operativa, limitando su eficacia en escenarios reales de uso.
1. ## <a name="_toc230972466"></a>**Metodología seleccionada**
   1. ### <a name="_toc230972467"></a>**Metodología adoptada**
Para el desarrollo del proyecto se adopta Kanban como metodología principal de trabajo. Kanban es un método de gestión visual que organiza las tareas mediante un flujo continuo representado en un tablero con estados como Backlog, En progreso, En revisión y Completado.

En el contexto del proyecto, el tablero se divide en dos módulos principales (frontend y backend), con espacios de integración para las tareas que requieren coordinación entre ambas integrantes. El flujo continuo de Kanban permite adaptar el avance del trabajo a la disponibilidad variable del equipo y facilita la identificación de bloqueos técnicos durante el desarrollo.

El seguimiento de tareas se realizará mediante un tablero digital en Monday.com, donde cada actividad será registrada como una tarea técnica asociada a una fase del proyecto. Las tareas incluirán criterios básicos de finalización y pasarán al estado “Completado” únicamente cuando la funcionalidad implementada haya sido integrada y validada mediante pruebas funcionales básicas o verificación del contrato de interfaz correspondiente.
1. ### <a name="_toc230972468"></a>**Justificación técnica**
La elección de Kanban responde a las características técnicas y organizativas del proyecto. El equipo está conformado por dos integrantes con responsabilidades diferenciadas, por lo que una metodología ligera y flexible resulta más adecuada que enfoques con mayor carga de roles y ceremonias.

Asimismo, el proyecto depende de integraciones externas y tecnologías cuyo comportamiento real solo puede validarse durante la implementación, como las APIs de threat intelligence del Filtro F1, las librerías de escaneo móvil nativo y los servicios de geocodificación inversa. En este contexto, Kanban permite reorganizar prioridades y avanzar mediante entregas continuas sin depender de ciclos rígidos de desarrollo. Además, la metodología facilita la visibilidad del avance simultáneo de frontend y backend, permitiendo coordinar contratos de interfaz e integraciones progresivas entre ambos módulos.

Una metodología secuencial como Waterfall resultaría poco adecuada debido a la incertidumbre técnica presente en las integraciones y pruebas del sistema, mientras que Scrum introduce una estructura de roles y ceremonias innecesaria para un equipo de dos personas.
1. ## ` `**<a name="_toc230972469"></a>Las fases del proyecto**
El proyecto se organiza en seis fases, alineadas con el roadmap técnico del prototipo y con los objetivos específicos declarados en el protocolo de cada módulo. Dentro del tablero Kanban, cada fase corresponde a un conjunto de columnas con sus respectivas tarjetas; ambos módulos (frontend y backend) avanzan en paralelo, coordinados mediante los contratos de interfaz acordados y el estado visible del tablero.
1. ### <a name="_toc230972470"></a>**Fase 1 — Diseño y Configuración de Entorno (Semanas 1–2)**
Descripción: Establecimiento de las bases técnicas, el diseño de la arquitectura del frontend y el contrato de interfaz entre módulos antes de escribir código productivo. Esta fase es de planificación conjunta y configuración de entornos.

Actividades principales:

<a name="_toc230973132"></a>*Tabla *1*: Activades principales de fase 1* 

|**Actividad**|**Entregable al otro módulo**|
| - | - |
|Diseño de la arquitectura del frontend: navegación entre pantallas, estructura de componentes React Native y estrategia de manejo de estado.|—|
|Configuración del entorno de desarrollo móvil: React Native (New Architecture), Android Studio, Xcode, emuladores y dispositivos físicos iOS y Android.|—|
|Diseño de wireframes del flujo principal de interacción (escaneo → carga → resultado simple/extendido) y de las pantallas de las funcionalidades secundarias.|Wireframes del flujo principal para revisión conjunta.|
|Definición conjunta del contrato de interfaz (esquema del response de veredicto: nivel de riesgo, detalle por filtro, indicadores activados; códigos de error compartidos).|Contrato de interfaz v1 documentado; revisión del esquema del response desde la perspectiva de consumo del frontend.|

Entregable de fase: Contrato de interfaz v1 documentado y acordado por ambas integrantes; wireframes del flujo principal aprobados; entornos de desarrollo configurados y verificados.

Relación con los objetivos: Esta fase fundamenta la totalidad de los objetivos específicos de ambos módulos al establecer las decisiones de diseño y los contratos técnicos que guiarán la implementación.
1. ### <a name="_toc230972471"></a>**Fase 2 — Escaneo, F1 y Arquitectura Base del Frontend (Semanas 3–6)**
Descripción: Construcción del núcleo funcional del prototipo. Al finalizar esta fase existe un sistema funcional end-to-end: el usuario puede escanear un QR en el dispositivo móvil, la URL se envía al backend, se ejecuta el Filtro F1, y el resultado se presenta en pantalla.

Actividades principales:

<a name="_toc230973133"></a>*Tabla *2*: Activades principales de fase 2*

|**Actividad**|**Entregable al otro módulo**|
| - | - |
|Implementación del módulo de escaneo con react-native-vision-camera y CodeScanner nativo en iOS y Android; clasificación del contenido como URL vs. no-URL.|Confirmación del formato y metadata de la URL enviada al endpoint de análisis.|
|Pantalla de carga con animación skeleton/shimmer y pantalla de resultado simple con el veredicto consolidado.|—|
|Historial local offline con MMKV (últimos 20 escaneos).|—|
|Integración del Filtro F1: consumo del endpoint de análisis, presentación del veredicto consolidado (SEGURO, MALICIOSO, INCIERTO), manejo de timeouts (≤ 5 s) y degradación elegante ante fallo parcial de APIs.|Consumo del contrato de interfaz; retroalimentación sobre los estados post-F1 desde la perspectiva del frontend.|

Entregable de fase: Prototipo funcional end-to-end del flujo principal (escaneo → F1 → resultado simple) demostrable en dispositivo físico iOS y Android.

Relación con los objetivos: Cumplimiento de los objetivos de tiempo de escaneo, flujo de interacción básico e integración del Filtro F1 con tiempo de respuesta < 5 segundos.
1. ### <a name="_toc230972472"></a>**Fase 3 — Pantallas de Resultado Extendido: Filtro F2.1 (Semanas 7–9)**
Descripción: Implementación de las pantallas de resultado extendido en el frontend, que presentan al usuario el desglose de criterios de riesgo estructural cuando el Filtro F1 no es concluyente. Al finalizar esta fase, el prototipo presenta el desglose heurístico recibido del backend de forma comprensible.

Actividades principales:

<a name="_toc230973134"></a>*Tabla *3*: Activades principales de fase 3*

|**Actividad**|**Entregable al otro módulo**|
| - | - |
|Pantalla de resultado extendido: presentación visual del score de riesgo y del desglose de criterios activados (antigüedad del dominio, TLD sospechoso, estructura de la URL, HTTPS vs. HTTP).|—|
|Integración con el endpoint del Filtro F2.1 mediante el contrato actualizado; manejo de los estados SOSPECHOSO e INCIERTO en la interfaz.|Retroalimentación sobre el response de F2.1 desde el consumo del frontend; especificación visual de los criterios a mostrar.|
|Diseño de componentes reutilizables de presentación de niveles de riesgo y refinamiento visual de la jerarquía de información del veredicto.|—|

Entregable de fase: Flujo funcional escaneo → F1 → F2.1 → resultado con desglose heurístico, demostrable en dispositivo físico.

Relación con los objetivos: Cumplimiento del objetivo de desarrollo del flujo de interacción principal con presentación del veredicto en dos niveles de detalle (simple y extendido).
1. ### <a name="_toc230972473"></a>**Fase 4 — Pantallas F2.2 y F2.3 + Features Adicionales (Semanas 10–12)**
Descripción: Implementación de las pantallas de presentación del análisis dinámico y de la vista previa visual segura, junto con las funcionalidades secundarias del prototipo (historial, reporte de QR y Story Card). Al finalizar esta fase el frontend cubre la totalidad de las pantallas del sistema de análisis en cascada.

Actividades principales:

<a name="_toc230973135"></a>*Tabla *4*: Activades principales de fase 4*

|**Actividad**|**Entregable al otro módulo**|
| - | - |
|Pantalla de resultado F2.2: presentación de los indicadores de comportamiento detectados en el análisis de sandbox (redirecciones, descargas automáticas, scripts ofuscados, formularios sospechosos).|Definición de los indicadores de comportamiento a mostrar en la interfaz; integración con el endpoint de F2.2.|
|Pantalla de vista previa visual segura (F2.3): visualización del screenshot del sitio recibido mediante la URL firmada de S3, sin exponer el dispositivo del usuario.|Integración con el endpoint de F2.3; consumo de la URL firmada de S3 incluida en el response.|
|Implementación del reporte de QR malicioso al backend y de la Story Card compartible (foto de contexto, QR blureado, ubicación y resultado visual); geocodificación inversa para resolución de nombre de lugar y ciudad.|Envío del reporte al endpoint del backend con el payload completo.|

Entregable de fase: Prototipo completo con todas las pantallas funcionales y todas las features adicionales; integración real entre frontend y backend para los filtros F2.2 y F2.3.

Relación con los objetivos: Cumplimiento de todos los objetivos específicos de ambos módulos. Disponibilidad del sistema completo para la fase de pruebas.
1. ### <a name="_toc230972474"></a>**Fase 5 — Pruebas, Refinamiento y Documentación (Semanas 13–15)**
Descripción: Validación integral del prototipo, corrección de defectos, refinamiento de la experiencia de usuario y elaboración del informe final de cada módulo.

Actividades principales:

<a name="_toc230973136"></a>*Tabla *5*: Activades principales de fase 5*

|**Actividad**|**Entregable al otro módulo**|
| - | - |
|Pruebas de integración end-to-end del flujo completo con muestra de URLs clasificadas: maliciosas conocidas de PhishTank y VirusTotal, y URLs legítimas de Tranco List.|Reporte de resultados de pruebas end-to-end con URLs de referencia para validación visual.|
|Pruebas de rendimiento del módulo de escaneo (T\_scan, percentil 90 sobre 30 QRs en condiciones controladas de tamaño, ángulo e iluminación).|—|
|Pruebas de rendimiento del Filtro F1 (T\_F1, percentil 90 sobre 100 URLs en red móvil 4G).|—|
|Pruebas de usabilidad con participantes: comprensión del veredicto, tasa de completación del flujo principal y tiempo de primer escaneo exitoso.|—|
|Corrección de defectos identificados en pruebas.|—|
|Redacción del informe final del módulo frontend.|—|

Entregable de fase: Prototipo validado con resultados de pruebas documentados; informe final de cada módulo; presentación y demostración del prototipo.
1. ### <a name="_toc230972475"></a>**Fase de cierre — Preparación y Defensa (Semanas 16–17)**
Descripción: Incorporación de retroalimentación del asesor, revisión cruzada de coherencia entre módulos y preparación de la defensa del trabajo de graduación.

Actividades principales:

<a name="_toc230973137"></a>*Tabla *6*: Activades principales de fase de cierre*

|**Actividad**|**Entregable**|
| - | - |
|Incorporar retroalimentación del asesor en el informe de cada módulo.|Informe final revisado por módulo.|
|Revisión cruzada de coherencia entre documentos de ambos módulos.|Informe consolidado con coherencia verificada.|
|Preparación del guión de demostración y diseño de slides de defensa.|Presentación y guión listos para ensayo.|
|Ensayo de la defensa con simulación de preguntas del comité evaluador.|Buffer para ajustes finales antes de la defensa.|

Entregable de fase: Prototipo validado con resultados de pruebas documentados; informe final de cada módulo; presentación y demostración del prototipo.
1. ## <a name="_toc230972476"></a>**Recursos necesarios**
   1. ### <a name="_toc230972477"></a>**Recursos humanos**
<a name="_toc230973138"></a>*Tabla *7*: Recursos humanos*

|**Persona**|**Rol**|**Responsabilidades en el proyecto**|
| - | - | - |
|María José Villafuerte (22129)|Desarrolladora frontend|Diseño de interfaz (UX/UI), implementación del módulo React Native, módulo de escaneo, integración del Filtro F1, historial local, reporte, Story Card y geocodificación inversa|
|Fabiola Contreras (22787)|Desarrolladora backend|Arquitectura y despliegue en AWS, implementación de los filtros F2.1, F2.2 y F2.3, integración con APIs externas (WhoisXML, URLScan.io, VirusTotal), base de datos y almacenamiento|
|Asesor académico|Supervisor universitario|Revisión del protocolo, validación metodológica, retroalimentación en entregas parciales y evaluación final|

Ambas integrantes comparten la responsabilidad de acordar y mantener el contrato de interfaz entre módulos, así como de la integración end-to-end del sistema.
1. ### <a name="_toc230972478"></a>**Recursos tecnológicos**
Equipamiento de desarrollo:

<a name="_toc230973139"></a>*Tabla *8*: Recursos tecnológicos*

|**Recurso**|**Uso**|
| - | - |
|Computadora con Windows 11|Desarrollo principal del frontend (VS Code), Android Studio, emulación Android|
|Acceso al laboratorio de macOS de la universidad|Compilación y pruebas del frontend en dispositivos iOS mediante Xcode|
|Dispositivos físicos iOS y Android|Pruebas del módulo de escaneo y validación del flujo de la app en hardware real|

Stack tecnológico:

<a name="_toc230973140"></a>*Tabla *9*: Stack tecnológico*

|**Tecnología**|**Tipo**|**Uso**|
| - | - | - |
|React Native 0.76+ (New Architecture)|Framework|Base de código multiplataforma iOS y Android|
|react-native-vision-camera v4|Librería|Escaneo nativo de códigos QR (CodeScanner) en iOS y Android|
|react-native-mmkv|Librería|Almacenamiento local offline del historial de escaneos|
|React Navigation|Librería|Navegación entre las pantallas de la aplicación|
|JavaScript / TypeScript|—|Lenguaje de desarrollo del módulo frontend|

APIs externas:

<a name="_toc230973141"></a>*Tabla *10*: Apis Externas*

|**API**|**Plan**|**Límite relevante**|**Módulo**|
| - | - | - | - |
|Google Safe Browsing API|Gratuito (Google Cloud)|10,000 requests/día|F1|
|VirusTotal API|Gratuito|500 requests/día, 4 req/min|F1|
|PhishTank API|Gratuito (registro requerido)|Sin límite documentado en consultas|F1|
|APIs de geocodificación inversa (Nominatim / Google Maps)|Gratuito / Freemium|Resolución de nombre de lugar y ciudad|Story Card (Frontend)|

Herramientas compartidas:

<a name="_toc230973142"></a>*Tabla *11*: Herramientas compartidas*

|**Herramienta**|**Uso**|
| - | - |
|Git + GitHub|Control de versiones; repositorio compartido entre ambos módulos|
|Postman|Prueba manual de los endpoints del backend durante la integración del frontend|
|Jest|Pruebas unitarias del módulo frontend|
1. ### <a name="_toc230972479"></a>**Recursos externos**
Créditos de APIs: Las APIs de reputación seleccionadas para el Filtro F1, así como los servicios de geocodificación inversa, ofrecen planes gratuitos suficientes para el volumen estimado de pruebas durante el desarrollo y evaluación del prototipo, por lo que no se contempla inversión económica adicional.

Acceso a hardware iOS: La compilación y prueba del frontend en dispositivos iOS se realizará mediante el laboratorio de cómputo con equipos macOS de la universidad, sin que ello implique inversión adicional en hardware especializado.
1. ### <a name="_toc230972480"></a>**Estrategias para garantizar disponibilidad**
Dependencia de APIs externas (F1): El sistema implementará una estrategia de degradación progresiva; las llamadas a las APIs de reputación se ejecutan en paralelo con un timeout por API, de modo que si una API no responde dentro del tiempo límite, el veredicto se consolida con las respuestas disponibles sin interrumpir el flujo de la aplicación.

Dependencia entre módulos (frontend ↔ backend): Frontend y backend se desarrollarán inicialmente mediante contratos de interfaz y mocks locales, permitiendo el avance paralelo de ambos módulos y reduciendo bloqueos durante la integración.

Permisos de cámara y ubicación: La interfaz contemplará flujos de degradación claros cuando el usuario no conceda permisos de cámara o ubicación; en particular, la Story Card se generará sin ubicación cuando el permiso de geolocalización no esté disponible.

Curva de aprendizaje tecnológico: Las primeras semanas del proyecto se destinarán a validación técnica y exploración de las tecnologías principales del frontend, especialmente react-native-vision-camera y la New Architecture de React Native.
1. ## <a name="_toc230972481"></a>**Viabilidad del proyecto**
   1. ### <a name="_toc230972482"></a>**Análisis de viabilidad técnica**
La viabilidad técnica del proyecto se sustenta en la utilización de tecnologías estables y ampliamente adoptadas para desarrollo móvil. El frontend se desarrollará con React Native y react-native-vision-camera, mientras que el almacenamiento local del historial se resolverá con react-native-mmkv; el módulo se integra con el backend mediante contratos de interfaz REST.

Las APIs externas integradas en el Filtro F1 (Google Safe Browsing, VirusTotal y PhishTank) y los servicios de geocodificación inversa ofrecen planes gratuitos suficientes para el volumen estimado de pruebas y validación del prototipo durante el período de desarrollo. Para reducir limitaciones relacionadas con cuotas o latencia, el sistema implementará llamadas en paralelo, manejo de timeouts y degradación progresiva ante fallos parciales.

La arquitectura del sistema mantiene una separación clara entre frontend y backend mediante contratos de interfaz REST, permitiendo el desarrollo paralelo de ambos módulos y reduciendo riesgos de integración. Asimismo, el acceso a hardware especializado para pruebas en iOS se encuentra cubierto mediante el laboratorio de cómputo de la universidad.

En conjunto, las tecnologías seleccionadas, la disponibilidad de recursos y la planificación modular del desarrollo permiten considerar el proyecto técnicamente viable dentro del alcance y período establecidos.
1. ### <a name="_toc230972483"></a>**Viabilidad temporal**
El proyecto se considera temporalmente viable debido a la división modular del trabajo y a la planificación incremental establecida en las fases de desarrollo. La distribución de responsabilidades entre frontend y backend permite que ambas integrantes trabajen en paralelo durante gran parte del proyecto, reduciendo dependencias críticas y optimizando el tiempo disponible.

La metodología Kanban facilita además la priorización continua de tareas y la adaptación del flujo de trabajo según la disponibilidad académica del equipo, permitiendo reorganizar actividades ante posibles retrasos sin afectar el avance global del proyecto.

En conjunto, la planificación modular, la metodología de trabajo y el alcance delimitado del prototipo permiten considerar el proyecto viable dentro del tiempo establecido para el trabajo de graduación.
1. ### <a name="_toc230972484"></a>**Riesgos y estrategias de mitigación**
El proyecto presenta riesgos principalmente asociados a dependencias externas, integración entre módulos y disponibilidad de recursos tecnológicos. Para reducir su impacto, se establecen estrategias preventivas orientadas a mantener continuidad operativa y flexibilidad durante el desarrollo.

<a name="_toc230973143"></a>*Tabla *12*: Riesgos y estrategias de mitigación*

|**ID**|**Riesgo**|**Estrategia de mitigación**|
| - | - | - |
|R1|Incompatibilidades de react-native-vision-camera con la New Architecture de React Native|Exploración técnica temprana en las primeras semanas, revisión de issues abiertos en el repositorio de la biblioteca y fijación de una versión estable.|
|R2|Latencia real del Filtro F1 superior al umbral de 5 segundos en red móvil|Ejecución paralela de las consultas (Promise.all), timeout por API de 4 segundos y consolidación del veredicto con las respuestas disponibles.|
|R3|Retrasos entre frontend y backend|Uso de contratos de interfaz y mocks locales para permitir desarrollo paralelo.|
|R4|Acceso condicionado al laboratorio de macOS para compilación en iOS|Planificación anticipada de sesiones de compilación y prueba continua en Android durante el desarrollo.|
|R5|Denegación de permisos de cámara o ubicación por parte del usuario|Flujos de degradación con mensajes claros; la Story Card se genera sin ubicación cuando no hay permiso de geolocalización.|
|R6|Problemas de integración detectados tardíamente|Integraciones parciales al cierre de cada fase y validación continua de los contratos de interfaz.|

Las pruebas de usabilidad del prototipo se realizarán con consentimiento informado de los participantes. La aplicación almacena únicamente la información necesaria para el funcionamiento del sistema, incluyendo historial local de escaneos y reportes enviados al backend. Las capturas de vista previa visual y registros temporales se almacenarán con mecanismos de expiración automática, y los datos de ubicación utilizados en Story Card requerirán autorización explícita del usuario.
1. ## <a name="_toc230972485"></a>**Métricas e indicadores para evaluar los resultados**
Las métricas definidas a continuación permiten verificar objetivamente el cumplimiento de los objetivos específicos de ambos módulos y sustentan las conclusiones del trabajo sin recurrir a apreciaciones subjetivas.
1. ### <a name="_toc230972486"></a>**Métricas del Módulo de Escaneo (Frontend)**
<a name="_toc230973144"></a>*Tabla *13*: Métricas del Módulo de Escaneo*

|**Métrica**|**Definición**|**Valor objetivo**|**Instrumento de medición**|
| - | - | - | - |
|Tiempo de escaneo (T\_scan)|Tiempo desde que el QR entra en el campo de visión hasta que la app extrae la URL|≤ 5 segundos (p90)|Timestamps en la app; muestra de 30 QRs en condiciones controladas|
|Tasa de detección de QR (TDR)|% de QRs correctamente decodificados sobre el total presentado|≥ 95%|Muestra de 40 QRs con variedad de tamaños, ángulos e iluminación|
|Precisión de clasificación de contenido|% de QRs correctamente clasificados como URL vs. no-URL|≥ 98%|Muestra de 50 QRs (60% URL / 40% no-URL)|
1. ### <a name="_toc230972487"></a>**Métricas del Filtro F1 — Reputación (Frontend + Backend)**
<a name="_toc230973145"></a>*Tabla *14*: Métricas del Filtro F1*

|**Métrica**|**Definición**|**Valor objetivo**|**Instrumento de medición**|
| - | - | - | - |
|Tiempo de respuesta F1 (T\_F1)|Tiempo desde el envío de la URL hasta la recepción del veredicto en la app|≤ 5 segundos (p90)|Timestamps en los hooks de llamada a la API; 100 URLs de prueba en red 4G|
|Tasa de detección de maliciosos conocidos (TDM)|% de URLs maliciosas verificadas que reciben veredicto MALICIOSO|≥ 90%|50 URLs maliciosas de PhishTank + 50 URLs limpias de Tranco List; cálculo de precisión, recall y F1-score|
|Tasa de falsos positivos (TFP)|% de URLs legítimas que reciben veredicto MALICIOSO|≤ 5%|Misma muestra anterior (50 URLs limpias)|
|Disponibilidad bajo fallo parcial|% de requests que producen un veredicto válido cuando una API no responde|100%|Pruebas de inyección de fallo: se bloquea artificialmente una API a la vez|
1. ### <a name="_toc230972488"></a>**Métricas de Usabilidad (Frontend)**
<a name="_toc230973146"></a>*Tabla *15*: Métricas de Usabilidad*

|**Métrica**|**Definición**|**Valor objetivo**|**Instrumento de medición**|
| - | - | - | - |
|Comprensión del veredicto|% de usuarios de prueba que interpretan correctamente el nivel de riesgo sin instrucciones previas|≥ 90%|Prueba de usabilidad con 5 participantes; tarea: “¿qué indica esta pantalla?”|
|Tasa de completación del flujo principal|% de usuarios que completan el flujo escaneo → resultado sin errores de navegación|≥ 85%|Observación directa en sesión de usability testing|
|Tiempo de primer escaneo exitoso (T\_learn)|Tiempo que un usuario sin instrucciones tarda en completar su primer escaneo exitoso|≤ 60 segundos|Cronometraje en sesión de usability testing|
|Renderizado correcto de niveles de detalle|Ambas vistas de resultado (simple y extendida) renderizan sin errores en iOS y Android para todos los estados del veredicto (SEGURO, SOSPECHOSO, MALICIOSO, INCIERTO)|Sin errores de renderizado en ningún estado|Prueba funcional manual con una URL representativa por estado; verificación en dispositivo físico iOS y Android|
1. ### <a name="_toc230972489"></a>**Métricas de Funcionalidades Secundarias (Frontend)**
Estas métricas cubren las funcionalidades del tercer objetivo específico de María José: historial offline, reporte de QR malicioso y Story Card.

<a name="_toc230973147"></a>*Tabla *16*: Métricas de funcionalidades secundarias*

|**Métrica**|**Definición**|**Valor objetivo**|**Instrumento de medición**|
| - | - | - | - |
|Persistencia del historial offline|Los escaneos almacenados en MMKV permanecen accesibles tras cerrar y reabrir la app, sin conexión a internet|100% de los escaneos almacenados recuperables offline|Prueba funcional: almacenar 5 escaneos, desactivar red, cerrar app, reabrir y verificar que los 5 aparecen en historial|
|Límite de historial|La app no almacena más de 20 entradas en historial local; al superar el límite, descarta la entrada más antigua|Comportamiento correcto al superar 20 entradas|Prueba funcional: almacenar 21 escaneos consecutivos y verificar que solo persisten los 20 más recientes|
|Envío correcto del reporte|% de reportes de QR malicioso iniciados por el usuario que llegan al backend con el payload completo (URL, veredicto, timestamp)|100%|Prueba funcional con Postman: verificar en la base de datos que el registro del reporte existe tras la acción en la app|
|Generación de Story Card|% de intentos de generación de Story Card que producen una imagen compartible con los cuatro elementos requeridos (foto de contexto, QR blureado, ubicación y resultado visual)|≥ 90%|Prueba funcional manual sobre 10 escaneos con distintos resultados (SEGURO y MALICIOSO); inspección visual de la imagen generada|
|Resolución de geocodificación inversa|% de escaneos con permiso de ubicación activo que producen un nombre de lugar y ciudad legible en la Story Card|≥ 85%|Prueba funcional en 10 ubicaciones distintas con permiso de ubicación concedido|
1. ### <a name="_toc230972490"></a>**Métricas de Calidad Técnica General**
<a name="_toc230973148"></a>*Tabla *17*: Métricas de Calidad Técnica General*

|**Métrica**|**Definición**|**Valor objetivo**|**Instrumento de medición**|
| - | - | - | - |
|Compatibilidad multiplataforma|La app compila y ejecuta el flujo principal sin errores críticos en iOS ≥ 15 y Android ≥ 10|Sin errores críticos en ambas plataformas|Prueba en dispositivos físicos o emuladores representativos|
|Cobertura de pruebas unitarias (frontend)|% de líneas de código en lógica de negocio (clasificación de QR, consolidación del veredicto F1) cubiertas por pruebas unitarias|≥ 70%|Jest + reporte de cobertura|
|Tiempo de inicio de la app (T\_start)|Tiempo desde que el usuario toca el ícono hasta que la pantalla de escaneo está lista|≤ 3 segundos en dispositivo de gama media|Medición manual; promedio de 5 arranques en frío|
|Latencia total del flujo completo (T\_total)|Tiempo desde el escaneo del QR hasta la presentación del veredicto final en la app, incluyendo todos los filtros ejecutados|≤ 35 segundos para el flujo completo (F1 + F2.1 + F2.2)|Medición end-to-end sobre 20 URLs de prueba|

Los umbrales fueron definidos considerando la experiencia de usuario esperada en aplicaciones móviles y las limitaciones técnicas documentadas de las APIs utilizadas.
1. ## <a name="_toc230972491"></a>**Trazabilidad metodológica**
La siguiente tabla resume la relación entre los objetivos específicos del proyecto, los módulos involucrados, las fases de implementación y las métricas utilizadas para evaluar su cumplimiento. Esta trazabilidad permite verificar la coherencia entre los objetivos planteados, la metodología de desarrollo y los mecanismos de evaluación definidos.

<a name="_toc230973149"></a>*Tabla *18*: Trazabilidad metodológica*

|**Objetivo específico**|**Módulo**|**Fase**|**Métricas asociadas**|
| - | - | - | - |
|OE1. Implementar el módulo de escaneo de QR con extracción de URL < 5 s y clasificación del tipo de contenido|Frontend|Fase 2|T\_scan, TDR, precisión de clasificación de contenido|
|OE2. Desarrollar el flujo de interacción principal entre el escaneo y la presentación del veredicto (resultado simple y extendido)|Frontend|Fases 2–4|Comprensión del veredicto, tasa de completación, T\_learn, renderizado correcto de niveles de detalle|
|OE3. Implementar las funcionalidades secundarias de historial offline, reporte y Story Card con geocodificación inversa|Frontend|Fases 2 y 4|Persistencia del historial offline, límite de historial, envío del reporte, generación de Story Card, resolución de geocodificación inversa|
|OE4. Integrar el Filtro F1 de consulta a listas de reputación con tiempo de respuesta < 5 s|Frontend + Backend|Fase 2|T\_F1, TDM, TFP, disponibilidad bajo fallo parcial|
1. ## <a name="_toc230972492"></a>**Coherencia entre Problema, Objetivos, Metodología y Métricas**
La estructura metodológica del proyecto mantiene coherencia entre el problema identificado, los objetivos específicos, las fases de desarrollo y las métricas de evaluación. La división modular entre frontend y backend permite distribuir responsabilidades técnicas de forma paralela, mientras que la metodología Kanban facilita la integración progresiva y el seguimiento continuo del avance. Asimismo, las métricas definidas permiten evaluar objetivamente el cumplimiento de los objetivos planteados durante el desarrollo y validación del prototipo.



CAPÍTULO 7

# <a name="_toc230972493"></a>Definición y alcance


1. ## <a name="_toc230972494"></a>**Definición del alcance**
El presente protocolo se enfoca en el diseño e implementación del frontend móvil del sistema de análisis automatizado de URLs para detección de quishing, integrado dentro de un sistema compuesto por una interfaz en React Native y un motor backend desplegado en AWS. El frontend cubre el flujo completo de la experiencia de usuario e integra el Filtro F1 como primer filtro de análisis funcional end-to-end:

F1 — Reputación: consumo en tiempo real del veredicto consolidado de Google Safe Browsing, PhishTank y VirusTotal; primer filtro funcional integrado de extremo a extremo.

Pantallas de resultado para F2.1 (análisis heurístico), F2.2 (sandbox) y F2.3 (vista previa visual segura): la interfaz presenta el desglose y los indicadores recibidos del backend; la implementación del motor de análisis de estos filtros forma parte del módulo backend.

Funcionalidades secundarias: historial local offline (últimos 20 escaneos), reporte de QR malicioso al backend y Story Card compartible con geocodificación inversa.

El producto final es demostrable en dispositivos físicos iOS y Android; no contempla publicación en tiendas de aplicaciones.
1. ## <a name="_toc230972495"></a>**Delimitación Funcional y Técnica**
   1. ### <a name="_toc230972496"></a>**Funcionalidades incluidas**
<a name="_toc230973150"></a>*Tabla *19*: Delimitación Funcional y Técnica*

|**Módulo**|**Componente**|
| - | - |
|Frontend|Decodificación QR nativa en tiempo real (Apple Vision / ML Kit)|
|Frontend|Clasificación de contenido: URL vs. no-URL|
|Frontend|Pantalla de carga (skeleton/shimmer) y resultado simple/extendido|
|Frontend|Historial local cifrado (últimos 20 escaneos, consultable offline)|
|Frontend|Reporte de QR malicioso al backend|
|Frontend|Story Card compartible con ubicación geocodificada|
|Frontend|Integración del Filtro F1 (consumo del veredicto de reputación vía backend)|

El motor de análisis backend (filtros F2.1, F2.2 y F2.3) forma parte del sistema integral, pero su implementación queda fuera del alcance principal del presente protocolo; el frontend consume sus resultados mediante el contrato de interfaz acordado.
1. ### <a name="_toc230972497"></a>**Stack tecnológico fijo**
<a name="_toc230973151"></a>*Tabla *20*: Stack tecnológico fijo*

|**Capa**|**Tecnología**|
| - | - |
|Framework móvil|React Native 0.76+ (New Architecture)|
|Cámara y escaneo|react-native-vision-camera v4|
|Almacenamiento local|react-native-mmkv|
|Navegación|React Navigation|
|Geocodificación inversa|Nominatim / Google Maps API|
|Reputación (F1)|Google Safe Browsing v5, PhishTank, VirusTotal v3|

La unidad de análisis es exclusivamente la URL textual extraída del QR (RFC 3986). No se analiza el símbolo QR en sí ni ningún otro tipo de contenido codificado.
1. ## <a name="_toc230972498"></a>**Restricciones**
Temporal: diecisiete semanas de desarrollo organizadas en seis fases, contemplando un margen adicional dentro del semestre académico para atender posibles ajustes o imprevistos.

Equipo: dos integrantes, cada una responsable de un módulo. Sin recursos adicionales.

Económica: el sistema opera dentro de los planes gratuitos de todas las APIs externas y del AWS Free Tier. No se contempla inversión en planes de pago.

Hardware: la compilación para iOS requiere acceso periódico al laboratorio de macOS de la universidad.

Conectividad: el análisis requiere conexión a internet. Sin conexión, el sistema no produce veredicto y lo comunica al usuario; no se implementa análisis offline.
1. ## <a name="_toc230972499"></a>**Exclusiones explícitas**
Funcionales: cuentas de usuario y autenticación; historial ilimitado; GIF animado del comportamiento del sitio (F2.3); notificaciones push; escaneo en segundo plano.

De contenido: análisis de seguridad sobre datos WiFi, vCard o esquemas de pago codificados en QR; URLs con esquemas distintos de http:// y https://.

Técnicas: implementación del motor de análisis backend (filtros F2.1, F2.2 y F2.3); modelos de aprendizaje automático propios; análisis de HTML o JavaScript en el dispositivo; despliegue en tiendas de aplicaciones; pruebas de carga a escala.

De investigación: estudios de usabilidad con muestras estadísticamente representativas; estudios de campo en entornos reales; análisis comparativo con soluciones comerciales.



CAPÍTULO 8

# <a name="_toc230972500"></a>Plan de trabajo


El cronograma de actividades fue planificado considerando un semestre académico de 20 semanas; sin embargo, se definieron únicamente 17 semanas de trabajo efectivo con el propósito de contar con un margen de contingencia ante posibles retrasos, ajustes metodológicos o imprevistos durante el desarrollo del proyecto. Esta planificación busca asegurar una ejecución ordenada y realista de las actividades propuestas, permitiendo flexibilidad para atender eventualidades sin comprometer el cumplimiento de los objetivos establecidos.
1. ## <a name="_toc230972501"></a>**Distribución de Fases**
<a name="_toc230973152"></a>*Tabla *21*: Plan de trabajo, distribución de fases*

|**Fase**|**Semanas**|**Duración**|
| :-: | :-: | :-: |
|**Fase 1 — Diseño y Configuración de Entorno**|S1–S2|2 semanas|
|**Fase 2 — Escaneo, F1 y Arquitectura Base del Frontend**|S3–S6|4 semanas|
|**Fase 3 — Pantallas de Resultado Extendido: Filtro F2.1**|S7–S9|3 semanas|
|**Fase 4 — Pantallas F2.2 y F2.3 + Features Adicionales**|S10–S12|3 semanas|
|**Fase 5 — Pruebas, Refinamiento y Documentación**|S13–S15|3 semanas|
|**Cierre — Preparación y Defensa**|S16–S17|2 semanas|
|**TOTAL**|**S1–S17**|**17 semanas**|
##
1. ## <a name="_toc230972502"></a>**Diagrama de Gantt mensual**
<a name="_toc230973153"></a>*Tabla *22*: Plan de trabajo, diagrama de Gantt mensual*

|**LEYENDA**|||||||||
| :-: | :- | :- | :- | :- | :- | :- | :- | :- |
|** |Actividad activa||||||||
|**▒▒▒▒**|Actividad parcial / transición||||||||
|**◆**|Hito crítico||||||||
|**Módulo**|**Fase**|**Actividad**|**Mes 1**|**Mes 2**|**Mes 3**|**Mes 4**|||
|**Frontend<br>(Majo)**|**F1**|Arquitectura de pantallas y wireframes|||||||
||**F1**|Configuración entorno React Native|||||||
||**F2**|Módulo de escaneo (react-native-vision-camera)|||||||
||**F2**|Clasificación de contenido QR|||||||
||**F2**|Skeleton / shimmer + pantallas resultado simple|||||||
||**F2**|Filtro F1 (GSB + PhishTank + VirusTotal en paralelo)|||||||
||**F2**|Historial offline MMKV|||||||
||**F3**|Pantalla resultado extendido F2.1|||||||
||**F3**|Flujo de navegación estado INCIERTO|||||||
||**F3**|Integración con endpoint F2.1|||||||
||**F4**|Pantalla resultado F2.2 (sandbox)|||||||
||**F4**|Pantalla F2.3 (vista previa visual)|||||||
||**F4**|Reporte de QR malicioso|||||||
||**F4**|Story Card + geocodificación inversa|||||||
||**F5**|Pruebas de rendimiento (T\_scan, compatibilidad)|||||||
||**F5**|Usability testing (5 participantes)|||||||
||**F5**|Corrección de defectos|||||||
||**Cierre**|Redacción informe final (frontend)|||||||
||**Cierre**|Preparación y ensayo de la defensa|||||||
||**F1**|Configuración entorno AWS (Lambda, DynamoDB, S3)|||||||
||**F2**|Endpoint base API Gateway + Lambda|||||||
||**F2**|Base de datos + IAM + seguridad de endpoints|||||||
||**F3**|Motor heurístico F2.1 (análisis estructural URL)|||||||
||**F3**|Integración WhoisXML API + caché DynamoDB (TTL 7d)|||||||
||**F3**|Score de riesgo + umbral + desglose de criterios|||||||
||**F3**|Mock F2.1 actualizado + pruebas del score|||||||
||**F4**|Sandbox F2.2 (URLScan.io + VirusTotal, timeout 30s)|||||||
||**F4**|Vista previa visual F2.3 (screenshot → S3 → URL firmada)|||||||
||**F4**|Endpoint de reportes + pipeline a blacklists|||||||
||**F5**|Pruebas integración E2E (Tranco List + PhishTank)|||||||
||**F5**|Pruebas rendimiento F1 (T\_F1 p90) y F2.1|||||||
||**F5**|Pruebas tolerancia a fallos + carga básica|||||||
||**F5**|Corrección de defectos|||||||
||**Cierre**|Redacción informe final (backend)|||||||
||**Cierre**|Preparación y ensayo de la defensa|||||||
|**Conjunto**|**F1**|◆ Contrato de interfaz v1|**◆**||||||
||**F2-F4**|⟷ Integración real por fase (mock → endpoint real)|||||||
||**F5**|◆ Revisión cruzada de informes finales||||**◆**|||
||**Cierre**|◆ Defensa del trabajo de graduación||||**◆**|||


1. ## <a name="_toc230972503"></a>**Cronograma semanal**
<a name="_toc230973154"></a>*Tabla *23*: Plan de trabajo, Cronograma semanal*

|**Sem**|**Fase**|**Desarrollo**|**🔄 Sincronización**|
| :-: | :-: | :-: | :-: |
|**S1**|**F1**|Diseño de navegación y wireframes del flujo principal; inicio configuración entorno React Native.|Alineación de visión general del sistema.|
|**S2**|**F1**|Configuración RN + react-native-vision-camera v4; evaluación APIs F1 (cuotas, latencias, auth).|**◆ M1 — Contrato de interfaz v1 acordado y documentado.**|
|**S3**|**F2**|Implementación módulo de escaneo con CodeScanner nativo en iOS y Android.|—|
|**S4**|**F2**|Lógica de clasificación del contenido QR; pantalla skeleton/shimmer; pantallas resultado simple.|—|
|**S5**|**F2**|Filtro F1 completo: llamadas en paralelo a GSB + PhishTank + VirusTotal; lógica de consolidación del veredicto; endpoint F1 funcional en entorno de desarrollo|⟷ Majo entrega endpoint F1 funcional; inicio integración real|
|**S6**|**F2**|Integración real con endpoint backend; historial offline MMKV (20 escaneos); pruebas E2E.|**◆ M2 — Prototipo E2E funcional en dispositivo físico iOS y Android.**|
|**S7**|**F3**|Pantalla resultado extendido F2.1 (score + desglose); ajustes flujo navegación INCIERTO.|—|
|**S8**|**F3**|Especificación visual del response F2.1 para Fabi; integración con endpoint F2.1.|⟷ Majo entrega spec visual; Fabi entrega endpoint F2.1.|
|**S9**|**F3**|Casos de prueba F2.1 con URLs de distintas categorías heurísticas; validación del desglose.|**◆ M3 — Flujo escaneo → F1 → F2.1 → desglose heurístico en dispositivo físico.**|
|**S10**|**F4**|Especificación de indicadores del response F2.2; pantalla resultado F2.2 (redirects, scripts).|⟷ Majo define indicadores del response F2.2.|
|**S11**|**F4**|Pantalla F2.3: screenshot/GIF; manejo recurso no disponible; flujo reporte QR malicioso.|⟷ Fabi entrega endpoints F2.2 y F2.3; Majo integra pantallas.|
|**S12**|**F4**|Integración reporte QR con endpoint; Story Card completa con geocodificación inversa.|**◆ M4 — Prototipo completo con todos los filtros y features integrados.**|
|**S13**|**F5**|Pruebas T\_scan (30 QRs: tamaño, ángulo, iluminación); compatibilidad iOS≥15 y Android≥10.|⟷ Acuerdan conjunto de URLs de prueba compartidas.|
|**S14**|**F5**|Corrección de defectos UI/UX; inicio redacción informe final frontend.|**◆ M5 — Cierre de pruebas; defectos críticos corregidos.**|
|**S15**|**F5**|Informe final módulo frontend completado; entrega del borrador al asesor.|**◆ M6 — Borradores de ambos informes entregados al asesor.**|
|**S16**|**Cierre**|Incorporar retroalimentación del asesor; revisión cruzada; preparación guión y slides.|⟷ Revisión cruzada y coherencia entre documentos.|
|**S17**|**Cierre**|Ensayo de la defensa con simulación de preguntas; buffer para ajustes finales.|**◆ M7 — Defensa del trabajo de graduación.**|


# <a name="_toc230972504"></a>Referencias: 


[1] Verizon, *2024 Data Breach Investigations Report*. Verizon Business, 2024. [En línea]. Disponible: <https://www.verizon.com/business/resources/reports/2024-dbir-data-breach-investigations-report.pdf>

[2] OWASP Foundation, "OWASP Mobile Application Security Verification Standard (MASVS) v2.1," *OWASP Mobile Application Security*, 2024. [En línea]. Disponible: <https://mas.owasp.org/MASVS/>

[3] K. Krombholz, P. Frühwirt, P. Kieseberg, I. Kapsalis, M. Huber y E. Weippl, "QR code security: A survey of attacks and challenges for usable security," en *Human Aspects of Information Security, Privacy, and Trust (HAS 2014)*, Lecture Notes in Computer Science, vol. 8533, T. Tryfonas e I. Askoxylakis, Eds. Cham, Switzerland: Springer, 2014, pp. 79–90. doi: 10.1007/978-3-319-07620-1\_8.

[4] Anti-Phishing Working Group, *Phishing Activity Trends Report, 1st Quarter 2024*. APWG, 2024. [En línea]. Disponible: <https://docs.apwg.org/reports/apwg_trends_report_q1_2024.pdf>

[5] D. Sahoo, C. Liu y S. C. H. Hoi, "Malicious URL detection using machine learning: A survey," *arXiv preprint arXiv:1701.07179*, 2017. [En línea]. Disponible: <https://arxiv.org/abs/1701.07179>

[6] S. Sheng, B. Wardman, G. Warner, L. F. Cranor, J. Hong y C. Zhang, "An empirical analysis of phishing blacklists," en *Proc. 6th Conf. Email and Anti-Spam (CEAS 2009)*, Mountain View, CA, USA, 2009. [En línea]. Disponible: <https://kilthub.cmu.edu/articles/journal_contribution/An_Empirical_Analysis_of_Phishing_Blacklists/6469805>

[7] Insikt Group, *Security Challenges Rise as QR Code and AI-Generated Phishing Proliferate (CTA-2024-0718)*. Recorded Future, 18 de julio de 2024. [En línea]. Disponible: <https://www.recordedfuture.com/research/qr-code-and-ai-generated-phishing-proliferate>

[8] T. Vidas, E. Owusu, S. Wang, C. Zeng, L. F. Cranor y N. Christin, "QRishing: The susceptibility of smartphone users to QR code phishing attacks," en *Financial Cryptography and Data Security (FC 2013 Workshops)*, Lecture Notes in Computer Science, vol. 7862, A. A. Adams, M. Brenner y M. Smith, Eds. Berlín, Alemania: Springer, 2013, pp. 52–69. doi: 10.1007/978-3-642-41320-9\_4.

[9] Anti-Phishing Working Group, *Phishing Activity Trends Report, 1st Quarter 2025*. APWG, 2025. [En línea]. Disponible: <https://docs.apwg.org/reports/apwg_trends_report_q1_2025.pdf>

[10] Palo Alto Networks Unit 42, "Phishing on the edge of the web and mobile using QR codes," *Unit 42 Threat Research*, 2023. [En línea]. Disponible: <https://unit42.paloaltonetworks.com/qr-codes-as-attack-vector/>

[11] *Information technology — Automatic identification and data capture techniques — QR Code bar code symbology specification*, ISO/IEC 18004:2015 (3.ª ed.), International Organization for Standardization, 2015. [En línea]. Disponible: <https://www.iso.org/standard/62021.html>

[12] *Information technology — Automatic identification and data capture techniques — QR code bar code symbology specification*, ISO/IEC 18004:2024 (4.ª ed.), International Organization for Standardization, 2024. [En línea]. Disponible: <https://www.iso.org/standard/83389.html>

[13] Apple Inc., "Technical Note TN2325: AV Foundation iOS machine readable code detection FAQ," *Apple Developer Documentation*. [En línea]. Disponible: <https://developer.apple.com/library/archive/technotes/tn2325/_index.html>

[14] Apple Inc., "VNDetectBarcodesRequest — Vision framework," *Apple Developer Documentation*. [En línea]. Disponible: <https://developer.apple.com/documentation/vision/vndetectbarcodesrequest>

[15] Google, "Scan barcodes with ML Kit on Android," *Google for Developers*. [En línea]. Disponible: <https://developers.google.com/ml-kit/vision/barcode-scanning/android>

[16] M. Rousavy, "VisionCamera — The Barcode Scanner," *react-native-vision-camera Documentation*. [En línea]. Disponible: <https://react-native-vision-camera.com/docs/guides/code-scanning>

[17] J. Ma, L. K. Saul, S. Savage y G. M. Voelker, "Beyond blacklists: Learning to detect malicious web sites from suspicious URLs," en *Proc. 15th ACM SIGKDD Int. Conf. Knowledge Discovery and Data Mining (KDD '09)*, París, Francia, 2009, pp. 1245–1254. doi: 10.1145/1557019.1557153.

[18] A. Le, A. Markopoulou y M. Faloutsos, "PhishDef: URL names say it all," en *Proc. IEEE INFOCOM 2011*, Shanghái, China, 2011, pp. 191–195. [En línea]. Disponible: <https://arxiv.org/abs/1009.2275>

[19] Google, "Google Safe Browsing — Overview (v5)," *Google for Developers*. [En línea]. Disponible: <https://developers.google.com/safe-browsing>

[20] Google LLC, "VirusTotal API v3 — Overview," *VirusTotal Documentation*. [En línea]. Disponible: <https://docs.virustotal.com/reference/overview>

[21] PhishTank / Cisco Talos, "Developer Information," *PhishTank*. [En línea]. Disponible: <https://phishtank.org/developer_info.php>

[22] abuse.ch, "URLhaus — API," *URLhaus Documentation*. [En línea]. Disponible: <https://urlhaus.abuse.ch/api/>

[23] MISP Project, "MISP — Open Source Threat Intelligence Platform & Open Standards For Threat Information Sharing," *MISP Project*. [En línea]. Disponible: <https://www.misp-project.org/>

[24] Meta Platforms, "About the New Architecture," *React Native Documentation*. [En línea]. Disponible: <https://reactnative.dev/architecture/landing-page>

[25] Apple Inc., *Apple Platform Security*. Apple Inc., 2024. [En línea]. Disponible: <https://help.apple.com/pdf/security/en_US/apple-platform-security-guide.pdf>

[26] Apple Inc., "NSAppTransportSecurity — Information Property List," *Apple Developer Documentation*. [En línea]. Disponible: <https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity>

[27] Google, "Network security configuration," *Android Developers*. [En línea]. Disponible: <https://developer.android.com/privacy-and-security/security-config>

[28] Apple Inc., "TN3183: Adding required reason API entries to your privacy manifest," *Apple Developer Documentation*. [En línea]. Disponible: <https://developer.apple.com/documentation/technotes/tn3183-adding-required-reason-api-entries-to-your-privacy-manifest>

[29] M. Rousavy, "StorageBenchmark — Benchmark App to compare different storage libraries (MMKV, AsyncStorage, WatermelonDB, RealmDB, SQLite)," *GitHub Repository*. [En línea]. Disponible: <https://github.com/mrousavy/StorageBenchmark>

[30] M. Rousavy, "react-native-mmkv — The fastest key/value storage for React Native," *GitHub Repository*. [En línea]. Disponible: <https://github.com/mrousavy/react-native-mmkv>

[31] Apple Inc., "CLGeocoder — Core Location," *Apple Developer Documentation*. [En línea]. Disponible: <https://developer.apple.com/documentation/corelocation/clgeocoder>

[32] Mapbox, "Geocoding API — Mapbox Search Service," *Mapbox API Documentation*. [En línea]. Disponible: <https://docs.mapbox.com/api/search/geocoding/>

[33] Apple Inc., "Requesting authorization to use location services," *Apple Developer Documentation*. [En línea]. Disponible: <https://developer.apple.com/documentation/corelocation/requesting-authorization-to-use-location-services>

[34] Google, "Request location permissions," *Android Developers*. [En línea]. Disponible: <https://developer.android.com/develop/sensors-and-location/location/permissions>

[35] G. Riba (gre), "react-native-view-shot — Snapshot a React Native view and save it to an image," *GitHub Repository*. [En línea]. Disponible: <https://github.com/gre/react-native-view-shot>

[36] L. F. Cranor, "A framework for reasoning about the human in the loop," en *Proc. 1st Conf. Usability, Psychology, and Security (UPSEC '08)*, San Francisco, CA, USA, 2008, art. 1. [En línea]. Disponible: <https://www.usenix.org/legacy/event/upsec08/tech/full_papers/cranor/cranor.pdf>

[37] S. Egelman, L. F. Cranor y J. Hong, "You've been warned: An empirical study of the effectiveness of web browser phishing warnings," en *Proc. SIGCHI Conf. Human Factors in Computing Systems (CHI '08)*, Florencia, Italia, 2008, pp. 1065–1074. doi: 10.1145/1357054.1357219.

[38] D. Akhawe y A. P. Felt, "Alice in Warningland: A large-scale field study of browser security warning effectiveness," en *Proc. 22nd USENIX Security Symposium*, Washington, D.C., USA, 2013, pp. 257–272. [En línea]. Disponible: <https://www.usenix.org/conference/usenixsecurity13/technical-sessions/presentation/akhawe>

[39] M. Sokolova y G. Lapalme, "A systematic analysis of performance measures for classification tasks," *Information Processing & Management*, vol. 45, n.º 4, pp. 427–437, jul. 2009. doi: 10.1016/j.ipm.2009.03.002.

[40] OpenPhish, "OpenPhish — Phishing Intelligence," *OpenPhish*. [En línea]. Disponible: <https://openphish.com/>

[41] Amazon Web Services, "AWS Lambda — Developer Guide," *Amazon Web Services Documentation*. [En línea]. Disponible: <https://docs.aws.amazon.com/lambda/latest/dg/welcome.html>

[42] F. Salahdine y N. Kaabouch, "Social Engineering Attacks: A Survey," Future Internet, vol. 11, n.º 4, art. 89, abr. 2019. doi: 10.3390/fi11040089. [En línea]. Disponible: <https://www.mdpi.com/1999-5903/11/4/89>




