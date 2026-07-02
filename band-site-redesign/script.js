// Placeholder data — replace with real gigs/products, or wire up to Shopify
// (collection.products / a gigs metafield) once this is ported into a theme.

const GIGS = [
  {
    month: 'AUG',
    day: '14',
    title: 'Riverside Music Festival',
    venue: 'Kilkenny, Ireland',
    time: '8:00 PM · Main Stage',
    link: '#',
  },
  {
    month: 'AUG',
    day: '29',
    title: "O'Malley's Late Set",
    venue: 'Galway, Ireland',
    time: '10:00 PM · Free Entry',
    link: '#',
  },
  {
    month: 'SEP',
    day: '12',
    title: 'Harvest Street Parade',
    venue: 'Cork, Ireland',
    time: '2:00 PM · All Ages',
    link: '#',
  },
  {
    month: 'OCT',
    day: '03',
    title: 'Private Wedding (Booked)',
    venue: 'Wicklow, Ireland',
    time: 'Private Event',
    link: '#',
  },
];

const PRODUCTS = [
  { name: 'Blastabrass Logo Tee', price: '€28.00', image: 'T-shirt photo' },
  { name: 'Brass Section Hoodie', price: '€48.00', image: 'Hoodie photo' },
  { name: 'Snapback Cap', price: '€22.00', image: 'Cap photo' },
  { name: 'Live at the Docks — Vinyl', price: '€30.00', image: 'Vinyl photo' },
  { name: 'Tote Bag', price: '€16.00', image: 'Tote photo' },
  { name: 'Enamel Pin Set', price: '€12.00', image: 'Pins photo' },
];

function renderGigs() {
  const list = document.getElementById('gigList');
  if (!list) return;
  list.innerHTML = GIGS.map((gig) => `
    <li class="gig-item">
      <div class="gig-date">${gig.month}<span class="day">${gig.day}</span></div>
      <div class="gig-info">
        <h3>${gig.title}</h3>
        <p>${gig.venue} &middot; ${gig.time}</p>
      </div>
      <a class="btn btn-ghost" href="${gig.link}">Details</a>
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
        <button type="button" class="btn btn-primary" disabled>Add to Cart</button>
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
  renderGigs();
  renderProducts();
  setupNavToggle();
  setupContactForm();
  setupScrollReveal();
  setYear();
});
