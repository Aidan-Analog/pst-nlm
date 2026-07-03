// Placeholder data — replace with real gigs/products, or wire up to Shopify
// (collection.products / a gigs metafield) once this is ported into a theme.

const GIGS = [
  {
    day: '14',
    month: 'jun',
    name: 'Summer Sessions',
    venue: 'Iveagh Gardens, Dublin',
    badge: 'tickets available',
    variant: '',
  },
  {
    day: '22',
    month: 'jul',
    name: 'Wilderness-on-the-Lee',
    venue: 'Fitzgerald Park, Cork',
    badge: 'sold out',
    variant: 'is-dark',
  },
  {
    day: '08',
    month: 'aug',
    name: 'Boomtown by the Bay',
    venue: 'Salthill Prom, Galway',
    badge: 'free entry',
    variant: 'is-brand',
  },
  {
    day: '03',
    month: 'oct',
    name: 'Private Wedding',
    venue: 'Wicklow, Ireland',
    badge: 'private event',
    variant: '',
  },
];

const GIG_FILTERS = ['all shows', 'dublin', 'cork', 'galway', 'private hire'];

const PRODUCTS = [
  { name: 'blasta brass. logo tee', price: '€28.00', image: 'T-shirt photo' },
  { name: 'brass carnage hoodie', price: '€48.00', image: 'Hoodie photo' },
  { name: 'circle b snapback', price: '€22.00', image: 'Cap photo' },
  { name: 'live carnage — vinyl', price: '€30.00', image: 'Vinyl photo' },
  { name: 'nice to smell ya. tote', price: '€16.00', image: 'Tote photo' },
  { name: 'enamel pin set', price: '€12.00', image: 'Pins photo' },
];

function renderGigFilters() {
  const wrap = document.getElementById('gigFilters');
  if (!wrap) return;
  wrap.innerHTML = GIG_FILTERS.map((label, i) => `
    <span class="chip${i === 0 ? ' chip-active' : ''}">${label}</span>
  `).join('');
}

function renderGigs() {
  const list = document.getElementById('gigList');
  if (!list) return;
  list.innerHTML = GIGS.map((gig) => `
    <li class="gig-card ${gig.variant}">
      <div class="gig-date">${gig.day}<span class="gig-month">${gig.month}</span></div>
      <div class="gig-info">
        <p class="gig-name">${gig.name}</p>
        <p class="gig-venue">${gig.venue}</p>
      </div>
      <span class="badge badge-pink">${gig.badge}</span>
      <a class="btn btn-outline-pink" href="#">details</a>
    </li>
  `).join('');
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  grid.innerHTML = PRODUCTS.map((product) => `
    <article class="product-card">
      <div class="product-image">${product.image}</div>
      <div class="product-body">
        <h3>${product.name}</h3>
        <p class="product-price">${product.price}</p>
        <button type="button" class="btn btn-primary" disabled>add to cart</button>
      </div>
    </article>
  `).join('');
}

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
  if (!wrap) return;
  wrap.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    wrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip-active'));
    chip.classList.add('chip-active');
  });
}

function setupContactForm() {
  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');
  if (!form || !note) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    note.textContent = 'This is a design mockup — the form is not wired to a backend yet.';
  });
}

function setupScrollReveal() {
  const targets = document.querySelectorAll('.reveal');
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

function setYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

document.addEventListener('DOMContentLoaded', () => {
  renderGigFilters();
  renderGigs();
  renderProducts();
  setupNavToggle();
  setupGigFilters();
  setupContactForm();
  setupScrollReveal();
  setYear();
});
