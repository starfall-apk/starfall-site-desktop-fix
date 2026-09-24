/* =========================================================================
   home.js — поведение, которое есть ТОЛЬКО на главной странице:
   счётчики в блоке Kulsh, параллакс логотипа и очистка will-change.
   Общее поведение (меню, прогресс, reveal, ripple) живёт в shared.js.
   ========================================================================= */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ============ СЧЁТЧИКИ ============ */
  const statsRoot = document.getElementById('kulshStats');
  if (statsRoot && 'IntersectionObserver' in window && !reduceMotion) {
    const counters = Array.prototype.slice.call(statsRoot.querySelectorAll('[data-count]'));
    const statIO = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;

      const dur = 1200;
      const start = performance.now();
      const data = counters.map(function (el) {
        return {
          el: el,
          target: parseFloat(el.dataset.count) || 0,
          suffix: el.dataset.suffix || ''
        };
      });

      function tick(now) {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        for (let i = 0; i < data.length; i++) {
          const d = data[i];
          d.el.textContent = Math.round(d.target * eased) + d.suffix;
        }
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      statIO.disconnect();
    }, { threshold: 0.4 });

    statIO.observe(statsRoot);
  } else if (statsRoot) {
    statsRoot.querySelectorAll('[data-count]').forEach(function (el) {
      el.textContent = el.dataset.count + (el.dataset.suffix || '');
    });
  }

  /* ============ ПАРАЛЛАКС ЛОГОТИПА ============ */
  const logoWrap = document.getElementById('heroLogoWrap');
  if (logoWrap && canHover && !reduceMotion) {
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;
    let targetTX = 0, targetTY = 0;
    let curTX = 0, curTY = 0;
    let rafId = null;

    logoWrap.style.willChange = 'transform';

    function loop() {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      curTX += (targetTX - curTX) * 0.06;
      curTY += (targetTY - curTY) * 0.06;
      logoWrap.style.transform =
        'translate3d(' + curTX.toFixed(2) + 'px, ' + curTY.toFixed(2) + 'px, 0) ' +
        'rotateY(' + curX.toFixed(2) + 'deg) rotateX(' + (-curY).toFixed(2) + 'deg)';

      if (Math.abs(targetX - curX) > 0.01 || Math.abs(targetY - curY) > 0.01 ||
          Math.abs(targetTX - curTX) > 0.05 || Math.abs(targetTY - curTY) > 0.05) {
        rafId = requestAnimationFrame(loop);
      } else {
        rafId = null;
        logoWrap.style.willChange = 'auto';
      }
    }

    window.addEventListener('mousemove', function (e) {
      logoWrap.style.willChange = 'transform';
      const rect = logoWrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      /* Основной эффект — движение логотипа по X/Y вслед за курсором.
         Поворот (rotateX/Y) оставлен лишь лёгким вторичным штрихом поверх
         сдвига, а не доминирующим эффектом. */
      targetTX = Math.max(-1, Math.min(1, dx)) * 22;
      targetTY = Math.max(-1, Math.min(1, dy)) * 22;
      targetX = Math.max(-1, Math.min(1, dx)) * 3;
      targetY = Math.max(-1, Math.min(1, dy)) * 3;
      if (!rafId) rafId = requestAnimationFrame(loop);
    }, { passive: true });

    window.addEventListener('mouseleave', function () {
      targetX = 0; targetY = 0;
      targetTX = 0; targetTY = 0;
      if (!rafId) rafId = requestAnimationFrame(loop);
    });
  }

  /* ============ ОЧИСТКА will-change ПОСЛЕ ВХОДА HERO ============ */
  document.querySelectorAll('.hero-content > *').forEach(function (el) {
    el.addEventListener('animationend', function () {
      el.style.willChange = 'auto';
    }, { once: true });
  });
})();
