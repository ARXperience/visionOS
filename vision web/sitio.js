/* ═══════════════════════════════════════════════════════════════════
   Visión Colombia — comportamiento del sitio público.

   Sin dependencias y sin build: son 250 líneas de DOM contra APIs que el
   navegador ya trae (IntersectionObserver, fetch, scroll-snap). Meter un
   framework aquí obligaría a mantener un pipeline para una web de seis
   páginas que cambia dos veces al año.

   Lo que sí hace este archivo, y es el punto: hablar con VISION OS. El
   formulario de citas crea un lead de verdad en el sistema, y el portal
   consulta la cita de verdad. Un formulario que manda correos a una
   bandeja es exactamente lo que la clínica ya tenía.
   ═══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const raiz = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* En producción la web y la API viven en dominios distintos (Vercel y
     Hostinger); en local todo sale del proxy del 8777. Se deduce en vez de
     configurarse: un archivo de configuración más es un archivo que alguien
     olvida cambiar el día del despliegue. */
  const API = location.hostname.endsWith('visioncolombia.com.co')
    ? 'https://api.visioncolombia.com.co/api'
    : '/api';

  const GENERICO =
    'No pudimos completar la operación. Inténtelo de nuevo o escríbanos por WhatsApp al 310 514 9719.';

  async function pedir(ruta, cuerpo) {
    const res = await fetch(API + ruta, {
      method: cuerpo ? 'POST' : 'GET',
      headers: cuerpo ? { 'content-type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = await res.json().catch(() => null);
    if (!res.ok) {
      const m = datos && datos.message;
      throw new Error((Array.isArray(m) ? m.join('. ') : m) || GENERICO);
    }
    return datos;
  }

  /* ── Tema ──────────────────────────────────────────────────────── */

  const temaEfectivo = () =>
    raiz.dataset.tema || (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');

  $$('[data-tema-boton]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const nuevo = temaEfectivo() === 'oscuro' ? 'claro' : 'oscuro';
      raiz.dataset.tema = nuevo;
      // Se recuerda la elección: cambiar de tema en cada página sería peor
      // que no ofrecerlo.
      try {
        localStorage.setItem('tema', nuevo);
      } catch {
        /* Navegación privada: el tema dura lo que dura la página. */
      }
      boton.setAttribute('aria-label', nuevo === 'oscuro' ? 'Usar tema claro' : 'Usar tema oscuro');
    });
  });

  /* ── Barra ─────────────────────────────────────────────────────── */

  const barra = $('.barra');
  if (barra) {
    const marcar = () => barra.classList.toggle('barra--fija', scrollY > 8);
    marcar();
    addEventListener('scroll', marcar, { passive: true });
  }

  const menu = $('#menu');
  const hamburguesa = $('[data-menu-boton]');
  if (menu && hamburguesa) {
    hamburguesa.addEventListener('click', () => {
      const abierto = menu.dataset.abierto === 'si';
      menu.dataset.abierto = abierto ? 'no' : 'si';
      hamburguesa.setAttribute('aria-expanded', String(!abierto));
    });
    // Al elegir destino se cierra: en móvil el menú tapa la página entera.
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        menu.dataset.abierto = 'no';
        hamburguesa.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── Entradas al hacer scroll ──────────────────────────────────── */

  // Las tarjetas también forman parte del recorrido: se incorporan al mismo
  // observador para entrar de forma progresiva al llegar al scroll.
  $$('.tarjeta, .cifra, .faq details').forEach((el) => {
    if (!el.classList.contains('revela')) el.classList.add('revela');
    if (el.matches('.tarjeta, .cifra')) el.classList.add('flota-scroll');
  });

  const porRevelar = $$('.revela, .paso');
  if (porRevelar.length) {
    // Se escalona por posición dentro del grupo: las tarjetas de una fila
    // entran una detrás de otra, que es lo que da la sensación de orden.
    porRevelar.forEach((el) => {
      if (!el.style.getPropertyValue('--d')) {
        const hermanos = Array.from(el.parentElement.children).filter((h) =>
          h.classList.contains('revela') || h.classList.contains('paso'),
        );
        el.style.setProperty('--d', `${Math.min(hermanos.indexOf(el), 6) * 90}ms`);
      }
    });

    const ojo = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('visible');
          // Una vez visible, no se vuelve a observar: reanimar al subir
          // marea y cuesta trabajo al hilo principal.
          ojo.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.06 },
    );
    porRevelar.forEach((el) => ojo.observe(el));
  }

  // Después de entrar, las tarjetas mantienen un pequeño desplazamiento
  // ligado a la posición real del scroll. No es una animación única: cambia
  // mientras el visitante recorre la sección, y se desactiva si prefiere
  // movimiento reducido.
  const flotantes = $$('.flota-scroll');
  if (flotantes.length && !quieto) {
    let pendiente = false;
    const moverTarjetas = () => {
      pendiente = false;
      const centro = innerHeight / 2;
      flotantes.forEach((tarjeta) => {
        const r = tarjeta.getBoundingClientRect();
        const progreso = Math.max(-1, Math.min(1, (centro - (r.top + r.height / 2)) / innerHeight));
        tarjeta.style.setProperty('--flotacion-y', `${Math.round(progreso * -14)}px`);
      });
    };
    const programar = () => {
      if (!pendiente) {
        pendiente = true;
        requestAnimationFrame(moverTarjetas);
      }
    };
    addEventListener('scroll', programar, { passive: true });
    addEventListener('resize', programar);
    programar();
  }

  /* ── Cifras ────────────────────────────────────────────────────── */

  $$('[data-cifra]').forEach((el) => {
    const fin = Number(el.dataset.cifra);
    const sufijo = el.dataset.sufijo || '';
    if (quieto) {
      el.textContent = fin.toLocaleString('es-CO') + sufijo;
      return;
    }

    const ojo = new IntersectionObserver(
      (entradas) => {
        if (!entradas[0].isIntersecting) return;
        ojo.disconnect();
        const inicio = performance.now();
        const paso = (t) => {
          const p = Math.min((t - inicio) / 1400, 1);
          // Desacelera al final: contar a velocidad constante parece un
          // reloj, no un dato.
          const suave = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(fin * suave).toLocaleString('es-CO') + sufijo;
          if (p < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
      },
      { threshold: 0.5 },
    );
    ojo.observe(el);
  });

  /* ── Carruseles ────────────────────────────────────────────────── */

  $$('[data-carrusel]').forEach((carrusel) => {
    const pista = $('.carrusel__pista', carrusel);
    const mandos = $$('[data-ir]', carrusel);
    if (!pista) return;

    const salto = () => {
      const primera = pista.firstElementChild;
      return primera ? primera.getBoundingClientRect().width + 20 : pista.clientWidth * 0.8;
    };

    mandos.forEach((b) =>
      b.addEventListener('click', () =>
        pista.scrollBy({ left: salto() * Number(b.dataset.ir), behavior: quieto ? 'auto' : 'smooth' }),
      ),
    );

    const limites = () => {
      const fin = pista.scrollWidth - pista.clientWidth - 4;
      mandos.forEach((b) => {
        const atras = Number(b.dataset.ir) < 0;
        b.disabled = atras ? pista.scrollLeft <= 4 : pista.scrollLeft >= fin;
      });
    };
    limites();
    pista.addEventListener('scroll', limites, { passive: true });
    addEventListener('resize', limites);

    // Servicios usa un tramo anclado: al bajar por la sección, la escena se
    // mantiene en pantalla y el scroll descubre las tarjetas de forma fluida.
    if (carrusel.hasAttribute('data-scroll-carrusel') && !quieto) {
      const zona = carrusel.closest('.servicios-inmersos') || carrusel;
      const seccion = carrusel.closest('.seccion--scroll-servicios') || zona;
      const posicionDocumento = (elemento) => {
        let y = 0;
        for (let nodo = elemento; nodo; nodo = nodo.offsetParent) y += nodo.offsetTop;
        return y;
      };
      let objetivo = 0;
      let animacion = 0;
      const animarPista = () => {
        const diferencia = objetivo - pista.scrollLeft;
        if (Math.abs(diferencia) < 0.5) {
          pista.scrollLeft = objetivo;
          animacion = 0;
          return;
        }
        pista.scrollLeft += diferencia * 0.16;
        animacion = requestAnimationFrame(animarPista);
      };
      const avanzarConScroll = () => {
        const inicio = posicionDocumento(zona);
        const final = posicionDocumento(seccion) + seccion.offsetHeight - innerHeight;
        const progreso = Math.max(0, Math.min(1, (scrollY - inicio) / Math.max(1, final - inicio)));
        // Se conserva la vista de varias tarjetas. El scroll avanza solo una
        // ficha por tramo, en vez de desplazar una pantalla completa de tres.
        const primera = pista.firstElementChild;
        const estilo = getComputedStyle(pista);
        const separacion = Number.parseFloat(estilo.columnGap || estilo.gap) || 0;
        const paso = primera ? primera.getBoundingClientRect().width + separacion : pista.clientWidth;
        const maximo = Math.max(0, pista.scrollWidth - pista.clientWidth);
        const movimientos = Math.max(1, Math.ceil(maximo / paso));
        const indice = Math.min(movimientos, Math.floor(progreso * (movimientos + 1)));
        objetivo = Math.min(maximo, paso * indice);
        if (!animacion) animacion = requestAnimationFrame(animarPista);
      };
      addEventListener('scroll', avanzarConScroll, { passive: true });
      addEventListener('resize', avanzarConScroll);
      avanzarConScroll();
    }
  });

  /* ── Frases ────────────────────────────────────────────────────── */

  const rotador = $('[data-frases]');
  if (rotador) {
    const frases = $$('.frase', rotador);
    const puntos = $$('.punto', rotador.parentElement);
    let i = 0;
    let reloj;

    const mostrar = (n) => {
      i = (n + frases.length) % frases.length;
      frases.forEach((f, k) => f.toggleAttribute('data-activa', k === i));
      puntos.forEach((p, k) => p.setAttribute('aria-selected', String(k === i)));
    };

    const arrancar = () => {
      if (quieto) return;
      clearInterval(reloj);
      reloj = setInterval(() => mostrar(i + 1), 7000);
    };

    puntos.forEach((p, k) =>
      p.addEventListener('click', () => {
        mostrar(k);
        arrancar();
      }),
    );

    mostrar(0);
    arrancar();
    // Si la sección no está a la vista, no hay por qué seguir girando.
    new IntersectionObserver((e) => (e[0].isIntersecting ? arrancar() : clearInterval(reloj)), {
      threshold: 0.2,
    }).observe(rotador);
  }

  /* ── Video de portada ──────────────────────────────────────────── */

  $$('video[data-fondo]').forEach((video) => {
    const listo = () => video.setAttribute('data-listo', '');
    if (video.readyState >= 3) listo();
    else video.addEventListener('canplay', listo, { once: true });

    // Un video reproduciéndose fuera de pantalla gasta batería y no lo ve
    // nadie. En móvil eso se nota.
    new IntersectionObserver(
      (e) => {
        if (quieto) return;
        e[0].isIntersecting ? video.play().catch(() => {}) : video.pause();
      },
      { threshold: 0.01 },
    ).observe(video);
  });

  /* ── Mensajes de la portada ───────────────────────────────────── */

  const titularPortada = $('[data-hero-titular]');
  const lineaPortada = $('[data-hero-linea]');
  const destacadoPortada = $('[data-hero-destacado]');
  const descripcionPortada = $('[data-hero-descripcion]');

  if (titularPortada && lineaPortada && destacadoPortada && descripcionPortada) {
    const mensajes = [
      {
        linea: 'Sus ojos son',
        destacado: 'irrepetibles',
        descripcion: 'No hay dos miradas iguales. Por eso cada cuidado empieza por conocer la suya.',
      },
      {
        linea: 'Transformando',
        destacado: 'miradas',
        descripcion: 'Consulta, diagnóstico, cirugía y seguimiento en una misma institución.',
      },
      {
        linea: 'La ciencia de',
        destacado: 'ver más lejos',
        descripcion: 'Decisiones precisas para cuidar su visión en cada momento de la vida.',
      },
      {
        linea: 'Cuidar es',
        destacado: 'acompañar',
        descripcion: 'Especialistas, atención humana y una historia clínica conectada con usted.',
      },
    ];
    let mensajeActual = 0;
    let relojPortada = 0;
    let cuadroParticulas = 0;
    const lienzoParticulas = document.createElement('canvas');
    lienzoParticulas.className = 'portada__lienzo-particulas';
    lienzoParticulas.setAttribute('aria-hidden', 'true');
    titularPortada.append(lienzoParticulas);

    const escribirParticulas = (elemento, texto) => {
      elemento.replaceChildren();
      Array.from(texto).forEach((caracter, indice) => {
        const letra = document.createElement('span');
        letra.className = 'particula-letra';
        letra.textContent = caracter === ' ' ? '\u00a0' : caracter;
        letra.style.setProperty('--i', indice);
        letra.style.setProperty('--x', `${((indice * 17) % 33) - 16}px`);
        letra.style.setProperty('--y', `${((indice * 23) % 25) - 12}px`);
        letra.style.setProperty('--giro', `${((indice * 29) % 30) - 15}deg`);
        elemento.append(letra);
      });
    };

    const tomarParticulas = () => {
      const caja = titularPortada.getBoundingClientRect();
      const escala = Math.min(window.devicePixelRatio || 1, 1.5);
      const ancho = Math.ceil(caja.width * escala);
      const alto = Math.ceil(caja.height * escala);
      const boceto = document.createElement('canvas');
      boceto.width = ancho;
      boceto.height = alto;
      const contexto = boceto.getContext('2d', { willReadFrequently: true });
      const estilo = getComputedStyle(titularPortada);
      contexto.scale(escala, escala);
      contexto.font = `${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`;
      contexto.textBaseline = 'top';

      const dibujarLinea = (elemento, color) => {
        const rect = elemento.getBoundingClientRect();
        contexto.fillStyle = color;
        contexto.fillText(elemento.textContent.replaceAll('\u00a0', ' '), rect.left - caja.left, rect.top - caja.top);
      };
      dibujarLinea(lineaPortada, '#f8fbff');
      dibujarLinea(destacadoPortada, '#76dff3');

      const pixeles = contexto.getImageData(0, 0, ancho, alto).data;
      const puntos = [];
      for (let y = 0; y < alto; y += 5 * escala) {
        for (let x = 0; x < ancho; x += 5 * escala) {
          if (pixeles[(Math.floor(y) * ancho + Math.floor(x)) * 4 + 3] > 32) {
            puntos.push({
              x: x / escala,
              y: y / escala,
              dx: ((x * 13 + y * 7) % 90) - 45,
              dy: ((x * 5 + y * 17) % 72) - 36,
              tam: 1 + ((x + y) % 3),
            });
          }
        }
      }
      return puntos.sort(() => Math.random() - 0.5).slice(0, 430);
    };

    const animarParticulas = (direccion) => {
      cancelAnimationFrame(cuadroParticulas);
      const puntos = tomarParticulas();
      const caja = titularPortada.getBoundingClientRect();
      const escala = Math.min(window.devicePixelRatio || 1, 1.5);
      lienzoParticulas.width = Math.ceil(caja.width * escala);
      lienzoParticulas.height = Math.ceil(caja.height * escala);
      lienzoParticulas.style.width = `${caja.width}px`;
      lienzoParticulas.style.height = `${caja.height}px`;
      const contexto = lienzoParticulas.getContext('2d');
      contexto.scale(escala, escala);
      const inicio = performance.now();
      const duracion = 720;

      const pintar = (ahora) => {
        const progreso = Math.min((ahora - inicio) / duracion, 1);
        const avance = direccion === 'sale' ? progreso : 1 - progreso;
        contexto.clearRect(0, 0, caja.width, caja.height);
        puntos.forEach((punto) => {
          const opacidad = direccion === 'sale' ? 1 - progreso : progreso;
          contexto.fillStyle = `rgba(123, 225, 244, ${opacidad * 0.92})`;
          contexto.fillRect(
            punto.x + punto.dx * avance,
            punto.y + punto.dy * avance,
            punto.tam,
            punto.tam,
          );
        });
        if (progreso < 1) cuadroParticulas = requestAnimationFrame(pintar);
        else contexto.clearRect(0, 0, caja.width, caja.height);
      };
      cuadroParticulas = requestAnimationFrame(pintar);
    };

    const pintarMensaje = (indice) => {
      const mensaje = mensajes[indice];
      escribirParticulas(lineaPortada, mensaje.linea);
      escribirParticulas(destacadoPortada, mensaje.destacado);
      descripcionPortada.textContent = mensaje.descripcion;
    };

    const cambiarMensaje = () => {
      const siguiente = (mensajeActual + 1) % mensajes.length;
      animarParticulas('sale');
      titularPortada.classList.add('portada__titular--disuelve');
      descripcionPortada.classList.add('portada__descripcion--disuelve');

      setTimeout(() => {
        mensajeActual = siguiente;
        pintarMensaje(mensajeActual);
        titularPortada.classList.remove('portada__titular--disuelve');
        titularPortada.classList.add('portada__titular--reintegra');
        descripcionPortada.classList.remove('portada__descripcion--disuelve');
        animarParticulas('entra');
        setTimeout(() => titularPortada.classList.remove('portada__titular--reintegra'), 760);
      }, 720);
    };

    pintarMensaje(mensajeActual);
    if (!quieto) {
      const iniciarMensajes = () => {
        if (!relojPortada) relojPortada = setInterval(cambiarMensaje, 6200);
      };
      const detenerMensajes = () => {
        clearInterval(relojPortada);
        relojPortada = 0;
      };
      new IntersectionObserver(
        (entradas) => (entradas[0].isIntersecting ? iniciarMensajes() : detenerMensajes()),
        { threshold: 0.25 },
      ).observe(titularPortada);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) detenerMensajes();
      });
    }
  }

  /* ── Catálogo real en el formulario ────────────────────────────── */

  const LINEAS = {
    CONSULTA: 'Consultas',
    EXAMEN: 'Exámenes diagnósticos',
    CIRUGIA: 'Cirugías',
    OPTICA: 'Óptica',
    ESTETICA: 'Estética',
    EMPRESAS: 'Empresas',
  };

  /* Las sedes y los servicios se piden al sistema, no se escriben en el
     HTML: el día que abra una sede o se retire un examen, la web ya lo
     dice sin que nadie toque este repositorio. Si la API no responde, los
     <option> escritos a mano siguen ahí y el formulario funciona igual. */
  async function llenarCatalogo() {
    const sedes = $('#sede');
    const servicios = $('#servicio');
    if (!sedes && !servicios) return;

    try {
      const [ss, sv] = await Promise.all([
        sedes ? pedir('/publico/sedes') : null,
        servicios ? pedir('/publico/servicios') : null,
      ]);

      if (sedes && ss && ss.length) {
        sedes.querySelectorAll('option[data-respaldo]').forEach((o) => o.remove());
        for (const s of ss) {
          sedes.append(new Option(`${s.city} — ${s.name}`, s.code));
        }
      }

      if (servicios && sv && sv.length) {
        servicios.querySelectorAll('option[data-respaldo], optgroup').forEach((o) => o.remove());
        for (const grupo of sv) {
          const g = document.createElement('optgroup');
          g.label = LINEAS[grupo.linea] || grupo.linea;
          for (const s of grupo.servicios) g.append(new Option(s.name, s.slug));
          servicios.append(g);
        }
        servicios.append(new Option('No estoy seguro', ''));
      }
    } catch {
      /* Silencio a propósito: el formulario ya trae opciones de respaldo y
         un error rojo por el catálogo asusta a quien solo quiere una cita. */
    }
  }

  /* ── Formularios ───────────────────────────────────────────────── */

  function avisar(caja, tipo, titulo, texto) {
    caja.className = `aviso aviso--${tipo}`;
    caja.innerHTML = `<b></b><span></span>`;
    caja.firstChild.textContent = titulo;
    caja.lastChild.textContent = texto;
    caja.hidden = false;
    caja.setAttribute('role', tipo === 'mal' ? 'alert' : 'status');
  }

  function conectar(forma, ruta, armar, alResponder) {
    if (!forma) return;
    const caja = $('[data-aviso]', forma);
    const boton = $('button[type=submit]', forma);
    const original = boton ? boton.textContent : '';

    forma.addEventListener('submit', async (e) => {
      e.preventDefault();
      const datos = new FormData(forma);
      if (boton) {
        boton.disabled = true;
        boton.textContent = 'Enviando…';
      }
      try {
        const r = await pedir(ruta, armar(datos));
        alResponder(r, forma, caja);
      } catch (err) {
        avisar(caja, 'mal', 'No se pudo enviar', err.message);
      } finally {
        if (boton) {
          boton.disabled = false;
          boton.textContent = original;
        }
      }
    });
  }

  const limpio = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

  conectar(
    $('#forma-cita'),
    '/publico/solicitudes',
    (d) => ({
      nombre: d.get('nombre').trim(),
      telefono: d.get('telefono').trim(),
      correo: limpio(d.get('correo')),
      sede: limpio(d.get('sede')),
      servicio: limpio(d.get('servicio')),
      mensaje: limpio(d.get('mensaje')),
      // La casilla viaja como dato: la API guarda la evidencia de la Ley
      // 1581 solo si de verdad se marcó, no porque el formulario exista.
      autorizacion: d.get('autorizacion') === 'si',
      nit: limpio(d.get('nit')),
    }),
    (r, forma, caja) => {
      avisar(
        caja,
        'bien',
        r.radicado ? `Solicitud recibida · ${r.radicado}` : 'Solicitud recibida',
        `${r.mensaje} Guarde este número: con él encontramos su solicitud si nos escribe por WhatsApp.`,
      );
      forma.reset();
      caja.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'center' });
    },
  );

  conectar(
    $('#forma-pqrsf'),
    '/publico/pqrsf',
    (d) => ({
      tipo: d.get('tipo'),
      nombre: d.get('nombre').trim(),
      contacto: d.get('contacto').trim(),
      asunto: d.get('asunto').trim(),
      detalle: d.get('detalle').trim(),
      nit: limpio(d.get('nit')),
    }),
    (r, forma, caja) => {
      const plazo = r.dueDate
        ? new Date(r.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
        : null;
      avisar(
        caja,
        'bien',
        `Radicado ${r.radicado}`,
        plazo
          ? `Queda registrada. Le respondemos a más tardar el ${plazo}, dentro del plazo de ley.`
          : 'Queda registrada. Le respondemos dentro del plazo de ley.',
      );
      forma.reset();
    },
  );

  /* ── Portal del paciente ───────────────────────────────────────── */

  const portal = $('#forma-portal');
  if (portal) {
    const salida = $('#resultado');
    const caja = $('[data-aviso]', portal);

    // El recordatorio de WhatsApp trae el enlace con el código puesto. Los
    // últimos cuatro del documento se siguen pidiendo: si no, reenviar ese
    // mensaje a un grupo mostraría la cita a cualquiera.
    const codigoUrl = new URLSearchParams(location.search).get('c');
    if (codigoUrl) {
      $('#codigo').value = codigoUrl.toUpperCase();
      $('#ultimos4').focus();
    }

    const fecha = (iso) =>
      new Date(iso).toLocaleString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

    const credenciales = () => ({
      codigo: $('#codigo').value.trim().toUpperCase(),
      ultimos4: $('#ultimos4').value.trim(),
    });

    function pintar(c) {
      salida.hidden = false;
      salida.innerHTML = '';

      const ficha = document.createElement('div');
      ficha.className = 'ficha revela visible';
      // Todo lo que viene de la base entra por textContent. El nombre del
      // paciente lo pudo escribir él mismo en WhatsApp: interpolarlo en
      // innerHTML sería dejar que un contacto escriba HTML en esta página.
      ficha.innerHTML = `
        <span class="pastilla" data-estado></span>
        <p class="pequeno" style="margin:.9rem 0 0"><span data-hola></span> Su próxima cita es:</p>
        <p class="ficha__cuando"></p>
        <p class="entrada" style="margin:0"></p>
        <dl class="datos">
          <div><dt>Sede</dt><dd data-sede></dd></div>
          <div><dt>Dirección</dt><dd data-dir></dd></div>
          <div><dt>Código</dt><dd data-codigo></dd></div>
        </dl>`;

      $('[data-estado]', ficha).textContent = c.estado.replace(/_/g, ' ').toLowerCase();
      $('[data-hola]', ficha).textContent = `Hola, ${c.paciente}.`;
      $('[data-codigo]', ficha).textContent = c.codigo;
      $('.ficha__cuando', ficha).textContent = fecha(c.cuando);
      $('.entrada', ficha).textContent = c.servicio + (c.ojo ? ` · ojo ${c.ojo === 'OD' ? 'derecho' : 'izquierdo'}` : '');
      $('[data-sede]', ficha).textContent = c.sede.nombre;
      $('[data-dir]', ficha).textContent = c.sede.direccion;

      if (c.requiereDilatacion) {
        const d = document.createElement('p');
        d.className = 'aviso';
        d.style.marginTop = '1.25rem';
        d.innerHTML = '<b>Le vamos a dilatar la pupila.</b>';
        d.append(
          'Venga acompañado y no conduzca de regreso: la visión queda borrosa varias horas.',
        );
        ficha.append(d);
      }
      if (c.preparacion) {
        const p = document.createElement('p');
        p.className = 'aviso';
        p.style.marginTop = '.75rem';
        p.innerHTML = '<b>Preparación</b>';
        p.append(c.preparacion);
        ficha.append(p);
      }

      const acciones = document.createElement('div');
      acciones.className = 'acciones';
      if (c.puedeConfirmar) {
        const b = document.createElement('button');
        b.className = 'btn';
        b.type = 'button';
        b.textContent = 'Confirmar que asistiré';
        b.onclick = () => responder('confirmar');
        acciones.append(b);
      }
      if (c.puedeCancelar) {
        const b = document.createElement('button');
        b.className = 'btn btn--fantasma';
        b.type = 'button';
        b.textContent = 'No podré asistir';
        b.onclick = () => {
          if (confirm('¿Seguro que quiere cancelar esta cita? El cupo queda libre para otro paciente.')) {
            responder('cancelar');
          }
        };
        acciones.append(b);
      }
      if (acciones.children.length) ficha.append(acciones);

      const nota = document.createElement('p');
      nota.className = 'pequeno';
      nota.style.marginTop = '1.25rem';
      // Reagendar exige ver la disponibilidad real de la agenda, y eso sí es
      // una aplicación con sesión. Para eso está WhatsApp.
      nota.innerHTML =
        '¿Necesita otra hora? Escríbanos por <a href="https://wa.me/573105149719">WhatsApp</a> y le buscamos un cupo.';
      ficha.append(nota);

      salida.append(ficha);
      salida.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'nearest' });
    }

    async function responder(accion) {
      try {
        const r = await pedir('/portal/responder', { ...credenciales(), accion });
        avisar(caja, 'bien', accion === 'confirmar' ? 'Cita confirmada' : 'Cita cancelada', r.mensaje);
        pintar(await pedir('/portal/consultar', credenciales()));
      } catch (err) {
        avisar(caja, 'mal', 'No se pudo registrar', err.message);
      }
    }

    portal.addEventListener('submit', async (e) => {
      e.preventDefault();
      const boton = $('button[type=submit]', portal);
      boton.disabled = true;
      boton.textContent = 'Consultando…';
      caja.hidden = true;
      try {
        pintar(await pedir('/portal/consultar', credenciales()));
      } catch (err) {
        salida.hidden = true;
        avisar(caja, 'mal', 'No encontramos la cita', err.message);
      } finally {
        boton.disabled = false;
        boton.textContent = 'Ver mi cita';
      }
    });

    $('#ultimos4').addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });
    $('#codigo').addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  }

  /* ── Detalles ──────────────────────────────────────────────────── */

  const anio = $('[data-anio]');
  if (anio) anio.textContent = new Date().getFullYear();

  llenarCatalogo();
})();
