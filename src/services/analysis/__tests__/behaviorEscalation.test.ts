import {
  behaviorEscalation,
  MALICIOUS_ENGINE_THRESHOLD,
} from '../behaviorEscalation';

const vt = (detalle: string) => [{ indicador: 'virustotal_motores_maliciosos', detalle }];

describe('behaviorEscalation · VirusTotal', () => {
  it('eleva justo en el umbral', () => {
    const reason = behaviorEscalation(vt('3 motores lo marcan como malicioso'));
    expect(reason).toEqual({ indicator: 'virustotal_motores_maliciosos', engines: 3 });
  });

  it('eleva muy por encima del umbral', () => {
    // El caso real de `malware.wicar.org`, que el backend devolvia SOSPECHOSO.
    expect(behaviorEscalation(vt('18 motores lo marcan como malicioso'))).toMatchObject({
      engines: 18,
    });
  });

  it('NO eleva por debajo del umbral', () => {
    // El caso real del acortador: 2 motores. Un solo producto agresivo puede
    // dar un falso positivo, y dos pueden compartir firmas.
    expect(behaviorEscalation(vt('2 motores lo marcan como malicioso'))).toBeNull();
    expect(behaviorEscalation(vt('1 motores lo marcan como malicioso'))).toBeNull();
  });

  it('lee el numero aunque el texto cambie de forma', () => {
    expect(behaviorEscalation(vt('Detectado por 7 motores'))).toMatchObject({ engines: 7 });
  });

  it('no eleva si el texto no trae numero', () => {
    expect(behaviorEscalation(vt('varios motores lo marcan'))).toBeNull();
  });

  it('no eleva con cero motores', () => {
    expect(behaviorEscalation(vt('0 motores lo marcan como malicioso'))).toBeNull();
  });

  /*
   * Motores que DUDAN no equivalen a motores que CONCLUYEN. El backend tiene
   * un indicador distinto para cada cosa y aqui solo cuenta el de maliciosos.
   */
  it('ignora los motores que solo lo marcan como sospechoso', () => {
    const indicators = [
      { indicador: 'virustotal_motores_sospechosos', detalle: '9 motores lo marcan como sospechoso' },
    ];
    expect(behaviorEscalation(indicators)).toBeNull();
  });
});

describe('behaviorEscalation · indicadores decisivos de URLScan', () => {
  it('eleva con un veredicto malicioso de URLScan', () => {
    const indicators = [
      { indicador: 'urlscan_verdict_malicioso', detalle: 'URLScan lo marca como malicioso' },
    ];
    expect(behaviorEscalation(indicators)).toEqual({ indicator: 'urlscan_verdict_malicioso' });
  });

  /*
   * Si URLScan borra el informe tras analizarlo, segun la documentacion del
   * backend es porque confirmo contenido malicioso: la desaparicion del
   * informe es la señal.
   */
  it('eleva cuando URLScan elimino el scan', () => {
    const indicators = [
      { indicador: 'urlscan_scan_eliminado', detalle: 'El scan fue eliminado tras analizarlo' },
    ];
    expect(behaviorEscalation(indicators)).toEqual({ indicator: 'urlscan_scan_eliminado' });
  });

  it('no necesita contar motores para esos dos', () => {
    const indicators = [{ indicador: 'urlscan_verdict_malicioso', detalle: 'sin numeros aqui' }];
    expect(behaviorEscalation(indicators)).not.toBeNull();
  });
});

describe('behaviorEscalation · lo que NO eleva', () => {
  /*
   * La documentacion del backend advierte que el `detalle` de la redireccion a
   * veces trae una categoria en vez de la URL destino, asi que es una señal
   * sospechosa, no una confirmacion.
   */
  it('una redireccion detectada no basta', () => {
    const indicators = [
      { indicador: 'redireccion_detectada', detalle: 'Se detecto una redireccion' },
    ];
    expect(behaviorEscalation(indicators)).toBeNull();
  });

  it('las categorias de riesgo no bastan', () => {
    const indicators = [{ indicador: 'categorias_riesgo', detalle: 'phishing, malware' }];
    expect(behaviorEscalation(indicators)).toBeNull();
  });

  it('un indicador desconocido no eleva', () => {
    const indicators = [{ indicador: 'algo_nuevo_del_backend', detalle: '99 de algo' }];
    expect(behaviorEscalation(indicators)).toBeNull();
  });
});

describe('behaviorEscalation · entradas degeneradas', () => {
  it('una lista vacia no eleva', () => {
    expect(behaviorEscalation([])).toBeNull();
  });

  it('ausente no eleva', () => {
    expect(behaviorEscalation(undefined)).toBeNull();
  });

  it('algo que no es arreglo no revienta', () => {
    expect(behaviorEscalation('raro' as never)).toBeNull();
  });

  it('un indicador sin clave se ignora', () => {
    expect(behaviorEscalation([{ detalle: '9 motores' } as never])).toBeNull();
  });

  it('una clave en blanco se ignora', () => {
    expect(behaviorEscalation([{ indicador: '   ', detalle: '9 motores' }])).toBeNull();
  });

  it('un indicador de VirusTotal sin detalle no eleva', () => {
    // `detalle` es el unico campo que el contrato garantiza, pero si llegara
    // ausente no se puede contar motores: sin numero no hay evidencia.
    expect(behaviorEscalation([{ indicador: 'virustotal_motores_maliciosos' } as never])).toBeNull();
  });

  it('encuentra el indicador decisivo aunque no sea el primero', () => {
    const indicators = [
      { indicador: 'redireccion_detectada', detalle: 'una redireccion' },
      { indicador: 'virustotal_motores_maliciosos', detalle: '5 motores lo marcan' },
    ];
    expect(behaviorEscalation(indicators)).toMatchObject({ engines: 5 });
  });
});

describe('el umbral mismo', () => {
  /*
   * Es el valor que el README venia proponiendo al backend (§8, punto 1), asi
   * que cuando Fabi lo implemente los dos lados coincidiran. Cambiarlo aqui
   * sin cambiarlo alla desalinearia el sistema.
   */
  it('son 3 motores', () => {
    expect(MALICIOUS_ENGINE_THRESHOLD).toBe(3);
  });

  it('es mayor que 1: un solo motor puede ser falso positivo', () => {
    expect(MALICIOUS_ENGINE_THRESHOLD).toBeGreaterThan(1);
  });
});
