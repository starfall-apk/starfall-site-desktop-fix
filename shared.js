(function () {
  'use strict';

  /* Подставляем редактируемый контент из localStorage (или дефолт) */
  if (window.StarfallContent) {
    var content = window.StarfallContent.load();
    window.StarfallContent.applyToDOM(content);
    window.__starfallContent = content;
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

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
    drawer.querySelectorAll('.drawer-item.is-active').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        closeDrawer();
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
  }
})();
