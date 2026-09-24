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

      /* ============ СОСТОЯНИЕ ВОЛНЫ — полностью через JS, без CSS :hover ============
         .btn-hovering запускает волну вверх по буквам (вместо :hover — так
         момент старта полностью в руках JS, а не браузерного :hover, который
         снимается синхронно с mouseleave и мог стартовать новый transition
         ПОВЕРХ ещё не долетевшего предыдущего при быстром повторном наведении,
         из-за чего буквы оказывались в разных фазах и визуально дёргались
         все разом. .btn-leaving — обнуляет transition-delay при преждевременном
         уходе курсора, буквы едут назад единым фронтом. */
      var charCount = text.length;
      var waveDuration = 320 + charCount * 38; // держим в синхроне со CSS (320ms база + 38ms/буква)
      var hoverStartedAt = 0;
      var pendingEnter = false;

      function startWave() {
        pendingEnter = false;
        clearTimeout(btn._leavingTimer);
        btn.classList.remove('btn-leaving');
        /* Двойной rAF — гарантирует, что браузер закоммитил кадр БЕЗ
           .btn-leaving и БЕЗ .btn-hovering (т.е. полностью "нулевое"
           состояние) прежде чем мы включим волну. Одного reflow бывает
           недостаточно: браузер может склеить снятие класса и следующий
           transform в один кадр композитинга. Два rAF ждут кадр отрисовки
           дважды — так предыдущий transition гарантированно "остывает". */
      btn.classList.remove('btn-hovering');
        void btn.offsetWidth;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            if (!btn.matches(':hover')) return; // курсор уже ушёл, пока ждали кадры
            btn.classList.add('btn-hovering');
            hoverStartedAt = performance.now();
          });
        });
      }

      btn.addEventListener('mouseenter', function () {
        if (pendingEnter) return;
        pendingEnter = true;
        startWave();
      });

      btn.addEventListener('mouseleave', function () {
        pendingEnter = false;
        btn.classList.remove('btn-hovering');
        var elapsed = performance.now() - hoverStartedAt;
        clearTimeout(btn._leavingTimer);
        if (elapsed < waveDuration) {
          btn.classList.add('btn-leaving');
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

  /* ============ ПЕРЕЛИВАНИЕ ФОНА ОТ ДВИЖЕНИЯ КУРСОРА (desktop) ============
     Без пятен света. Управляем ДВУМЯ CSS-переменными, читаемыми только
     в rAF-цикле ниже (не через animation-duration!):
       --shimmer-x / --shimmer-y — сглаженное, с задержкой направление
       (единичный вектор, куда "клонится" переливание — пропорционально
       направлению курсора, а не случайно), --shimmer-amt — интенсивность.
     Раньше было два источника рывков: 1) targetSpeed считался как
     нарастающий максимум (Math.max), а не текущая скорость — отсюда
     несглаженные скачки; 2) --shimmer-speed крутил animation-duration уже
     идущей keyframe-анимации, а смена duration на лету пересчитывает фазу
     анимации и даёт визуальный "прыжок". Теперь никакой смены duration:
     сдвиг фона — это единственный непрерывный translate3d, целиком через
     lerp, с задержкой отклика (lag) и медленным плавным затуханием. */
  if (canHover && !reduceMotion) {
    var bgLayerEl = document.querySelector('.bg-layer');
    if (bgLayerEl) {
      var docElShimmer = document.documentElement;
      var lastPX = null, lastPY = null, lastPT = null;
      /* Сырой вектор скорости курсора, сглаженный экспоненциально (EMA) —
         не максимум, а именно текущее значение, поэтому реагирует плавно
         в обе стороны (и на разгон, и на замедление). */
      var velX = 0, velY = 0;
      /* Векторы, которые реально идут в CSS — со своим, более медленным
         lerp поверх velX/velY. Это и есть "задержка от курсора": фон
         догоняет направление курсора с ощутимым лагом, а не дёргается
         вслед за каждым движением. */
      var driftX = 0, driftY = 0, driftAmt = 0;
      var shimmerRaf = null;

      /* Сырой мгновенный вектор из последнего pointermove-события — сам по
         себе шумный (события идут не строго по кадрам), поэтому НЕ пишется
         в vel* напрямую, а лишь служит целью, к которой vel* плавно едет
         в rAF-цикле ниже. Так убирается дребезг на входе, до того как
         вектор вообще попадёт в задержанный drift*. */
      var rawX = 0, rawY = 0;

      function shimmerLoop() {
        /* 1) vel* — быстро, но плавно (EMA) следует за сырым вектором;
              между событиями rawX/Y сами по себе не затухают, поэтому
              здесь же плавно тянем их к нулю, если новых событий нет. */
        rawX *= 0.94; rawY *= 0.94;
        velX += (rawX - velX) * 0.18;
        velY += (rawY - velY) * 0.18;

        var targetAmt = Math.min(Math.hypot(velX, velY) / 1.8, 1);
        /* 2) drift* — САМА задержка: медленно, с заметным лагом догоняет
              vel*. Маленький коэффициент = дольше едет и дольше тормозит,
              то есть переливание всегда плавное и никогда резкое. */
        driftX += (velX - driftX) * 0.012;
        driftY += (velY - driftY) * 0.012;
        driftAmt += (targetAmt - driftAmt) * 0.01;

        docElShimmer.style.setProperty('--shimmer-x', driftX.toFixed(4));
        docElShimmer.style.setProperty('--shimmer-y', driftY.toFixed(4));
        docElShimmer.style.setProperty('--shimmer-amt', driftAmt.toFixed(4));

        if (Math.abs(rawX) > 0.0005 || Math.abs(rawY) > 0.0005 ||
            Math.abs(velX) > 0.0005 || Math.abs(velY) > 0.0005 ||
            Math.abs(driftX) > 0.0005 || Math.abs(driftY) > 0.0005 ||
            driftAmt > 0.0005) {
          shimmerRaf = requestAnimationFrame(shimmerLoop);
        } else {
          rawX = 0; rawY = 0; velX = 0; velY = 0;
          driftX = 0; driftY = 0; driftAmt = 0;
          docElShimmer.style.setProperty('--shimmer-x', '0');
          docElShimmer.style.setProperty('--shimmer-y', '0');
          docElShimmer.style.setProperty('--shimmer-amt', '0');
          shimmerRaf = null;
        }
      }

      window.addEventListener('pointermove', function (e) {
        var now = performance.now();
        if (lastPT !== null) {
          var dt = now - lastPT;
          if (dt > 0 && dt < 200) { // отсекаем аномальные скачки dt (напр. после паузы вкладки)
            /* Направление (единичный вектор) * величина скорости — так
               переливание клонится именно туда, куда движется курсор,
               а не абстрактно "быстрее/медленнее". Пишем только в raw* —
               сглаживание происходит целиком в rAF-цикле выше. */
            var dx = e.clientX - lastPX, dy = e.clientY - lastPY;
            var dist = Math.hypot(dx, dy);
            if (dist > 0.5) {
              var v = Math.min(dist / dt, 3); // px/ms, с потолком
              rawX = (dx / dist) * v;
              rawY = (dy / dist) * v;
            }
          }
        }
        lastPX = e.clientX; lastPY = e.clientY; lastPT = now;
        if (!shimmerRaf) shimmerRaf = requestAnimationFrame(shimmerLoop);
      }, { passive: true });
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
