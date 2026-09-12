/* =========================================================
   FIGURE SCRUB
   ADMIN DASHBOARD
   SUPABASE + AUTH + PRODUCTS + ORDERS + CUSTOMERS
   COUPONS + SUBSCRIBERS + MESSAGES + ANALYTICS + SETTINGS
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://fsbzopacumiuwjsegsgu.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_KBYOhE4HKCT-BsrKHgOlPg_Iry7wFWY";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================================
   STATE
========================================================= */

let products = [];
let orders = [];
let orderItems = [];
let customers = [];
let coupons = [];
let subscribers = [];
let messages = [];

let editingProductId = null;
let confirmCallback = null;
let currentUser = null;

/* =========================================================
   PRODUCT MEDIA + SIZE STOCK
========================================================= */

let currentProductImages = [];
let pendingProductImageFiles = [];
let currentSizeStock = {};

/* =========================================================
   HELPERS
========================================================= */

function money(value) {
    const number = Number(value || 0);

    return `${number.toLocaleString("en-EG")} EGP`;
}


function setText(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


function escapeHtml(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return date.toLocaleDateString(
        "en-EG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatDateTime(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return date.toLocaleString(
        "en-EG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}


function getSizeStock(product) {
    if (!product || !product.size_stock) {
        return {};
    }

    let value = product.size_stock;

    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
        } catch (error) {
            return {};
        }
    }

    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return {};
    }

    return value;
}


function getSizeStock(product) {

    let sizeStock = product?.size_stock;

    if (!sizeStock) {
        return {};
    }

    if (typeof sizeStock === "string") {

        try {
            sizeStock = JSON.parse(sizeStock);
        } catch {
            return {};
        }
    }

    if (
        !sizeStock ||
        typeof sizeStock !== "object" ||
        Array.isArray(sizeStock)
    ) {
        return {};
    }

    return sizeStock;
}


function getStock(product) {

    const sizeStock =
        getSizeStock(product);

    const quantities =
        Object.values(sizeStock);

    /*
       If the product has per-size stock,
       use the sum of all sizes.
    */

    if (quantities.length > 0) {

        return quantities.reduce(
            (total, quantity) => {

                return total +
                    Math.max(
                        0,
                        Number(quantity) || 0
                    );

            },
            0
        );
    }

    /*
       Backward compatibility
       for old products.
    */

    return Number(
        product?.stock ??
        product?.stock_quantity ??
        0
    );
}


function getProductImages(product) {
    if (!product) {
        return [];
    }

    let images = product.image_urls;

    if (typeof images === "string") {
        try {
            images = JSON.parse(images);
        } catch (error) {
            images = [];
        }
    }

    if (Array.isArray(images) && images.length > 0) {
        return images.filter(Boolean);
    }

    /*
      Compatibility مع المنتجات القديمة
      اللي عندها image_url فقط.
    */
    if (product.image_url) {
        return [product.image_url];
    }

    return [];
}

function getProductSizes(product) {
    let sizes =
        product?.sizes;

    if (!sizes) {
        return [];
    }

    if (Array.isArray(sizes)) {
        return sizes;
    }

    if (typeof sizes === "string") {

        try {
            const parsed =
                JSON.parse(sizes);

            if (
                Array.isArray(parsed)
            ) {
                return parsed;
            }

        } catch (error) {
            // Continue with comma split.
        }

        return sizes
            .split(",")
            .map(
                size =>
                    size.trim()
            )
            .filter(Boolean);
    }

    return [];
}


function getErrorMessage(error) {
    if (!error) {
        return "Something went wrong.";
    }

    if (error.message) {
        return error.message;
    }

    return "Something went wrong.";
}


/* =========================================================
   CUSTOMER HELPERS
========================================================= */

function customerName(customer) {
    return (
        customer?.name ||
        customer?.customer_name ||
        customer?.full_name ||
        "Unnamed Customer"
    );
}


function customerEmail(customer) {
    return (
        customer?.email ||
        customer?.customer_email ||
        "—"
    );
}


function customerPhone(customer) {
    return (
        customer?.phone ||
        customer?.customer_phone ||
        customer?.mobile ||
        customer?.phone_number ||
        "—"
    );
}


function customerGovernment(customer) {
    return (
        customer?.government ||
        customer?.governorate ||
        customer?.government_name ||
        "—"
    );
}


function customerAddress(customer) {
    return (
        customer?.address ||
        customer?.customer_address ||
        "—"
    );
}


function customerTotalOrders(customer) {
    const direct =
        customer?.total_orders ??
        customer?.orders_count;

    if (
        direct !== undefined &&
        direct !== null &&
        direct !== ""
    ) {
        return Number(direct || 0);
    }

    return customerOrders(
        customer
    ).length;
}


function customerTotalSpend(customer) {
    const direct =
        customer?.total_spend ??
        customer?.total_spending;

    if (
        direct !== undefined &&
        direct !== null &&
        direct !== ""
    ) {
        return Number(direct || 0);
    }

    return customerOrders(
        customer
    ).reduce(
        (
            total,
            order
        ) =>
            total +
            orderTotal(order),
        0
    );
}


function customerVip(customer) {
    if (
        customer?.is_vip === true ||
        customer?.vip === true
    ) {
        return true;
    }

    return (
        customerTotalOrders(
            customer
        ) > 3
    );
}


function customerCreatedAt(customer) {
    return (
        customer?.created_at ||
        customer?.createdAt ||
        null
    );
}


function customerOrders(customer) {
    if (!customer) {
        return [];
    }

    const email =
        normalize(
            customerEmail(customer)
        );

    const phone =
        normalize(
            customerPhone(customer)
        );

    return orders.filter(order => {

        const orderEmail =
            normalize(
                order.customer_email ||
                order.email
            );

        const orderPhone =
            normalize(
                order.customer_phone ||
                order.phone
            );

        if (
            email &&
            email !== "—" &&
            orderEmail &&
            orderEmail === email
        ) {
            return true;
        }

        if (
            phone &&
            phone !== "—" &&
            orderPhone &&
            orderPhone === phone
        ) {
            return true;
        }

        return false;
    });
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(
    message,
    type = "success"
) {
    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {
        return;
    }

    clearTimeout(
        toastTimer
    );

    toast.textContent =
        message;

    toast.className =
        `toast show ${type}`;

    toastTimer =
        setTimeout(
            () => {
                toast.classList.remove(
                    "show"
                );
            },
            3500
        );
}


/* =========================================================
   CONFIRM MODAL
========================================================= */

function showConfirm(
    title,
    message,
    callback
) {
    setText(
        "confirmTitle",
        title
    );

    setText(
        "confirmMessage",
        message
    );

    confirmCallback =
        callback;

    openModal(
        "confirmModal"
    );
}


function closeConfirm() {
    confirmCallback =
        null;

    closeModal(
        "confirmModal"
    );
}


function runConfirmAction() {
    if (
        typeof confirmCallback ===
        "function"
    ) {
        const callback =
            confirmCallback;

        confirmCallback =
            null;

        closeModal(
            "confirmModal"
        );

        callback();
    }
}


/* =========================================================
   MODALS
========================================================= */

function openModal(id) {
    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.add(
        "active"
    );

    document.body.style.overflow =
        "hidden";
}


function closeModal(id) {
    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "active"
    );

    if (
        !document.querySelector(
            ".modal-overlay.active"
        )
    ) {
        document.body.style.overflow =
            "";
    }
}


/* =========================================================
   AUTH
========================================================= */

async function checkAdminSession() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .getSession();

        if (error) {
            throw error;
        }

        const session =
            data?.session;

        if (!session) {

            window.location.href =
                "admin-login.html";

            return false;
        }

        currentUser =
            session.user;

        setText(
            "adminEmail",
            currentUser.email ||
            "Admin"
        );

        return true;

    } catch (error) {

        console.error(
            "Auth error:",
            error
        );

        showToast(
            "Unable to verify admin session.",
            "error"
        );

        return false;
    }
}


/* =========================================================
   ADMIN CHECK
========================================================= */

async function verifyAdmin() {

    if (!currentUser) {
        return false;
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("admin_users")
                .select(
                    "id,email,role"
                )
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();

        if (error) {

            console.warn(
                "Admin table check:",
                error
            );

            return true;
        }

        if (
            !data ||
            data.role !== "admin"
        ) {

            showToast(
                "This account is not authorized as an admin.",
                "error"
            );

            await supabaseClient
                .auth
                .signOut();

            setTimeout(
                () => {
                    window.location.href =
                        "admin-login.html";
                },
                1000
            );

            return false;
        }

        return true;

    } catch (error) {

        console.error(
            "Admin verification error:",
            error
        );

        return true;
    }
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    showConfirm(
        "Logout",
        "Are you sure you want to logout?",
        async () => {

            const {
                error
            } =
                await supabaseClient
                    .auth
                    .signOut();

            if (error) {

                showToast(
                    error.message,
                    "error"
                );

                return;
            }

            window.location.href =
                "admin-login.html";
        }
    );
}


/* =========================================================
   LOAD ALL DATA
========================================================= */

async function loadAllData() {

    showToast(
        "Loading dashboard...",
        "success"
    );

    await Promise.all([
        loadProducts(),
        loadOrders(),
        loadCustomers(),
        loadCoupons(),
        loadSubscribers(),
        loadMessages()
    ]);

    renderEverything();
}


/* =========================================================
   PRODUCTS
========================================================= */

async function loadProducts() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("products")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        products =
            data || [];

    } catch (error) {

        console.error(
            "Products:",
            error
        );

        products = [];

        showToast(
            "Could not load products.",
            "error"
        );
    }
}


function populateProductFilters() {

    const colorSelect =
        document.getElementById(
            "productColorFilter"
        );

    const sizeSelect =
        document.getElementById(
            "productSizeFilter"
        );

    if (
        !colorSelect ||
        !sizeSelect
    ) {
        return;
    }

    const currentColor =
        colorSelect.value;

    const currentSize =
        sizeSelect.value;

    const colors =
        [
            ...new Set(
                products
                    .map(
                        product =>
                            product.color
                    )
                    .filter(Boolean)
                    .map(
                        color =>
                            String(
                                color
                            ).trim()
                    )
            )
        ]
            .sort(
                (a, b) =>
                    a.localeCompare(b)
            );

    const sizes =
        [
            ...new Set(
                products.flatMap(
                    product =>
                        getProductSizes(
                            product
                        )
                )
            )
        ]
            .sort();

    colorSelect.innerHTML =
        `<option value="">All Colors</option>` +
        colors
            .map(
                color =>
                    `<option value="${escapeHtml(color)}">${escapeHtml(color)}</option>`
            )
            .join("");

    sizeSelect.innerHTML =
        `<option value="">All Sizes</option>` +
        sizes
            .map(
                size =>
                    `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`
            )
            .join("");

    colorSelect.value =
        currentColor;

    sizeSelect.value =
        currentSize;
}


function getColorValue(color) {

    const name =
        normalize(color);

    const colors = {
        black: "#1d1d1d",
        white: "#ffffff",
        ivory: "#f3eee3",
        cream: "#eee6d5",
        navy: "#243b5a",
        blue: "#547da7",
        "baby blue": "#a8c8dc",
        green: "#4f6f62",
        "forest green": "#315648",
        sage: "#9caf9f",
        olive: "#737b4d",
        beige: "#c9b99c",
        brown: "#765844",
        mocha: "#9a7761",
        pink: "#d59aaa",
        rose: "#bc7c8f",
        blush: "#e7b9c3",
        lavender: "#9b7cab",
        purple: "#80658d",
        grey: "#8b918f",
        gray: "#8b918f",
        burgundy: "#6e3444",
        maroon: "#692f3d",
        red: "#b5535e"
    };

    if (colors[name]) {
        return colors[name];
    }

    let hash = 0;

    for (
        let i = 0;
        i < name.length;
        i++
    ) {
        hash =
            name.charCodeAt(i) +
            ((hash << 5) - hash);
    }

    const hue =
        Math.abs(hash) % 360;

    return `hsl(${hue}, 28%, 48%)`;
}


function productColorHTML(color) {

    if (!color) {
        return "—";
    }

    return `
        <div class="color-cell">

            <span
                class="color-dot"
                style="background:${getColorValue(color)}">
            </span>

            <span>
                ${escapeHtml(color)}
            </span>

        </div>
    `;
}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts() {

    const tbody =
        document.getElementById(
            "productsTable"
        );

    if (!tbody) {
        return;
    }

    const search =
        normalize(
            document.getElementById(
                "productSearch"
            )?.value
        );

    const category =
        document.getElementById(
            "productCategoryFilter"
        )?.value || "";

    const color =
        document.getElementById(
            "productColorFilter"
        )?.value || "";

    const size =
        document.getElementById(
            "productSizeFilter"
        )?.value || "";

    const stock =
        document.getElementById(
            "productStockFilter"
        )?.value || "";

    const tag =
        document.getElementById(
            "productTagFilter"
        )?.value || "";

    const filtered =
        products.filter(
            product => {

                const productText =
                    normalize(
                        [
                            product.name,
                            product.color,
                            product.subcategory,
                            product.category
                        ].join(" ")
                    );

                const sizes =
                    getProductSizes(
                        product
                    );

                const productStock =
                    getStock(product);

                if (
                    search &&
                    !productText.includes(
                        search
                    )
                ) {
                    return false;
                }

                if (
                    category &&
                    product.category !==
                    category
                ) {
                    return false;
                }

                if (
                    color &&
                    product.color !==
                    color
                ) {
                    return false;
                }

                if (
                    size &&
                    !sizes.includes(size)
                ) {
                    return false;
                }

                if (
                    stock === "available" &&
                    productStock <= 0
                ) {
                    return false;
                }

                if (
                    stock === "out" &&
                    productStock > 0
                ) {
                    return false;
                }

                if (
                    tag === "best" &&
                    !(
                        product.is_best_seller ||
                        product.is_most_ordered
                    )
                ) {
                    return false;
                }

                if (
                    tag === "new" &&
                    !(
                        product.is_just_arrived ||
                        product.is_new
                    )
                ) {
                    return false;
                }

                return true;
            }
        );

    if (!filtered.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">

                    <div class="empty-state">

                        <div class="empty-state-icon">
                            ◈
                        </div>

                        <strong>
                            No products found
                        </strong>

                        <p>
                            Try changing your filters.
                        </p>

                    </div>

                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        filtered
            .map(
                product => {

                    const stock =
                        getStock(product);

                    const sizes =
                        getProductSizes(
                            product
                        );

                    const tags = [];

                    if (
                        product.is_best_seller ||
                        product.is_most_ordered
                    ) {
                        tags.push(
                            `<span class="tag best">Best Seller</span>`
                        );
                    }

                    if (
                        product.is_just_arrived ||
                        product.is_new
                    ) {
                        tags.push(
                            `<span class="tag new">Just Arrived</span>`
                        );
                    }

                    if (
                        !product.is_active
                    ) {
                        tags.push(
                            `<span class="tag hidden">Hidden</span>`
                        );
                    }

                    if (
                        stock <= 0
                    ) {
                        tags.push(
                            `<span class="tag sold">Sold Out</span>`
                        );
                    }

                    let stockClass =
                        "";

                    if (
                        stock <= 0
                    ) {
                        stockClass =
                            "out";
                    } else if (
                        stock <= 5
                    ) {
                        stockClass =
                            "low";
                    }

                    return `
                        <tr>

                            <td>

                                <div class="table-product">

                                    ${
                                        product.image_url
                                        ?
                                        `
                                        <img
                                            class="table-product-image"
                                            src="${escapeHtml(product.image_url)}"
                                            alt="${escapeHtml(product.name)}">
                                        `
                                        :
                                        `<div class="table-product-image"></div>`
                                    }

                                    <div class="table-product-info">

                                        <strong>
                                            ${escapeHtml(
                                                product.name
                                            )}
                                        </strong>

                                        <small>
                                            ${
                                                sizes.length
                                                ?
                                                sizes.join(", ")
                                                :
                                                "No sizes"
                                            }
                                        </small>

                                    </div>

                                </div>

                            </td>

                            <td>
                                ${escapeHtml(
                                    product.category ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${productColorHTML(
                                    product.color
                                )}
                            </td>

                            <td>

                                <strong>
                                    ${money(
                                        product.price
                                    )}
                                </strong>

                                ${
                                    product.old_price
                                    ?
                                    `
                                    <br>

                                    <del
                                        style="
                                            color:#aaa;
                                            font-size:.5rem;
                                        ">
                                        ${money(
                                            product.old_price
                                        )}
                                    </del>
                                    `
                                    :
                                    ""
                                }

                            </td>

                            <td>

                                <span
                                    class="stock-number ${stockClass}">
                                    ${stock}
                                </span>

                            </td>

                            <td>

                                <div class="tags">

                                    ${
                                        tags.length
                                        ?
                                        tags.join("")
                                        :
                                        `<span class="tag">Standard</span>`
                                    }

                                </div>

                            </td>

                            <td>

                                <div class="action-group">

                                    <button
                                        class="table-action"
                                        data-action="edit-product"
                                        data-id="${product.id}">
                                        Edit
                                    </button>

                                    <button
                                        class="table-action delete"
                                        data-action="delete-product"
                                        data-id="${product.id}">
                                        Delete
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   PRODUCT ADMIN CARDS
========================================================= */

function productAdminCard(
    product,
    type = ""
) {

    const stock =
        getStock(product);

    let badge =
        "Product";

    if (type === "best") {
        badge =
            "Best Seller";
    }

    if (type === "new") {
        badge =
            "Just Arrived";
    }

    if (type === "sold") {
        badge =
            "Sold Out";
    }

    return `
        <div class="admin-product-card">

            <div class="admin-product-image-wrap">

                ${
                    product.image_url
                    ?
                    `
                    <img
                        src="${escapeHtml(product.image_url)}"
                        class="admin-product-image"
                        alt="${escapeHtml(product.name)}">
                    `
                    :
                    ""
                }

                <span class="admin-product-badge">
                    ${badge}
                </span>

            </div>

            <div class="admin-product-content">

                <h4>
                    ${escapeHtml(product.name)}
                </h4>

                <div class="admin-product-color">

                    <span
                        class="color-dot"
                        style="background:${getColorValue(product.color)}">
                    </span>

                    ${escapeHtml(
                        product.color ||
                        "No color"
                    )}

                </div>

                <div class="admin-product-price">

                    <strong>
                        ${money(product.price)}
                    </strong>

                    ${
                        product.old_price
                        ?
                        `<del>${money(product.old_price)}</del>`
                        :
                        ""
                    }

                </div>

                <div class="admin-product-actions">

                    <button
                        class="secondary-btn"
                        data-action="edit-product"
                        data-id="${product.id}">
                        Edit
                    </button>

                    ${
                        type !== "sold"
                        ?
                        `
                        <button
                            class="table-action delete"
                            data-action="delete-product"
                            data-id="${product.id}">
                            Delete
                        </button>
                        `
                        :
                        ""
                    }

                </div>

            </div>

        </div>
    `;
}


function emptyHTML(
    title,
    message
) {

    return `
        <div
            class="empty-state"
            style="grid-column:1/-1;">

            <div class="empty-state-icon">
                ◈
            </div>

            <strong>
                ${escapeHtml(title)}
            </strong>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>
    `;
}


function renderBestSellers() {

    const container =
        document.getElementById(
            "bestSellersGrid"
        );

    if (!container) {
        return;
    }

    const list =
        products.filter(
            product =>
                product.is_best_seller ||
                product.is_most_ordered
        );

    if (!list.length) {

        container.innerHTML =
            emptyHTML(
                "No Best Sellers",
                "Choose products as Best Sellers from Products."
            );

        return;
    }

    container.innerHTML =
        list
            .map(
                product =>
                    productAdminCard(
                        product,
                        "best"
                    )
            )
            .join("");
}


function renderJustArrived() {

    const container =
        document.getElementById(
            "justArrivedGrid"
        );

    if (!container) {
        return;
    }

    const list =
        products.filter(
            product =>
                product.is_just_arrived ||
                product.is_new
        );

    if (!list.length) {

        container.innerHTML =
            emptyHTML(
                "No New Products",
                "Choose products as Just Arrived from Products."
            );

        return;
    }

    container.innerHTML =
        list
            .map(
                product =>
                    productAdminCard(
                        product,
                        "new"
                    )
            )
            .join("");
}


function renderSoldOut() {

    const container =
        document.getElementById(
            "soldOutGrid"
        );

    if (!container) {
        return;
    }

    const list =
        products.filter(
            product =>
                getStock(product) <= 0
        );

    if (!list.length) {

        container.innerHTML =
            emptyHTML(
                "Nothing is Sold Out",
                "All active products currently have stock."
            );

        return;
    }

    container.innerHTML =
        list
            .map(
                product =>
                    productAdminCard(
                        product,
                        "sold"
                    )
            )
            .join("");
}


/* =========================================================
   PRODUCT MODAL
========================================================= */

function resetProductForm() {
    const form = document.getElementById("productForm");

    if (form) {
        form.reset();
    }
const genderInput =
    document.getElementById("productGender");

if (genderInput) {
    genderInput.value = "both";
}
    setText("productModalTitle", "Add Product");

    const idInput = document.getElementById("productId");

    if (idInput) {
        idInput.value = "";
    }

    editingProductId = null;

    /*
      Reset images
    */
    currentProductImages = [];
    pendingProductImageFiles = [];

    const imageInput = document.getElementById("productImages");

    if (imageInput) {
        imageInput.value = "";
    }

    const oldImageInput = document.getElementById("productImage");

    if (oldImageInput) {
        oldImageInput.value = "";
    }

    renderProductImagesPreview();

    /*
      Reset size stock
    */
    currentSizeStock = {};

    renderSizeStockInputs([], {});

    const stockInput = document.getElementById("productStock");

    if (stockInput) {
        stockInput.value = "0";
    }

    /*
      Reset size chart
    */
    setPreview(
        "sizeChartPreview",
        null,
        "Size Chart"
    );

    const active = document.getElementById("productActive");

    if (active) {
        active.checked = true;
    }
}


function setPreview(
    previewId,
    url,
    fallbackText
) {

    const preview =
        document.getElementById(
            previewId
        );

    if (!preview) {
        return;
    }

    if (url) {

        preview.innerHTML = `
            <img
                src="${escapeHtml(url)}"
                alt="Preview">
        `;

    } else {

        preview.innerHTML =
            `<span>${escapeHtml(
                fallbackText
            )}</span>`;
    }
}


function openAddProduct() {
    resetProductForm();

    openModal(
        "productModal"
    );
}


function openEditProduct(id) {
    const product = products.find(
        item => String(item.id) === String(id)
    );
const genderInput =
    document.getElementById("productGender");

if (genderInput) {
    genderInput.value =
        product.gender || "both";
}
    if (!product) {
        showToast?.(
            "Product not found.",
            "error"
        );

        return;
    }

    editingProductId = product.id;

    setText(
        "productModalTitle",
        "Edit Product"
    );

    document.getElementById("productId").value =
        product.id;

    document.getElementById("productName").value =
        product.name || "";

    document.getElementById("productCategory").value =
        product.category || "";

    document.getElementById("productSubcategory").value =
        product.subcategory || "";

    document.getElementById("productColor").value =
        product.color || "";

    const sizes = getProductSizes(product);

    document.getElementById("productSizes").value =
        sizes.join(", ");

    document.getElementById("productPrice").value =
        product.price ?? "";

    document.getElementById("productOldPrice").value =
        product.old_price ?? "";

    document.getElementById("productDescription").value =
        product.description || "";

    document.getElementById("productBestSeller").checked =
        Boolean(
            product.is_best_seller ||
            product.is_most_ordered
        );

    document.getElementById("productJustArrived").checked =
        Boolean(
            product.is_just_arrived ||
            product.is_new
        );

    document.getElementById("productActive").checked =
        product.is_active !== false;


    /*
      ================================
      PRODUCT IMAGES
      ================================
    */

    currentProductImages =
        getProductImages(product);

    pendingProductImageFiles = [];

    const imageInput =
        document.getElementById("productImages");

    if (imageInput) {
        imageInput.value = "";
    }

    renderProductImagesPreview();


    /*
      ================================
      SIZE STOCK
      ================================
    */

    const sizeStock =
        getSizeStock(product);

    renderSizeStockInputs(
        sizes,
        sizeStock
    );

    /*
      لو المنتج قديم ولسه مفيهوش
      size_stock، نعرض الـ stock القديم
      بدون ما نعتبره موزع على المقاسات.
    */
    if (
        Object.keys(sizeStock).length === 0
    ) {
        const stockInput =
            document.getElementById("productStock");

        if (stockInput) {
            stockInput.value =
                getStock(product);
        }
    }


    /*
      ================================
      SIZE CHART
      ================================
    */

    setPreview(
        "sizeChartPreview",
        product.size_chart_url,
        "Size Chart"
    );

    openModal("productModal");
}


/* =========================================================
   IMAGE UPLOAD
========================================================= */

async function uploadImage(
    file,
    folder
) {

    if (!file) {
        return null;
    }

    const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (
        !allowed.includes(
            file.type
        )
    ) {
        throw new Error(
            "Please upload JPG, PNG, WEBP or GIF image."
        );
    }

    if (
        file.size >
        5 * 1024 * 1024
    ) {
        throw new Error(
            "Image must be smaller than 5MB."
        );
    }

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    const filename =
        `${crypto.randomUUID()}.${extension}`;

    const path =
        `${folder}/${filename}`;

    const {
        error
    } =
        await supabaseClient
            .storage
            .from("product-images")
            .upload(
                path,
                file,
                {
                    cacheControl: "3600",
                    upsert: false
                }
            );

    if (error) {
        throw error;
    }

    const {
        data
    } =
        supabaseClient
            .storage
            .from("product-images")
            .getPublicUrl(
                path
            );

    return data.publicUrl;
}


/* =========================================================
   SAVE PRODUCT
========================================================= */

async function saveProduct(event) {
    if (event) {
        event.preventDefault();
    }

    const name =
        document.getElementById("productName")?.value.trim();

    const category =
        document.getElementById("productCategory")?.value.trim();

    const subcategory =
        document.getElementById("productSubcategory")?.value.trim();

    const color =
        document.getElementById("productColor")?.value.trim();

    const sizes =
        parseProductSizes(
            document.getElementById("productSizes")?.value
        );

    const price =
        Number(
            document.getElementById("productPrice")?.value
        );

    const oldPriceRaw =
        document.getElementById("productOldPrice")?.value;

    const oldPrice =
        oldPriceRaw === ""
            ? null
            : Number(oldPriceRaw);

    const description =
        document.getElementById("productDescription")?.value.trim();

    const bestSeller =
        Boolean(
            document.getElementById("productBestSeller")?.checked
        );

    const justArrived =
        Boolean(
            document.getElementById("productJustArrived")?.checked
        );

    const active =
        document.getElementById("productActive")?.checked !== false;

const genderInput =
    document.getElementById("productGender");

const gender =
    genderInput?.value || "both";
    /*
      ================================
      VALIDATION
      ================================
    */

    if (!name) {
        showToast?.(
            "Please enter product name.",
            "error"
        );

        return;
    }

    if (!category) {
        showToast?.(
            "Please select a category.",
            "error"
        );

        return;
    }

    if (!Number.isFinite(price) || price < 0) {
        showToast?.(
            "Please enter a valid price.",
            "error"
        );

        return;
    }

    if (sizes.length === 0) {
        showToast?.(
            "Please add at least one product size.",
            "error"
        );

        return;
    }


    /*
      ================================
      SIZE STOCK
      ================================
    */

    const sizeStock =
        readSizeStock();

    const totalStock =
        calculateTotalSizeStock(sizeStock);

    /*
      Make sure every size has a stock value.
    */
    const missingSizeStock =
        sizes.some(
            size =>
                !Object.prototype.hasOwnProperty.call(
                    sizeStock,
                    size
                )
        );

    if (missingSizeStock) {
        showToast?.(
            "Please set stock for every size.",
            "error"
        );

        return;
    }


      /*
      ================================
      PRODUCT IMAGES
      ================================
    */

    const newImageFiles =
        Array.isArray(pendingProductImageFiles)
            ? pendingProductImageFiles
            : [];


    /*
      ================================
      UPLOAD PRODUCT IMAGES
      ================================
    */

    let uploadedImageUrls = [];

    try {
        if (newImageFiles.length > 0) {
            uploadedImageUrls =
                await Promise.all(
                    newImageFiles.map(file =>
                        uploadImage(
                            file,
                            "products"
                        )
                    )
                );
        }
    } catch (error) {
        console.error(
            "Product image upload error:",
            error
        );

        showToast?.(
            getErrorMessage(
                error,
                "Failed to upload product images."
            ),
            "error"
        );

        return;
    }


    /*
      ================================
      EXISTING IMAGES + NEW IMAGES
      ================================
    */

    const finalImageUrls = [
        ...(currentProductImages || []),
        ...uploadedImageUrls.filter(Boolean)
    ];


    /*
      ================================
      MAIN IMAGE
      ================================
    */

    const mainImageUrl =
        finalImageUrls[0] || null;


    /*
      ================================
      SIZE CHART
      ================================
    */

    const sizeChartInput =
        document.getElementById("sizeChartImage");

    let sizeChartUrl = null;

    try {
        if (sizeChartInput?.files?.length) {
            sizeChartUrl =
                await uploadImage(
                    sizeChartInput.files[0],
                    "size-charts"
                );
        }
    } catch (error) {
        console.error(
            "Size chart upload error:",
            error
        );

        showToast?.(
            getErrorMessage(
                error,
                "Failed to upload size chart."
            ),
            "error"
        );

        return;
    }


    /*
      ================================
      PAYLOAD
      ================================
    */

    const payload = {
        name,

        category,

        subcategory:
            subcategory || null,

        color:
            color || null,

        sizes,

        price,

        old_price:
            oldPrice,

        /*
          Legacy total stock.
          This is now automatically calculated.
        */
        stock:
            totalStock,

        /*
          NEW:
          stock per size
        */
        size_stock:
            sizeStock,

        description:
            description || null,

        gender,

        is_best_seller:
            bestSeller,

        is_just_arrived:
            justArrived,

        is_most_ordered:
            bestSeller,

        is_new:
            justArrived,

        is_active:
            active
    };


    /*
      Only update images if new images
      were actually selected OR if this
      is a new product.
    */

    if (finalImageUrls.length > 0) {
        payload.image_urls =
            finalImageUrls;

        payload.image_url =
            mainImageUrl;
    }


    /*
      Keep existing size chart if
      no new one was uploaded.
    */

    if (sizeChartUrl) {
        payload.size_chart_url =
            sizeChartUrl;
    }


    /*
      ================================
      SAVE TO SUPABASE
      ================================
    */

    try {
        let result;

        if (editingProductId) {
            result =
                await supabaseClient
                    .from("products")
                    .update(payload)
                    .eq(
                        "id",
                        editingProductId
                    );
        } else {
            result =
                await supabaseClient
                    .from("products")
                    .insert(payload);
        }

        if (result.error) {
            throw result.error;
        }


        /*
          Reload products
        */

        await loadProducts();

        renderEverything();


        /*
          Close modal
        */

        closeModal("productModal");


        /*
          Reset state
        */

        resetProductForm();


        showToast?.(
            editingProductId
                ? "Product updated successfully."
                : "Product added successfully.",
            "success"
        );

    } catch (error) {
        console.error(
            "Save product error:",
            error
        );

        showToast?.(
            getErrorMessage(
                error,
                "Failed to save product."
            ),
            "error"
        );
    }
}

/* =========================================================
   DELETE PRODUCT
========================================================= */

async function deleteProduct(id) {

    const product =
        products.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!product) {
        return;
    }

    showConfirm(
        "Delete Product",
        `Delete "${product.name}" permanently? This cannot be undone.`,
        async () => {

            try {

                const {
                    error
                } =
                    await supabaseClient
                        .from("products")
                        .delete()
                        .eq(
                            "id",
                            id
                        );

                if (error) {
                    throw error;
                }

                showToast(
                    "Product deleted.",
                    "success"
                );

                await loadProducts();

                renderEverything();

            } catch (error) {

                console.error(
                    error
                );

                showToast(
                    getErrorMessage(error),
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   ORDERS
========================================================= */

async function loadOrders() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("orders")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        orders =
            data || [];

    } catch (error) {

        console.error(
            "Orders:",
            error
        );

        orders = [];

        showToast(
            "Could not load orders.",
            "error"
        );
    }

    await loadOrderItems();
}


async function loadOrderItems() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("order-items")
                .select("*");

        if (error) {
            throw error;
        }

        orderItems =
            data || [];

    } catch (error) {

        console.warn(
            "Order items:",
            error
        );

        orderItems = [];
    }
}


function orderNumber(order) {
    return (
        order.order_number ||
        order.id?.slice(0, 8) ||
        "—"
    );
}


function orderTotal(order) {
    return Number(
        order.total ??
        order.total_amount ??
        0
    );
}


function orderStatusClass(status) {
    return normalize(status)
        .replace(
            /\s+/g,
            "-"
        );
}


function statusBadge(status) {

    const safeStatus =
        status ||
        "Pending";

    return `
        <span
            class="status-badge ${orderStatusClass(safeStatus)}">
            ${escapeHtml(
                safeStatus
            )}
        </span>
    `;
}
function paymentStatusBadge(order) {

    const method =
        normalize(
            order.payment_method || ""
        );

    // Cash on Delivery does not need payment verification
    if (
        method.includes("cash") ||
        method.includes("cod") ||
        method.includes("الدفع عند الاستلام")
    ) {
        return `
            <span class="status-badge not-required">
                Not Required
            </span>
        `;
    }

    const paymentStatus =
        normalize(
            order.payment_status || ""
        );

    if (
        paymentStatus === "paid" ||
        paymentStatus === "completed"
    ) {
        return `
            <span class="status-badge paid">
                Paid
            </span>
        `;
    }

    return `
        <span class="status-badge payment-pending">
            Payment Pending
        </span>
    `;
}
function paymentStatusRequiresVerification(order) {

    const method =
        normalize(
            order.payment_method || ""
        );

    const paymentStatus =
        normalize(
            order.payment_status || ""
        );

    const isCash =
        method.includes("cash") ||
        method.includes("cod") ||
        method.includes("الدفع عند الاستلام");

    return (
        !isCash &&
        paymentStatus !== "paid" &&
        paymentStatus !== "completed"
    );
}
function renderOrders() {

    const tbody =
        document.getElementById(
            "ordersTable"
        );

    if (!tbody) {
        return;
    }

    const search =
        normalize(
            document.getElementById(
                "orderSearch"
            )?.value
        );

    const status =
        document.getElementById(
            "orderStatusFilter"
        )?.value || "";

    const filtered =
        orders.filter(
            order => {

                const searchable =
                    normalize(
                        [
                            orderNumber(order),
                            order.customer_name,
                            order.name,
                            order.customer_phone,
                            order.phone,
                            order.whatsapp,
                            order.customer_email
                        ].join(" ")
                    );

                if (
                    search &&
                    !searchable.includes(
                        search
                    )
                ) {
                    return false;
                }

                if (
                    status &&
                    order.status !==
                    status
                ) {
                    return false;
                }

                return true;
            }
        );

    if (!filtered.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="9">

                    <div class="empty-state">

                        <div class="empty-state-icon">
                            ▣
                        </div>

                        <strong>
                            No orders found
                        </strong>

                        <p>
                            There are no orders matching your filters.
                        </p>

                    </div>

                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        filtered
            .map(
                order => `
                    <tr>

                        <td>
                            <strong>
                                #${escapeHtml(
                                    orderNumber(order)
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHtml(
                                order.customer_name ||
                                order.name ||
                                "Guest"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                order.customer_phone ||
                                order.phone ||
                                "—"
                            )}
                        </td>

                        <td>
                            <strong>
                                ${money(
                                    orderTotal(order)
                                )}
                            </strong>
                        </td>

                        <td>
    ${escapeHtml(
        order.payment_method ||
        "—"
    )}
</td>

<td>
    ${paymentStatusBadge(order)}
</td>

<td>
    ${statusBadge(
        order.status
    )}
</td>
                        <td>
                            ${formatDate(
                                order.created_at
                            )}
                        </td>

                        <td>

                            <div class="action-group">

                                <button
                                    class="table-action"
                                    data-action="view-order"
                                    data-id="${order.id}">
                                    View
                                </button>

                                <button
                                    class="table-action delete"
                                    data-action="delete-order"
                                    data-id="${order.id}">
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>
                `
            )
            .join("");
}


/* =========================================================
   VIEW ORDER
========================================================= */

function getItemsForOrder(
    orderId
) {

    return orderItems.filter(
        item =>
            String(item.order_id) ===
            String(orderId)
    );
}


function viewOrder(id) {

    const order =
        orders.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!order) {
        return;
    }

    setText(
        "orderModalTitle",
        `Order #${orderNumber(order)}`
    );

    const items =
        getItemsForOrder(
            order.id
        );

    const details =
        document.getElementById(
            "orderDetails"
        );

    if (!details) {
        return;
    }

    const statusOptions = [
        "Pending",
        "Confirmed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled"
    ];

    details.innerHTML = `
        <div class="order-details-grid">

            <div class="order-detail-box">
                <span>Customer</span>

                <strong>
                    ${escapeHtml(
                        order.customer_name ||
                        order.name ||
                        "Guest"
                    )}
                </strong>
            </div>

            <div class="order-detail-box">
                <span>Phone</span>

                <strong>
                    ${escapeHtml(
                        order.customer_phone ||
                        order.phone ||
                        "—"
                    )}
                </strong>
            </div>

            <div class="order-detail-box">
                <span>WhatsApp</span>

                <strong>
                    ${escapeHtml(
                        order.whatsapp ||
                        "—"
                    )}
                </strong>
            </div>

            <div class="order-detail-box">
                <span>Email</span>

                <strong>
                    ${escapeHtml(
                        order.customer_email ||
                        "—"
                    )}
                </strong>
            </div>

            <div class="order-detail-box">
                <span>Governorate</span>

                <strong>
                    ${escapeHtml(
                        order.governorate ||
                        "—"
                    )}
                </strong>
            </div>

            <div class="order-detail-box">
                <span>Address</span>

                <strong>
                    ${escapeHtml(
                        order.address ||
                        "—"
                    )}
                </strong>
            </div>

            <div class="order-detail-box">
                <span>Payment Method</span>

                <strong>
                    ${escapeHtml(
                        order.payment_method ||
                        "—"
                    )}
                </strong>
            </div>
<div class="order-detail-box">
    <span>Payment Status</span>

    <div>
        ${paymentStatusBadge(order)}

        ${
            paymentStatusRequiresVerification(order)
                ? `
                    <button
                        type="button"
                        class="primary-btn"
                        data-action="mark-payment-paid"
                        data-id="${order.id}"
                        style="margin-top: 10px;">
                        ✓ Mark as Paid
                    </button>
                `
                : ""
        }
    </div>
</div>
            <div class="order-detail-box">
                <span>Order Date</span>

                <strong>
                    ${formatDateTime(
                        order.created_at
                    )}
                </strong>
            </div>

            <div class="order-detail-box">

                <span>Status</span>

                <select
                    id="orderStatusSelect"
                    data-order-id="${order.id}">

                    ${statusOptions
                        .map(
                            option => `
                                <option
                                    value="${option}"
                                    ${
                                        order.status ===
                                        option
                                        ?
                                        "selected"
                                        :
                                        ""
                                    }>
                                    ${option}
                                </option>
                            `
                        )
                        .join("")}

                </select>

            </div>

        </div>

        <div class="order-items-list">

            <p class="section-kicker">
                PRODUCTS
            </p>

            ${
                items.length
                ?
                items
                    .map(
                        item => `
                            <div class="order-item">

                                ${
                                    item.product_image
                                    ?
                                    `
                                    <img
                                        src="${escapeHtml(
                                            item.product_image
                                        )}"
                                        alt="${escapeHtml(
                                            item.product_name ||
                                            "Product"
                                        )}">
                                    `
                                    :
                                    ""
                                }

                                <div class="order-item-info">

                                    <strong>
                                        ${escapeHtml(
                                            item.product_name ||
                                            "Product"
                                        )}
                                    </strong>

                                    <small>

                                        Qty:
                                        ${Number(
                                            item.quantity ||
                                            1
                                        )}

                                        ${
                                            item.size
                                            ?
                                            ` · Size: ${escapeHtml(item.size)}`
                                            :
                                            ""
                                        }

                                        ${
                                            item.color
                                            ?
                                            ` · Color: ${escapeHtml(item.color)}`
                                            :
                                            ""
                                        }

                                    </small>

                                </div>

                                <div class="order-item-price">

                                    ${money(
                                        item.subtotal ??
                                        (
                                            Number(
                                                item.price ||
                                                0
                                            ) *
                                            Number(
                                                item.quantity ||
                                                1
                                            )
                                        )
                                    )}

                                </div>

                            </div>
                        `
                    )
                    .join("")
                :
                `
                <div class="empty-state">

                    <strong>
                        No item details
                    </strong>

                    <p>
                        This order does not have visible order items.
                    </p>

                </div>
                `
            }

        </div>

        <div class="order-summary">

            <div class="order-summary-row">
                <span>Subtotal</span>
                <strong>
                    ${money(
                        order.subtotal
                    )}
                </strong>
            </div>

            <div class="order-summary-row">
                <span>Discount</span>
                <strong>
                    - ${money(
                        order.discount
                    )}
                </strong>
            </div>

            <div class="order-summary-row">
                <span>Shipping</span>
                <strong>
                    ${money(
                        order.shipping
                    )}
                </strong>
            </div>

            <div class="order-summary-row total">
                <span>Total</span>

                <strong>
                    ${money(
                        orderTotal(order)
                    )}
                </strong>
            </div>

        </div>

        <div class="modal-actions">

            <button
                type="button"
                class="secondary-btn"
                data-close-modal>
                Close
            </button>

            <button
                type="button"
                class="danger-btn"
                data-action="delete-order"
                data-id="${order.id}">
                Delete Order
            </button>

        </div>
    `;

    openModal(
        "orderModal"
    );
}


async function updateOrderStatus(
    orderId,
    status
) {

    try {

        const {
            error
        } =
            await supabaseClient
                .from("orders")
                .update({
                    status
                })
                .eq(
                    "id",
                    orderId
                );

        if (error) {
            throw error;
        }

        showToast(
            "Order status updated.",
            "success"
        );

        await loadOrders();

        await loadCustomers();

        renderEverything();

        closeModal(
            "orderModal"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}
async function markPaymentPaid(id) {

    try {

        const {
            error
        } =
            await supabaseClient
                .from("orders")
                .update({
                    payment_status: "paid"
                })
                .eq(
                    "id",
                    id
                );

        if (error) {
            throw error;
        }

        showToast(
            "Payment marked as paid.",
            "success"
        );

        await loadOrders();

        renderEverything();

        viewOrder(id);

    } catch (error) {

        console.error(
            "Mark payment paid:",
            error
        );

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}

async function deleteOrder(id) {

    const order =
        orders.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!order) {
        return;
    }

    showConfirm(
        "Delete Order",
        `Delete order #${orderNumber(order)} permanently?`,
        async () => {

            try {

                const {
                    error:
                        itemsError
                } =
                    await supabaseClient
                        .from("order-items")
                        .delete()
                        .eq(
                            "order_id",
                            id
                        );

                if (itemsError) {
                    throw itemsError;
                }

                const {
                    error
                } =
                    await supabaseClient
                        .from("orders")
                        .delete()
                        .eq(
                            "id",
                            id
                        );

                if (error) {
                    throw error;
                }

                showToast(
                    "Order deleted.",
                    "success"
                );

                closeModal(
                    "orderModal"
                );

                await loadOrders();

                await loadCustomers();

                renderEverything();

            } catch (error) {

                console.error(
                    error
                );

                showToast(
                    getErrorMessage(error),
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   CUSTOMERS
========================================================= */

/* =========================================================
   CUSTOMERS
   CUSTOMER BASE
========================================================= */

async function loadCustomers() {

    const container =
        document.getElementById("customersContainer") ||
        document.getElementById("customersTable") ||
        document.querySelector(".customers-container");

    if (!container) {
        console.warn("Customers container not found.");
        return;
    }

    container.innerHTML = `
        <div class="loading-state">
            Loading customers...
        </div>
    `;

    try {

        /* =========================================
           LOAD CUSTOMERS FROM ORDERS
        ========================================= */

        const {
            data: customerOrders,
            error
        } = await supabaseClient
            .from("orders")
            .select(`
                id,
                customer_name,
                customer_phone,
                whatsapp,
                customer_email,
                total,
                created_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        /* =========================================
           ERROR
        ========================================= */

        if (error) {
            throw error;
        }


        /* =========================================
           EMPTY
        ========================================= */

        if (
            !customerOrders ||
            customerOrders.length === 0
        ) {

            customers = [];

            container.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        ◈
                    </div>

                    <h3>
                        No Customers
                    </h3>

                    <p>
                        Customer records will appear here after the first order.
                    </p>

                </div>
            `;

            return;
        }


        /* =========================================
           BUILD CUSTOMER LIST
        ========================================= */

        const customerMap = new Map();


        customerOrders.forEach(order => {

            const email =
                normalize(
                    order.customer_email
                );

            const phone =
                normalize(
                    order.customer_phone
                );

            const whatsapp =
                normalize(
                    order.whatsapp
                );


            /*
               Use email first.
               If there is no email, use phone.
               If neither exists, use order id.
            */

            const customerKey =
                email ||
                phone ||
                whatsapp ||
                String(order.id);


            if (!customerMap.has(customerKey)) {

                customerMap.set(
                    customerKey,
                    {
                        name:
                            order.customer_name ||
                            "Guest Customer",

                        phone:
                            order.customer_phone ||
                            "—",

                        whatsapp:
                            order.whatsapp ||
                            "—",

                        email:
                            order.customer_email ||
                            "—",

                        orders: 0,

                        totalSpent: 0,

                        lastOrder:
                            order.created_at ||
                            null
                    }
                );

            }


            const customer =
                customerMap.get(
                    customerKey
                );


            /* =====================================
               UPDATE CUSTOMER DATA
            ===================================== */

            customer.orders += 1;


            customer.totalSpent +=
                Number(
                    order.total || 0
                );


            /*
               Keep the latest available
               customer information.
            */

            if (
                order.customer_name &&
                (
                    !customer.name ||
                    customer.name ===
                    "Guest Customer"
                )
            ) {
                customer.name =
                    order.customer_name;
            }


            if (
                order.customer_phone &&
                customer.phone === "—"
            ) {
                customer.phone =
                    order.customer_phone;
            }


            if (
                order.whatsapp &&
                customer.whatsapp === "—"
            ) {
                customer.whatsapp =
                    order.whatsapp;
            }


            if (
                order.customer_email &&
                customer.email === "—"
            ) {
                customer.email =
                    order.customer_email;
            }


            /*
               Since orders are already sorted
               newest first, the first order
               is the latest order.
            */

            if (
                !customer.lastOrder ||
                new Date(order.created_at) >
                new Date(customer.lastOrder)
            ) {
                customer.lastOrder =
                    order.created_at;
            }

        });


        customers =
            Array.from(
                customerMap.values()
            );


        /* =========================================
           CUSTOMER TYPE
        ========================================= */

        customers.forEach(customer => {

            /*
               VIP = 5 or more orders
               OR spending 10,000 EGP or more.
            */

            if (
                customer.orders >= 5 ||
                customer.totalSpent >= 10000
            ) {
                customer.type = "VIP";
            } else {
                customer.type = "Regular";
            }

        });


        /* =========================================
           RENDER CUSTOMER BASE
        ========================================= */

        container.innerHTML = `

            <div class="customers-table-wrapper">

                <table class="customers-table">

                    <thead>

                        <tr>

                            <th>
                                Customer
                            </th>

                            <th>
                                Phone
                            </th>

                            <th>
                                WhatsApp
                            </th>

                            <th>
                                Email
                            </th>

                            <th>
                                Orders
                            </th>

                            <th>
                                Total Spent
                            </th>

                            <th>
                                Last Order
                            </th>

                            <th>
                                Type
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                            customers.map(
                                customer => {

                                    const initial =
                                        String(
                                            customer.name ||
                                            "C"
                                        )
                                            .charAt(0)
                                            .toUpperCase();


                                    return `

                                        <tr>

                                            <!-- CUSTOMER -->

                                            <td>

                                                <div class="customer-main">

                                                    <div class="customer-avatar">
                                                        ${escapeHtml(initial)}
                                                    </div>

                                                    <div>

                                                        <strong>
                                                            ${
                                                                escapeHtml(
                                                                    customer.name
                                                                )
                                                            }
                                                        </strong>

                                                    </div>

                                                </div>

                                            </td>


                                            <!-- PHONE -->

                                            <td>

                                                <div class="customer-contact">

                                                    ${
                                                        escapeHtml(
                                                            customer.phone
                                                        )
                                                    }

                                                </div>

                                            </td>


                                            <!-- WHATSAPP -->

                                            <td>

                                                <div class="customer-contact">

                                                    ${
                                                        escapeHtml(
                                                            customer.whatsapp
                                                        )
                                                    }

                                                </div>

                                            </td>


                                            <!-- EMAIL -->

                                            <td>

                                                <div class="customer-contact">

                                                    ${
                                                        escapeHtml(
                                                            customer.email
                                                        )
                                                    }

                                                </div>

                                            </td>


                                            <!-- ORDERS -->

                                            <td>

                                                <span class="orders-count">

                                                    ${
                                                        customer.orders
                                                    }

                                                </span>

                                            </td>


                                            <!-- TOTAL SPENT -->

                                            <td>

                                                <strong class="customer-spend">

                                                    ${
                                                        Number(
                                                            customer.totalSpent
                                                        ).toLocaleString(
                                                            "en-EG",
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            }
                                                        )
                                                    }

                                                    EGP

                                                </strong>

                                            </td>


                                            <!-- LAST ORDER -->

                                            <td>

                                                <span class="customer-date">

                                                    ${
                                                        formatDate(
                                                            customer.lastOrder
                                                        )
                                                    }

                                                </span>

                                            </td>


                                            <!-- TYPE -->

                                            <td>

                                                ${
                                                    customer.type === "VIP"
                                                        ?
                                                        `
                                                        <span class="customer-status vip">
                                                            VIP
                                                        </span>
                                                        `
                                                        :
                                                        `
                                                        <span class="customer-status">
                                                            Regular
                                                        </span>
                                                        `
                                                }

                                            </td>

                                        </tr>

                                    `;
                                }
                            ).join("")
                        }

                    </tbody>

                </table>

            </div>

        `;

    } catch (error) {

        console.error(
            "Customers failed:",
            error
        );

        customers = [];

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ⚠
                </div>

                <h3>
                    Unable to load customers
                </h3>

                <p>
                    ${
                        escapeHtml(
                            getErrorMessage(error)
                        )
                    }
                </p>

            </div>

        `;
    }
}

function renderCustomers() {

    const container =
        document.getElementById(
            "customersContainer"
        ) ||
        document.getElementById(
            "customersTable"
        ) ||
        document.querySelector(
            ".customers-container"
        );

    if (!container) {
        return;
    }

    if (!customers.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ◈
                </div>

                <h3>
                    No Customers
                </h3>

                <p>
                    Customer records will appear here.
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML = `

        <div class="customers-table-wrapper">

            <table class="customers-table">

                <thead>

                    <tr>

                        <th>
                            Customer
                        </th>

                        <th>
                            Contact
                        </th>

                        <th>
                            Address
                        </th>

                        <th>
                            Orders
                        </th>

                        <th>
                            Total Spend
                        </th>

                        <th>
                            Status
                        </th>

                        <th>
                            Created
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${
                        customers
                            .map(
                                customer => {

                                    const name =
                                        customerName(
                                            customer
                                        );

                                    const email =
                                        customerEmail(
                                            customer
                                        );

                                    const phone =
                                        customerPhone(
                                            customer
                                        );

                                    const address =
                                        customerAddress(
                                            customer
                                        );

                                    const government =
                                        customerGovernment(
                                            customer
                                        );

                                    const totalOrders =
                                        customerTotalOrders(
                                            customer
                                        );

                                    const totalSpend =
                                        customerTotalSpend(
                                            customer
                                        );

                                    const isVip =
                                        customerVip(
                                            customer
                                        );

                                    const created =
                                        customerCreatedAt(
                                            customer
                                        );

                                    const avatar =
                                        String(
                                            name ||
                                            "C"
                                        )
                                            .charAt(0)
                                            .toUpperCase();

                                    return `

                                        <tr>

                                            <td>

                                                <div class="customer-main">

                                                    <div class="customer-avatar">
                                                        ${escapeHtml(
                                                            avatar
                                                        )}
                                                    </div>

                                                    <div>

                                                        <strong>
                                                            ${escapeHtml(
                                                                name
                                                            )}
                                                        </strong>

                                                        ${
                                                            isVip
                                                            ?
                                                            `
                                                            <span class="vip-badge">
                                                                VIP
                                                            </span>
                                                            `
                                                            :
                                                            ""
                                                        }

                                                    </div>

                                                </div>

                                            </td>


                                            <td>

                                                <div class="customer-contact">

                                                    <div>
                                                        ${escapeHtml(
                                                            email
                                                        )}
                                                    </div>

                                                    <div>
                                                        ${escapeHtml(
                                                            phone
                                                        )}
                                                    </div>

                                                </div>

                                            </td>


                                            <td>

                                                <div class="customer-location">

                                                    ${
                                                        government !== "—"
                                                        ?
                                                        `
                                                        <div>
                                                            ${escapeHtml(
                                                                government
                                                            )}
                                                        </div>
                                                        `
                                                        :
                                                        ""
                                                    }

                                                    <div>
                                                        ${escapeHtml(
                                                            address
                                                        )}
                                                    </div>

                                                </div>

                                            </td>


                                            <td>

                                                <span class="orders-count">
                                                    ${totalOrders}
                                                </span>

                                            </td>


                                            <td>

                                                <strong class="customer-spend">

                                                    ${totalSpend.toFixed(2)}
                                                    EGP

                                                </strong>

                                            </td>


                                            <td>

                                                ${
                                                    isVip
                                                    ?
                                                    `
                                                    <span class="customer-status vip">
                                                        VIP Customer
                                                    </span>
                                                    `
                                                    :
                                                    `
                                                    <span class="customer-status">
                                                        Regular
                                                    </span>
                                                    `
                                                }

                                            </td>


                                            <td>

                                                <span class="customer-date">

                                                    ${
                                                        created
                                                        ?
                                                        formatDate(
                                                            created
                                                        )
                                                        :
                                                        "—"
                                                    }

                                                </span>

                                            </td>

                                        </tr>

                                    `;
                                }
                            )
                            .join("")
                    }

                </tbody>

            </table>

        </div>
    `;
}


/* =========================================================
   COUPONS
========================================================= */

async function loadCoupons() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("coupons")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        coupons =
            data || [];

    } catch (error) {

        console.error(
            "Coupons:",
            error
        );

        coupons = [];

        showToast(
            "Could not load coupons.",
            "error"
        );
    }
}


function couponIsCurrentlyActive(
    coupon
) {

    if (!coupon.is_active) {
        return false;
    }

    const now =
        Date.now();

    if (
        coupon.starts_at &&
        new Date(
            coupon.starts_at
        ).getTime() > now
    ) {
        return false;
    }

    if (
        coupon.expires_at &&
        new Date(
            coupon.expires_at
        ).getTime() < now
    ) {
        return false;
    }

    if (
        Number(
            coupon.usage_limit || 0
        ) > 0 &&
        Number(
            coupon.used_count || 0
        ) >=
        Number(
            coupon.usage_limit
        )
    ) {
        return false;
    }

    return true;
}


function renderCoupons() {

    const tbody =
        document.getElementById(
            "couponsTable"
        );

    if (!tbody) {
        return;
    }

    if (!coupons.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    ${emptyHTML(
                        "No Coupons",
                        "Create your first discount coupon."
                    )}
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        coupons
            .map(
                coupon => {

                    const active =
                        couponIsCurrentlyActive(
                            coupon
                        );

                    const discount =
                        coupon.discount_type ===
                        "percentage"
                        ?
                        `${coupon.discount_value}%`
                        :
                        money(
                            coupon.discount_value
                        );

                    const usage =
                        Number(
                            coupon.used_count ||
                            0
                        ) +
                        " / " +
                        (
                            Number(
                                coupon.usage_limit ||
                                0
                            ) > 0
                            ?
                            Number(
                                coupon.usage_limit
                            )
                            :
                            "∞"
                        );

                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        coupon.code
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${discount}
                            </td>

                            <td>
                                ${money(
                                    coupon.minimum_order
                                )}
                            </td>

                            <td>
                                ${usage}
                            </td>

                            <td>

                                ${
                                    coupon.starts_at
                                    ?
                                    formatDate(
                                        coupon.starts_at
                                    )
                                    :
                                    "Now"
                                }

                                →

                                ${
                                    coupon.expires_at
                                    ?
                                    formatDate(
                                        coupon.expires_at
                                    )
                                    :
                                    "No expiry"
                                }

                            </td>

                            <td>

                                <span
                                    class="status-badge ${
                                        active
                                        ?
                                        "delivered"
                                        :
                                        "cancelled"
                                    }">

                                    ${
                                        active
                                        ?
                                        "Active"
                                        :
                                        "Inactive"
                                    }

                                </span>

                            </td>

                            <td>

                                <div class="action-group">

                                    <button
                                        class="table-action"
                                        data-action="toggle-coupon"
                                        data-id="${coupon.id}">

                                        ${
                                            coupon.is_active
                                            ?
                                            "Disable"
                                            :
                                            "Enable"
                                        }

                                    </button>

                                    <button
                                        class="table-action delete"
                                        data-action="delete-coupon"
                                        data-id="${coupon.id}">

                                        Delete

                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


function resetCouponForm() {

    const form =
        document.getElementById(
            "couponForm"
        );

    if (form) {
        form.reset();
    }

    const active =
        document.getElementById(
            "couponActive"
        );

    if (active) {
        active.checked =
            true;
    }
}


function openCouponModal() {

    resetCouponForm();

    openModal(
        "couponModal"
    );
}


async function saveCoupon(event) {

    event.preventDefault();

    try {

        const code =
            document.getElementById(
                "couponCode"
            ).value
                .trim()
                .toUpperCase();

        const type =
            document.getElementById(
                "couponType"
            ).value;

        const value =
            Number(
                document.getElementById(
                    "couponValue"
                ).value
            );

        const minimum =
            Number(
                document.getElementById(
                    "couponMinimum"
                ).value ||
                0
            );

        const limit =
            Number(
                document.getElementById(
                    "couponLimit"
                ).value ||
                0
            );

        const active =
            document.getElementById(
                "couponActive"
            ).checked;

        const startsInput =
            document.getElementById(
                "couponStartsAt"
            ).value;

        const expiresInput =
            document.getElementById(
                "couponExpiresAt"
            ).value;

        if (!code) {
            throw new Error(
                "Coupon code is required."
            );
        }

        if (value <= 0) {
            throw new Error(
                "Discount value must be greater than zero."
            );
        }

        if (
            type === "percentage" &&
            value > 100
        ) {
            throw new Error(
                "Percentage discount cannot exceed 100%."
            );
        }

        const payload = {

            code,

            discount_type:
                type,

            discount_value:
                value,

            minimum_order:
                minimum,

            usage_limit:
                limit,

            is_active:
                active,

            starts_at:
                startsInput
                ?
                new Date(
                    startsInput
                ).toISOString()
                :
                null,

            expires_at:
                expiresInput
                ?
                new Date(
                    expiresInput
                ).toISOString()
                :
                null
        };

        const {
            error
        } =
            await supabaseClient
                .from("coupons")
                .insert(
                    payload
                );

        if (error) {
            throw error;
        }

        showToast(
            "Coupon created successfully.",
            "success"
        );

        closeModal(
            "couponModal"
        );

        await loadCoupons();

        renderCoupons();

    } catch (error) {

        console.error(
            error
        );

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


async function toggleCoupon(id) {

    const coupon =
        coupons.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!coupon) {
        return;
    }

    try {

        const {
            error
        } =
            await supabaseClient
                .from("coupons")
                .update({
                    is_active:
                        !coupon.is_active
                })
                .eq(
                    "id",
                    id
                );

        if (error) {
            throw error;
        }

        showToast(
            coupon.is_active
            ?
            "Coupon disabled."
            :
            "Coupon enabled.",
            "success"
        );

        await loadCoupons();

        renderCoupons();

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


async function deleteCoupon(id) {

    const coupon =
        coupons.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!coupon) {
        return;
    }

    showConfirm(
        "Delete Coupon",
        `Delete coupon "${coupon.code}" permanently?`,
        async () => {

            try {

                const {
                    error
                } =
                    await supabaseClient
                        .from("coupons")
                        .delete()
                        .eq(
                            "id",
                            id
                        );

                if (error) {
                    throw error;
                }

                showToast(
                    "Coupon deleted.",
                    "success"
                );

                await loadCoupons();

                renderCoupons();

            } catch (error) {

                showToast(
                    getErrorMessage(error),
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   SUBSCRIBERS
   REAL TABLE = public.subscribers
   COLUMNS = id, email, created_at
========================================================= */

async function loadSubscribers() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("subscribers")
                .select(
                    "id,email,created_at"
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        subscribers =
            data || [];

        console.log(
            "Subscribers loaded:",
            subscribers
        );

    } catch (error) {

        console.error(
            "Subscribers:",
            error
        );

        subscribers = [];

        showToast(
            "Could not load email subscribers.",
            "error"
        );
    }
}


function renderSubscribers() {

    const tbody =
        document.getElementById(
            "subscribersTable"
        );

    if (!tbody) {
        return;
    }

    if (!subscribers.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4">

                    ${emptyHTML(
                        "No Subscribers",
                        "Email subscribers will appear here."
                    )}

                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        subscribers
            .map(
                subscriber => `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    subscriber.email ||
                                    "—"
                                )}
                            </strong>
                        </td>

                        <td>
                            5%
                        </td>

                        <td>

                            <span class="status-badge new">
                                Subscribed
                            </span>

                        </td>

                        <td>
                            ${formatDate(
                                subscriber.created_at
                            )}
                        </td>

                    </tr>

                `
            )
            .join("");
}


/* =========================================================
   CONTACT MESSAGES
========================================================= */

async function loadMessages() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("contact_messages")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        messages =
            data || [];

    } catch (error) {

        console.warn(
            "Messages:",
            error
        );

        messages = [];
    }
}


function renderMessages() {

    const tbody =
        document.getElementById(
            "messagesTable"
        );

    if (!tbody) {
        return;
    }

    if (!messages.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">

                    ${emptyHTML(
                        "No Messages",
                        "Contact messages will appear here."
                    )}

                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        messages
            .map(
                message => {

                    const status =
                        message.status ||
                        "New";

                    const className =
                        normalize(
                            status
                        );

                    return `

                        <tr>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        message.name
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    message.email ||
                                    "—"
                                )}
                            </td>

                            <td>

                                <div
                                    style="
                                        max-width:260px;
                                        line-height:1.6;
                                    ">

                                    ${escapeHtml(
                                        message.message
                                    )}

                                </div>

                            </td>

                            <td>
                                ${formatDate(
                                    message.created_at
                                )}
                            </td>

                            <td>

                                <span
                                    class="status-badge ${className}">

                                    ${escapeHtml(
                                        status
                                    )}

                                </span>

                            </td>

                            <td>

                                <div class="action-group">

                                    ${
                                        normalize(
                                            status
                                        ) !== "read"
                                        ?
                                        `
                                        <button
                                            class="table-action"
                                            data-action="read-message"
                                            data-id="${message.id}">
                                            Read
                                        </button>
                                        `
                                        :
                                        ""
                                    }

                                    <button
                                        class="table-action delete"
                                        data-action="delete-message"
                                        data-id="${message.id}">
                                        Delete
                                    </button>

                                </div>

                            </td>

                        </tr>

                    `;
                }
            )
            .join("");
}


async function markMessageRead(id) {

    try {

        const {
            error
        } =
            await supabaseClient
                .from("contact_messages")
                .update({
                    status: "read"
                })
                .eq(
                    "id",
                    id
                );

        if (error) {
            throw error;
        }

        await loadMessages();

        renderMessages();

        showToast(
            "Message marked as read.",
            "success"
        );

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


async function deleteMessage(id) {

    showConfirm(
        "Delete Message",
        "Delete this contact message permanently?",
        async () => {

            try {

                const {
                    error
                } =
                    await supabaseClient
                        .from("contact_messages")
                        .delete()
                        .eq(
                            "id",
                            id
                        );

                if (error) {
                    throw error;
                }

                await loadMessages();

                renderMessages();

                showToast(
                    "Message deleted.",
                    "success"
                );

            } catch (error) {

                showToast(
                    getErrorMessage(error),
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

    const activeProducts =
        products.filter(
            product =>
                product.is_active !==
                false
        );

    const available =
        activeProducts.filter(
            product =>
                getStock(product) > 0
        );

    const soldOut =
        activeProducts.filter(
            product =>
                getStock(product) <= 0
        );

    const deliveredOrders =
        orders.filter(
            order =>
                order.status ===
                "Delivered"
        );

    const pending =
        orders.filter(
            order =>
                order.status ===
                "Pending"
        );

    const confirmed =
        orders.filter(
            order =>
                order.status ===
                "Confirmed"
        );

    const processing =
        orders.filter(
            order =>
                order.status ===
                "Processing"
        );

    const shipped =
        orders.filter(
            order =>
                order.status ===
                "Shipped"
        );

    const cancelled =
        orders.filter(
            order =>
                order.status ===
                "Cancelled"
        );

    const totalSales =
        deliveredOrders.reduce(
            (
                total,
                order
            ) =>
                total +
                orderTotal(order),
            0
        );

    const vip =
        customers.filter(
            customer =>
                customerTotalOrders(
                    customer
                ) > 3
        );

    setText(
        "totalProducts",
        activeProducts.length
    );

    setText(
        "availableProducts",
        available.length
    );

    setText(
        "outOfStock",
        soldOut.length
    );

    setText(
        "totalOrders",
        orders.length
    );

    setText(
        "pendingOrders",
        pending.length
    );

    setText(
        "completedOrders",
        deliveredOrders.length
    );

    setText(
        "totalCustomers",
        customers.length
    );

    setText(
        "vipCustomers",
        vip.length
    );

    setText(
        "totalSales",
        money(totalSales)
    );

    setText(
        "dashboardPending",
        pending.length
    );

    setText(
        "dashboardConfirmed",
        confirmed.length
    );

    setText(
        "dashboardProcessing",
        processing.length
    );

    setText(
        "dashboardShipped",
        shipped.length
    );

    setText(
        "dashboardDelivered",
        deliveredOrders.length
    );

    setText(
        "dashboardCancelled",
        cancelled.length
    );

    renderRecentOrders();

    renderTopProducts();

    renderSalesChart();
}


function renderRecentOrders() {

    const tbody =
        document.getElementById(
            "recentOrdersTable"
        );

    if (!tbody) {
        return;
    }

    const recent =
        orders.slice(0, 6);

    if (!recent.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4">

                    <div class="empty-state">

                        <strong>
                            No orders yet
                        </strong>

                        <p>
                            New orders will appear here.
                        </p>

                    </div>

                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        recent
            .map(
                order => `

                    <tr>

                        <td>
                            #${escapeHtml(
                                orderNumber(order)
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                order.customer_name ||
                                order.name ||
                                "Guest"
                            )}
                        </td>

                        <td>
                            ${money(
                                orderTotal(order)
                            )}
                        </td>

                        <td>
                            ${statusBadge(
                                order.status
                            )}
                        </td>

                    </tr>

                `
            )
            .join("");
}


/* =========================================================
   BEST SELLING
========================================================= */

function calculateBestProducts() {

    const quantities = {};

    orderItems.forEach(
        item => {

            const productId =
                item.product_id ||
                item.product_name;

            if (!productId) {
                return;
            }

            if (
                !quantities[productId]
            ) {

                quantities[productId] = {

                    quantity: 0,

                    name:
                        item.product_name ||
                        "Product",

                    image:
                        item.product_image ||
                        ""
                };
            }

            quantities[productId]
                .quantity +=
                Number(
                    item.quantity ||
                    0
                );
        }
    );

    return Object.values(
        quantities
    )
        .sort(
            (a, b) =>
                b.quantity -
                a.quantity
        );
}


function renderTopProducts() {

    const container =
        document.getElementById(
            "topProductsList"
        );

    if (!container) {
        return;
    }

    const calculated =
        calculateBestProducts();

    if (calculated.length) {

        container.innerHTML =
            calculated
                .slice(0, 5)
                .map(
                    (
                        product,
                        index
                    ) => `

                        <div class="top-product-item">

                            <div class="top-product-rank">
                                ${index + 1}
                            </div>

                            ${
                                product.image
                                ?
                                `
                                <img
                                    class="top-product-image"
                                    src="${escapeHtml(
                                        product.image
                                    )}"
                                    alt="">
                                `
                                :
                                ""
                            }

                            <div class="top-product-info">

                                <strong>
                                    ${escapeHtml(
                                        product.name
                                    )}
                                </strong>

                                <span>
                                    ${product.quantity}
                                    sold
                                </span>

                            </div>

                        </div>

                    `
                )
                .join("");

        return;
    }

    const manuallySelected =
        products.filter(
            product =>
                product.is_best_seller ||
                product.is_most_ordered
        );

    if (!manuallySelected.length) {

        container.innerHTML =
            emptyHTML(
                "No Sales Data",
                "Best selling products will appear after orders."
            );

        return;
    }

    container.innerHTML =
        manuallySelected
            .slice(0, 5)
            .map(
                (
                    product,
                    index
                ) => `

                    <div class="top-product-item">

                        <div class="top-product-rank">
                            ${index + 1}
                        </div>

                        ${
                            product.image_url
                            ?
                            `
                            <img
                                class="top-product-image"
                                src="${escapeHtml(
                                    product.image_url
                                )}"
                                alt="">
                            `
                            :
                            ""
                        }

                        <div class="top-product-info">

                            <strong>
                                ${escapeHtml(
                                    product.name
                                )}
                            </strong>

                            <span>
                                Best Seller
                            </span>

                        </div>

                    </div>

                `
            )
            .join("");
}


/* =========================================================
   SALES CHART
========================================================= */

function renderSalesChart() {

    const container =
        document.getElementById(
            "salesChart"
        );

    if (!container) {
        return;
    }

    const days =
        Number(
            document.getElementById(
                "salesPeriod"
            )?.value ||
            7
        );

    const now =
        new Date();

    const points = [];

    for (
        let i = days - 1;
        i >= 0;
        i--
    ) {

        const date =
            new Date(now);

        date.setHours(
            0,
            0,
            0,
            0
        );

        date.setDate(
            date.getDate() -
            i
        );

        const next =
            new Date(date);

        next.setDate(
            next.getDate() +
            1
        );

        const sales =
            orders
                .filter(
                    order =>
                        order.status ===
                        "Delivered"
                )
                .filter(
                    order => {

                        const created =
                            new Date(
                                order.created_at
                            );

                        return (
                            created >= date &&
                            created < next
                        );
                    }
                )
                .reduce(
                    (
                        total,
                        order
                    ) =>
                        total +
                        orderTotal(order),
                    0
                );

        points.push({
            date,
            sales
        });
    }

    const max =
        Math.max(
            ...points.map(
                point =>
                    point.sales
            ),
            1
        );

    container.innerHTML =
        points
            .map(
                point => {

                    const height =
                        Math.max(
                            3,
                            (
                                point.sales /
                                max
                            ) *
                            170
                        );

                    const label =
                        point.date
                            .toLocaleDateString(
                                "en-EG",
                                {
                                    day: "2-digit",
                                    month: "short"
                                }
                            );

                    return `

                        <div class="chart-bar-wrap">

                            <div
                                class="chart-bar"
                                style="height:${height}px;">

                                <span class="chart-value">
                                    ${money(
                                        point.sales
                                    )}
                                </span>

                            </div>

                            <span class="chart-label">
                                ${label}
                            </span>

                        </div>

                    `;
                }
            )
            .join("");
}


/* =========================================================
   ANALYTICS
========================================================= */

function renderAnalytics() {

    const delivered =
        orders.filter(
            order =>
                order.status ===
                "Delivered"
        );

    const revenue =
        delivered.reduce(
            (
                total,
                order
            ) =>
                total +
                orderTotal(order),
            0
        );

    const average =
        delivered.length
        ?
        revenue /
        delivered.length
        :
        0;

    const sold =
        orderItems.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(
                    item.quantity ||
                    0
                ),
            0
        );

    setText(
        "analyticsRevenue",
        money(revenue)
    );

    setText(
        "analyticsOrders",
        delivered.length
    );

    setText(
        "averageOrder",
        money(average)
    );

    setText(
        "soldProducts",
        sold
    );

    const best =
        calculateBestProducts()[0];

    setText(
        "analyticsBestProduct",
        best?.name ||
        "—"
    );

    const colors = {};
    const sizes = {};

    orderItems.forEach(
        item => {

            if (item.color) {

                const key =
                    String(
                        item.color
                    ).trim();

                colors[key] =
                    (
                        colors[key] ||
                        0
                    ) +
                    Number(
                        item.quantity ||
                        0
                    );
            }

            if (item.size) {

                const key =
                    String(
                        item.size
                    ).trim();

                sizes[key] =
                    (
                        sizes[key] ||
                        0
                    ) +
                    Number(
                        item.quantity ||
                        0
                    );
            }
        }
    );

    const bestColor =
        Object.entries(
            colors
        )
            .sort(
                (a, b) =>
                    b[1] -
                    a[1]
            )[0];

    const bestSize =
        Object.entries(
            sizes
        )
            .sort(
                (a, b) =>
                    b[1] -
                    a[1]
            )[0];

    setText(
        "analyticsBestColor",
        bestColor?.[0] ||
        "—"
    );

    setText(
        "analyticsBestSize",
        bestSize?.[0] ||
        "—"
    );

    setText(
        "analyticsVip",
        customers.filter(
            customer =>
                customerTotalOrders(
                    customer
                ) > 3
        ).length
    );

    renderAnalyticsChart();

    renderActiveCustomers();
}


function renderAnalyticsChart() {

    const container =
        document.getElementById(
            "analyticsChart"
        );

    if (!container) {
        return;
    }

    const period =
        document.getElementById(
            "analyticsPeriod"
        )?.value ||
        "day";

    let count = 7;

    if (
        period === "week"
    ) {
        count = 8;
    }

    if (
        period === "month"
    ) {
        count = 12;
    }

    if (
        period === "year"
    ) {
        count = 12;
    }

    const points = [];

    for (
        let i = count - 1;
        i >= 0;
        i--
    ) {

        const now =
            new Date();

        let start;
        let end;
        let label;

        if (
            period === "year"
        ) {

            start =
                new Date(
                    now.getFullYear() -
                    i,
                    0,
                    1
                );

            end =
                new Date(
                    now.getFullYear() -
                    i +
                    1,
                    0,
                    1
                );

            label =
                String(
                    start.getFullYear()
                );

        } else if (
            period === "month"
        ) {

            start =
                new Date(
                    now.getFullYear(),
                    now.getMonth() -
                    i,
                    1
                );

            end =
                new Date(
                    now.getFullYear(),
                    now.getMonth() -
                    i +
                    1,
                    1
                );

            label =
                start.toLocaleDateString(
                    "en-EG",
                    {
                        month: "short"
                    }
                );

        } else if (
            period === "week"
        ) {

            start =
                new Date(now);

            start.setDate(
                start.getDate() -
                (
                    i * 7
                )
            );

            start.setHours(
                0,
                0,
                0,
                0
            );

            end =
                new Date(start);

            end.setDate(
                end.getDate() +
                7
            );

            label =
                `W${count - i}`;

        } else {

            start =
                new Date(now);

            start.setDate(
                start.getDate() -
                i
            );

            start.setHours(
                0,
                0,
                0,
                0
            );

            end =
                new Date(start);

            end.setDate(
                end.getDate() +
                1
            );

            label =
                start.toLocaleDateString(
                    "en-EG",
                    {
                        day: "2-digit"
                    }
                );
        }

        const sales =
            orders
                .filter(
                    order =>
                        order.status ===
                        "Delivered"
                )
                .filter(
                    order => {

                        const date =
                            new Date(
                                order.created_at
                            );

                        return (
                            date >= start &&
                            date < end
                        );
                    }
                )
                .reduce(
                    (
                        total,
                        order
                    ) =>
                        total +
                        orderTotal(order),
                    0
                );

        points.push({
            label,
            sales
        });
    }

    const max =
        Math.max(
            ...points.map(
                point =>
                    point.sales
            ),
            1
        );

    container.innerHTML =
        points
            .map(
                point => {

                    const height =
                        Math.max(
                            3,
                            (
                                point.sales /
                                max
                            ) *
                            220
                        );

                    return `

                        <div class="chart-bar-wrap">

                            <div
                                class="chart-bar"
                                style="height:${height}px;">

                                <span class="chart-value">
                                    ${money(
                                        point.sales
                                    )}
                                </span>

                            </div>

                            <span class="chart-label">
                                ${escapeHtml(
                                    point.label
                                )}
                            </span>

                        </div>

                    `;
                }
            )
            .join("");
}


function renderActiveCustomers() {

    const container =
        document.getElementById(
            "activeCustomersList"
        );

    if (!container) {
        return;
    }

    const list =
        customers
            .map(
                customer => {

                    const related =
                        customerOrders(
                            customer
                        );

                    const count =
                        customerTotalOrders(
                            customer
                        ) ||
                        related.length;

                    return {
                        customer,
                        count
                    };
                }
            )
            .sort(
                (a, b) =>
                    b.count -
                    a.count
            )
            .slice(
                0,
                8
            );

    if (!list.length) {

        container.innerHTML =
            emptyHTML(
                "No Customer Data",
                "Customer activity will appear here."
            );

        return;
    }

    container.innerHTML =
        `<div class="analytics-stat-list">` +
        list
            .map(
                item => `

                    <div class="analytics-list-item">

                        <span>
                            ${escapeHtml(
                                customerName(
                                    item.customer
                                )
                            )}
                        </span>

                        <strong>
                            ${item.count}
                            orders
                        </strong>

                    </div>

                `
            )
            .join("") +
        `</div>`;
}


/* =========================================================
   SETTINGS
   REAL TABLE = public.store-settings
========================================================= */

async function getSetting(key) {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("store-settings")
                .select(
                    "setting_value"
                )
                .eq(
                    "setting_key",
                    key
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        return data?.setting_value;

    } catch (error) {

        console.warn(
            `Setting ${key}:`,
            error
        );

        return null;
    }
}


async function saveSetting(
    key,
    value
) {

    const {
        error
    } =
        await supabaseClient
            .from("store-settings")
            .upsert(
                {
                    setting_key:
                        key,

                    setting_value:
                        value,

                    updated_at:
                        new Date().toISOString()
                },
                {
                    onConflict:
                        "setting_key"
                }
            );

    if (error) {
        throw error;
    }
}


async function loadSettings() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("store-settings")
                .select("*");

        if (error) {
            throw error;
        }

        const settings = {};

        (
            data || []
        ).forEach(
            row => {

                let value =
                    row.setting_value;

                if (
                    typeof value ===
                    "string"
                ) {

                    try {

                        value =
                            JSON.parse(
                                value
                            );

                    } catch {
                        // Keep string.
                    }
                }

                settings[
                    row.setting_key
                ] =
                    value;
            }
        );

        setInputValue(
            "vodafoneCash",
            settings.vodafone_cash ||
            ""
        );

        setInputValue(
            "instapay",
            settings.instapay ||
            ""
        );

        setInputValue(
            "settingStoreName",
            settings.store_name ||
            "Figure Scrub"
        );

        setInputValue(
            "settingEmail",
            settings.contact_email ||
            ""
        );

        setInputValue(
            "settingWhatsapp",
            settings.whatsapp ||
            ""
        );

        setInputValue(
            "settingInstagram",
            settings.instagram ||
            ""
        );

        setInputValue(
            "settingFacebook",
            settings.facebook ||
            ""
        );

        setInputValue(
            "settingAnnouncement",
            settings.announcement_text ||
            ""
        );

    } catch (error) {

        console.warn(
            "Settings:",
            error
        );
    }
}


function setInputValue(
    id,
    value
) {

    const input =
        document.getElementById(
            id
        );

    if (input) {
        input.value =
            value;
    }
}


async function savePaymentSettings(
    key,
    inputId
) {

    try {

        const value =
            document.getElementById(
                inputId
            ).value.trim();

        await saveSetting(
            key,
            value
        );

        showToast(
            "Payment setting saved.",
            "success"
        );

    } catch (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


async function saveWebsiteSettings() {

    try {

        const settings = {

            store_name:
                document.getElementById(
                    "settingStoreName"
                ).value.trim(),

            contact_email:
                document.getElementById(
                    "settingEmail"
                ).value.trim(),

            whatsapp:
                document.getElementById(
                    "settingWhatsapp"
                ).value.trim(),

            instagram:
                document.getElementById(
                    "settingInstagram"
                ).value.trim(),

            facebook:
                document.getElementById(
                    "settingFacebook"
                ).value.trim(),

            announcement_text:
                document.getElementById(
                    "settingAnnouncement"
                ).value.trim()
        };

        for (
            const [
                key,
                value
            ]
            of Object.entries(
                settings
            )
        ) {

            await saveSetting(
                key,
                value
            );
        }

        showToast(
            "Website settings saved.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   EMAIL CAMPAIGN
========================================================= */

function openEmailModal() {

    const subject =
        document.getElementById(
            "emailSubject"
        );

    const message =
        document.getElementById(
            "emailMessage"
        );

    if (subject) {
        subject.value = "";
    }

    if (message) {
        message.value = "";
    }

    openModal(
        "emailModal"
    );
}


async function sendEmailToAll() {

    const subject =
        document.getElementById(
            "emailSubject"
        )?.value.trim();

    const message =
        document.getElementById(
            "emailMessage"
        )?.value.trim();

    if (!subject) {

        showToast(
            "Please enter an email subject.",
            "warning"
        );

        return;
    }

    if (!message) {

        showToast(
            "Please write your message.",
            "warning"
        );

        return;
    }

    const confirmed = confirm(
        "Are you sure you want to send this email to all subscribers?"
    );

    if (!confirmed) {
        return;
    }

    const button =
        document.getElementById(
            "confirmSendEmail"
        );

    const originalText =
        button?.textContent || "Send";

    if (button) {
        button.disabled = true;
        button.textContent = "Sending...";
    }

    try {

        const {
            data: {
                session
            }
        } =
            await supabaseClient.auth.getSession();

        if (!session) {

            showToast(
                "Your session has expired. Please login again.",
                "error"
            );

            return;
        }

        const response =
            await fetch(
                `${SUPABASE_URL}/functions/v1/send-newsletter`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${session.access_token}`,

                        "apikey":
                            SUPABASE_KEY
                    },

                    body: JSON.stringify({
                        subject: subject,
                        message: message
                    })
                }
            );

        const result =
            await response.json();

        console.log(
            "Newsletter result:",
            result
        );

        if (!response.ok) {

            throw new Error(
                result?.error ||
                "Failed to send newsletter."
            );
        }

        showToast(
            `Newsletter sent successfully to ${result.sent || 0} subscriber(s).`,
            "success"
        );

        closeModal(
            "emailModal"
        );

        const subjectInput =
            document.getElementById(
                "emailSubject"
            );

        const messageInput =
            document.getElementById(
                "emailMessage"
            );

        if (subjectInput) {
            subjectInput.value = "";
        }

        if (messageInput) {
            messageInput.value = "";
        }

    } catch (error) {

        console.error(
            "Send newsletter:",
            error
        );

        showToast(
            error.message ||
            "Could not send newsletter.",
            "error"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                originalText;
        }
    }
}

/* =========================================================
   NAVIGATION
========================================================= */

function navigateTo(
    sectionId
) {

    const target =
        document.getElementById(
            sectionId
        );

    if (!target) {
        return;
    }

    document
        .querySelectorAll(
            ".page-section"
        )
        .forEach(
            section =>
                section.classList.remove(
                    "active"
                )
        );

    target.classList.add(
        "active"
    );

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item =>
                item.classList.toggle(
                    "active",
                    item.dataset.section ===
                    sectionId
                )
        );

    const navItem =
        document.querySelector(
            `.nav-item[data-section="${sectionId}"]`
        );

    setText(
        "pageTitle",
        navItem
        ?
        navItem.textContent.trim()
        :
        "Dashboard"
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (
        sectionId ===
        "subscribers"
    ) {

        loadSubscribers()
            .then(
                renderSubscribers
            );
    }

    if (
        sectionId ===
        "customers"
    ) {

        loadCustomers();
    }
}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderEverything() {

    populateProductFilters();

    renderDashboard();

    renderProducts();

    renderOrders();

    renderCustomers();

    renderCoupons();

    renderSubscribers();

    renderMessages();

    renderBestSellers();

    renderJustArrived();

    renderSoldOut();

    renderAnalytics();
}


/* =========================================================
   REALTIME
========================================================= */

function setupRealtime() {

    supabaseClient
        .channel(
            "figure-scrub-admin"
        )

        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "products"
            },
            async () => {

                await loadProducts();

                renderEverything();
            }
        )

        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "orders"
            },
            async () => {

                await loadOrders();

                await loadCustomers();

                renderEverything();
            }
        )

        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "order-items"
            },
            async () => {

                await loadOrderItems();

                renderEverything();
            }
        )

        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "coupons"
            },
            async () => {

                await loadCoupons();

                renderCoupons();
            }
        )

        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "subscribers"
            },
            async () => {

                await loadSubscribers();

                renderSubscribers();
            }
        )

        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "contact_messages"
            },
            async () => {

                await loadMessages();

                renderMessages();
            }
        )

        .subscribe();
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {
   /* -----------------------------------------
   PRODUCT IMAGES
----------------------------------------- */

const productImagesInput =
    document.getElementById("productImages");

if (productImagesInput) {

    productImagesInput.addEventListener(
        "change",
        event => {

            const files = Array.from(
                event.target.files || []
            );

            if (!files.length) {
                return;
            }

            pendingProductImageFiles = [
                ...(pendingProductImageFiles || []),
                ...files
            ];
const genderInput =
    document.getElementById("productGender");

if (genderInput) {
    genderInput.value = "both";
}
            renderProductImagesPreview();

            /*
             * Allows selecting the same
             * image again later.
             */
            productImagesInput.value = "";
        }
    );
}
    /* -----------------------------------------
       NAVIGATION
    ----------------------------------------- */

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        navigateTo(
                            button.dataset.section
                        );
                    }
                );
            }
        );


    /* -----------------------------------------
       GO BUTTONS
    ----------------------------------------- */

    document.addEventListener(
        "click",
        event => {

            const go =
                event.target.closest(
                    "[data-go]"
                );

            if (go) {

                navigateTo(
                    go.dataset.go
                );
            }
        }
    );


    /* -----------------------------------------
       ADD PRODUCT
    ----------------------------------------- */

    document
        .querySelectorAll(
            "[data-open-product]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    openAddProduct
                );
            }
        );


    /* -----------------------------------------
       PRODUCT FORM
    ----------------------------------------- */

    const productForm =
        document.getElementById(
            "productForm"
        );

    if (productForm) {

        productForm.addEventListener(
            "submit",
            saveProduct
        );
    }
const productSizesInput =
    document.getElementById("productSizes");

if (productSizesInput) {
    productSizesInput.addEventListener(
        "input",
        () => {
            const sizes =
                parseProductSizes(
                    productSizesInput.value
                );

            const existingStock =
                readSizeStock();

            renderSizeStockInputs(
                sizes,
                existingStock
            );
        }
    );
}
const sizeStockContainer =
    document.getElementById("sizeStockContainer");

if (sizeStockContainer) {
    sizeStockContainer.addEventListener(
        "input",
        event => {
            if (
                event.target.matches(
                    "[data-size-stock]"
                )
            ) {
                updateTotalStockFromSizes();
            }
        }
    );
}

    /* -----------------------------------------
       PRODUCT SEARCH / FILTERS
    ----------------------------------------- */

    [
        "productSearch",
        "productCategoryFilter",
        "productColorFilter",
        "productSizeFilter",
        "productStockFilter",
        "productTagFilter"
    ].forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );

            if (!element) {
                return;
            }

            element.addEventListener(
                "input",
                renderProducts
            );

            element.addEventListener(
                "change",
                renderProducts
            );
        }
    );


    /* -----------------------------------------
       ORDER SEARCH
    ----------------------------------------- */

    const orderSearch =
        document.getElementById(
            "orderSearch"
        );

    if (orderSearch) {

        orderSearch.addEventListener(
            "input",
            renderOrders
        );
    }


    const orderStatusFilter =
        document.getElementById(
            "orderStatusFilter"
        );

    if (orderStatusFilter) {

        orderStatusFilter.addEventListener(
            "change",
            renderOrders
        );
    }


    /* -----------------------------------------
       SALES PERIOD
    ----------------------------------------- */

    const salesPeriod =
        document.getElementById(
            "salesPeriod"
        );

    if (salesPeriod) {

        salesPeriod.addEventListener(
            "change",
            renderSalesChart
        );
    }


    /* -----------------------------------------
       ANALYTICS PERIOD
    ----------------------------------------- */

    const analyticsPeriod =
        document.getElementById(
            "analyticsPeriod"
        );

    if (analyticsPeriod) {

        analyticsPeriod.addEventListener(
            "change",
            renderAnalytics
        );
    }


    /* -----------------------------------------
       COUPON
    ----------------------------------------- */

    const addCouponBtn =
        document.getElementById(
            "addCouponBtn"
        );

    if (addCouponBtn) {

        addCouponBtn.addEventListener(
            "click",
            openCouponModal
        );
    }


    const couponForm =
        document.getElementById(
            "couponForm"
        );

    if (couponForm) {

        couponForm.addEventListener(
            "submit",
            saveCoupon
        );
    }


    /* -----------------------------------------
       EMAIL
    ----------------------------------------- */

    const sendEmailBtn =
        document.getElementById(
            "sendEmailBtn"
        );

    if (sendEmailBtn) {

        sendEmailBtn.addEventListener(
            "click",
            openEmailModal
        );
    }


    const confirmSendEmail =
        document.getElementById(
            "confirmSendEmail"
        );

    if (confirmSendEmail) {

        confirmSendEmail.addEventListener(
            "click",
            sendEmailToAll
        );
    }


    /* -----------------------------------------
       PAYMENT SETTINGS
    ----------------------------------------- */

    const saveVodafoneBtn =
        document.getElementById(
            "saveVodafoneBtn"
        );

    if (saveVodafoneBtn) {

        saveVodafoneBtn.addEventListener(
            "click",
            () =>
                savePaymentSettings(
                    "vodafone_cash",
                    "vodafoneCash"
                )
        );
    }


    const saveInstapayBtn =
        document.getElementById(
            "saveInstapayBtn"
        );

    if (saveInstapayBtn) {

        saveInstapayBtn.addEventListener(
            "click",
            () =>
                savePaymentSettings(
                    "instapay",
                    "instapay"
                )
        );
    }


    /* -----------------------------------------
       WEBSITE SETTINGS
    ----------------------------------------- */

    const saveWebsite =
        document.getElementById(
            "saveWebsiteSettings"
        );

    if (saveWebsite) {

        saveWebsite.addEventListener(
            "click",
            saveWebsiteSettings
        );
    }


    /* -----------------------------------------
       LOGOUT
    ----------------------------------------- */

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );
    }


    const accountLogoutBtn =
        document.getElementById(
            "accountLogoutBtn"
        );

    if (accountLogoutBtn) {

        accountLogoutBtn.addEventListener(
            "click",
            logout
        );
    }


    /* -----------------------------------------
       CONFIRM
    ----------------------------------------- */

    const confirmActionBtn =
        document.getElementById(
            "confirmActionBtn"
        );

    if (confirmActionBtn) {

        confirmActionBtn.addEventListener(
            "click",
            runConfirmAction
        );
    }


    /* -----------------------------------------
       CLOSE MODALS
    ----------------------------------------- */

    document.addEventListener(
        "click",
        event => {

            const close =
                event.target.closest(
                    "[data-close-modal]"
                );

            if (!close) {
                return;
            }

            const overlay =
                close.closest(
                    ".modal-overlay"
                );

            if (overlay) {

                closeModal(
                    overlay.id
                );
            }
        }
    );


    /* -----------------------------------------
       CLICK OUTSIDE MODAL
    ----------------------------------------- */

    document
        .querySelectorAll(
            ".modal-overlay"
        )
        .forEach(
            overlay => {

                overlay.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            overlay
                        ) {

                            closeModal(
                                overlay.id
                            );
                        }
                    }
                );
            }
        );


    /* -----------------------------------------
       KEYBOARD ESC
    ----------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }

            document
                .querySelectorAll(
                    ".modal-overlay.active"
                )
                .forEach(
                    modal =>
                        closeModal(
                            modal.id
                        )
                );
        }
    );


    /* -----------------------------------------
       DELEGATED ACTIONS
    ----------------------------------------- */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );

            if (!button) {
                return;
            }

            const action =
                button.dataset.action;

            const id =
                button.dataset.id;

            if (
                action ===
                "edit-product"
            ) {

                openEditProduct(id);

                return;
            }

            if (
                action ===
                "delete-product"
            ) {

                deleteProduct(id);

                return;
            }

            if (
                action ===
                "view-order"
            ) {

                viewOrder(id);

                return;
            }

            if (
                action ===
                "delete-order"
            ) {

                deleteOrder(id);

                return;
            }
if (
    action ===
    "mark-payment-paid"
) {

    markPaymentPaid(id);

    return;
}
            if (
                action ===
                "toggle-coupon"
            ) {

                toggleCoupon(id);

                return;
            }

            if (
                action ===
                "delete-coupon"
            ) {

                deleteCoupon(id);

                return;
            }

            if (
                action ===
                "read-message"
            ) {

                markMessageRead(id);

                return;
            }

            if (
                action ===
                "delete-message"
            ) {

                deleteMessage(id);

                return;
            }
        }
    );


    /* -----------------------------------------
       ORDER STATUS
    ----------------------------------------- */

    document.addEventListener(
        "change",
        event => {

            if (
                event.target.id !==
                "orderStatusSelect"
            ) {
                return;
            }

            const orderId =
                event.target.dataset
                    .orderId;

            const status =
                event.target.value;

            updateOrderStatus(
                orderId,
                status
            );
        }
    );

 
    /* ----------------------------------------- 
       SIZE CHART PREVIEW 
    ----------------------------------------- */ 
 
    const sizeChartImage = 
        document.getElementById( 
            "sizeChartImage" 
        ); 
 
    if (sizeChartImage) { 
 
        sizeChartImage.addEventListener( 
            "change", 
            event => { 
 
                const file = 
                    event.target 
                        .files[0]; 
 
                if (!file) { 
                    return; 
                } 
 
                const url = 
                    URL.createObjectURL( 
                        file 
                    ); 
 
                setPreview( 
                    "sizeChartPreview", 
                    url, 
                    "Size Chart" 
                ); 
            } 
        ); 
    } 
} 

function renderProductImagesPreview() {
    const container = document.getElementById("productImagesPreview");

    if (!container) return;

    container.innerHTML = "";

    const existingImages = currentProductImages || [];

    const previewImages = existingImages.map((url, index) => ({
        type: "existing",
        value: url,
        index
    }));

    const newFiles = pendingProductImageFiles || [];

    newFiles.forEach((file, index) => {
        previewImages.push({
            type: "new",
            value: URL.createObjectURL(file),
            file,
            index
        });
    });

    if (previewImages.length === 0) {
        container.innerHTML = `
            <div class="image-preview">
                <span>Main Image</span>
            </div>
        `;
        return;
    }

    previewImages.forEach((image, index) => {
        const wrapper = document.createElement("div");

        wrapper.className = "image-preview";
        wrapper.innerHTML = `
            <img
                src="${escapeHtml(image.value)}"
                alt="Product image ${index + 1}"
            >

            ${
                index === 0
                    ? `<span>Main Image</span>`
                    : ""
            }
        `;

        container.appendChild(wrapper);
    });
}
function parseProductSizes(value) {
    if (Array.isArray(value)) {
        return value
            .map(size => String(size).trim())
            .filter(Boolean);
    }

    return String(value || "")
        .split(",")
        .map(size => size.trim())
        .filter(Boolean);
}


function renderSizeStockInputs(sizes, stockValues = {}) {
    const container = document.getElementById("sizeStockContainer");

    if (!container) return;

    const cleanSizes = parseProductSizes(sizes);

    currentSizeStock = {
        ...stockValues
    };

    if (cleanSizes.length === 0) {
        container.innerHTML = `
            <div class="empty-size-stock">
                Add product sizes first.
                <br>
                Example: S, M, L, XL
            </div>
        `;

        return;
    }

    container.innerHTML = cleanSizes.map(size => {
        const quantity = Number(
            stockValues?.[size] ?? 0
        );

        return `
            <div class="size-stock-row">
                <div class="size-stock-label">
                    ${escapeHtml(size)}
                </div>

                <input
                    type="number"
                    min="0"
                    step="1"
                    value="${quantity}"
                    data-size-stock="${escapeHtml(size)}"
                    class="size-stock-input"
                >
            </div>
        `;
    }).join("");

    updateTotalStockFromSizes();
}


function readSizeStock() {
    const inputs = document.querySelectorAll(
        "#sizeStockContainer [data-size-stock]"
    );

    const sizeStock = {};

    inputs.forEach(input => {
        const size = input.dataset.sizeStock;

        if (!size) return;

        sizeStock[size] = Math.max(
            0,
            Number(input.value) || 0
        );
    });

    return sizeStock;
}


function calculateTotalSizeStock(sizeStock) {
    return Object.values(sizeStock).reduce(
        (total, quantity) => {
            return total + Math.max(0, Number(quantity) || 0);
        },
        0
    );
}


function updateTotalStockFromSizes() {
    const sizeStock = readSizeStock();

    const total = calculateTotalSizeStock(sizeStock);

    const stockInput = document.getElementById("productStock");

    if (stockInput) {
        stockInput.value = total;
    }
}
/* =========================================================
   INIT
========================================================= */

async function init() {

    const authenticated =
        await checkAdminSession();

    if (!authenticated) {
        return;
    }

    const isAdmin =
        await verifyAdmin();

    if (!isAdmin) {
        return;
    }

    setupEventListeners();

    await loadAllData();

    await loadSettings();

    setupRealtime();

    navigateTo(
        "dashboard"
    );
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);
