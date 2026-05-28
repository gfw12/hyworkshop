const STORE_KEYS = {
  products: "vpn_shop_products",
  messages: "vpn_shop_messages",
  orders: "vpn_shop_orders",
  analytics: "vpn_shop_analytics",
  paymentSettings: "vpn_shop_payment_settings",
  checkoutFields: "vpn_shop_checkout_fields",
  categories: "vpn_shop_categories",
  siteSettings: "vpn_shop_site_settings",
  adminPassword: "vpn_shop_admin_password",
  admin: "vpn_shop_admin_session",
  contentVersion: "vpn_shop_content_version",
};

const CONTENT_VERSION = "hy-digital-shop-2026-05-28";

const seedProducts = [
  {
    id: "hy-month-plan",
    name: "基础加速月卡",
    category: "加速套餐",
    price: "68",
    stock: 999,
    image: "",
    description: "适合短期体验和轻量使用，付款后联系客服开通。",
  },
  {
    id: "hy-season-plan",
    name: "稳定加速季卡",
    category: "加速套餐",
    price: "168",
    stock: 999,
    image: "",
    description: "适合长期使用，价格更划算，支持微信或支付宝付款。",
  },
  {
    id: "hy-year-plan",
    name: "尊享加速年卡",
    category: "加速套餐",
    price: "598",
    stock: 999,
    image: "",
    description: "一年有效，适合稳定长期使用，下单后客服协助配置。",
  },
];

const DEFAULT_PAYMENT_SETTINGS = {
  wechatQr: "./assets/wechat-qr.jpg",
  alipayQr: "./assets/alipay-qr.jpg",
  enableWechat: true,
  enableAlipay: true,
};

const DEFAULT_SITE_SETTINGS = {
  siteName: "HY 数字服务商城",
  siteSubtitle: "在线选择套餐、提交订单、扫码付款，客服会在付款后协助开通和配置。",
  heroEyebrow: "HY SERVICE",
  heroTitle: "加速套餐、付款下单和客服确认都在一个页面完成。",
  heroText: "选择合适套餐后提交订单，付款完成请联系右下角客服确认开通。",
  heroCountLabel: "可选套餐",
};

const DEFAULT_CHECKOUT_FIELDS = [
  { id: "buyerName", label: "姓名/称呼", placeholder: "请输入称呼", type: "text", required: true },
  { id: "buyerContact", label: "联系方式", placeholder: "微信号、手机号或邮箱", type: "text", required: true },
  { id: "buyerQuantity", label: "购买数量", placeholder: "", type: "number", required: true },
  { id: "buyerAddress", label: "收货信息", placeholder: "收货人、电话和地址", type: "textarea", required: true },
  { id: "buyerNote", label: "备注", placeholder: "颜色、尺寸、收货信息或其他要求", type: "textarea", required: false },
];

let checkoutProduct = null;
let latestPaymentOrder = null;

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  syncStoreToServer();
}

const SYNC_KEYS = [
  STORE_KEYS.products,
  STORE_KEYS.messages,
  STORE_KEYS.orders,
  STORE_KEYS.analytics,
  STORE_KEYS.paymentSettings,
  STORE_KEYS.checkoutFields,
  STORE_KEYS.categories,
  STORE_KEYS.siteSettings,
  STORE_KEYS.adminPassword,
  STORE_KEYS.contentVersion,
  "vpn_shop_customer_name",
];

let syncTimer = null;
let isHydratingStore = false;
let lastRenderedMessages = "";
let storePollTimer = null;

function collectLocalStore() {
  const store = {};
  for (const key of SYNC_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) store[key] = value;
  }
  return store;
}

function applyRemoteStore(store) {
  isHydratingStore = true;
  for (const [key, value] of Object.entries(store || {})) {
    if (typeof value === "string") localStorage.setItem(key, value);
  }
  isHydratingStore = false;
}

function syncStoreToServer() {
  if (isHydratingStore) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    pushStoreToServer();
  }, 150);
}

function pushStoreToServer() {
  return fetch("/api/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(collectLocalStore()),
  }).catch(() => {});
}

async function hydrateStoreFromServer() {
  try {
    const response = await fetch("/api/store", { cache: "no-store" });
    if (!response.ok) return;
    applyRemoteStore(await response.json());
  } catch {
    // Local file preview or older deployments can still use localStorage.
  }
}

async function refreshStoreFromServer() {
  try {
    const response = await fetch("/api/store", { cache: "no-store" });
    if (!response.ok) return false;
    applyRemoteStore(await response.json());
    return true;
  } catch {
    return false;
  }
}

function startRealtimeSync(renderCallback) {
  clearInterval(storePollTimer);
  storePollTimer = setInterval(async () => {
    const ok = await refreshStoreFromServer();
    if (ok) renderCallback();
  }, 2500);
}

function loadProducts() {
  const raw = localStorage.getItem(STORE_KEYS.products);
  if (!raw) {
    writeJSON(STORE_KEYS.products, seedProducts);
    return seedProducts;
  }
  return readJSON(STORE_KEYS.products, []);
}

function saveProducts(products) {
  writeJSON(STORE_KEYS.products, products);
}

function installCurrentDefaultContent() {
  writeJSON(STORE_KEYS.products, seedProducts);
  writeJSON(STORE_KEYS.siteSettings, DEFAULT_SITE_SETTINGS);
  writeJSON(STORE_KEYS.categories, ["加速套餐"]);
  writeJSON(STORE_KEYS.analytics, { siteViews: 0, productViews: {} });
  localStorage.setItem(STORE_KEYS.contentVersion, CONTENT_VERSION);
  syncStoreToServer();
}

function migrateDefaultContent() {
  if (localStorage.getItem(STORE_KEYS.contentVersion) === CONTENT_VERSION) return;
  installCurrentDefaultContent();
}

function loadMessages() {
  return readJSON(STORE_KEYS.messages, []);
}

function saveMessages(messages) {
  writeJSON(STORE_KEYS.messages, messages);
}

function loadOrders() {
  return readJSON(STORE_KEYS.orders, []);
}

function saveOrders(orders) {
  writeJSON(STORE_KEYS.orders, orders);
}

function getCurrentCustomerName() {
  const orders = loadOrders();
  const latestNamedOrder = orders.find((order) => order.buyerName);
  if (latestNamedOrder) return latestNamedOrder.buyerName;
  return localStorage.getItem("vpn_shop_customer_name") || "";
}

function saveCurrentCustomerName(name) {
  if (name) {
    localStorage.setItem("vpn_shop_customer_name", name);
    syncStoreToServer();
  }
}

function getAdminPassword() {
  return localStorage.getItem(STORE_KEYS.adminPassword) || "admin123";
}

function setAdminPassword(password) {
  localStorage.setItem(STORE_KEYS.adminPassword, password);
  syncStoreToServer();
}

function loadAnalytics() {
  return readJSON(STORE_KEYS.analytics, { siteViews: 0, productViews: {} });
}

function saveAnalytics(analytics) {
  writeJSON(STORE_KEYS.analytics, analytics);
}

function loadPaymentSettings() {
  const settings = readJSON(STORE_KEYS.paymentSettings, DEFAULT_PAYMENT_SETTINGS);
  const hasWechatQr = Object.prototype.hasOwnProperty.call(settings, "wechatQr");
  const hasAlipayQr = Object.prototype.hasOwnProperty.call(settings, "alipayQr");
  const savedWechatQr = hasWechatQr ? settings.wechatQr : DEFAULT_PAYMENT_SETTINGS.wechatQr;
  const savedAlipayQr = hasAlipayQr ? settings.alipayQr : DEFAULT_PAYMENT_SETTINGS.alipayQr;
  const wechatQr = savedWechatQr === "./assets/wechat-pay.jpg" ? DEFAULT_PAYMENT_SETTINGS.wechatQr : savedWechatQr;
  const alipayQr = savedAlipayQr === "./assets/alipay.jpg" ? DEFAULT_PAYMENT_SETTINGS.alipayQr : savedAlipayQr;
  const enableWechat = settings.enableWechat !== false;
  const enableAlipay = settings.enableAlipay !== false;
  return {
    wechatQr,
    alipayQr,
    enableWechat: enableWechat || !enableAlipay,
    enableAlipay: enableAlipay,
  };
}

function savePaymentSettings(settings) {
  writeJSON(STORE_KEYS.paymentSettings, settings);
}

function loadSiteSettings() {
  const settings = readJSON(STORE_KEYS.siteSettings, DEFAULT_SITE_SETTINGS);
  return {
    siteName: settings.siteName || DEFAULT_SITE_SETTINGS.siteName,
    siteSubtitle: settings.siteSubtitle || DEFAULT_SITE_SETTINGS.siteSubtitle,
    heroEyebrow: settings.heroEyebrow || DEFAULT_SITE_SETTINGS.heroEyebrow,
    heroTitle: settings.heroTitle || DEFAULT_SITE_SETTINGS.heroTitle,
    heroText: settings.heroText || DEFAULT_SITE_SETTINGS.heroText,
    heroCountLabel: settings.heroCountLabel || DEFAULT_SITE_SETTINGS.heroCountLabel,
  };
}

function saveSiteSettings(settings) {
  writeJSON(STORE_KEYS.siteSettings, settings);
}

function applySiteSettings() {
  const settings = loadSiteSettings();
  const isAdmin = Boolean(document.querySelector("#adminApp") || document.querySelector("#loginBox"));
  const headerTitle = document.querySelector(".site-header h1");
  const headerSub = document.querySelector(".site-header .sub");

  if (headerTitle) headerTitle.textContent = isAdmin ? `${settings.siteName}后台` : settings.siteName;
  if (headerSub && !isAdmin) headerSub.textContent = settings.siteSubtitle;
  if (document.querySelector("#heroEyebrowText")) document.querySelector("#heroEyebrowText").textContent = settings.heroEyebrow;
  if (document.querySelector("#heroTitleText")) document.querySelector("#heroTitleText").textContent = settings.heroTitle;
  if (document.querySelector("#heroBodyText")) document.querySelector("#heroBodyText").textContent = settings.heroText;
  if (document.querySelector("#heroCountLabelText")) document.querySelector("#heroCountLabelText").textContent = settings.heroCountLabel;
  document.title = isAdmin ? `${settings.siteName} | 后台管理` : `${settings.siteName} | 商品展示`;
}

function loadCheckoutFields() {
  return readJSON(STORE_KEYS.checkoutFields, DEFAULT_CHECKOUT_FIELDS);
}

function saveCheckoutFields(fields) {
  writeJSON(STORE_KEYS.checkoutFields, fields);
}

function loadCategories() {
  const saved = readJSON(STORE_KEYS.categories, []);
  const productCategories = loadProducts().map((product) => product.category).filter(Boolean);
  return [...new Set([...saved, ...productCategories])];
}

function saveCategories(categories) {
  writeJSON(STORE_KEYS.categories, [...new Set(categories.filter(Boolean))]);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readImageFile(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => callback(reader.result));
  reader.readAsDataURL(file);
}

function renderImagePreview(previewId, src, emptyText) {
  const preview = document.querySelector(`#${previewId}`);
  if (!preview) return;
  preview.innerHTML = src
    ? `<img src="${src}" alt="图片预览">`
    : `<span>${emptyText}</span>`;
}

function trackSiteView() {
  if (sessionStorage.getItem("vpn_shop_site_viewed") === "yes") return;
  const analytics = loadAnalytics();
  analytics.siteViews = Number(analytics.siteViews || 0) + 1;
  analytics.productViews = analytics.productViews || {};
  saveAnalytics(analytics);
  sessionStorage.setItem("vpn_shop_site_viewed", "yes");
}

function trackProductViews(products) {
  const analytics = loadAnalytics();
  analytics.productViews = analytics.productViews || {};

  for (const product of products) {
    const key = `vpn_shop_product_viewed_${product.id}`;
    if (sessionStorage.getItem(key) === "yes") continue;
    analytics.productViews[product.id] = Number(analytics.productViews[product.id] || 0) + 1;
    sessionStorage.setItem(key, "yes");
  }

  saveAnalytics(analytics);
}

function fallbackImage(name) {
  const text = encodeURIComponent(name.slice(0, 8));
  return `https://dummyimage.com/900x600/0f766e/ffffff&text=${text}`;
}

function money(price) {
  return `¥${price}`;
}

function orderTotal(order) {
  return Number(order.price || 0) * Number(order.quantity || 1);
}

function createOrderNumber() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  return `YQ${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function getOrderNumber(order) {
  return order.orderNumber || order.id;
}

function getOrderFields(order) {
  if (Array.isArray(order.fields) && order.fields.length) return order.fields;
  return [
    { label: "姓名/称呼", value: order.buyerName || "" },
    { label: "联系方式", value: order.buyerContact || "" },
    { label: "购买数量", value: order.quantity || 1 },
    { label: "收货信息", value: order.address || "" },
    { label: "备注", value: order.note || "" },
  ];
}

function renderOrderFields(order) {
  return getOrderFields(order).map((field) => `
    <div class="order-read-block">
      <span>${escapeHtml(field.label || "未命名字段")}</span>
      <p>${escapeHtml(field.value || "未填写")}</p>
    </div>
  `).join("");
}

function renderProducts() {
  const grid = document.querySelector("#productGrid");
  if (!grid) return;

  const search = document.querySelector("#searchInput").value.trim().toLowerCase();
  const selected = document.querySelector("#categoryFilter").value;
  const products = loadProducts();
  const categories = loadCategories();
  const filter = document.querySelector("#categoryFilter");

  filter.innerHTML = `<option value="">全部分类</option>` + categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  filter.value = selected;

  const filtered = products.filter((p) => {
    const haystack = `${p.name} ${p.category} ${p.description}`.toLowerCase();
    return (!search || haystack.includes(search)) && (!selected || p.category === selected);
  });

  trackProductViews(filtered);

  document.querySelector("#productCount").textContent = products.length;
  grid.innerHTML = filtered.map((p) => `
    <article class="product-card">
      <img src="${p.image || fallbackImage(p.name)}" alt="${p.name}">
      <div class="product-body">
        <span class="tag">${p.category}</span>
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <p class="price">${money(p.price)}</p>
        <p class="stock">库存：${p.stock}</p>
        <div class="product-actions">
          <button onclick="openCheckout('${p.id}')">购买 / 支付</button>
          <button class="ghost" onclick="openChat('我想咨询：${p.name}')">咨询</button>
        </div>
      </div>
    </article>
  `).join("") || `<p class="sub">没有找到商品，可以去后台上架。</p>`;
}

window.openCheckout = function openCheckout(id) {
  checkoutProduct = loadProducts().find((p) => p.id === id);
  if (!checkoutProduct) return;

  document.querySelector("#checkoutTitle").textContent = `购买：${checkoutProduct.name}`;
  document.querySelector("#orderSummary").innerHTML = `
    <strong>${checkoutProduct.name}</strong>
    <span>${checkoutProduct.category}</span>
    <b>${money(checkoutProduct.price)}</b>
  `;
  renderPaymentOptions();
  renderCheckoutFields();
  updatePaymentTip();
  document.querySelector("#checkoutDialog").showModal();
};

function renderCheckoutFields() {
  const box = document.querySelector("#checkoutFields");
  if (!box) return;

  box.innerHTML = loadCheckoutFields().map((field) => {
    const required = field.required ? "required" : "";
    const placeholder = escapeHtml(field.placeholder || "");
    const label = escapeHtml(field.label || "未命名字段");
    const id = escapeHtml(field.id);

    if (field.type === "textarea") {
      return `<label>${label}<textarea id="${id}" data-checkout-field="${id}" rows="3" ${required} placeholder="${placeholder}"></textarea></label>`;
    }

    const numberAttrs = field.type === "number" ? `min="1" value="1" max="${Math.max(Number(checkoutProduct?.stock || 1), 1)}"` : "";
    return `<label>${label}<input id="${id}" data-checkout-field="${id}" type="${field.type === "number" ? "number" : "text"}" ${numberAttrs} ${required} placeholder="${placeholder}" /></label>`;
  }).join("");
}

function getCheckoutFieldValue(id) {
  const field = document.querySelector(`[data-checkout-field="${id}"]`);
  return field ? field.value.trim() : "";
}

function getEnabledPaymentMethods() {
  const settings = loadPaymentSettings();
  const methods = [];
  if (settings.enableWechat) methods.push("微信支付");
  if (settings.enableAlipay) methods.push("支付宝");
  return methods.length ? methods : ["微信支付"];
}

function renderPaymentOptions() {
  const box = document.querySelector("#paymentOptions");
  if (!box) return;
  const current = document.querySelector("input[name='payment']:checked")?.value;
  const methods = getEnabledPaymentMethods();
  box.innerHTML = methods.map((method, index) => `
    <label class="payment-option">
      <input type="radio" name="payment" value="${method}" ${method === current || (!current && index === 0) ? "checked" : ""} />
      <span>${method}</span>
    </label>
  `).join("");
}

function updatePaymentTip() {
  const checked = document.querySelector("input[name='payment']:checked");
  const method = checked ? checked.value : "微信支付";
  document.querySelector("#paymentTip").textContent =
    method === "微信支付"
      ? "提交订单后会弹出微信收款码，请扫码付款。"
      : "提交订单后会弹出支付宝收款码，请扫码付款。";
}

function cropQrCodeImage(source, callback) {
  const image = new Image();
  image.onload = () => {
    const maxSize = 900;
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const tile = Math.max(6, Math.round(Math.min(width, height) / 70));
    const cols = Math.ceil(width / tile);
    const rows = Math.ceil(height / tile);
    const data = context.getImageData(0, 0, width, height).data;
    const active = Array.from({ length: rows }, () => Array(cols).fill(false));

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        let dark = 0;
        let total = 0;
        const startX = col * tile;
        const startY = row * tile;
        for (let y = startY; y < Math.min(startY + tile, height); y += 1) {
          for (let x = startX; x < Math.min(startX + tile, width); x += 1) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            if (r < 105 && g < 105 && b < 105) dark += 1;
            total += 1;
          }
        }
        active[row][col] = total > 0 && dark / total > 0.08;
      }
    }

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    let best = null;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!active[row][col] || visited[row][col]) continue;
        const queue = [[row, col]];
        visited[row][col] = true;
        let minRow = row;
        let maxRow = row;
        let minCol = col;
        let maxCol = col;
        let count = 0;

        while (queue.length) {
          const [currentRow, currentCol] = queue.shift();
          count += 1;
          minRow = Math.min(minRow, currentRow);
          maxRow = Math.max(maxRow, currentRow);
          minCol = Math.min(minCol, currentCol);
          maxCol = Math.max(maxCol, currentCol);

          dirs.forEach(([dr, dc]) => {
            const nextRow = currentRow + dr;
            const nextCol = currentCol + dc;
            if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) return;
            if (!active[nextRow][nextCol] || visited[nextRow][nextCol]) return;
            visited[nextRow][nextCol] = true;
            queue.push([nextRow, nextCol]);
          });
        }

        const boxWidth = (maxCol - minCol + 1) * tile;
        const boxHeight = (maxRow - minRow + 1) * tile;
        const aspect = boxWidth / Math.max(boxHeight, 1);
        const score = count * Math.min(aspect, 1 / aspect);
        if (count > 12 && aspect > 0.65 && aspect < 1.55 && (!best || score > best.score)) {
          best = { minRow, maxRow, minCol, maxCol, score };
        }
      }
    }

    if (!best) {
      callback(source);
      return;
    }

    const rawX = best.minCol * tile;
    const rawY = best.minRow * tile;
    const rawWidth = (best.maxCol - best.minCol + 1) * tile;
    const rawHeight = (best.maxRow - best.minRow + 1) * tile;
    const side = Math.min(Math.max(rawWidth, rawHeight) * 1.18, Math.min(width, height));
    const centerX = rawX + rawWidth / 2;
    const centerY = rawY + rawHeight / 2;
    const cropX = Math.max(0, Math.min(width - side, centerX - side / 2));
    const cropY = Math.max(0, Math.min(height - side, centerY - side / 2));
    const output = document.createElement("canvas");
    output.width = Math.round(side);
    output.height = Math.round(side);
    output.getContext("2d").drawImage(canvas, cropX, cropY, side, side, 0, 0, output.width, output.height);
    callback(output.toDataURL("image/png"));
  };
  image.onerror = () => callback(source);
  image.src = source;
}

function renderPaymentQr(method) {
  if (checkoutProduct?.id) {
    checkoutProduct = loadProducts().find((product) => product.id === checkoutProduct.id) || checkoutProduct;
  }
  const settings = loadPaymentSettings();
  const qrSrc = method === "微信支付" ? settings.wechatQr : settings.alipayQr;
  const qrImage = document.querySelector("#paymentQrImage");
  const qrEmpty = document.querySelector("#paymentQrEmpty");

  document.querySelector("#paymentDialogTitle").textContent = `${method}收款码`;

  if (qrSrc) {
    qrImage.removeAttribute("src");
    qrImage.hidden = false;
    qrEmpty.hidden = true;
    cropQrCodeImage(qrSrc, (croppedSrc) => {
      qrImage.src = croppedSrc;
    });
  } else {
    qrImage.removeAttribute("src");
    qrImage.hidden = true;
    qrEmpty.hidden = false;
  }
}

function openPaymentDialog(order) {
  latestPaymentOrder = order;
  renderPaymentQr(order.payment);
  document.querySelector("#paymentChecking").textContent = "付款后请联系客服确认";
  document.querySelector("#paymentDialog").showModal();
}

function closePaymentDialog() {
  document.querySelector("#paymentDialog").close();
  latestPaymentOrder = null;
}

function openContactDialog() {
  document.querySelector("#contactDialog").showModal();
}

function closeContactDialog() {
  document.querySelector("#contactDialog").close();
}

function renderCustomerOrders() {
  const list = document.querySelector("#customerOrdersList");
  if (!list) return;

  const orders = loadOrders();
  list.innerHTML = orders.map((order) => `
    <div class="customer-order-card">
      <div class="row">
        <strong>${order.productName} x ${order.quantity || 1}</strong>
        <span>${money(orderTotal(order))}</span>
      </div>
      <p>订单编号：${getOrderNumber(order)}</p>
      <p>付款方式：${order.payment}</p>
      <p>付款状态：${order.status}</p>
      <p>发货状态：${order.shippingStatus || "未发货"}</p>
      ${renderOrderFields(order)}
      <small>${new Date(order.time).toLocaleString()}</small>
    </div>
  `).join("") || `<p class="sub">当前还没有订单。</p>`;
}

function openCustomerOrders() {
  renderCustomerOrders();
  document.querySelector("#customerOrdersDialog").showModal();
}

function closeCustomerOrders() {
  document.querySelector("#customerOrdersDialog").close();
}

function closeCheckout() {
  document.querySelector("#checkoutDialog").close();
  document.querySelector("#checkoutForm").reset();
  checkoutProduct = null;
}

function submitOrder(event) {
  event.preventDefault();
  if (!checkoutProduct) return;

  const selectedPayment = document.querySelector("input[name='payment']:checked");
  if (!selectedPayment) {
    alert("请先选择支付方式");
    return;
  }
  const payment = selectedPayment.value;
  const fieldValues = {};
  for (const field of loadCheckoutFields()) {
    fieldValues[field.id] = getCheckoutFieldValue(field.id);
  }
  const quantity = Number(fieldValues.buyerQuantity || 1);
  const order = {
    id: crypto.randomUUID(),
    orderNumber: createOrderNumber(),
    productId: checkoutProduct.id,
    productName: checkoutProduct.name,
    price: checkoutProduct.price,
    quantity,
    total: Number(checkoutProduct.price || 0) * quantity,
    payment,
    buyerName: fieldValues.buyerName || "",
    buyerContact: fieldValues.buyerContact || "",
    address: fieldValues.buyerAddress || "",
    note: fieldValues.buyerNote || "",
    fields: loadCheckoutFields().map((field) => ({
      id: field.id,
      label: field.label,
      value: fieldValues[field.id] || "",
    })),
    status: "待确认付款",
    shippingStatus: "未发货",
    time: Date.now(),
  };
  saveCurrentCustomerName(order.buyerName);

  const orders = loadOrders();
  orders.unshift(order);
  saveOrders(orders);

  const messages = loadMessages();
  messages.push({
    id: crypto.randomUUID(),
    from: "customer",
    name: order.buyerName,
    text: `我已提交订单：${order.productName} x ${order.quantity}，付款方式：${order.payment}，合计：${money(order.total)}。联系方式：${order.buyerContact}`,
    time: Date.now(),
  });
  messages.push({
    id: crypto.randomUUID(),
    from: "service",
    name: "客服",
    text: "订单已收到，请等待客服确认付款和发货信息。",
    time: Date.now() + 500,
  });
  saveMessages(messages);

  closeCheckout();
  openPaymentDialog(order);
  renderChat();
}

function openChat(prefill = "") {
  const panel = document.querySelector("#chatPanel");
  const input = document.querySelector("#chatText");
  const nameInput = document.querySelector("#customerName");
  const savedName = getCurrentCustomerName();
  if (nameInput && savedName) nameInput.value = savedName;
  panel.classList.add("open");
  if (prefill) input.value = prefill;
  input.focus();
  renderChat();
}

function renderChat() {
  const body = document.querySelector("#chatBody");
  if (!body) return;
  const messages = loadMessages();
  const signature = JSON.stringify(messages);
  if (signature === lastRenderedMessages && body.innerHTML) return;
  lastRenderedMessages = signature;
  body.innerHTML = messages.map((m) => `
    <div class="bubble ${m.from === "customer" ? "me" : ""}">
      <strong>${m.name}</strong>
      <div>${m.text}</div>
      <small>${new Date(m.time).toLocaleString()}</small>
    </div>
  `).join("") || `<p class="sub">还没有消息，欢迎咨询。</p>`;
  body.scrollTop = body.scrollHeight;
}

function initFrontPage() {
  if (!document.querySelector("#productGrid")) return;

  applySiteSettings();
  trackSiteView();
  renderPaymentOptions();
  renderProducts();
  const savedCustomerName = getCurrentCustomerName();
  if (savedCustomerName) document.querySelector("#customerName").value = savedCustomerName;
  document.querySelector("#searchInput").addEventListener("input", renderProducts);
  document.querySelector("#categoryFilter").addEventListener("change", renderProducts);
  document.querySelector("#chatToggle").addEventListener("click", () => openChat());
  document.querySelector("#closeChat").addEventListener("click", () => document.querySelector("#chatPanel").classList.remove("open"));
  document.querySelector("#closeCheckout").addEventListener("click", closeCheckout);
  document.querySelector("#cancelCheckout").addEventListener("click", closeCheckout);
  document.querySelector("#closePaymentDialog").addEventListener("click", closePaymentDialog);
  document.querySelector("#contactAfterPay").addEventListener("click", () => {
    closePaymentDialog();
    openContactDialog();
  });
  document.querySelector("#closeContactDialog").addEventListener("click", closeContactDialog);
  document.querySelector("#contactDone").addEventListener("click", closeContactDialog);
  document.querySelector("#viewOrdersButton").addEventListener("click", openCustomerOrders);
  document.querySelector("#closeCustomerOrders").addEventListener("click", closeCustomerOrders);
  document.querySelector("#customerOrdersDone").addEventListener("click", closeCustomerOrders);
  document.querySelector("#paymentOptions").addEventListener("change", updatePaymentTip);
  document.querySelector("#checkoutForm").addEventListener("submit", submitOrder);

  document.querySelector("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const text = document.querySelector("#chatText").value.trim();
    const typedName = document.querySelector("#customerName").value.trim();
    const name = typedName || getCurrentCustomerName() || "顾客";
    if (!text) return;
    saveCurrentCustomerName(name);
    document.querySelector("#customerName").value = name;

    const messages = loadMessages();
    messages.push({ id: crypto.randomUUID(), from: "customer", name, text, time: Date.now() });
    saveMessages(messages);
    pushStoreToServer();
    document.querySelector("#chatText").value = "";
    renderChat();
  });

  startRealtimeSync(() => {
    renderChat();
    renderPaymentOptions();
    renderProducts();
  });
}

function renderAdminProducts() {
  const box = document.querySelector("#adminProducts");
  if (!box) return;
  const products = loadProducts();
  const analytics = loadAnalytics();
  const views = analytics.productViews || {};
  box.innerHTML = products.map((p) => `
    <div class="admin-item">
      <div class="row">
        <strong>${p.name}</strong>
        <span>${money(p.price)} / ${p.stock}件</span>
      </div>
      <span class="tag">${p.category}</span>
      <p>${p.description}</p>
      <small>浏览次数：${views[p.id] || 0}</small>
      <div class="form-actions">
        <button onclick="editProduct('${p.id}')">编辑</button>
        <button class="ghost danger" onclick="deleteProduct('${p.id}')">删除</button>
      </div>
    </div>
  `).join("") || `<p class="sub">暂无商品。</p>`;
}

function renderAdminStats() {
  const box = document.querySelector("#adminStats");
  if (!box) return;

  const products = loadProducts();
  const orders = loadOrders();
  const analytics = loadAnalytics();
  const productViews = analytics.productViews || {};
  const totalRevenue = orders.reduce((sum, order) => sum + orderTotal(order), 0);
  const pendingShipments = orders.filter((order) => order.shippingStatus !== "已发货").length;
  const totalProductViews = Object.values(productViews).reduce((sum, count) => sum + Number(count || 0), 0);

  box.innerHTML = `
    <div class="stat-card">
      <span>流水金额</span>
      <strong>${money(totalRevenue)}</strong>
    </div>
    <div class="stat-card">
      <span>订单数量</span>
      <strong>${orders.length}</strong>
    </div>
    <div class="stat-card">
      <span>待发货</span>
      <strong>${pendingShipments}</strong>
    </div>
    <div class="stat-card">
      <span>网站访问</span>
      <strong>${analytics.siteViews || 0}</strong>
    </div>
    <div class="stat-card">
      <span>商品浏览</span>
      <strong>${totalProductViews}</strong>
    </div>
    <div class="stat-card">
      <span>上架商品</span>
      <strong>${products.length}</strong>
    </div>
  `;
}

function renderAdminOrders() {
  const box = document.querySelector("#adminOrders");
  if (!box) return;
  const orders = loadOrders();
  box.innerHTML = orders.map((o) => `
    <div class="message-item">
      <div class="row">
        <strong>${o.productName} x ${o.quantity || 1}</strong>
        <span>${money(orderTotal(o))} · ${o.payment}</span>
      </div>
      <span>订单编号：${getOrderNumber(o)}</span>
      <div class="order-read-grid">${renderOrderFields(o)}</div>
      <small>${o.status} · ${o.shippingStatus || "未发货"} · ${new Date(o.time).toLocaleString()}</small>
      <div class="form-actions">
        <button onclick="setOrderShipping('${o.id}', '已发货')">标记已发货</button>
        <button class="ghost" onclick="setOrderShipping('${o.id}', '未发货')">标记未发货</button>
        <button class="ghost" onclick="setOrderPaid('${o.id}')">确认付款</button>
        <button class="ghost danger" onclick="deleteOrder('${o.id}')">删除订单</button>
      </div>
    </div>
  `).join("") || `<p class="sub">暂无订单。</p>`;
}

function renderAdminMessages() {
  const box = document.querySelector("#adminMessages");
  if (!box) return;
  const messages = loadMessages();
  const customers = [...new Set(messages.filter((m) => m.from === "customer").map((m) => m.name).filter(Boolean))];
  const replyCustomer = document.querySelector("#replyCustomer");
  const selectedCustomer = replyCustomer ? replyCustomer.value : "";

  if (replyCustomer) {
    replyCustomer.innerHTML = `<option value="">全部顾客</option>` + customers.map((name) => `
      <option value="${name}" ${name === selectedCustomer ? "selected" : ""}>${name}</option>
    `).join("");
  }

  const visibleMessages = selectedCustomer
    ? messages.filter((m) => m.name === selectedCustomer || m.to === selectedCustomer)
    : messages;

  box.innerHTML = visibleMessages.map((m) => `
    <div class="message-item ${m.from === "service" ? "service-message" : ""}">
      <strong>${m.from === "service" ? "客服" : m.name}${m.to ? ` 回复 ${m.to}` : ""}：${m.text}</strong>
      <span>${new Date(m.time).toLocaleString()}</span>
    </div>
  `).join("") || `<p class="sub">暂无聊天记录。</p>`;
}

function sendAdminReply(event) {
  event.preventDefault();
  const text = document.querySelector("#adminReplyText").value.trim();
  const to = document.querySelector("#replyCustomer").value;
  if (!text) return;

  const messages = loadMessages();
  messages.push({
    id: crypto.randomUUID(),
    from: "service",
    name: "客服",
    to,
    text,
    time: Date.now(),
  });
  saveMessages(messages);
  pushStoreToServer();
  document.querySelector("#adminReplyText").value = "";
  renderAdminMessages();
}

function renderSiteSettings() {
  const form = document.querySelector("#siteSettingsForm");
  if (!form) return;
  const settings = loadSiteSettings();
  document.querySelector("#siteName").value = settings.siteName;
  document.querySelector("#siteSubtitle").value = settings.siteSubtitle;
  document.querySelector("#heroEyebrow").value = settings.heroEyebrow;
  document.querySelector("#heroTitle").value = settings.heroTitle;
  document.querySelector("#heroText").value = settings.heroText;
  document.querySelector("#heroCountLabel").value = settings.heroCountLabel;
}

function renderPaymentSettings() {
  const form = document.querySelector("#paymentSettingsForm");
  if (!form) return;
  const settings = loadPaymentSettings();
  document.querySelector("#wechatQr").value = settings.wechatQr || "";
  document.querySelector("#alipayQr").value = settings.alipayQr || "";
  document.querySelector("#enableWechatPayment").checked = settings.enableWechat;
  document.querySelector("#enableAlipayPayment").checked = settings.enableAlipay;
  renderImagePreview("wechatQrPreview", settings.wechatQr, "当前使用默认微信收款码");
  renderImagePreview("alipayQrPreview", settings.alipayQr, "当前使用默认支付宝收款码");
}

function renderCheckoutFieldSettings() {
  const list = document.querySelector("#checkoutFieldList");
  if (!list) return;

  const fields = loadCheckoutFields();
  list.innerHTML = fields.map((field, index) => `
    <div class="field-config-item">
      <input data-field-edit="${field.id}" data-prop="label" value="${escapeHtml(field.label)}" placeholder="字段名称" />
      <input data-field-edit="${field.id}" data-prop="placeholder" value="${escapeHtml(field.placeholder || "")}" placeholder="输入提示" />
      <select data-field-edit="${field.id}" data-prop="type">
        <option value="text" ${field.type === "text" ? "selected" : ""}>单行文本</option>
        <option value="number" ${field.type === "number" ? "selected" : ""}>数字</option>
        <option value="textarea" ${field.type === "textarea" ? "selected" : ""}>多行文本</option>
      </select>
      <label class="inline-check"><input type="checkbox" data-field-edit="${field.id}" data-prop="required" ${field.required ? "checked" : ""} /> 必填</label>
      <button type="button" class="ghost" onclick="saveCheckoutField('${field.id}')">保存</button>
      <button type="button" class="ghost danger" onclick="deleteCheckoutField('${field.id}')">删除</button>
    </div>
  `).join("") || `<p class="sub">暂无下单字段。</p>`;
}

function renderCategorySettings() {
  const box = document.querySelector("#categoryManager");
  const datalist = document.querySelector("#categoryOptions");
  if (!box && !datalist) return;

  const categories = loadCategories();
  if (box) {
    box.innerHTML = categories.map((category, index) => `
      <span class="category-pill">${escapeHtml(category)} <button type="button" onclick="deleteCategoryByIndex(${index})">×</button></span>
    `).join("") || `<p class="sub">暂无分类。</p>`;
  }
  if (datalist) {
    datalist.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
  }
}

window.saveCheckoutField = function saveCheckoutField(id) {
  const fields = loadCheckoutFields();
  const field = fields.find((item) => item.id === id);
  if (!field) return;

  document.querySelectorAll(`[data-field-edit="${id}"]`).forEach((input) => {
    const prop = input.dataset.prop;
    field[prop] = prop === "required" ? input.checked : input.value.trim();
  });

  if (!field.label) field.label = "未命名字段";
  saveCheckoutFields(fields);
  renderCheckoutFieldSettings();
};

window.deleteCheckoutField = function deleteCheckoutField(id) {
  if (!confirm("确定删除这个下单字段吗？")) return;
  saveCheckoutFields(loadCheckoutFields().filter((field) => field.id !== id));
  renderCheckoutFieldSettings();
};

window.deleteCategoryByIndex = function deleteCategoryByIndex(index) {
  const categories = loadCategories();
  const category = categories[index];
  if (!category) return;
  if (!confirm(`确定删除分类“${category}”吗？已上架商品不会被删除。`)) return;
  saveCategories(categories.filter((item) => item !== category));
  renderCategorySettings();
};

function resetProductForm() {
  document.querySelector("#productForm").reset();
  document.querySelector("#productId").value = "";
  document.querySelector("#image").value = "";
  renderImagePreview("imagePreview", "", "暂无商品照片");
}

window.editProduct = function editProduct(id) {
  const product = loadProducts().find((p) => p.id === id);
  if (!product) return;
  for (const key of ["id", "name", "category", "price", "image", "stock", "description"]) {
    const el = document.querySelector(`#${key === "id" ? "productId" : key}`);
    if (el) el.value = product[key] ?? "";
  }
  renderImagePreview("imagePreview", product.image, "暂无商品照片");
};

window.deleteProduct = function deleteProduct(id) {
  if (!confirm("确定删除这个商品吗？")) return;
  saveProducts(loadProducts().filter((p) => p.id !== id));
  renderAdminProducts();
  renderAdminStats();
};

window.setOrderShipping = function setOrderShipping(id, shippingStatus) {
  const orders = loadOrders();
  const order = orders.find((item) => item.id === id);
  if (!order) return;
  order.shippingStatus = shippingStatus;
  saveOrders(orders);
  renderAdminOrders();
  renderAdminStats();
};

window.setOrderPaid = function setOrderPaid(id) {
  const orders = loadOrders();
  const order = orders.find((item) => item.id === id);
  if (!order) return;
  order.status = "已确认付款";
  saveOrders(orders);
  renderAdminOrders();
  renderAdminStats();
};

window.deleteOrder = function deleteOrder(id) {
  if (!confirm("确定删除这个订单吗？")) return;
  saveOrders(loadOrders().filter((order) => order.id !== id));
  renderAdminOrders();
  renderAdminStats();
};

function initAdminPage() {
  if (!document.querySelector("#loginBox")) return;
  applySiteSettings();
  const loginBox = document.querySelector("#loginBox");
  const adminApp = document.querySelector("#adminApp");

  function enterAdmin() {
    loginBox.classList.add("hidden");
    adminApp.classList.remove("hidden");
    renderAdminStats();
    renderSiteSettings();
    renderPaymentSettings();
    renderCheckoutFieldSettings();
    renderCategorySettings();
    renderAdminProducts();
    renderAdminOrders();
    renderAdminMessages();
  }

  startRealtimeSync(() => {
    renderAdminMessages();
    renderAdminOrders();
    renderAdminStats();
  });

  if (sessionStorage.getItem(STORE_KEYS.admin) === "yes") enterAdmin();

  document.querySelector("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (document.querySelector("#adminPassword").value === getAdminPassword()) {
      sessionStorage.setItem(STORE_KEYS.admin, "yes");
      enterAdmin();
    } else {
      alert("密码不正确");
    }
  });

  document.querySelector("#productForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const products = loadProducts();
    const id = document.querySelector("#productId").value || crypto.randomUUID();
    const product = {
      id,
      name: document.querySelector("#name").value.trim(),
      category: document.querySelector("#category").value.trim(),
      price: document.querySelector("#price").value.trim(),
      image: document.querySelector("#image").value.trim(),
      stock: Number(document.querySelector("#stock").value || 0),
      description: document.querySelector("#description").value.trim(),
    };
    saveCategories([...loadCategories(), product.category]);
    const index = products.findIndex((p) => p.id === id);
    if (index >= 0) products[index] = product;
    else products.unshift(product);
    saveProducts(products);
    resetProductForm();
    renderAdminProducts();
    renderAdminStats();
    renderCategorySettings();
  });

  document.querySelector("#resetForm").addEventListener("click", resetProductForm);
  document.querySelector("#imageUpload").addEventListener("change", (event) => {
    readImageFile(event.target.files[0], (dataUrl) => {
      document.querySelector("#image").value = dataUrl;
      renderImagePreview("imagePreview", dataUrl, "暂无商品照片");
    });
  });
  document.querySelector("#wechatQrUpload").addEventListener("change", (event) => {
    readImageFile(event.target.files[0], (dataUrl) => {
      document.querySelector("#wechatQr").value = dataUrl;
      renderImagePreview("wechatQrPreview", dataUrl, "当前使用默认微信收款码");
    });
  });
  document.querySelector("#alipayQrUpload").addEventListener("change", (event) => {
    readImageFile(event.target.files[0], (dataUrl) => {
      document.querySelector("#alipayQr").value = dataUrl;
      renderImagePreview("alipayQrPreview", dataUrl, "当前使用默认支付宝收款码");
    });
  });
  document.querySelector("#paymentSettingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const enableWechat = document.querySelector("#enableWechatPayment").checked;
    const enableAlipay = document.querySelector("#enableAlipayPayment").checked;
    if (!enableWechat && !enableAlipay) {
      alert("至少要选择一种支付方式");
      return;
    }
    savePaymentSettings({
      wechatQr: document.querySelector("#wechatQr").value.trim(),
      alipayQr: document.querySelector("#alipayQr").value.trim(),
      enableWechat,
      enableAlipay,
    });
    renderPaymentSettings();
    alert("统一收款码已保存");
  });
  document.querySelector("#resetPaymentSettings").addEventListener("click", () => {
    const enableWechat = document.querySelector("#enableWechatPayment").checked;
    const enableAlipay = document.querySelector("#enableAlipayPayment").checked;
    if (!confirm("确定清空微信和支付宝收款码吗？")) return;
    savePaymentSettings({
      wechatQr: "",
      alipayQr: "",
      enableWechat: enableWechat || !enableAlipay,
      enableAlipay,
    });
    document.querySelector("#wechatQrUpload").value = "";
    document.querySelector("#alipayQrUpload").value = "";
    renderPaymentSettings();
    alert("收款码已清空");
  });
  document.querySelector("#siteSettingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveSiteSettings({
      siteName: document.querySelector("#siteName").value.trim(),
      siteSubtitle: document.querySelector("#siteSubtitle").value.trim(),
      heroEyebrow: document.querySelector("#heroEyebrow").value.trim(),
      heroTitle: document.querySelector("#heroTitle").value.trim(),
      heroText: document.querySelector("#heroText").value.trim(),
      heroCountLabel: document.querySelector("#heroCountLabel").value.trim(),
    });
    applySiteSettings();
    renderSiteSettings();
    alert("网站名称已保存");
  });
  document.querySelector("#adminPasswordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const current = document.querySelector("#currentAdminPassword").value;
    const next = document.querySelector("#newAdminPassword").value;
    const confirm = document.querySelector("#confirmAdminPassword").value;

    if (current !== getAdminPassword()) {
      alert("当前密码不正确");
      return;
    }
    if (next.length < 6) {
      alert("新密码至少需要 6 位");
      return;
    }
    if (next !== confirm) {
      alert("两次输入的新密码不一致");
      return;
    }

    setAdminPassword(next);
    event.target.reset();
    alert("后台密码已修改");
  });
  document.querySelector("#checkoutFieldForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const label = document.querySelector("#fieldLabel").value.trim();
    if (!label) return;
    const fields = loadCheckoutFields();
    fields.push({
      id: `field_${Date.now()}`,
      label,
      placeholder: document.querySelector("#fieldPlaceholder").value.trim(),
      type: document.querySelector("#fieldType").value,
      required: document.querySelector("#fieldRequired").checked,
    });
    saveCheckoutFields(fields);
    event.target.reset();
    document.querySelector("#fieldRequired").checked = true;
    renderCheckoutFieldSettings();
  });
  document.querySelector("#resetCheckoutFields").addEventListener("click", () => {
    if (!confirm("确定恢复默认下单字段吗？")) return;
    saveCheckoutFields(DEFAULT_CHECKOUT_FIELDS);
    renderCheckoutFieldSettings();
  });
  document.querySelector("#categoryForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const category = document.querySelector("#newCategory").value.trim();
    if (!category) return;
    saveCategories([...loadCategories(), category]);
    document.querySelector("#newCategory").value = "";
    renderCategorySettings();
  });
  document.querySelector("#clearOrders").addEventListener("click", () => {
    if (!confirm("确定清空订单记录吗？")) return;
    saveOrders([]);
    renderAdminOrders();
    renderAdminStats();
  });
  document.querySelector("#clearMessages").addEventListener("click", () => {
    if (!confirm("确定清空聊天记录吗？")) return;
    saveMessages([]);
    renderAdminMessages();
  });
  document.querySelector("#adminChatForm").addEventListener("submit", sendAdminReply);
  document.querySelector("#replyCustomer").addEventListener("change", renderAdminMessages);
}

hydrateStoreFromServer().finally(() => {
  migrateDefaultContent();
  initFrontPage();
  initAdminPage();
});
