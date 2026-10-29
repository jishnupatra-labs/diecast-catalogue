/* My Miniature World - shared catalogue script.
 * Used by the 14 regular category pages (not bundles.html / mylist.html).
 * Each page sets, BEFORE loading this file:
 *   window.CATALOGUE_CONFIG = { seriesFilter: "<exact series name>" };
 * Must be loaded as a classic (non-module, non-deferred) script at the position
 * where the page's inline script used to be, so inline onclick handlers
 * (addToList, renderPage, openLightbox, closeLightbox) stay global.
 */
const SERIES_FILTER = (window.CATALOGUE_CONFIG || {}).seriesFilter;
  const PRODUCTS_URL  = "products.json";
  
  const STORAGE_KEY = "mylist_v1";
  const SESSION_KEY = "mylist_session_v1";

  function initSession() {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.setItem(SESSION_KEY, "active");
    }
  }

  function loadList() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function saveList(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  }

  let list = {};

  async function init() {
    initSession();
    list = loadList();
    try {
      const res = await fetch(PRODUCTS_URL, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const all = await res.json();
      const seen = {};
      const products = [];
      all.forEach(p => {
        if (p.series === SERIES_FILTER && !seen[p.code]) {
          seen[p.code] = true; products.push(p);
        }
      });
      document.getElementById("loading-state").classList.add("hidden");
      catalogueLoaded = true;
      document.getElementById("availability-filter").classList.remove("hidden");
      const grid = document.getElementById("grid");
      grid.classList.remove("hidden");
      allProducts = products;
      renderPage(1);
      return;
      grid.innerHTML = products.map(p => {
        const inList = !!list[p.code];
        const isSold = p.status === "SOLD";
      return `<div class="card">
          <div class="card-img-wrap">
            <img class="card-img" src="${p.image}" alt="" onclick="openLightbox(this.src)" style="cursor:zoom-in;"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
            <div class="card-img-fallback">🚗</div>
          </div>
          <div class="card-body">
            <div class="card-code-name"><span class="code">${p.code}</span> : ${esc(p.name)}</div>
            <div class="card-brand">${esc(p.brand)}</div>
            <div class="card-price">₹${p.price}</div>
            <button class="add-btn ${isSold ? 'sold-btn' : ''}" id="btn-${p.code}"
              data-code="${p.code}"
              data-name="${esc(p.name)}"
              onclick="addToList(this)"
              ${p.status === "SOLD" || inList ? "disabled" : ""}>
              ${p.status === "SOLD" ? "SOLD OUT" : inList ? "✅ Added to My Garage" : "+ Add to My Garage"}
            </button>
          </div>
        </div>`;
      }).join("");
    } catch(e) {
      document.getElementById("loading-state").classList.add("hidden");
      document.getElementById("error-state").classList.remove("hidden");
    }
  }

  function addToList(btn) {
    const code = btn.dataset.code;
    const name = btn.dataset.name;
    list = loadList();
    if (list[code]) { showToast("Already in your garage!"); return; }
    list[code] = true;
    saveList(list);
    btn.disabled = true;
    btn.textContent = "✅ Added to My Garage";
    showToast("✅ " + name + " added!");
  }

  function esc(str) {
    const d = document.createElement("div"); d.textContent = str; return d.innerHTML;
  }

  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2500);
  }

  init();

  function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox').style.display = 'flex';
  }
  function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
    document.getElementById('lightbox-img').src = '';
  }
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
  });

  // ── Pagination ──
  let allProducts = [];
  let currentPage = 1;

  function getRowsPerPage() {
    return 4;
  }

  function getColsPerRow() {
    return window.innerWidth <= 600 ? 2 : 4;
  }

  function getItemsPerPage() {
    return getRowsPerPage() * getColsPerRow();
  }

  function getTotalPages() {
    return Math.ceil(getVisibleProducts().length / getItemsPerPage());
  }

  function renderPage(page) {
    if (!catalogueLoaded) return;
    currentPage = page;
    const itemsPerPage = getItemsPerPage();
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const visibleProducts = getVisibleProducts();
    const pageProducts = visibleProducts.slice(start, end);
    const list = loadList();

    const grid = document.getElementById('grid');
    updateFilterUI();
    if (visibleProducts.length === 0) {
      grid.innerHTML = '';
      grid.classList.add('hidden');
      document.getElementById('empty-state').classList.remove('hidden');
      renderPagination();
      return;
    }
    document.getElementById('empty-state').classList.add('hidden');
    grid.classList.remove('hidden');
    grid.innerHTML = pageProducts.map(p => {
      const inList = !!list[p.code];
      const isSold = p.status === "SOLD";
      return `<div class="card">
        <div class="card-img-wrap">
          <img class="card-img" src="${p.image}" alt="" onclick="openLightbox(this.src)" style="cursor:zoom-in;"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
          <div class="card-img-fallback">🚗</div>
        </div>
        <div class="card-body">
          <div class="card-code-name"><span class="code">${p.code}</span> : ${esc(p.name)}</div>
          <div class="card-brand">${esc(p.brand)}</div>
          <div class="card-price">₹${p.price}</div>
          <button class="add-btn ${isSold ? 'sold-btn' : ''}" id="btn-${p.code}"
            data-code="${p.code}"
            data-name="${esc(p.name)}"
            onclick="addToList(this)"
            ${p.status === "SOLD" || inList ? "disabled" : ""}>
            ${p.status === "SOLD" ? "SOLD OUT" : inList ? "✅ Added to My Garage" : "+ Add to My Garage"}
          </button>
        </div>
      </div>`;
    }).join('');

    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderPagination() {
    const total = getTotalPages();
    const pag = document.getElementById('pagination');

    if (total <= 1) { pag.classList.add('hidden'); return; }
    pag.classList.remove('hidden');

    pag.innerHTML = `
      <button class="page-btn" onclick="renderPage(1)" ${currentPage === 1 ? 'disabled' : ''}>&lt;&lt; First</button>
      <button class="page-btn" onclick="renderPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&lt; Prev</button>
      <span class="page-info">${currentPage} of ${total}</span>
      <button class="page-btn" onclick="renderPage(${currentPage + 1})" ${currentPage === total ? 'disabled' : ''}>Next &gt;</button>
      <button class="page-btn" onclick="renderPage(${total})" ${currentPage === total ? 'disabled' : ''}>Last &gt;&gt;</button>
    `;
  }

  // ── Availability filter ──
  let activeFilter = 'all';
  let catalogueLoaded = false;

  function isSoldOut(p) { return p.status === "SOLD"; }

  function getVisibleProducts() {
    if (activeFilter === 'in-stock') return allProducts.filter(p => !isSoldOut(p));
    if (activeFilter === 'sold-out') return allProducts.filter(p => isSoldOut(p));
    return allProducts;
  }

  function updateFilterUI() {
    const sold = allProducts.filter(isSoldOut).length;
    const counts = { 'all': allProducts.length, 'in-stock': allProducts.length - sold, 'sold-out': sold };
    Object.keys(counts).forEach(k => {
      document.getElementById('count-' + k).textContent = counts[k];
    });
    document.querySelectorAll('.avail-opt').forEach(btn => {
      const on = btn.dataset.filter === activeFilter;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function setAvailabilityFilter(f) {
    activeFilter = f;
    renderPage(1);
  }

  document.querySelectorAll('.avail-opt').forEach(btn => {
    btn.addEventListener('click', () => setAvailabilityFilter(btn.dataset.filter));
  });

  window.addEventListener('resize', () => renderPage(currentPage));
