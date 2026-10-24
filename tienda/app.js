const API_URL = "https://catalogo-worker.carpincho.workers.dev/";
const STORAGE_KEY = "bangboo-cart";

const photos = {
  F001: "photo-1505740420928-5e560c06d30e",
  F002: "photo-1523275335684-37898b6baf30",
  F003: "photo-1608043152269-423dbba4e7e1",
  F004: "photo-1587829741301-dc798b83add3",
  F005: "photo-1527864550417-7fd91fc51a46",
  F006: "photo-1553062407-98eeb64c6a62",
  F007: "photo-1507473885765-e6ed057f782c",
  F008: "photo-1556911220-e15b29be8c8f",
  F009: "photo-1497366754035-f200968a6e72",
  F010: "photo-1602143407151-7111542de6e8",
  F011: "photo-1542291026-7eec264c27ff",
  F012: "photo-1521572163474-6864f9cf17ab",
  F013: "photo-1563861826100-9cb868fdbe1c",
  F014: "photo-1631049307264-da0ec9d70304",
  F015: "photo-1570222094114-d054a817e56b",
  F016: "photo-1570222094114-d054a817e56b",
  F017: "photo-1558618666-fcd25c85cd64",
  F018: "photo-1558618666-fcd25c85cd64",
  F019: "photo-1505693416388-ac5ce068fe85",
  F020: "photo-1527443224154-c4a3942d3acf",
  F021: "photo-1556911220-e15b29be8c8f",
  F022: "photo-1485965120184-e220f721d03e",
  F023: "photo-1505740420928-5e560c06d30e",
  F024: "photo-1617806118233-18e1de247200",
  F025: "photo-1558317374-067fb5f30001",
};

const palette = [
  "#e6e5d9",
  "#e7ddd2",
  "#e2e6df",
  "#e6e0d2",
];

const elements = {
  grid: document.querySelector("#product-grid"),
  status: document.querySelector("#catalog-status"),
  categories: document.querySelector("#category-list"),
  search: document.querySelector("#search-input"),
  sort: document.querySelector("#sort-select"),
  cartCount: document.querySelector("#cart-count"),
  drawerCount: document.querySelector("#drawer-count"),
  drawer: document.querySelector("#cart-drawer"),
  backdrop: document.querySelector("#drawer-backdrop"),
  cartItems: document.querySelector("#cart-items"),
  cartEmpty: document.querySelector("#cart-empty"),
  cartFooter: document.querySelector("#cart-footer"),
  subtotal: document.querySelector("#cart-subtotal"),
  toast: document.querySelector("#toast"),
};

let products = [];
let selectedCategory = "Todas";
let cart = loadCart();
let toastTimer;

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    );
  } catch (error) {
    console.warn("No se pudo leer el carrito guardado.", error);
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    showToast("No se pudo guardar el carrito en este dispositivo.");
    console.error("No se pudo guardar el carrito.", error);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function formatPrice(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
    : "Consultar";
}

function productImage(product) {
  const photo = photos[product.id];
  if (!photo) return "";
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=700&q=80`;
}

function renderCategories() {
  const categories = [
    "Todas",
    ...new Set(
      products
        .map((product) => String(product.categoria || "").trim())
        .filter(Boolean),
    ),
  ];

  elements.categories.innerHTML = categories
    .map((category) => {
      const label = category === "Todas" ? "Todo" : category;
      return `<button class="category-chip${selectedCategory === category ? " is-active" : ""}" type="button" data-category="${escapeHTML(category)}" aria-pressed="${selectedCategory === category}">${escapeHTML(label)}</button>`;
    })
    .join("");
}

function getVisibleProducts() {
  const query = elements.search.value.trim().toLocaleLowerCase("es");
  const visible = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "Todas" || product.categoria === selectedCategory;
    const searchable = [
      product.nombre_del_producto,
      product.descripcion_corta,
      product.marca,
      product.categoria,
    ]
      .join(" ")
      .toLocaleLowerCase("es");
    return matchesCategory && searchable.includes(query);
  });

  switch (elements.sort.value) {
    case "price-low":
      visible.sort((a, b) => Number(a.precio_usd) - Number(b.precio_usd));
      break;
    case "price-high":
      visible.sort((a, b) => Number(b.precio_usd) - Number(a.precio_usd));
      break;
    case "name":
      visible.sort((a, b) =>
        String(a.nombre_del_producto).localeCompare(
          String(b.nombre_del_producto),
          "es",
        ),
      );
      break;
  }

  return visible;
}

function renderProducts() {
  const visible = getVisibleProducts();
  elements.status.textContent = `${visible.length} ${visible.length === 1 ? "hallazgo" : "hallazgos"} para ti`;

  if (visible.length === 0) {
    elements.grid.innerHTML = `<div class="empty-results"><strong>No encontramos eso por aquí.</strong>Prueba otra búsqueda o una categoría diferente.</div>`;
    return;
  }

  elements.grid.innerHTML = visible
    .map((product, index) => {
      const stock = Number(product.stock);
      const unavailable = Number.isFinite(stock) && stock <= 0;
      const stockLabel = unavailable ? "Agotado" : product.categoria || "Selección";
      return `<article class="product-card">
        <div class="product-visual" style="--visual-bg:${palette[index % palette.length]}">
          ${
            productImage(product, index)
              ? `<img src="${productImage(product, index)}" alt="${escapeHTML(product.nombre_del_producto)}" loading="lazy" />`
              : `<div class="product-placeholder" aria-hidden="true"><span>${escapeHTML(product.categoria || "Bangboo")}</span></div>`
          }
          <span class="product-tag">${escapeHTML(stockLabel)}</span>
          <button class="add-to-cart" type="button" data-add="${escapeHTML(product.id)}" aria-label="Agregar ${escapeHTML(product.nombre_del_producto)} al carrito"${unavailable ? " disabled" : ""}>${unavailable ? "–" : "+"}</button>
        </div>
        <div class="product-info">
          <div class="product-category">${escapeHTML(product.categoria || "Selección")}</div>
          <h3 class="product-name">${escapeHTML(product.nombre_del_producto || "Producto")}</h3>
          <p class="product-description">${escapeHTML(product.descripcion_corta || product.descripcion_larga || "")}</p>
          <div class="product-bottom">
            <span class="product-price">${formatPrice(product.precio_usd)}</span>
            <span class="product-brand">${escapeHTML(product.marca || "")}</span>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

function renderCart() {
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.id);
    return sum + (product ? Number(product.precio_usd) * item.quantity : 0);
  }, 0);

  elements.cartCount.textContent = quantity;
  elements.drawerCount.textContent = `(${quantity})`;
  elements.cartEmpty.hidden = quantity > 0;
  elements.cartFooter.hidden = quantity === 0;
  elements.cartItems.innerHTML = cart
    .map((item) => {
      const product = products.find((entry) => entry.id === item.id);
      if (!product) return "";
      const photo = productImage(product);
      return `<article class="cart-line">
        ${
          photo
            ? `<img src="${photo}" alt="" />`
            : `<div class="cart-line-image" aria-hidden="true"></div>`
        }
        <div>
          <h3>${escapeHTML(product.nombre_del_producto)}</h3>
          <p>${formatPrice(product.precio_usd)}</p>
          <div class="quantity-control" aria-label="Cantidad de ${escapeHTML(product.nombre_del_producto)}">
            <button type="button" data-quantity="${escapeHTML(product.id)}" data-change="-1" aria-label="Quitar una unidad">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-quantity="${escapeHTML(product.id)}" data-change="1" aria-label="Agregar una unidad">+</button>
          </div>
        </div>
        <span class="cart-line-price">${formatPrice(Number(product.precio_usd) * item.quantity)}</span>
      </article>`;
    })
    .join("");

  elements.subtotal.textContent = formatPrice(total);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => elements.toast.classList.remove("is-visible"),
    3200,
  );
}

function setCartOpen(isOpen) {
  elements.drawer.classList.toggle("is-open", isOpen);
  elements.drawer.setAttribute("aria-hidden", String(!isOpen));
  elements.drawer.inert = !isOpen;
  elements.backdrop.hidden = !isOpen;
  document.body.classList.toggle("drawer-open", isOpen);
  if (isOpen) document.querySelector("#close-cart").focus();
}

function addToCart(id) {
  const product = products.find((entry) => entry.id === id);
  if (!product) return;
  const item = cart.find((entry) => entry.id === id);
  const stock = Number(product.stock);
  if (Number.isFinite(stock) && (item?.quantity || 0) >= stock) {
    showToast("Ya agregaste todas las unidades disponibles.");
    return;
  }
  if (item) item.quantity += 1;
  else cart.push({ id, quantity: 1 });
  saveCart();
  renderCart();
  showToast(`${product.nombre_del_producto} se agregó a tu carrito.`);
}

elements.grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (button && !button.disabled) addToCart(button.dataset.add);
});

elements.grid.addEventListener(
  "error",
  (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const placeholder = document.createElement("div");
    placeholder.className = "product-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = image.alt;
    placeholder.append(label);
    image.replaceWith(placeholder);
  },
  true,
);

elements.categories.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  selectedCategory = button.dataset.category;
  renderCategories();
  renderProducts();
});

elements.cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-quantity]");
  if (!button) return;
  const item = cart.find((entry) => entry.id === button.dataset.quantity);
  if (!item) return;
  const change = Number(button.dataset.change);
  const product = products.find((entry) => entry.id === item.id);
  const stock = Number(product?.stock);
  if (change > 0 && Number.isFinite(stock) && item.quantity >= stock) {
    showToast("Ya agregaste todas las unidades disponibles.");
    return;
  }
  item.quantity += change;
  if (item.quantity <= 0) cart = cart.filter((entry) => entry !== item);
  saveCart();
  renderCart();
});

document.querySelector("#open-cart").addEventListener("click", () => setCartOpen(true));
document.querySelector("#close-cart").addEventListener("click", () => setCartOpen(false));
document.querySelector("#continue-shopping").addEventListener("click", () => setCartOpen(false));
elements.backdrop.addEventListener("click", () => setCartOpen(false));
elements.search.addEventListener("input", renderProducts);
elements.sort.addEventListener("change", renderProducts);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.drawer.classList.contains("is-open")) {
    setCartOpen(false);
    document.querySelector("#open-cart").focus();
  }
});

document.querySelector("#checkout-button").addEventListener("click", async () => {
  const lines = cart
    .map((item) => {
      const product = products.find((entry) => entry.id === item.id);
      return product
        ? `${item.quantity} × ${product.nombre_del_producto} — ${formatPrice(Number(product.precio_usd) * item.quantity)}`
        : "";
    })
    .filter(Boolean);
  const total = cart.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.id);
    return sum + (product ? Number(product.precio_usd) * item.quantity : 0);
  }, 0);
  const order = `Pedido Bangboo\n${lines.join("\n")}\nTotal: ${formatPrice(total)}`;

  try {
    await navigator.clipboard.writeText(order);
    showToast("Pedido copiado. Compártelo con la tienda para coordinar el pago y el envío.");
  } catch (error) {
    console.error("No se pudo copiar el pedido.", error);
    showToast("No se pudo copiar el pedido. Intenta de nuevo desde un navegador seguro.");
  }
});

async function loadProducts() {
  elements.status.textContent = "Cargando productos…";
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`El catálogo respondió con el estado ${response.status}.`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("La respuesta del catálogo no tiene el formato esperado.");
    }

    products = data.filter(
      (product) =>
        product &&
        product.id &&
        product.nombre_del_producto &&
        product.estado?.toLocaleLowerCase("es") !== "inactivo",
    );
    cart = cart.filter((item) => products.some((product) => product.id === item.id));
    renderCategories();
    renderProducts();
    renderCart();
    saveCart();
  } catch (error) {
    console.error("No se pudo cargar el catálogo.", error);
    elements.status.textContent =
      "No pudimos cargar los productos. Revisa tu conexión e inténtalo de nuevo.";
    elements.grid.innerHTML = "";
  }
}

setCartOpen(false);
renderCart();
loadProducts();
