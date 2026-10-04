/* =====================================================================
   EDIT ME — photos & settings
   Swap the placeholder files in assets/ (same file names) or change the paths below.
   Anything left empty shows a placeholder.
   ===================================================================== */
var CONFIG = {
  // One photo per event card:  [Wedding Ceremony, Reception Evening]
  eventPhotos: ['assets/events/wedding-ceremony.jpg', 'assets/events/reception-evening.jpg'],
  // Optional landscape versions shown on phones (<=560px). Leave '' to reuse the portrait photo.
  eventPhotosWide: ['', ''],   // e.g. ['assets/events/wedding-ceremony-wide.jpg', 'assets/events/reception-evening-wide.jpg']
  // Photos shown in the gold frame on the "Our Story" page
  storyPhotos: { abhai: 'assets/story/abhai.jpg', varshini: 'assets/story/varshini.jpg' },
  // The photo trail on the last page ("Touch here for magic"). Add up to ~20 paths.
  gallery: (function () { var a = []; for (var n = 1; n <= 18; n++) a.push('assets/gallery/photo-' + (n < 10 ? '0' : '') + n + '.jpg'); return a; })(),  // replace assets/gallery/photo-01.jpg … photo-20.jpg with your photos (same names)
  galleryPlaceholders: 18             // how many placeholder cards to use when gallery is empty
};

(function () {
  /* Always open at the first screen after a refresh (don't restore the old scroll position) */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  var touched = false;
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (t) {
    addEventListener(t, function () { touched = true; }, { once: true, passive: true });
  });
  addEventListener('load', function () { if (!touched) { scrollTo(0, 0); setTimeout(function () { if (!touched) scrollTo(0, 0); }, 80); } });
  addEventListener('pageshow', function (e) { if (e.persisted) scrollTo(0, 0); });

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hero: names slide down and disappear behind the gopuram ---------- */
  var hero = $('#hero'), temple = $('#temple'), names = $('#names'), sHero = 0, kFast = 1, sEnd = 0;
  /* The temple rises from just below the screen, covers the fixed names, then travels up and away.
     On wide (desktop) screens it moves faster than the scroll at first and eases to normal speed,
     so the hero is short; on phones it simply follows the scroll. */
  function layout() {
    var vh = innerHeight, H = temple.offsetHeight || vh * 1.4;
    var startY = vh * 0.94 - H * 0.123;
    sEnd = Math.max(0, startY - (vh - H));                 // total temple travel
    kFast = innerWidth > innerHeight ? 2.6 : 1;            // initial speed multiplier
    sHero = 2 * sEnd / (kFast + 1);                        // scroll distance of the hero
    hero.style.height = (vh + sHero) + 'px';
    return startY;
  }
  function onScroll() {
    var startY = layout(), s = Math.min(Math.max(scrollY, 0), sHero);
    var f = s + (kFast - 1) * (s - s * s / (2 * sHero || 1));   // eased travel
    temple.style.transform = 'translate(-50%,' + (startY - f) + 'px)';
    names.style.transform = 'translateY(' + (-s * 0.05) + 'px)';
  }
  if (!reduce) { addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); temple.addEventListener('load', onScroll); onScroll(); }
  else { layout(); temple.style.transform = 'translate(-50%,' + (innerHeight - (temple.offsetHeight || innerHeight)) + 'px)'; }

  /* ---------- Events: one card, 1 / 2 navigation ---------- */
  var slides = $$('.slide'), dots = $$('.dot'), cur = 0;
  function show(i) {
    cur = (i + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.hidden = k !== cur; });
    dots.forEach(function (d, k) { d.setAttribute('aria-current', k === cur); });
  }
  dots.forEach(function (d) { d.onclick = function () { show(+d.dataset.i); }; });
  $('#prev').onclick = function () { show(cur - 1); };
  $('#next').onclick = function () { show(cur + 1); };
  var x0 = null, ev = $('#ev');
  ev.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  ev.addEventListener('touchend', function (e) {
    if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
  });

  /* ---------- Event photos (placeholders until CONFIG.eventPhotos is filled) ---------- */
  $$('.ph').forEach(function (el) {
    var i = +el.dataset.ev, src = CONFIG.eventPhotos[i], wide = CONFIG.eventPhotosWide[i];
    if (!src) return;
    el.textContent = '';
    var pic = document.createElement('picture');
    if (wide) { var so = document.createElement('source'); so.media = '(max-width:560px)'; so.srcset = wide; pic.appendChild(so); }
    var im = new Image(); im.src = src; im.alt = ''; pic.appendChild(im);
    el.appendChild(pic);
  });

  /* ---------- Story tabs (swap the framed photo) ---------- */
  var sp = $('#sp');
  [CONFIG.storyPhotos.abhai, CONFIG.storyPhotos.varshini].forEach(function (u) { new Image().src = u; });
  $$('.tab').forEach(function (b) {
    b.onclick = function () {
      $$('.tab').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      var a = b.dataset.t === 'a'; $('#ta').hidden = !a; $('#tv').hidden = a;
      var u = b.dataset.t === 'a' ? CONFIG.storyPhotos.abhai : CONFIG.storyPhotos.varshini;
      sp.style.opacity = 0; setTimeout(function () { sp.src = u; sp.alt = b.dataset.t === 'a' ? 'Abhai and Varshini' : 'Varshini and Abhai'; sp.style.opacity = 1; }, 180);
    };
  });

  /* ---------- Story: shrink-to-fit, so neither tab ever needs scrolling ----------
     For each tab, find the largest font size (--fs) at which its whole text fits inside the box.
     Re-runs on resize / rotation and once the web fonts have loaded. */
  var storyCard = $('#story .card'), bodies = $$('.body'), fitQueued = false;

  /* Left edge of the arch's cream interior (as a fraction of the card width) at each height
     (fraction of the card height), measured from the artwork. The right edge is the mirror image. */
  var ARCH = [[.22,.282],[.24,.245],[.26,.235],[.28,.175],[.30,.155],[.32,.152],[.34,.127],[.36,.114],[.38,.099],[.40,.091],[.60,.091]];
  function archLeft(f) {
    if (f <= ARCH[0][0]) return ARCH[0][1];
    for (var i = 1; i < ARCH.length; i++) if (f <= ARCH[i][0]) {
      var p = ARCH[i - 1], q = ARCH[i];
      return p[1] + (q[1] - p[1]) * (f - p[0]) / (q[0] - p[0]);
    }
    return ARCH[ARCH.length - 1][1];
  }
  /* Two invisible floats at the top of each text box. Their shape follows the arch, so the text
     wraps inside the curve instead of running over the border on the sides. */
  function shapeBody(b, cr) {
    var r = b.getBoundingClientRect(), bh = b.clientHeight, fw = r.width / 2;
    if (!bh || !fw) return;
    var sl = b.querySelector('.sh.l'), sr = b.querySelector('.sh.r');
    if (!sl) {
      sl = document.createElement('i'); sl.className = 'sh l'; sl.setAttribute('aria-hidden', 'true');
      sr = document.createElement('i'); sr.className = 'sh r'; sr.setAttribute('aria-hidden', 'true');
      b.insertBefore(sr, b.firstChild); b.insertBefore(sl, b.firstChild);
    }
    var step = Math.max(4, cr.height * 0.006), pl = [], pr = [];
    for (var y = 0; ; y += step) {
      var yy = Math.min(y, bh), f = (r.top - cr.top + yy) / cr.height;
      var x = Math.min(fw, Math.max(0, (archLeft(f) + 0.03) * cr.width - (r.left - cr.left)));
      pl.push(x.toFixed(1) + 'px ' + yy.toFixed(1) + 'px');
      pr.push((fw - x).toFixed(1) + 'px ' + yy.toFixed(1) + 'px');
      if (yy >= bh) break;
    }
    var polyL = 'polygon(0px 0px,' + pl.join(',') + ',0px ' + bh + 'px)';
    var polyR = 'polygon(' + fw + 'px 0px,' + pr.join(',') + ',' + fw + 'px ' + bh + 'px)';
    [[sl, polyL], [sr, polyR]].forEach(function (p) {
      p[0].style.width = fw + 'px'; p[0].style.height = bh + 'px';
      p[0].style.shapeOutside = p[1]; p[0].style.webkitShapeOutside = p[1];
    });
  }
  function fitStory() {
    fitQueued = false;
    var cr = storyCard.getBoundingClientRect(), cw = storyCard.clientWidth || innerWidth, hi0 = Math.max(12, cw * 0.02);
    var state = bodies.map(function (b) { return b.hidden; });
    bodies.forEach(function (b) {
      bodies.forEach(function (o) { o.hidden = (o !== b); });      // measure one tab at a time
      shapeBody(b, cr);
      var lo = 5.5, hi = hi0;
      for (var i = 0; i < 14; i++) {
        var mid = (lo + hi) / 2;
        b.style.setProperty('--fs', mid + 'px');
        if (b.scrollHeight <= b.clientHeight + 1) lo = mid; else hi = mid;
      }
      b.style.setProperty('--fs', lo.toFixed(2) + 'px');
    });
    bodies.forEach(function (b, i) { b.hidden = state[i]; });
  }
  function queueFit() { if (!fitQueued) { fitQueued = true; requestAnimationFrame(fitStory); } }
  fitStory();
  addEventListener('resize', queueFit);
  addEventListener('load', queueFit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFit);

  /* ---------- Countdown (22 Nov 2026, 9:00 AM IST) ---------- */
  var target = new Date('2026-11-22T09:00:00+05:30');
  function tick() {
    var s = Math.max(0, Math.floor((target - new Date()) / 1000));
    var v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
    for (var k in v) $('#' + k).textContent = String(v[k]).padStart(2, '0');
  }
  tick(); setInterval(tick, 1000);
  /* ---------- Photo trail: move/drag over the last page and photos pop up, then fade ---------- */
  var box = $('#count'), trail = $('#trail'), ti = 0, lx = -999, ly = -999, live = 0;
  var total = Math.max(CONFIG.gallery.length, CONFIG.galleryPlaceholders);

  /* Preload the rest of the site quietly, after the first screen has loaded */
  var queue = ['assets/invite-frame.webp', 'assets/ganesha.webp', 'assets/events-bg.webp',
               'assets/story-frame.webp', 'assets/photo-frame.webp']
    .concat(CONFIG.eventPhotos, CONFIG.eventPhotosWide || [],
            [CONFIG.storyPhotos.abhai, CONFIG.storyPhotos.varshini]);
  var held = [];
  /* Trail photos: small, so fetch them all at once and first */
  function preloadGallery() {
    CONFIG.gallery.forEach(function (src) {
      var im = new Image(); im.decoding = 'async'; im.src = src; held.push(im);
    });
  }
  /* Everything else: one image at a time, so it never competes with what the visitor is viewing */
  function preloadAll() {
    var c = navigator.connection;
    if (c && (c.saveData || /2g/.test(c.effectiveType))) return;   // skip on slow / data-saver
    var list = queue.filter(Boolean), k = 0;
    (function next() {
      if (k >= list.length) return;
      var im = new Image(); im.decoding = 'async';
      im.onload = im.onerror = next;
      im.src = list[k++]; held.push(im);
    })();
  }
  function startPreload() {
    (window.requestIdleCallback || function (f) { setTimeout(f, 500); })(function () { preloadGallery(); preloadAll(); });
  }
  if (document.readyState === 'complete') startPreload();
  else addEventListener('load', startPreload);
  var pal = [['#c9806a', '#e8b79a'], ['#7a5aa0', '#b99ad6'], ['#3f7fcb', '#8fc0f0'], ['#b5534f', '#e6a08a'], ['#4d8a6a', '#a6d3b3']];
  function spawn(x, y) {
    if (live > 14) return;
    var d = document.createElement('div'), src = CONFIG.gallery[ti % total];
    if (src) { d.className = 'tr'; var im = new Image(); im.alt = ''; d.style.visibility = 'hidden'; im.onload = function () { d.style.visibility = ''; }; im.src = src; d.appendChild(im); }
    else { var p = pal[ti % pal.length]; d.className = 'tr ph2'; d.style.setProperty('--a', p[0]); d.style.setProperty('--b', p[1]); d.textContent = (ti % total) + 1; }
    ti++; live++;
    d.style.left = (x + (Math.random() * 40 - 20)) + 'px'; d.style.top = (y + (Math.random() * 40 - 20)) + 'px';
    d.style.setProperty('--r', (Math.random() * 28 - 14) + 'deg');
    trail.appendChild(d); setTimeout(function () { d.remove(); live--; }, 1750);
  }
  function move(cx, cy, force) {
    var r = box.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
    if (force || Math.hypot(x - lx, y - ly) > 85) { lx = x; ly = y; spawn(x, y); }
  }
  box.addEventListener('pointermove', function (e) { move(e.clientX, e.clientY, false); });
  box.addEventListener('touchmove', function (e) { var t = e.touches[0]; move(t.clientX, t.clientY, false); }, { passive: true });
  box.addEventListener('click', function (e) { move(e.clientX, e.clientY, true); });

  /* ---------- Background music ----------
     Tries to start as soon as the page opens. Browsers only allow sound after the visitor has
     interacted with the page, so if it is blocked it starts on the first tap / click / key press.
     The toggle turns it on/off; it always pauses when the tab is hidden or closed. */
  var audio = $('#bgm'), btn = $('#mt');
  var wantsMusic = true;          // becomes false once the visitor switches it off
  var resumeOnShow = false;
  audio.volume = 0.6;
  function ui() {
    var on = !audio.paused;
    btn.setAttribute('aria-pressed', on);
    btn.setAttribute('aria-label', 'Background music: ' + (on ? 'on' : 'off'));
    btn.classList.toggle('hint', !on && wantsMusic);
  }
  var gestures = ['pointerdown', 'touchend', 'keydown', 'click'];
  function arm() { gestures.forEach(function (g) { document.addEventListener(g, firstGesture, true); }); }
  function disarm() { gestures.forEach(function (g) { document.removeEventListener(g, firstGesture, true); }); }
  function tryPlay() {
    if (!wantsMusic || document.hidden) return;
    var p = audio.play();
    if (p && p.then) p.then(function () { disarm(); hideGate(); ui(); }).catch(function () { arm(); ui(); showGate(); });
  }
  var gate = $('#gate'), gateShown = false;
  function showGate() { if (gateShown || !gate) return; gateShown = true; gate.hidden = false; $('#open').focus({ preventScroll: true }); }
  function hideGate() { if (gate) gate.hidden = true; }
  $('#open').addEventListener('click', function () { hideGate(); wantsMusic = true; tryPlay(); });
  function firstGesture(e) {
    if (e.target.closest && e.target.closest('#mt')) return;
    hideGate(); tryPlay();
  }
  btn.addEventListener('click', function () {
    disarm();
    if (audio.paused) { wantsMusic = true; audio.play().catch(ui); } else { wantsMusic = false; audio.pause(); }
    ui();
  });
  ['play', 'pause'].forEach(function (t) { audio.addEventListener(t, ui); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { resumeOnShow = !audio.paused; audio.pause(); }      // tab switched / minimised
    else if (wantsMusic && resumeOnShow) { resumeOnShow = false; tryPlay(); }  // back again
  });
  addEventListener('pagehide', function () { audio.pause(); });                 // tab closed / left
  /* ---------- Lazy-load the off-screen frame / background images ---------- */
  function lazyBg(el, set) {
    if (!el) return;
    new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { set(); o.disconnect(); } }, { rootMargin: '1500px' }).observe(el);
  }
  lazyBg($('#story'), function () {
    $('#story').style.setProperty('--bg', 'url(assets/story-frame.webp)');
    $('#story .card').style.setProperty('--img', 'url(assets/story-frame.webp)');
  });
  lazyBg($('#events'), function () { $('#events').classList.add('bgon'); });

  tryPlay(); ui();
})();
