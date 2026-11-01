/*!
 * Slynx_ch — Personal Website
 * Vanilla JavaScript · no dependencies
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const matches = (q) => window.matchMedia(q).matches;
  const reduceMotion = matches('(prefers-reduced-motion: reduce)');
  const finePointer = matches('(hover: hover) and (pointer: fine)');
  const safe = (label, fn) => {
    try { return fn(); } catch (err) { console.warn(`[${label}]`, err); return null; }
  };

  const GITHUB_USER = 'Slynxch';
  const GITHUB_URL = `https://github.com/${GITHUB_USER}`;
  const ARROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8.5 7H17v8.5"/></svg>';

  const el = (tag, props = {}, children = []) => {
    const node = doc.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (value == null || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value; // static, trusted strings only
      else node.setAttribute(key, value === true ? '' : value);
    });
    [].concat(children).forEach((child) => { if (child != null) node.append(child); });
    return node;
  };

  /* ------------------------------------------------------------------
     Split text into characters
     mode "mask"  → <span class="char"><span>c</span></span> (for rise-in)
     mode "scrub" → <span class="c">c</span>                  (for scroll fill)
     ------------------------------------------------------------------ */
  function splitText(target, mode) {
    let index = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          let text = child.textContent;
          if (mode === 'mask') {
            text = text.replace(/\s+/g, ' ');
            if (!text.trim()) { child.remove(); return; }
          }
          const frag = doc.createDocumentFragment();
          for (const ch of text) {
            if (/\s/.test(ch)) {
              frag.append(doc.createTextNode(mode === 'mask' ? ' ' : ch));
              continue;
            }
            if (mode === 'scrub') {
              frag.append(el('span', { class: 'c', text: ch }));
            } else {
              const inner = el('span', { text: ch });
              inner.style.setProperty('--i', index);
              frag.append(el('span', { class: 'char', 'aria-hidden': 'true' }, inner));
            }
            index += 1;
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(target);
    return index;
  }

  function initSplits() {
    $$('[data-split-mask]').forEach((node) => {
      const label = node.textContent.trim();
      splitText(node, 'mask');
      if (!node.closest('[aria-hidden="true"]')) node.append(el('span', { class: 'sr-only', text: label }));
    });
  }

  /* ------------------------------------------------------------------
     Preloader → hero intro
     ------------------------------------------------------------------ */
  function initIntro(onReady) {
    const pre = $('.preloader');
    let seen = false;
    try { seen = sessionStorage.getItem('slynx:intro') === '1'; } catch (e) { /* private mode */ }

    const assetsReady = Promise.race([
      Promise.all([
        doc.fonts && doc.fonts.ready ? doc.fonts.ready.catch(() => {}) : Promise.resolve(),
        doc.readyState === 'complete'
          ? Promise.resolve()
          : new Promise((resolve) => window.addEventListener('load', resolve, { once: true })),
      ]),
      wait(4500),
    ]);

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      body.classList.remove('is-loading');
      body.classList.add('is-loaded');
      onReady();
    };

    if (!pre || seen || reduceMotion) {
      if (pre) pre.remove();
      Promise.race([assetsReady, wait(900)]).then(() => requestAnimationFrame(reveal));
      return;
    }

    body.classList.add('is-loading');
    const countEl = $('[data-count]', pre);
    const barEl = $('.preloader__bar i', pre);
    const MIN_DURATION = 1700;
    const start = performance.now();
    let ready = false;
    let shown = 0;
    assetsReady.then(() => { ready = true; });

    const step = (now) => {
      const elapsed = now - start;
      const linear = clamp(elapsed / MIN_DURATION, 0, 1);
      const target = ready ? linear * 100 : Math.min(86, linear * 86);
      shown = lerp(shown, target, 0.09);
      if (ready && linear >= 1 && shown > 99.3) shown = 100;

      countEl.textContent = String(Math.round(shown)).padStart(3, '0');
      barEl.style.transform = `scaleX(${shown / 100})`;

      if (shown < 100) { requestAnimationFrame(step); return; }

      try { sessionStorage.setItem('slynx:intro', '1'); } catch (e) { /* ignore */ }
      setTimeout(() => {
        pre.classList.add('is-done');
        setTimeout(reveal, 420);
        setTimeout(() => pre.remove(), 1700);
      }, 260);
    };
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------
     Scroll reveals (IntersectionObserver)
     ------------------------------------------------------------------ */
  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 })
    : null;

  function observeReveals(scope = doc) {
    $$('[data-stagger]', scope).forEach((group) => {
      Array.from(group.children).forEach((child, i) => {
        if (!child.style.getPropertyValue('--d')) child.style.setProperty('--d', `${(i * 0.09).toFixed(2)}s`);
      });
    });
    $$('[data-reveal]:not(.is-in)', scope).forEach((node) => {
      if (revealObserver && !reduceMotion) revealObserver.observe(node);
      else node.classList.add('is-in');
    });
  }

  /* ------------------------------------------------------------------
     Scroll scene: progress, nav, hero parallax, theme, scrub text
     All geometry is measured once (and on resize) to avoid layout reads per frame.
     ------------------------------------------------------------------ */
  function createScrollScene() {
    const progress = $('.progress i');
    const nav = $('.nav');
    const heroInner = $('.hero__inner');
    const heroCanvas = $('.hero__canvas');
    const heroSide = $('.hero__side');
    const metaTheme = $('meta[name="theme-color"]');
    const navLinks = $$('.nav__link[href^="#"]');
    const lightSections = $$('[data-theme="light"]');
    const navTargets = navLinks.map((link) => $(link.getAttribute('href')));

    const scrubs = $$('[data-scrub]').map((node) => {
      splitText(node, 'scrub');
      const chars = $$('.c', node);
      if (reduceMotion) chars.forEach((c) => c.classList.add('on'));
      return { node, chars, top: 0, height: 0, lit: -1 };
    });

    let vh = window.innerHeight;
    let maxScroll = 1;
    let lights = [];
    let targets = [];
    let parallax = [];
    let activeIndex = -2;

    const pageTop = (node) => node.getBoundingClientRect().top + window.scrollY;

    const measure = () => {
      vh = window.innerHeight;
      maxScroll = Math.max(1, root.scrollHeight - vh);
      lights = lightSections.map((s) => ({ top: pageTop(s), bottom: pageTop(s) + s.offsetHeight }));
      targets = navTargets.map((s) => (s ? { top: pageTop(s), bottom: pageTop(s) + s.offsetHeight } : null));
      scrubs.forEach((s) => { s.top = pageTop(s.node); s.height = s.node.offsetHeight; });
      parallax = reduceMotion ? [] : $$('[data-parallax]').map((node) => {
        const parent = node.parentElement;
        return {
          node,
          speed: parseFloat(node.dataset.parallax) || 0.1,
          center: pageTop(parent) + parent.offsetHeight / 2,
        };
      });
    };

    const update = (y, dy) => {
      if (progress) progress.style.transform = `scaleX(${clamp(y / maxScroll, 0, 1).toFixed(4)})`;

      if (nav) {
        nav.classList.toggle('is-scrolled', y > 40);
        if (!body.classList.contains('menu-open')) {
          if (dy > 3 && y > vh * 0.5) nav.classList.add('is-hidden');
          else if (dy < -3 || y < vh * 0.5) nav.classList.remove('is-hidden');
        }
      }

      if (!reduceMotion && y < vh * 1.5) {
        const fade = clamp(1 - (y / vh) * 1.15, 0, 1);
        if (heroInner) {
          heroInner.style.transform = `translate3d(0, ${(y * 0.22).toFixed(1)}px, 0)`;
          heroInner.style.opacity = fade.toFixed(3);
        }
        if (heroSide) heroSide.style.opacity = fade.toFixed(3);
        if (heroCanvas) heroCanvas.style.transform = `translate3d(0, ${(y * 0.42).toFixed(1)}px, 0)`;
      }

      const mid = y + vh * 0.5;
      const theme = lights.some((s) => mid >= s.top && mid <= s.bottom) ? 'light' : 'dark';
      if (body.dataset.theme !== theme) {
        body.dataset.theme = theme;
        if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#efe9df' : '#0b0b0d');
      }

      let active = -1;
      targets.forEach((t, i) => { if (t && mid >= t.top && mid < t.bottom) active = i; });
      if (active !== activeIndex) {
        activeIndex = active;
        navLinks.forEach((link, i) => link.classList.toggle('is-active', i === active));
      }

      if (!reduceMotion) {
        scrubs.forEach((s) => {
          const p = clamp((y + vh * 0.86 - s.top) / (vh * 0.5 + s.height * 0.6), 0, 1);
          const lit = Math.round(p * s.chars.length);
          if (lit === s.lit) return;
          s.lit = lit;
          s.chars.forEach((c, i) => c.classList.toggle('on', i < lit));
        });
      }

      parallax.forEach((p) => {
        const offset = (y + vh / 2 - p.center) * p.speed;
        p.node.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    };

    return { measure, update, dirty: true };
  }

  /* ------------------------------------------------------------------
     Marquee — speed reacts to scroll velocity, direction follows scroll
     ------------------------------------------------------------------ */
  function createMarquee() {
    const wrap = $('.marquee');
    const track = wrap && $('.marquee__track', wrap);
    const group = track && track.firstElementChild;
    if (!group) return null;

    let width = 0;
    let x = 0;
    let visible = true;

    const fill = () => {
      width = group.offsetWidth;
      while (track.children.length < 2 || track.scrollWidth < width + window.innerWidth * 1.2) {
        const clone = group.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.append(clone);
        if (track.children.length > 12) break;
      }
    };
    fill();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(wrap);
    }

    return {
      refresh: fill,
      tick(dt, velocity, direction) {
        if (!visible || !width || reduceMotion) return;
        const speed = 55 + Math.min(Math.abs(velocity) * 14, 900);
        x -= direction * speed * (dt / 1000);
        if (x <= -width) x += width;
        if (x > 0) x -= width;
        track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      },
    };
  }

  /* ------------------------------------------------------------------
     Custom cursor
     ------------------------------------------------------------------ */
  function createCursor() {
    if (!finePointer || reduceMotion) return null;
    const dot = $('.cursor-dot');
    const ring = $('.cursor-ring');
    const label = $('.cursor-ring__label');
    if (!dot || !ring) return null;

    let mx = -100; let my = -100; let rx = -100; let ry = -100;
    let active = false;

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!active) {
        active = true; rx = mx; ry = my;
        root.classList.add('cursor-visible');
      }
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    }, { passive: true });

    doc.addEventListener('mouseleave', () => { active = false; root.classList.remove('cursor-visible'); });
    window.addEventListener('blur', () => { active = false; root.classList.remove('cursor-visible'); });

    doc.addEventListener('pointerover', (e) => {
      const target = e.target instanceof Element ? e.target.closest('a, button, [data-cursor-label]') : null;
      const text = target ? target.getAttribute('data-cursor-label') : '';
      ring.classList.toggle('is-hover', !!target && !text);
      ring.classList.toggle('has-label', !!text);
      if (text) label.textContent = text;
    });
    window.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    window.addEventListener('pointerup', () => ring.classList.remove('is-down'));

    return {
      tick() {
        if (!active) return;
        rx = lerp(rx, mx, 0.2);
        ry = lerp(ry, my, 0.2);
        ring.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
      },
    };
  }

  /* ------------------------------------------------------------------
     Magnetic buttons & tilt cards
     ------------------------------------------------------------------ */
  function bindMagnetic(scope = doc) {
    if (!finePointer || reduceMotion) return;
    $$('[data-magnetic]', scope).forEach((node) => {
      if (node.dataset.magneticBound) return;
      node.dataset.magneticBound = '1';
      const strength = parseFloat(node.dataset.magnetic) || 0.3;
      let rect = null;
      node.addEventListener('pointerenter', () => { rect = node.getBoundingClientRect(); });
      node.addEventListener('pointermove', (e) => {
        if (!rect) rect = node.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        node.style.transform = `translate3d(${(x * strength).toFixed(1)}px, ${(y * strength).toFixed(1)}px, 0)`;
      });
      node.addEventListener('pointerleave', () => { rect = null; node.style.transform = ''; });
    });
  }

  function bindTilt() {
    if (!finePointer || reduceMotion) return;
    $$('[data-tilt]').forEach((card) => {
      let rect = null;
      card.addEventListener('pointerenter', () => { rect = card.getBoundingClientRect(); });
      card.addEventListener('pointermove', (e) => {
        if (!rect) rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
        card.style.setProperty('--rx', `${((0.5 - py) * 7).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${((px - 0.5) * 7).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        rect = null;
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------ */
  function initMenu() {
    const toggle = $('.nav__toggle');
    const menu = $('#menu');
    if (!toggle || !menu) return;

    const setOpen = (open) => {
      body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
      menu.setAttribute('aria-hidden', String(!open));
      menu.inert = !open;
      if (open) {
        $('.nav').classList.remove('is-hidden');
        setTimeout(() => { const first = $('a', menu); if (first) first.focus({ preventScroll: true }); }, 400);
      }
    };

    toggle.addEventListener('click', () => setOpen(!body.classList.contains('menu-open')));
    $$('a', menu).forEach((link) => link.addEventListener('click', () => setOpen(false)));
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && body.classList.contains('menu-open')) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ------------------------------------------------------------------
     Hero canvas — a breathing sphere of points with a gilded orbit
     ------------------------------------------------------------------ */
  function createSphere() {
    const canvas = $('.hero__canvas');
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const GOLD = '214, 188, 140';
    const TAU = Math.PI * 2;
    let w = 0; let h = 0; let dpr = 1;
    let points = [];
    let visible = true;
    let mx = 0; let my = 0; let sx = 0; let sy = 0;

    const build = () => {
      const count = w < 720 ? 620 : 1100;
      const golden = Math.PI * (3 - Math.sqrt(5));
      points = new Array(count);
      for (let i = 0; i < count; i += 1) {
        const y = 1 - (i / (count - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const t = golden * i;
        points[i] = { x: Math.cos(t) * r, y, z: Math.sin(t) * r, lat: Math.asin(y) };
      }
    };

    const layout = () => {
      const compact = w < 900;
      return {
        compact,
        R: compact ? Math.min(w * 0.36, h * 0.25) : Math.min(w * 0.19, h * 0.3),
        ox: compact ? w * 0.5 : w * 0.665,
        oy: compact ? h * 0.3 : h * 0.47,
      };
    };

    // rotate (x, y, z) by yaw (Y axis) then pitch (X axis) and project to screen
    const project = (x, y, z, cY, sY, cX, sX, L) => {
      const x1 = x * cY + z * sY;
      const z1 = -x * sY + z * cY;
      const y1 = y * cX - z1 * sX;
      const z2 = y * sX + z1 * cX;
      const persp = 4.6 / (4.6 - z2);
      return { x: L.ox + x1 * L.R * persp, y: L.oy + y1 * L.R * persp, z: z2 };
    };

    const drawOrbit = (L, t, radius, tilt, roll, alpha, satSpeed, satOffset) => {
      const cX = Math.cos(tilt); const sX = Math.sin(tilt);
      const cZ = Math.cos(roll); const sZ = Math.sin(roll);
      const segs = 180;
      const pts = [];
      for (let i = 0; i <= segs; i += 1) {
        const a = (i / segs) * TAU;
        let x = Math.cos(a) * radius; let y = 0; const z = Math.sin(a) * radius;
        const x1 = x * cZ - y * sZ; y = x * sZ + y * cZ; x = x1;
        pts.push(project(x, y, z, 1, 0, cX, sX, L));
      }
      ctx.lineWidth = 0.8;
      for (let i = 0; i < segs; i += 1) {
        const a = pts[i]; const b = pts[i + 1];
        const depth = ((a.z + b.z) / 2 / radius + 1) / 2;
        ctx.globalAlpha = alpha * (0.15 + depth * 0.85);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // satellite
      const sa = t * satSpeed + satOffset;
      let x = Math.cos(sa) * radius; let y = 0; const z = Math.sin(sa) * radius;
      const x1 = x * cZ - y * sZ; y = x * sZ + y * cZ; x = x1;
      const p = project(x, y, z, 1, 0, cX, sX, L);
      const depth = (p.z / radius + 1) / 2;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16);
      glow.addColorStop(0, `rgba(${GOLD}, ${0.55 * depth + 0.1})`);
      glow.addColorStop(1, `rgba(${GOLD}, 0)`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgb(${GOLD})`;
      ctx.globalAlpha = 0.4 + depth * 0.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 + depth * 1.2, 0, TAU); ctx.fill();
    };

    const draw = (now) => {
      const t = now * 0.001;
      const L = layout();
      ctx.clearRect(0, 0, w, h);

      sx = lerp(sx, mx, 0.04);
      sy = lerp(sy, my, 0.04);
      const yaw = t * 0.085 + sx * 0.55;
      const pitch = -0.32 + sy * 0.32;
      const cY = Math.cos(yaw); const sY = Math.sin(yaw);
      const cX = Math.cos(pitch); const sX = Math.sin(pitch);

      ctx.fillStyle = `rgb(${GOLD})`;
      for (let i = 0; i < points.length; i += 1) {
        const pt = points[i];
        const k = 1 + 0.045 * Math.sin(t * 1.25 + pt.lat * 6.5) + 0.018 * Math.sin(t * 0.7 + pt.x * 5);
        const p = project(pt.x * k, pt.y * k, pt.z * k, cY, sY, cX, sX, L);
        const depth = clamp((p.z + 1.08) / 2.16, 0, 1);
        ctx.globalAlpha = (0.05 + depth * depth * 0.78) * (L.compact ? 0.8 : 1);
        const size = 0.45 + depth * 1.25;
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, TAU); ctx.fill();
      }

      ctx.strokeStyle = `rgb(${GOLD})`;
      drawOrbit(L, t, 1.42, 0.34 + sy * 0.18, -0.36, 0.42, 0.32, 0);
      drawOrbit(L, t, 1.56, 0.44 + sy * 0.12, 0.3, 0.13, -0.18, 2.4);
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      draw(reduceMotion ? 6000 : performance.now());
    };
    resize();

    window.addEventListener('pointermove', (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas.parentElement);
    }

    return {
      resize,
      tick(now) { if (visible && !reduceMotion) draw(now); },
    };
  }

  /* ------------------------------------------------------------------
     Works — live list of public repositories from GitHub
     ------------------------------------------------------------------ */
  const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572a5', HTML: '#e34c26', CSS: '#663399',
    SCSS: '#c6538c', Java: '#b07219', 'C++': '#f34b7d', C: '#8a8a8a', 'C#': '#178600', Go: '#00add8',
    Rust: '#dea584', 'Jupyter Notebook': '#da5b0b', Shell: '#89e051', Kotlin: '#a97bff', Swift: '#f05138',
    Ruby: '#cc342d', PHP: '#4f5d95', Vue: '#41b883', Svelte: '#ff3e00', Dart: '#00b4ab', Lua: '#4b5bbf',
    R: '#198ce7', MATLAB: '#e16737', Haskell: '#5e5086', Scala: '#c22d40', 'Objective-C': '#438eff',
  };

  const pad2 = (n) => String(n).padStart(2, '0');

  const skeletonRow = () => el('li', { class: 'work is-skeleton', 'aria-hidden': 'true' },
    el('div', { class: 'work__link' }, [
      el('span', { class: 'work__index' }, el('span', { class: 'sk sk--meta', style: 'width:24px' })),
      el('span', { class: 'work__main' }, [el('span', { class: 'sk sk--title' }), el('span', { class: 'sk sk--text' })]),
      el('span', { class: 'work__meta' }, el('span', { class: 'sk sk--meta' })),
      el('span', { class: 'work__arrow' }),
    ]));

  const repoRow = (repo, i) => {
    const meta = el('span', { class: 'work__meta' });
    if (repo.language) {
      const dot = el('i');
      dot.style.setProperty('--c', LANG_COLORS[repo.language] || 'var(--accent)');
      meta.append(el('span', { class: 'work__lang' }, [dot, repo.language]));
    }
    if (repo.stars > 0) meta.append(el('span', { text: `★ ${repo.stars}` }));
    const date = repo.pushed ? new Date(repo.pushed) : null;
    if (date && !Number.isNaN(date.getTime())) meta.append(el('span', { text: `${date.getFullYear()}.${pad2(date.getMonth() + 1)}` }));

    const li = el('li', { class: 'work', 'data-reveal': '' },
      el('a', {
        class: 'work__link',
        href: repo.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        'data-cursor-label': 'Open',
      }, [
        el('span', { class: 'work__index', text: pad2(i + 1) }),
        el('span', { class: 'work__main' }, [
          el('span', { class: 'work__name', text: repo.name }),
          el('span', { class: 'work__desc', text: repo.description || '前往 GitHub 查看此專案的完整內容。' }),
        ]),
        meta,
        el('span', { class: 'work__arrow', html: ARROW_SVG }),
      ]));
    li.style.setProperty('--d', `${(i * 0.08).toFixed(2)}s`);
    return li;
  };

  const soonRow = (i) => {
    const li = el('li', { class: 'work is-soon', 'data-reveal': '' },
      el('div', { class: 'work__link' }, [
        el('span', { class: 'work__index', text: pad2(i + 1) }),
        el('span', { class: 'work__main' }, [
          el('span', { class: 'work__name', text: 'Coming Soon', lang: 'en' }),
          el('span', { class: 'work__desc', text: '新的專案正在醞釀中，敬請期待。' }),
        ]),
        el('span', { class: 'work__meta', text: 'In progress', lang: 'en' }),
        el('span', { class: 'work__arrow', 'aria-hidden': 'true' }),
      ]));
    li.style.setProperty('--d', `${(i * 0.08).toFixed(2)}s`);
    return li;
  };

  async function fetchRepos() {
    const CACHE_KEY = 'slynx:repos:v1';
    const TTL = 60 * 60 * 1000;
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Array.isArray(cached.data) && Date.now() - cached.time < TTL) return cached.data;
    } catch (e) { /* ignore */ }

    const controller = 'AbortController' in window ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
    try {
      const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller ? controller.signal : undefined,
      });
      if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Unexpected GitHub API response');
      const repos = data
        .filter((r) => !r.fork && !r.archived && !r.private)
        .map((r) => ({
          name: r.name,
          description: r.description,
          url: r.html_url,
          language: r.language,
          stars: r.stargazers_count || 0,
          pushed: r.pushed_at || r.updated_at,
        }));
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data: repos })); } catch (e) { /* ignore */ }
      return repos;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function initWorks(onChange) {
    const list = $('[data-repos]');
    if (!list) return;
    const note = $('[data-repos-note]');
    const count = $('[data-repo-count]');

    list.replaceChildren(skeletonRow(), skeletonRow(), skeletonRow());
    onChange();

    let repos = null;
    try {
      [repos] = await Promise.all([fetchRepos(), wait(700)]);
    } catch (err) {
      console.warn('[works]', err);
    }

    const rows = [];
    if (repos && repos.length) {
      repos
        .slice()
        .sort((a, b) => (b.stars - a.stars) || (new Date(b.pushed) - new Date(a.pushed)))
        .slice(0, 8)
        .forEach((repo, i) => rows.push(repoRow(repo, i)));
      if (count) { count.textContent = `(${pad2(repos.length)})`; count.hidden = false; }
    }
    if (!repos && note) {
      note.textContent = '暫時無法連線至 GitHub，請直接前往我的 GitHub 頁面瀏覽所有專案。';
      note.hidden = false;
    }
    while (rows.length < 3) rows.push(soonRow(rows.length));

    list.replaceChildren(...rows);
    observeReveals(list);
    onChange();
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  safe('splits', initSplits);
  $$('[data-year]').forEach((node) => { node.textContent = String(new Date().getFullYear()); });

  const scene = safe('scene', createScrollScene);
  const marquee = safe('marquee', createMarquee);
  const cursor = safe('cursor', createCursor);
  const sphere = safe('sphere', createSphere);
  safe('magnetic', bindMagnetic);
  safe('tilt', bindTilt);
  safe('menu', initMenu);

  let measureQueued = false;
  const remeasure = () => {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => {
      measureQueued = false;
      if (scene) { scene.measure(); scene.dirty = true; }
    });
  };

  safe('intro', () => initIntro(() => {
    safe('reveals', () => observeReveals());
    remeasure();
  }));

  safe('works', () => initWorks(remeasure));

  // Re-measure when layout settles or changes
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      remeasure();
      if (sphere) sphere.resize();
      if (marquee) marquee.refresh();
    }, 150);
  });
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(body);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => { remeasure(); if (marquee) marquee.refresh(); });
  window.addEventListener('load', remeasure);
  if (scene) scene.measure();

  // Single animation loop
  let lastY = window.scrollY;
  let lastTime = performance.now();
  let velocity = 0;
  let direction = 1;

  const frame = (now) => {
    const dt = Math.min(64, now - lastTime);
    lastTime = now;
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    velocity = lerp(velocity, dy, 0.12);
    if (dy > 0) direction = 1;
    else if (dy < 0) direction = -1;

    if (scene && (dy !== 0 || scene.dirty)) {
      safe('scene:update', () => scene.update(y, dy));
      scene.dirty = false;
    }
    if (marquee) marquee.tick(dt, velocity, direction);
    if (cursor) cursor.tick();
    if (sphere) sphere.tick(now);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
