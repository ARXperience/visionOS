const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── arrastrar con el raton un contenedor con scroll horizontal ────
   El tactil ya lo hace el navegador; esto es solo para el raton. Si el
   puntero se movio, el clic siguiente no debe activar el enlace de debajo. */
function draggable(el) {
  let x0, l0, moved = false;
  el.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button || e.target.closest('a,button')) return;
    x0 = e.clientX; l0 = el.scrollLeft; moved = false;
    el.setPointerCapture(e.pointerId);
    el.classList.add('drag');
    e.preventDefault();
  });
  el.addEventListener('pointermove', e => {
    if (x0 === undefined) return;
    const d = e.clientX - x0;
    if (Math.abs(d) > 5) moved = true;
    el.scrollLeft = l0 - d;
  });
  const end = () => { x0 = undefined; el.classList.remove('drag'); };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
}

/* ── slider del inicio: scroll-snap + autoplay ─────────────────────
   Sobre scroll-snap y no sobre transform: el swipe tactil y el
   teclado salen gratis, y si el usuario desliza mandan sus dedos. */
const track = document.getElementById('hstrack');
if (track) {
  const slides = [...track.children];
  const dots = document.getElementById('hsdots');
  const count = document.getElementById('hscount');
  const pad = n => String(n).padStart(2, '0');
  const total = pad(slides.length);
  let i = 0, timer;

  slides.forEach((_, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Ir a la diapositiva ' + (k + 1));
    b.onclick = () => { go(k); restart(); };
    dots.append(b);
  });

  const sync = () => {
    [...dots.children].forEach((d, k) => d.setAttribute('aria-current', k === i));
    count.textContent = pad(i + 1) + ' / ' + total;
  };
  const go = k => {
    i = (k + slides.length) % slides.length;
    track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    sync();
  };
  const restart = () => {
    clearInterval(timer);
    if (!reduce) timer = setInterval(() => go(i + 1), 7000);
  };

  document.getElementById('hsprev').onclick = () => { go(i - 1); restart(); };
  document.getElementById('hsnext').onclick = () => { go(i + 1); restart(); };

  let t;
  track.addEventListener('scroll', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const k = Math.round(track.scrollLeft / track.clientWidth);
      if (k !== i) { i = k; sync(); restart(); }
    }, 120);
  }, { passive: true });

  track.addEventListener('pointerenter', () => clearInterval(timer));
  track.addEventListener('pointerleave', restart);
  addEventListener('resize', () => track.scrollTo({ left: i * track.clientWidth }));
  document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : restart());

  draggable(track);      /* el hero tambien se arrastra con el raton */
  sync();
  restart();
}

/* ── carruseles de servicios ────────────────────────────────────
   Scroll nativo en vez de animacion CSS: el swipe tactil, la rueda y el
   teclado salen gratis. El autoplay solo empuja scrollLeft y las tarjetas
   van duplicadas, asi que al llegar a la mitad se rebobina sin costura.
   El arrastre con raton si hay que hacerlo a mano. */
document.querySelectorAll('.cx').forEach(cx => {
  const track = cx.firstElementChild;
  const half = () => track.scrollWidth / 2;
  const secs = parseFloat(getComputedStyle(cx).getPropertyValue('--d')) || 48;
  let px = 0, hold = 0, raf;

  const step = () => {
    const h = half();
    if (!hold) {
      px += h / (secs * 60);                   /* --d es el tiempo de una vuelta */
      cx.scrollLeft += px | 0;
      px -= px | 0;
    }
    /* las tarjetas van duplicadas: media pista es una vuelta exacta. Los dos
       umbrales no se solapan, si no rebotarian el uno contra el otro. */
    if (cx.scrollLeft >= h) cx.scrollLeft -= h;
    else if (cx.scrollLeft <= 0) cx.scrollLeft = h - 1;
    raf = requestAnimationFrame(step);
  };
  const play = () => { if (!reduce && !raf) raf = requestAnimationFrame(step); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  /* con captura de puntero los enter/leave pueden desparejarse: nunca baja de 0 */
  const grab = () => hold++, free = () => hold = Math.max(0, hold - 1);
  cx.addEventListener('pointerenter', grab);
  cx.addEventListener('pointerleave', free);
  cx.addEventListener('focusin', grab);
  cx.addEventListener('focusout', free);
  draggable(cx);

  const nav = cx.previousElementSibling?.querySelector('.rx-nav');
  nav?.querySelectorAll('button').forEach(b => b.onclick = () => {
    const w = cx.querySelector('.card')?.offsetWidth || 300;
    cx.scrollBy({ left: (+b.dataset.rx) * (w + 18) * 2, behavior: reduce ? 'auto' : 'smooth' });
  });

  new IntersectionObserver(([e]) => e.isIntersecting ? play() : stop(),
    { threshold: 0 }).observe(cx);
});

/* ── reveal al hacer scroll + contadores ───────────────────────── */
/* Las fichas que no venían marcadas también se descubren al hacer scroll. */
document.querySelectorAll('.card, .svc, .cta, .abox').forEach(el => {
  if (!el.classList.contains('rv')) el.classList.add('rv');
  if (el.classList.contains('card')) el.classList.add('flota-scroll');
});

const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  e.target.querySelectorAll('[data-n]').forEach(el => {
    const to = +el.dataset.n, t0 = performance.now();
    const tick = now => {
      const k = Math.min((now - t0) / 900, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  io.unobserve(e.target);
}), { rootMargin: '0px 0px -8% 0px' });

document.querySelectorAll('.rv').forEach((el, n) => {
  if (!reduce) el.style.transitionDelay = (n % 3) * 100 + 'ms';
  io.observe(el);
});

const flotantes = [...document.querySelectorAll('.flota-scroll')];
if (flotantes.length && !reduce) {
  let pendiente = false;
  const mover = () => {
    pendiente = false;
    const centro = innerHeight / 2;
    flotantes.forEach(card => {
      const r = card.getBoundingClientRect();
      const progreso = Math.max(-1, Math.min(1, (centro - (r.top + r.height / 2)) / innerHeight));
      card.style.setProperty('--flotacion-y', `${Math.round(progreso * -14)}px`);
    });
  };
  const programar = () => {
    if (!pendiente) { pendiente = true; requestAnimationFrame(mover); }
  };
  addEventListener('scroll', programar, { passive: true });
  addEventListener('resize', programar);
  programar();
}

/* cierra el desplegable de servicios al hacer clic fuera */
const dd = document.querySelector('.dd');
if (dd) document.addEventListener('click', e => { if (!dd.contains(e.target)) dd.open = false; });

/* ── Biblioteca visual propia de servicios ─────────────────────────
   Los textos y fichas provienen del inventario clínico existente. Las fotos
   antiguas de la primera maqueta se sustituyen por una colección editorial
   coherente, creada para este sitio y agrupada por familia asistencial. */
const actuales = new Set([
  'consultas.html', 'consulta-de-oftalmologia-general.html',
  'consulta-de-oftalmologia-subespecializada.html', 'consulta-de-retina-y-vitreo.html',
  'consulta-de-cornea-y-segmento-anterior.html', 'consulta-de-estrabismo.html',
  'consulta-de-oftalmologia-pediatrica.html', 'consulta-de-oculoplastica.html',
  'consulta-de-optometria.html', 'consulta-de-optometria-pediatrica.html',
  'consulta-especializada-de-baja-vision.html',
  'consulta-especializada-de-rehabilitacion-con-protesis-oculares.html',
  'consulta-especializada-de-rehabilitacion-para-la-autonomia-personal.html',
  'consulta-especializada-de-rehabilitacion-visual.html', 'glaucoma.html',
  'degeneracion-macular.html'
]);
const diagnosticos = new Set([
  'examenes-diagnosticos.html', 'angiografia-fluoresceinica.html', 'biometria-optica.html',
  'campo-visual-computarizado.html', 'citologia-de-impresion.html', 'ecografia-ocular-ultrasonica.html',
  'electrooculograma.html', 'electroretinograma.html', 'interferometria.html',
  'paquimetria-ultrasonica.html', 'potenciales-visuales-evocados.html', 'pupilometria.html',
  'recuento-endotelial.html', 'test-de-estereopsis-test-de-titmus.html',
  'test-de-farnsworth-d15.html', 'tomografia-optica-coherente.html',
  'topografia-corneal-y-paquimetria-pentacam.html', 'ultrabiomicroscopia-ultrasonica-ubm.html',
  'tecnologia.html'
]);
const cirugias = new Set([
  'cirugias.html', 'blefaroplastia.html', 'cirugia-refractiva-personalizada.html',
  'estrabismo.html', 'extraccion-de-cataratas.html', 'implante-de-anillos-intraestromales.html',
  'pterigion.html', 'queratoplastia-o-trasplante-corneal.html',
  'reticulacion-corneal-o-crosslinking.html'
]);

const archivo = ruta => {
  try { return new URL(ruta || location.href, location.href).pathname.split('/').pop(); }
  catch { return ''; }
};
const imagenServicio = ruta => {
  const pagina = archivo(ruta);
  if (actuales.has(pagina)) return 'media/servicios/consultas-nueva.png';
  if (diagnosticos.has(pagina)) return 'media/servicios/diagnostico-nueva.png';
  if (cirugias.has(pagina)) return 'media/servicios/cirugias-nueva.png';
  if (pagina === 'optica.html' || pagina === 'consulta-especializada-de-lentes-de-contacto.html') {
    return 'media/servicios/optica-nueva.png';
  }
  if (pagina === 'empresas.html') return 'media/servicios/empresas-nueva.png';
  if (pagina === 'medicina-estetica-facial.html') return 'media/servicios/estetica-nueva.png';
  return null;
};

const visualActual = imagenServicio(location.href);
if (visualActual) {
  document.querySelectorAll('.phero').forEach(el => { el.style.backgroundImage = `url(${visualActual})`; });
  document.querySelectorAll('.svc-fig img, img[src*="src/ai/"]').forEach(img => {
    const enlace = img.closest('a[href]')?.getAttribute('href');
    img.src = imagenServicio(enlace || location.href) || visualActual;
    img.removeAttribute('srcset');
  });
}
