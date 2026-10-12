import { localF1Verdict, trustedDomainsForReference } from '../localF1';

describe('localF1Verdict', () => {
  describe('dominios confiables', () => {
    it('marca seguro un dominio de la lista con https', () => {
      expect(localF1Verdict('https://github.com')).toBe('SEGURO');
    });

    it('acepta la ruta y la query: lo que importa es el host', () => {
      expect(localF1Verdict('https://github.com/usuario/repo?tab=readme')).toBe('SEGURO');
    });

    it('acepta un subdominio real', () => {
      expect(localF1Verdict('https://mail.google.com')).toBe('SEGURO');
    });

    it('acepta varios niveles de subdominio', () => {
      expect(localF1Verdict('https://docs.pages.github.com/algo')).toBe('SEGURO');
    });

    it('ignora www.', () => {
      expect(localF1Verdict('https://www.google.com')).toBe('SEGURO');
    });

    it('no distingue mayusculas en el host', () => {
      expect(localF1Verdict('https://GitHub.COM')).toBe('SEGURO');
    });

    it('tolera espacios alrededor', () => {
      expect(localF1Verdict('  https://github.com  ')).toBe('SEGURO');
    });

    it('acepta el dominio institucional', () => {
      expect(localF1Verdict('https://uvg.edu.gt/carreras')).toBe('SEGURO');
    });
  });

  /*
   * EL GRUPO QUE IMPORTA. Cada caso es un dominio de atacante que pasaria si
   * la comparacion se hiciera con `includes()` o con un `endsWith()` sin el
   * punto. Si alguno de estos empieza a dar SEGURO, la whitelist dejo de ser
   * un atajo y paso a ser una vulnerabilidad.
   */
  describe('no se deja enganar por dominios parecidos', () => {
    it('rechaza el dominio confiable como subdominio de otro', () => {
      expect(localF1Verdict('https://google.com.phishing.top')).toBe('INCIERTO');
    });

    it('rechaza el dominio confiable en medio de la ruta', () => {
      expect(localF1Verdict('https://sitio-falso.top/github.com/login')).toBe('INCIERTO');
    });

    it('rechaza un sufijo pegado sin punto', () => {
      expect(localF1Verdict('https://no-github.com')).toBe('INCIERTO');
    });

    it('rechaza el dominio sin el punto separador', () => {
      expect(localF1Verdict('https://googlecom.evil.top')).toBe('INCIERTO');
    });

    it('rechaza un TLD distinto', () => {
      expect(localF1Verdict('https://github.com.co')).toBe('INCIERTO');
    });

    it('rechaza el dominio como credencial en la URL', () => {
      expect(localF1Verdict('https://github.com@sitio-malo.top/x')).toBe('INCIERTO');
    });

    it('rechaza un homoglifo evidente', () => {
      expect(localF1Verdict('https://g00gle.com')).toBe('INCIERTO');
    });
  });

  describe('exige https', () => {
    it('no marca seguro un dominio confiable sin cifrar', () => {
      expect(localF1Verdict('http://github.com')).toBe('INCIERTO');
    });

    it('tampoco con otro esquema', () => {
      expect(localF1Verdict('ftp://github.com')).toBe('INCIERTO');
    });

    it('tampoco sin esquema', () => {
      expect(localF1Verdict('github.com')).toBe('INCIERTO');
    });
  });

  describe('el caso normal es INCIERTO', () => {
    it('un dominio cualquiera no esta en la lista', () => {
      expect(localF1Verdict('https://menu.cafeaurora.com/es')).toBe('INCIERTO');
    });

    it('una IP literal nunca es confiable', () => {
      expect(localF1Verdict('https://192.168.1.1/login.php')).toBe('INCIERTO');
    });

    it('una cadena vacia no revienta', () => {
      expect(localF1Verdict('')).toBe('INCIERTO');
    });

    it('texto suelto tampoco', () => {
      expect(localF1Verdict('Mesa 12')).toBe('INCIERTO');
    });
  });

  describe('la lista misma', () => {
    it('no esta vacia', () => {
      expect(trustedDomainsForReference.length).toBeGreaterThan(0);
    });

    it('se mantiene pequena: cada entrada es una afirmacion de confianza', () => {
      expect(trustedDomainsForReference.length).toBeLessThanOrEqual(15);
    });

    it('todas las entradas estan en minusculas y sin www', () => {
      for (const domain of trustedDomainsForReference) {
        expect(domain).toBe(domain.toLowerCase());
        expect(domain.startsWith('www.')).toBe(false);
      }
    });

    it('ninguna entrada lleva esquema ni ruta', () => {
      for (const domain of trustedDomainsForReference) {
        expect(domain).not.toContain('/');
        expect(domain).not.toContain(':');
      }
    });

    it('no hay duplicados', () => {
      const unique = new Set(trustedDomainsForReference);
      expect(unique.size).toBe(trustedDomainsForReference.length);
    });
  });
});

describe('entradas degeneradas', () => {
  it('una URL con esquema https pero sin host no revienta', () => {
    // `domainFromUrl` puede devolver vacio con una entrada asi; la guarda
    // existe para que eso no acabe comparandose contra la lista.
    expect(localF1Verdict('https://')).toBe('INCIERTO');
  });

  it('solo el esquema tampoco', () => {
    expect(localF1Verdict('https://#')).toBe('INCIERTO');
  });

  it('una URL cuyo host queda vacio tras quitar credenciales', () => {
    // `https://@` deja el host en cadena vacia: la guarda evita que eso llegue
    // a compararse contra la lista.
    expect(localF1Verdict('https://@')).toBe('INCIERTO');
  });
});
