import { supabase } from "./supabase.js";

/* =========================================
   NIVRA STORE
   Storefront Logic
========================================= */

// البيانات
let categories = [];
let products = [];
let variants = [];
let cart = [];

let selectedProduct = null;
let deliveryPrice = 0;

let zoomProduct = null;
let zoomIndex = 0;

let deferredPrompt = null;

const ALL_IMAGE = "./assets/images/hero.jpg";
const NO_IMAGE = "./assets/images/no-image.jpg";
const WHATSAPP_NUMBER = "9647741478145";

// فهارس الصور
const imageIndexes = {};

// منع تكرار التحميل
let isLoadingProducts = false;


// =========================================
// ELEMENTS
// =========================================

const categorySelect = document.getElementById("categorySelect");
const productsContainer = document.getElementById("productsContainer");

const orderModal = document.getElementById("orderModal");
const cartModal = document.getElementById("cartModal");
const contactModal = document.getElementById("contact");

const cartContainer = document.getElementById("cartContainer");

const installBtn = document.getElementById("installApp");

const zoomModal = document.getElementById("imageZoomModal");
const zoomImg = document.getElementById("zoomedImage");


// =========================================
// HELPERS
// =========================================

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}


function formatPrice(value) {
  return Number(value || 0).toLocaleString("en-US");
}


function showToast(message, color = "#111") {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.innerText = message;
  toast.style.background = color;
  toast.style.display = "block";

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.style.display = "none";
  }, 2600);
}


function openModal(modal) {
  if (!modal) return;

  modal.style.display = "flex";
  document.body.classList.add("modal-open");
}


function closeModal(modal) {
  if (!modal) return;

  modal.style.display = "none";

  const visibleModal = document.querySelector(
    ".modal[style*='display: flex'], .img-zoom-modal[style*='display: flex']"
  );

  if (!visibleModal) {
    document.body.classList.remove("modal-open");
  }
}


function closeAllModals() {
  [orderModal, cartModal, contactModal, zoomModal].forEach(modal => {
    if (modal) modal.style.display = "none";
  });

  document.body.classList.remove("modal-open");
}


function getProductImages(product) {
  const images = [];

  if (product.main_image) {
    images.push(product.main_image);
  }

  if (Array.isArray(product.product_images)) {
    const sortedImages = [...product.product_images].sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
    );

    sortedImages.forEach(item => {
      if (item.image_url && !images.includes(item.image_url)) {
        images.push(item.image_url);
      }
    });
  }

  if (!images.length) {
    images.push(NO_IMAGE);
  }

  return images;
}


function getCartQuantity() {
  return cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
}


function getProductsTotal() {
  return cart.reduce((sum, item) => {
    return sum + Number(item.price) * Number(item.qty || 0);
  }, 0);
}


function getFinalTotal() {
  return getProductsTotal() + deliveryPrice;
}


function getVariantStock(productId, color, size) {
  const variant = variants.find(item =>
    item.product_id == productId &&
    item.color === color &&
    item.size === size
  );

  return Number(variant?.stock_quantity || 0);
}


// =========================================
// CATEGORIES
// =========================================

async function loadCategories() {
  if (!categorySelect) return;

  const { data, error } = await supabase
    .from("categories")
    .select("*");

  if (error) {
    console.error("Categories error:", error);
    showToast("تعذر تحميل الأصناف");
    return;
  }

  categories = data || [];

  categorySelect.innerHTML = `
    <option value="all">كل الأصناف</option>
  `;

  categories.forEach(category => {
    categorySelect.innerHTML += `
      <option value="${escapeHTML(category.id)}">
        ${escapeHTML(category.name)}
      </option>
    `;
  });

  categorySelect.value = "all";

  showCategory({
    image: ALL_IMAGE,
    name: "كل المنتجات",
    description: "أزياء نيفرا للأناقة عنوان"
  });

  await loadProducts(null);
}


function showCategory(category) {
  const image = document.getElementById("categoryImage");
  const title = document.getElementById("categoryTitle");
  const description = document.getElementById("categoryDescription");

  if (image) {
    image.src = category.image || ALL_IMAGE;
    image.alt = category.name || "NIVRA Collection";
  }

  if (title) {
    title.innerText = category.name || "";
  }

  if (description) {
    description.innerText = category.description || "";
  }
}


if (categorySelect) {
  categorySelect.addEventListener("change", async () => {
    const value = categorySelect.value;

    if (value === "all") {
      showCategory({
        image: ALL_IMAGE,
        name: "كل المنتجات",
        description: "أزياء نيفرا للأناقة عنوان"
      });

      await loadProducts(null);
      return;
    }

    const category = categories.find(item => item.id == value);

    if (category) {
      showCategory(category);
      await loadProducts(category.id);
    }
  });
}


// =========================================
// PRODUCTS
// =========================================

async function loadProducts(categoryId = null) {
  if (!productsContainer || isLoadingProducts) return;

  isLoadingProducts = true;

  productsContainer.innerHTML = `
    <div class="products-loading">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>جاري تحميل التشكيلة...</p>
    </div>
  `;

  try {
    let query = supabase
      .from("products")
      .select(`
        *,
        product_images(
          image_url,
          sort_order
        )
      `);

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const { data: variantsData, error: variantsError } = await supabase
      .from("product_variants")
      .select("product_id, stock_quantity");

    if (variantsError) throw variantsError;

    const availableProducts = (data || []).filter(product => {
      return (variantsData || []).some(variant =>
        variant.product_id == product.id &&
        Number(variant.stock_quantity) > 0
      );
    });

    products = availableProducts;

    productsContainer.innerHTML = "";

    if (!products.length) {
      productsContainer.innerHTML = `
        <div class="empty-products">
          <i class="fa-regular fa-face-smile"></i>
          <h3>لا توجد منتجات متاحة حالياً</h3>
          <p>تابعي تشكيلتنا، قد تتوفر قطع جديدة قريباً.</p>
        </div>
      `;

      return;
    }

    products.forEach(product => {
      renderProductCard(product);
    });

    updateProductButtons();

  } catch (error) {
    console.error("Products loading error:", error);

    productsContainer.innerHTML = `
      <div class="empty-products">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>تعذر تحميل المنتجات</h3>
        <p>يرجى المحاولة مرة أخرى.</p>
      </div>
    `;

  } finally {
    isLoadingProducts = false;
  }
}


// =========================================
// PRODUCT CARD
// =========================================

function renderProductCard(product) {
  const images = getProductImages(product);

  const firstImage = images[0];

  const card = document.createElement("article");

  card.className = "product-card";

  card.innerHTML = `
    <div class="product-slider">

      <img
        class="product-main-img zoomable-img"
        src="${escapeHTML(firstImage)}"
        alt="${escapeHTML(product.name)}"
        loading="lazy"
      >

      ${
        images.length > 1
          ? `
            <button
              class="prev-img"
              type="button"
              data-id="${escapeHTML(product.id)}"
              aria-label="الصورة السابقة">
              <i class="fa-solid fa-chevron-right"></i>
            </button>

            <button
              class="next-img"
              type="button"
              data-id="${escapeHTML(product.id)}"
              aria-label="الصورة التالية">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          `
          : ""
      }

    </div>

    <div class="product-card-info">

      <h3>${escapeHTML(product.name)}</h3>

      <p class="product-price">
        ${formatPrice(product.price)}
        <span>دينار</span>
      </p>

      <div class="product-description">
        ${escapeHTML(product.description || "")}
      </div>

      <div class="cart-action">

        <button
          class="openProduct"
          type="button"
          data-id="${escapeHTML(product.id)}">

          <i class="fa-solid fa-bag-shopping"></i>
          <span>اختاري القطعة</span>

        </button>

        <div class="product-controls">

          <button
            class="qtyPlus"
            type="button"
            data-id="${escapeHTML(product.id)}"
            aria-label="إضافة قطعة أخرى"
            style="display:none">

            <i class="fa-solid fa-plus"></i>

          </button>

          <button
            class="removeProduct"
            type="button"
            data-id="${escapeHTML(product.id)}"
            aria-label="حذف المنتج من السلة"
            style="display:none">

            <i class="fa-regular fa-trash-can"></i>

          </button>

        </div>

      </div>

    </div>
  `;

  productsContainer.appendChild(card);

  const image = card.querySelector(".product-main-img");

  image.addEventListener("click", () => {
    openZoom(product.id, image.src);
  });


  const addButton = card.querySelector(".openProduct");

  addButton.addEventListener("click", () => {
    openProduct(product.id);
  });


  const nextButton = card.querySelector(".next-img");

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      changeProductImage(product.id, 1);
    });
  }


  const prevButton = card.querySelector(".prev-img");

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      changeProductImage(product.id, -1);
    });
  }


  card.querySelector(".qtyPlus").addEventListener("click", () => {
    openProduct(product.id);
  });


  card.querySelector(".removeProduct").addEventListener("click", () => {
    removeProductFromCart(product.id);
  });
}


// =========================================
// PRODUCT IMAGE SLIDER
// =========================================

function changeProductImage(productId, direction) {
  const product = products.find(item => item.id == productId);

  if (!product) return;

  const images = getProductImages(product);

  if (images.length < 2) return;

  if (imageIndexes[productId] === undefined) {
    imageIndexes[productId] = 0;
  }

  imageIndexes[productId] += direction;

  if (imageIndexes[productId] >= images.length) {
    imageIndexes[productId] = 0;
  }

  if (imageIndexes[productId] < 0) {
    imageIndexes[productId] = images.length - 1;
  }

  const card = document.querySelector(
    `.product-card .openProduct[data-id="${CSS.escape(String(productId))}"]`
  )?.closest(".product-card");

  const image = card?.querySelector(".product-main-img");

  if (image) {
    image.src = images[imageIndexes[productId]];
  }
}


// =========================================
// OPEN PRODUCT MODAL
// =========================================

async function openProduct(id) {
  selectedProduct = products.find(item => item.id == id);

  if (!selectedProduct) return;

  const image = document.getElementById("orderProductImage");
  const name = document.getElementById("orderProductName");
  const price = document.getElementById("productPrice");

  if (name) name.innerText = selectedProduct.name;
  if (price) price.innerText = formatPrice(selectedProduct.price);

  if (image) {
    image.src = selectedProduct.main_image || getProductImages(selectedProduct)[0];
    image.alt = selectedProduct.name;
  }

  openModal(orderModal);

  await loadVariants();
}


// =========================================
// VARIANTS
// =========================================

async function loadVariants() {
  if (!selectedProduct) return;

  const colorBox = document.getElementById("orderColor");
  const sizeBox = document.getElementById("orderSize");
  const productImage = document.getElementById("orderProductImage");

  if (!colorBox || !sizeBox) return;

  colorBox.innerHTML = "";
  sizeBox.innerHTML = "";

  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", selectedProduct.id);

  if (error) {
    console.error("Variants error:", error);
    showToast("تعذر تحميل خيارات المنتج");
    return;
  }

  variants = (data || []).filter(item =>
    Number(item.stock_quantity) > 0
  );

  if (!variants.length) {
    showToast("هذه القطعة غير متوفرة حالياً");
    closeModal(orderModal);
    return;
  }

  const sizes = [...new Set(variants.map(item => item.size).filter(Boolean))];

  const colors = [...new Set(variants.map(item => item.color).filter(Boolean))];

  function fillSizes(selectedColor = "") {
    const filtered = selectedColor
      ? variants.filter(item => item.color === selectedColor)
      : variants;

    const availableSizes = [
      ...new Set(filtered.map(item => item.size).filter(Boolean))
    ];

    sizeBox.innerHTML = availableSizes.map(size => `
      <option value="${escapeHTML(size)}">
        ${escapeHTML(size)}
      </option>
    `).join("");
  }


  function fillColors(selectedSize = "") {
    const filtered = selectedSize
      ? variants.filter(item => item.size === selectedSize)
      : variants;

    const availableColors = [
      ...new Set(filtered.map(item => item.color).filter(Boolean))
    ];

    colorBox.innerHTML = availableColors.map(color => `
      <option value="${escapeHTML(color)}">
        ${escapeHTML(color)}
      </option>
    `).join("");
  }


  fillSizes();
  sizeBox.value = sizes[0] || "";

  fillColors(sizeBox.value);
  colorBox.value = colors.find(color =>
    variants.some(item =>
      item.color === color && item.size === sizeBox.value
    )
  ) || colors[0] || "";


  function updateVariantImage() {
    const variant = variants.find(item =>
      item.size === sizeBox.value &&
      item.color === colorBox.value
    );

    if (variant?.image && productImage) {
      productImage.src = variant.image;
    } else if (productImage) {
      productImage.src =
        selectedProduct.main_image || getProductImages(selectedProduct)[0];
    }
  }


  sizeBox.onchange = () => {
    fillColors(sizeBox.value);

    colorBox.value = colors.find(color =>
      variants.some(item =>
        item.color === color && item.size === sizeBox.value
      )
    ) || colorBox.options[0]?.value || "";

    updateVariantImage();
  };


  colorBox.onchange = () => {
    const matchingVariant = variants.find(item =>
      item.color === colorBox.value &&
      item.size === sizeBox.value
    );

    if (!matchingVariant) {
      const alternative = variants.find(item =>
        item.color === colorBox.value
      );

      if (alternative) {
        sizeBox.value = alternative.size;
      }
    }

    updateVariantImage();
  };


  updateVariantImage();
}


// =========================================
// ADD TO CART
// =========================================

const addToCartButton = document.getElementById("addToCart");

if (addToCartButton) {
  addToCartButton.addEventListener("click", () => {
    if (!selectedProduct) return;

    const color = document.getElementById("orderColor")?.value;
    const size = document.getElementById("orderSize")?.value;

    const variant = variants.find(item =>
      item.color === color &&
      item.size === size
    );

    if (!variant) {
      showToast("يرجى اختيار اللون والمقاس");
      return;
    }

    const existing = cart.find(item =>
      item.id == selectedProduct.id &&
      item.color === color &&
      item.size === size
    );

    const currentQuantity = existing ? existing.qty : 0;

    if (currentQuantity >= Number(variant.stock_quantity)) {
      showToast("الكمية المطلوبة غير متوفرة بالمخزون");
      return;
    }

    if (existing) {
      existing.qty += 1;
      existing.stock_quantity = Number(variant.stock_quantity);
    } else {
      cart.push({
        id: selectedProduct.id,
        variantId: variant.id,
        name: selectedProduct.name,
        image:
          variant.image ||
          selectedProduct.main_image ||
          getProductImages(selectedProduct)[0],
        color,
        size,
        price: Number(selectedProduct.price),
        qty: 1,
        stock_quantity: Number(variant.stock_quantity)
      });
    }

    updateCart();

    closeModal(orderModal);

    showToast("أضيفت القطعة إلى حقيبتك", "#d987a0");
  });
}


// =========================================
// REMOVE PRODUCT FROM CART
// =========================================

function removeProductFromCart(productId) {
  cart = cart.filter(item => item.id != productId);

  updateCart();

  showToast("تم حذف القطعة من السلة");
}


// =========================================
// CART
// =========================================

function updateCart() {
  if (!cartContainer) return;

  const cartCount = document.getElementById("cartCount");
  const cartNotify = document.getElementById("cartNotify");

  const quantity = getCartQuantity();
  const productsTotal = getProductsTotal();

  if (cartCount) {
    cartCount.innerText = quantity;
  }

  if (cartNotify) {
    cartNotify.innerText = quantity;
    cartNotify.style.display = quantity > 0 ? "flex" : "none";
  }

  cartContainer.innerHTML = "";


  if (!cart.length) {
    cartContainer.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">
          <i class="fa-solid fa-bag-shopping"></i>
        </div>

        <h3>حقيبتك بانتظار اختياراتك</h3>

        <p>اكتشفي تشكيلتنا وأضيفي القطع التي تحبينها.</p>
      </div>
    `;
  }


  cart.forEach((item, index) => {
    const cartItem = document.createElement("div");

    cartItem.className = "cart-item";

    cartItem.innerHTML = `
      <div class="cart-item-image">
        <img
          src="${escapeHTML(item.image || NO_IMAGE)}"
          alt="${escapeHTML(item.name)}"
          loading="lazy">
      </div>

      <div class="cart-item-info">

        <h3>${escapeHTML(item.name)}</h3>

        <div class="cart-item-options">
          <span>اللون: ${escapeHTML(item.color)}</span>
          <span>المقاس: ${escapeHTML(item.size)}</span>
        </div>

        <strong class="cart-item-price">
          ${formatPrice(item.price * item.qty)}
          <small>دينار</small>
        </strong>

        <div class="cart-item-controls">

          <button
            type="button"
            class="cart-quantity-btn"
            data-cart-action="minus"
            data-index="${index}"
            aria-label="تقليل الكمية">

            <i class="fa-solid fa-minus"></i>

          </button>

          <span class="cart-quantity">
            ${item.qty}
          </span>

          <button
            type="button"
            class="cart-quantity-btn"
            data-cart-action="plus"
            data-index="${index}"
            aria-label="زيادة الكمية">

            <i class="fa-solid fa-plus"></i>

          </button>

          <button
            type="button"
            class="delete-btn"
            data-cart-action="remove"
            data-index="${index}"
            aria-label="حذف القطعة">

            <i class="fa-regular fa-trash-can"></i>

          </button>

        </div>

      </div>
    `;

    cartContainer.appendChild(cartItem);
  });


  const productsTotalElement =
    document.getElementById("cartProductsTotal");

  const deliveryElement =
    document.getElementById("cartDelivery");

  const deliveryTotalElement =
    document.getElementById("cartDeliveryTotal");

  const finalTotalElement =
    document.getElementById("cartFinalTotal");


  if (productsTotalElement) {
    productsTotalElement.innerText = formatPrice(productsTotal);
  }

  if (deliveryElement) {
    deliveryElement.innerText = formatPrice(deliveryPrice);
  }

  if (deliveryTotalElement) {
    deliveryTotalElement.innerText = formatPrice(deliveryPrice);
  }

  if (finalTotalElement) {
    finalTotalElement.innerText = formatPrice(getFinalTotal());
  }

  updateProductButtons();
}


// =========================================
// CART QUANTITY CONTROLS
// =========================================

if (cartContainer) {
  cartContainer.addEventListener("click", event => {
    const button = event.target.closest("[data-cart-action]");

    if (!button) return;

    const index = Number(button.dataset.index);
    const action = button.dataset.cartAction;

    const item = cart[index];

    if (!item) return;


    if (action === "plus") {
      if (item.qty >= item.stock_quantity) {
        showToast("لا توجد كمية إضافية متوفرة");
        return;
      }

      item.qty += 1;
    }


    if (action === "minus") {
      item.qty -= 1;

      if (item.qty <= 0) {
        cart.splice(index, 1);
      }
    }


    if (action === "remove") {
      cart.splice(index, 1);
    }

    updateCart();
  });
}


// =========================================
// PRODUCT BUTTON STATES
// =========================================

function updateProductButtons() {
  document.querySelectorAll(".product-card").forEach(card => {
    const addButton = card.querySelector(".openProduct");
    const plusButton = card.querySelector(".qtyPlus");
    const removeButton = card.querySelector(".removeProduct");

    if (!addButton) return;

    const productId = addButton.dataset.id;

    const exists = cart.some(item => item.id == productId);

    if (exists) {
      addButton.classList.add("is-added");

      addButton.innerHTML = `
        <i class="fa-solid fa-check"></i>
        <span>تمت الإضافة</span>
      `;

      if (plusButton) plusButton.style.display = "inline-flex";
      if (removeButton) removeButton.style.display = "inline-flex";

    } else {
      addButton.classList.remove("is-added");

      addButton.innerHTML = `
        <i class="fa-solid fa-bag-shopping"></i>
        <span>اختاري القطعة</span>
      `;

      if (plusButton) plusButton.style.display = "none";
      if (removeButton) removeButton.style.display = "none";
    }
  });
}


// =========================================
// OPEN CART
// =========================================

const cartButton = document.getElementById("cartButton");

if (cartButton) {
  cartButton.addEventListener("click", () => {
    updateCart();
    openModal(cartModal);
  });
}


const closeCartButton = document.getElementById("closeCartModal");

if (closeCartButton) {
  closeCartButton.addEventListener("click", () => {
    closeModal(cartModal);
  });
}


const continueShoppingButton =
  document.getElementById("continueShopping");

if (continueShoppingButton) {
  continueShoppingButton.addEventListener("click", () => {
    closeModal(cartModal);

    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}


// =========================================
// GOVERNORATES
// =========================================

async function loadGovernorates() {
  const box = document.getElementById("customerGovernorate");

  if (!box) return;

  const { data, error } = await supabase
    .from("governorates")
    .select("*");

  if (error) {
    console.error("Governorates error:", error);
    showToast("تعذر تحميل المحافظات");
    return;
  }

  box.innerHTML = `
    <option value="">اختاري المحافظة</option>
  `;

  (data || []).forEach(governorate => {
    box.innerHTML += `
      <option value="${escapeHTML(governorate.delivery_price)}">
        ${escapeHTML(governorate.name)}
      </option>
    `;
  });

  box.addEventListener("change", () => {
    deliveryPrice = Number(box.value || 0);
    updateCart();
  });
}


// =========================================
// CART STEP VALIDATION
// =========================================

// ملاحظة:
// التنقل بين خطوات السلة موجود في HTML inline script.
// هنا نحدّث الإجماليات فقط ونترك التنقل لذلك السكربت.


// =========================================
// RESERVE ORDER VIA WHATSAPP
// =========================================

const reserveButton = document.getElementById("reserveOrder");

if (reserveButton) {
  reserveButton.addEventListener("click", () => {

    if (!cart.length) {
      showToast("أضيفي منتجاً واحداً على الأقل");
      return;
    }

    const name =
      document.getElementById("customerName")?.value.trim() || "";

    const phoneInput =
      document.getElementById("customerPhone");

    const phone = (phoneInput?.value || "")
      .replace(/\s+/g, "")
      .replace(/-/g, "");

    const governorate =
      document.getElementById("customerGovernorate");

    const area =
      document.getElementById("customerArea")?.value.trim() || "";

    const nearest =
      document.getElementById("nearestPoint")?.value.trim() || "";


    if (!name) {
      showToast("يرجى إدخال الاسم الكامل");
      return;
    }

    if (name.length > 150) {
      showToast("الاسم يجب ألا يتجاوز 150 حرفاً");
      return;
    }

    const phoneRegex = /^(077|078|079|075)[0-9]{8}$/;

    if (!phoneRegex.test(phone)) {
      showToast("تأكدي من رقم الهاتف، يجب أن يتكون من 11 رقماً");
      phoneInput?.focus();
      return;
    }

    if (phoneInput) {
      phoneInput.value = phone;
    }

    if (!governorate?.value) {
      showToast("يرجى اختيار المحافظة");
      return;
    }

    if (!area) {
      showToast("يرجى إدخال المنطقة");
      return;
    }

    if (!nearest) {
      showToast("يرجى إدخال أقرب نقطة دالة");
      return;
    }


    const governorateName =
      governorate.options[governorate.selectedIndex].text;

    const productsTotal = getProductsTotal();
    const finalTotal = getFinalTotal();


    let message = `
مرحباً NIVRA 🌸
أرغب بتثبيت الحجز التالي:

━━━━━━━━━━━━━━
بيانات الزبونة
━━━━━━━━━━━━━━

الاسم: ${name}
الهاتف: ${phone}
المحافظة: ${governorateName}
المنطقة: ${area}
أقرب نقطة دالة: ${nearest}

━━━━━━━━━━━━━━
تفاصيل المنتجات
━━━━━━━━━━━━━━
`;


    cart.forEach((item, index) => {
      message += `
${index + 1}. ${item.name}
اللون: ${item.color}
المقاس: ${item.size}
الكمية: ${item.qty}
السعر: ${formatPrice(item.price * item.qty)} دينار
--------------------
`;
    });


    message += `
مجموع المنتجات: ${formatPrice(productsTotal)} دينار
التوصيل: ${formatPrice(deliveryPrice)} دينار

المجموع النهائي: ${formatPrice(finalTotal)} دينار

شكراً لاختياركم NIVRA 🤍
`;


    const whatsappURL =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    window.location.href = whatsappURL;

  });
}


// =========================================
// ORDER MODAL CLOSE
// =========================================

const closeOrderButton =
  document.getElementById("closeOrderModal");

if (closeOrderButton) {
  closeOrderButton.addEventListener("click", () => {
    closeModal(orderModal);
  });
}


// =========================================
// CONTACT MODAL
// =========================================

document.querySelectorAll("[data-open-contact]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    openModal(contactModal);
  });
});


const closeContactButton =
  document.getElementById("closeContactModal");

if (closeContactButton) {
  closeContactButton.addEventListener("click", () => {
    closeModal(contactModal);
  });
}


// إغلاق المودل عند الضغط على الخلفية
[orderModal, cartModal, contactModal].forEach(modal => {
  if (!modal) return;

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeModal(modal);
    }
  });
});


// إغلاق المودلات بزر Escape
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeAllModals();
  }
});


// =========================================
// IMAGE ZOOM
// =========================================

function openZoom(productId, imageSrc) {
  zoomProduct = products.find(item => item.id == productId);

  if (!zoomProduct) return;

  const images = getProductImages(zoomProduct);

  zoomIndex = images.indexOf(imageSrc);

  if (zoomIndex < 0) {
    zoomIndex = 0;
  }

  renderZoomImage();

  openModal(zoomModal);
}


function renderZoomImage() {
  if (!zoomProduct || !zoomImg) return;

  const images = getProductImages(zoomProduct);

  zoomImg.src = images[zoomIndex] || NO_IMAGE;
  zoomImg.alt = zoomProduct.name || "صورة المنتج";
}


function nextZoom() {
  if (!zoomProduct) return;

  const images = getProductImages(zoomProduct);

  if (images.length < 2) return;

  zoomIndex = (zoomIndex + 1) % images.length;

  renderZoomImage();
}


function prevZoom() {
  if (!zoomProduct) return;

  const images = getProductImages(zoomProduct);

  if (images.length < 2) return;

  zoomIndex = (zoomIndex - 1 + images.length) % images.length;

  renderZoomImage();
}


document.getElementById("closeZoom")?.addEventListener("click", () => {
  closeModal(zoomModal);
});


document.getElementById("zoomNext")?.addEventListener("click", nextZoom);

document.getElementById("zoomPrev")?.addEventListener("click", prevZoom);


if (zoomModal) {
  zoomModal.addEventListener("click", event => {
    if (event.target === zoomModal) {
      closeModal(zoomModal);
    }
  });
}


// =========================================
// SCROLL TO TOP
// =========================================

const scrollTopButton = document.getElementById("scrollTop");

if (scrollTopButton) {
  window.addEventListener("scroll", () => {
    scrollTopButton.classList.toggle(
      "is-visible",
      window.scrollY > 350
    );
  });

  scrollTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}


// =========================================
// PWA INSTALL
// =========================================

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}


function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}


function hideInstallSection() {
  document.querySelector(".install-section")?.style.setProperty("display", "none");

  document.querySelector(".benefits-section")?.style.setProperty("display", "none");
}


function handleInstallUI() {
  if (!installBtn) return;

  if (isInstalled()) {
    hideInstallSection();
    return;
  }

  installBtn.style.display = "flex";

  installBtn.innerHTML = `
    <span>تثبيت التطبيق</span>
    <i class="fa-solid fa-download"></i>
  `;
}


handleInstallUI();


window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();

  deferredPrompt = event;

  handleInstallUI();
});


function showInstallGuide() {
  if (isIOS()) {
    alert(
      "لتثبيت NIVRA على الآيفون:\n\n" +
      "1- افتحي الموقع من متصفح Safari.\n" +
      "2- اضغطي زر المشاركة.\n" +
      "3- اختاري إضافة إلى الشاشة الرئيسية.\n" +
      "4- اضغطي إضافة."
    );

    return;
  }

  alert(
    "لتثبيت NIVRA:\n\n" +
    "افتحي الموقع من Chrome أو المتصفح المدعوم، " +
    "ثم اختاري تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية."
  );
}


if (installBtn) {
  installBtn.addEventListener("click", async () => {

    if (isInstalled()) {
      hideInstallSection();
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();

      const choice = await deferredPrompt.userChoice;

      console.log("Install choice:", choice);

      deferredPrompt = null;

      handleInstallUI();

      return;
    }

    showInstallGuide();

  });
}


window.addEventListener("appinstalled", () => {
  hideInstallSection();
  deferredPrompt = null;
});


// =========================================
// SPLASH SCREEN
// =========================================

window.addEventListener("load", () => {
  const splash = document.getElementById("splashScreen");
  const fill = document.querySelector(".loader-fill");

  if (!splash) return;

  let progress = 0;

  const interval = setInterval(() => {
    progress += 10;

    if (fill) {
      fill.style.width = `${progress}%`;
    }

    if (progress >= 100) {
      clearInterval(interval);

      setTimeout(() => {
        splash.style.opacity = "0";
        splash.style.transition = "opacity 0.4s ease";

        setTimeout(() => {
          splash.style.display = "none";
        }, 400);

      }, 300);
    }

  }, 100);
});


// =========================================
// OFFLINE SYSTEM
// =========================================

const offlineScreen = document.getElementById("offlineScreen");
const offlineText = document.getElementById("offlineText");


function updateConnectionUI() {
  if (!offlineScreen) return;

  if (navigator.onLine) {
    offlineScreen.style.display = "none";
  } else {
    offlineScreen.style.display = "flex";

    if (offlineText) {
      offlineText.innerText =
        "تم انقطاع الاتصال بالإنترنت، يرجى التحقق من الشبكة.";
    }
  }
}


window.addEventListener("load", updateConnectionUI);


window.addEventListener("offline", () => {
  updateConnectionUI();
  showToast("تم انقطاع الاتصال بالإنترنت");
});


window.addEventListener("online", () => {
  if (offlineText) {
    offlineText.innerText = "تمت استعادة الاتصال";
  }

  if (offlineScreen) {
    offlineScreen.style.display = "flex";
  }

  showToast("تمت استعادة الاتصال بالإنترنت", "#25a56a");

  setTimeout(() => {
    if (offlineScreen) {
      offlineScreen.style.display = "none";
    }
  }, 1500);
});


// =========================================
// INITIALIZATION
// =========================================

async function initializeStore() {
  await Promise.all([
    loadCategories(),
    loadGovernorates()
  ]);

  updateCart();

  console.log("NIVRA Store initialized");
}


initializeStore();