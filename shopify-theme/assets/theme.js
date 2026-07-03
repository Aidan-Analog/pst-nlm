// Blasta Brass theme — shared interactivity

function setupNavToggle() {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('siteNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function setupGigFilters() {
  const wrap = document.getElementById('gigFilters');
  const cards = document.querySelectorAll('[data-gig-card]');
  if (!wrap || !cards.length) return;

  wrap.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    wrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip-active'));
    chip.classList.add('chip-active');

    const filter = chip.dataset.filter;
    cards.forEach((card) => {
      const matches = filter === 'all' || card.dataset.gigCard === filter;
      card.style.display = matches ? '' : 'none';
    });
  });
}

function setupProductThumbs() {
  document.querySelectorAll('[data-product-thumbs]').forEach((wrap) => {
    const main = document.querySelector(wrap.dataset.mainTarget);
    if (!main) return;
    wrap.querySelectorAll('img').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        main.src = thumb.dataset.fullSrc || thumb.src;
        wrap.querySelectorAll('img').forEach((t) => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  });
}

function setupQuantitySteppers() {
  document.querySelectorAll('[data-qty-wrap]').forEach((wrap) => {
    const input = wrap.querySelector('input[type="number"]');
    if (!input) return;
    wrap.querySelectorAll('[data-qty-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.qtyStep, 10);
        const min = parseInt(input.min || '1', 10);
        const next = Math.max(min, (parseInt(input.value, 10) || min) + step);
        input.value = String(next);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  });
}

function setupScrollReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach((el) => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavToggle();
  setupGigFilters();
  setupProductThumbs();
  setupQuantitySteppers();
  setupScrollReveal();
});
