(function () {
  'use strict';

  /* Подставляем редактируемый контент из localStorage (или дефолт) */
  if (window.StarfallContent) {
    var content = window.StarfallContent.load();
    window.StarfallContent.applyToDOM(content);
    window.__starfallContent = content;
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  /* Главная страница помечена <body data-page="home"> — у неё чуть другие пороги и поведение бренда */
  var isHome = document.body.getAttribute('data-page') === 'home';

  /* ============ BUTTON TEXT SLIDE: оборачиваем текстовый узел кнопки ============
     Разбиваем текст на буквы. Каждая буква получает свой мини-стек из двух
     идентичных копий (оригинал + дубль снизу, aria-hidden) и свой индекс
     --char-i для transition-delay в CSS — при hover буквы уезжают вверх
     по очереди слева направо, дубли заезжают снизу на их место.
     Сама надпись остаётся доступной screen-reader'ам как aria-label. */
  if (canHover && !reduceMotion) {
    document.querySelectorAll('.btn').forEach(function (btn) {
      if (btn.querySelector('.btn-label')) return;
      var textNode = null;
      for (var i = 0; i < btn.childNodes.length; i++) {
        var n = btn.childNodes[i];
        if (n.nodeType === 3 && n.textContent.trim().length) { textNode = n; break; }
      }
      if (!textNode) return;
      var text = textNode.textContent.trim();

      if (!btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', btn.textContent.trim());

      var label = document.createElement('span');
      label.className = 'btn-label';
      label.setAttribute('aria-hidden', 'true');

      for (var ci = 0; ci < text.length; ci++) {
        var ch = text[ci];
        var charSpan = document.createElement('span');
        charSpan.className = 'btn-char';
        if (ch === ' ') charSpan.style.width = '0.32em';

        var stack = document.createElement('span');
        stack.className = 'btn-char-stack';
        stack.style.setProperty('--char-i', ci);

        var s1 = document.createElement('span');
        s1.textContent = ch;
        var s2 = document.createElement('span');
        s2.textContent = ch;

        stack.appendChild(s1);
        stack.appendChild(s2);
        charSpan.appendChild(stack);
        label.appendChild(charSpan);
      }

      btn.replaceChild(label, textNode);

      /* ============ ЛОГИКА "все буквы сразу", если курсор ушёл раньше конца волны ============
         Считаем длительность волны по числу букв. Если пользователь убирает
         курсор до того, как последняя буква успела доехать наверх, ставим
         .btn-leaving — это обнуляет transition-delay, и весь набор букв
         едет обратно единым фронтом, а не по очереди. */
      var charCount = text.length;
      var waveDuration = 550 + charCount * 70; // держим в синхроне со CSS (550ms база + 70ms/буква)
      var hoverStartedAt = 0;

      btn.addEventListener('mouseenter', function () {
        btn.classList.remove('btn-leaving');
        hoverStartedAt = performance.now();
      });

      btn.addEventListener('mouseleave', function () {
        var elapsed = performance.now() - hoverStartedAt;
        if (elapsed < waveDuration) {
          btn.classList.add('btn-leaving');
          clearTimeout(btn._leavingTimer);
          btn._leavingTimer = setTimeout(function () {
            btn.classList.remove('btn-leaving');
          }, 600);
        } else {
          btn.classList.remove('btn-leaving');
        }
      });
    });
  }

  /* ============ ФОН НА МОБИЛЬНОМ: лёгкое переливание, привязанное к скроллу ============
     Один CSS var --scroll-p (0..1), обновляется в rAF внутри общего onScroll —
     ноль дополнительных слушателей, ноль layout thrashing, только transform/opacity. */
  var isCoarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var setScrollVar = null;
  if (isCoarse && !reduceMotion) {
    var docEl = document.documentElement;
    setScrollVar = function (pct) {
      docEl.style.setProperty('--scroll-p', pct.toFixed(4));
    };
  }

  /* ============ КУРСОРНЫЙ СВЕТ (desktop) ============
     Мягкое размытое пятно следует за курсором с небольшой задержкой —
     та же lerp-логика, что у параллакса лого на главной (плавный "разгон/
     торможение" вместо жёсткого прилипания к позиции курсора).
     Один слой, двигается только через translate3d + CSS-переменные —
     ноль layout, ноль лишних repaint, дешёвый одиночный rAF-цикл. */
  if (canHover && !reduceMotion) {
    var glow = document.createElement('div');
    glow.className = 'bg-cursor-glow';
    var bgLayer = document.querySelector('.bg-layer');
    if (bgLayer) {
      bgLayer.appendChild(glow);

      var gx = window.innerWidth / 2, gy = window.innerHeight / 2;
      var tx = gx, ty = gy;
      var glowRaf = null;

      function glowLoop() {
        gx += (tx - gx) * 0.06;
        gy += (ty - gy) * 0.06;
        glow.style.setProperty('--cx', gx.toFixed(1) + 'px');
        glow.style.setProperty('--cy', gy.toFixed(1) + 'px');

        if (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) {
          glowRaf = requestAnimationFrame(glowLoop);
        } else {
          glowRaf = null;
        }
      }

      window.addEventListener('pointermove', function (e) {
        tx = e.clientX; ty = e.clientY;
        glow.classList.add('is-active');
        if (!glowRaf) glowRaf = requestAnimationFrame(glowLoop);
      }, { passive: true });

      window.addEventListener('pointerleave', function () {
        glow.classList.remove('is-active');
      });
    }
  }

  /* ============ RIPPLE ============ */
  document.querySelectorAll('[data-ripple]').forEach(function (el) {
    el.addEventListener('pointerdown', function (e) {
      var rect = el.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var x = e.clientX - rect.left - size / 2;
      var y = e.clientY - rect.top - size / 2;

      var ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';

      el.appendChild(ripple);
      ripple.addEventListener('animationend', function () { ripple.remove(); });
    }, { passive: true });
  });

  /* ============ SCROLL PROGRESS + HEADER ============ */
  var progress = document.getElementById('scrollProgress');
  var header = document.getElementById('siteHeader');
  var rafPending = false;
  var lastPct = -1;
  var lastScrolled = null;

  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? scrollTop / docHeight : 0;

      if (progress && Math.abs(pct - lastPct) > 0.001) {
        progress.style.transform = 'scaleX(' + pct + ')';
        lastPct = pct;
      }

      var scrolled = scrollTop > 12;
      if (header && scrolled !== lastScrolled) {
        header.classList.toggle('is-scrolled', scrolled);
        lastScrolled = scrolled;
      }

      if (setScrollVar) setScrollVar(pct);

      rafPending = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ============ REVEAL ON SCROLL ============ */
  var revealTargets = document.querySelectorAll('.reveal, [data-stagger]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: isHome ? 0.15 : 0.12, rootMargin: '0px 0px -60px 0px' });

    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ============ DRAWER ============ */
  var drawer = document.getElementById('drawer');
  var backdrop = document.getElementById('drawerBackdrop');
  var menuBtn = document.getElementById('menuBtn');
  var closeBtn = document.getElementById('drawerClose');

  function openDrawer() {
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('is-locked');
    drawer.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    setTimeout(function () { closeBtn.focus(); }, 120);
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    drawer.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.focus();
  }

  if (menuBtn && drawer && backdrop && closeBtn) {
    menuBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    /* Пункт текущей страницы: не перезагружаем страницу, а просто закрываем меню */
    drawer.querySelectorAll(isHome ? '.drawer-item.is-active, .drawer-brand' : '.drawer-item.is-active').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        closeDrawer();
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
  }
})();
