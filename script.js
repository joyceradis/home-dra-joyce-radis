(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    setupHeaderScroll();
    setupNavigationState();
    setupButtonGlow();
    setupReveals();
    setupTilt();
    setupHeroMotion();
  });

  function setupHeaderScroll() {
    var header = document.querySelector('.header');
    if (!header) return;
    function updateHeader() {
      if (window.scrollY > 10) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    }
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  function setupNavigationState() {
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
    if (!navLinks.length) return;
    var path = window.location.pathname;
    navLinks.forEach(function (link) {
      link.classList.remove('is-active');
      var href = link.getAttribute('href') || '';
      if (
        (path.indexOf('pacientes') > -1 && href.indexOf('pacientes') > -1) ||
        (path.indexOf('advogados') > -1 && href.indexOf('advogados') > -1)
      ) {
        link.classList.add('is-active');
      }
    });
  }

  function setupButtonGlow() {
    document.querySelectorAll('.btn').forEach(function (button) {
      button.addEventListener('pointermove', function (event) {
        var rect = button.getBoundingClientRect();
        var x = ((event.clientX - rect.left) / rect.width) * 100;
        var y = ((event.clientY - rect.top) / rect.height) * 100;
        button.style.setProperty('--pointer-x', x + '%');
        button.style.setProperty('--pointer-y', y + '%');
      });
    });
  }

  function setupReveals() {
    if (!('IntersectionObserver' in window)) return;
    var targets = document.querySelectorAll(
      '.hero-copy > *, .visual-card, .path-card, .editorial-box, .editorial-copy > *, ' +
      '.cta-panel, .footer-box, .page-panel, .side-panel, .info-card, .highlight-card, ' +
      '.step-card, .contact-card, .page-footer-card, .thankyou-card, ' +
      '.home-minimal-copy > *, .home-signature-panel, .refined-portal-card'
    );
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -10% 0px' });

    Array.prototype.forEach.call(targets, function (element, index) {
      element.classList.add('reveal');
      element.style.setProperty('--reveal-delay', ((index % 6) * 70) + 'ms');
      observer.observe(element);
    });
  }

  function setupTilt() {
    if (!window.matchMedia || window.matchMedia('(pointer: coarse)').matches) return;
    var cards = document.querySelectorAll(
      '.visual-card, .path-card, .cta-panel, .page-panel, .side-panel, ' +
      '.info-card, .highlight-card, .step-card, .contact-card, ' +
      '.page-footer-card, .thankyou-card, .refined-portal-card, .home-signature-panel'
    );
    Array.prototype.forEach.call(cards, function (card) {
      card.classList.add('tilt-ready');
      card.addEventListener('pointermove', function (event) {
        var rect = card.getBoundingClientRect();
        var px = (event.clientX - rect.left) / rect.width;
        var py = (event.clientY - rect.top) / rect.height;
        var rotateY = (px - 0.5) * 8;
        var rotateX = (0.5 - py) * 8;
        card.style.transform = 'translateY(-10px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg)';
      });
      card.addEventListener('pointerleave', function () {
        card.style.transform = '';
      });
    });
  }

  function setupHeroMotion() {
    if (!window.matchMedia || window.matchMedia('(pointer: coarse)').matches) return;
    var heroVisual = document.querySelector('.hero-visual');
    var visualCard = document.querySelector('.visual-card');
    if (!heroVisual) return;
    heroVisual.addEventListener('pointermove', function (event) {
      var rect = heroVisual.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      heroVisual.style.transform = 'perspective(1200px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 5).toFixed(2) + 'deg) translateY(-2px)';
      if (visualCard) visualCard.style.transform = 'translate3d(' + (x * 10).toFixed(2) + 'px, ' + (y * 10).toFixed(2) + 'px, 24px)';
    });
    heroVisual.addEventListener('pointerleave', function () {
      heroVisual.style.transform = '';
      if (visualCard) visualCard.style.transform = '';
    });
  }

})();