/* =========================================================
   FIGURE SCRUB
   HOME + SHOP + CART + QUICK VIEW + FILTERS
   SUPABASE + REALTIME
   MULTI IMAGES + SIZE STOCK + GENDER + DESCRIPTION
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://fsbzopacumiuwjsegsgu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_KBYOhE4HKCT-BsrKHgOlPg_Iry7wFWY";

let supabaseClient = null;


/* =========================================================
   GLOBAL STATE
========================================================= */

let products = [];
let filteredProducts = [];

let activeFilter = "all";

let selectedProduct = null;
let selectedSize = null;

let modalQuantity = 1;

let cart = [];

let currentModalImages = [];
let currentModalImageIndex = 0;


/* =========================================================
   DOM
========================================================= */

let shopProducts = null;
let productCount = null;

let sizeFilter = null;
let colorFilter = null;
let priceFilter = null;

let noProducts = null;

let productModal = null;
let cartDrawer = null;


/* =========================================================
   INITIALIZE DOM
========================================================= */

function initializeDOM() {

    shopProducts =
        document.getElementById(
            "shopProducts"
        );

    productCount =
        document.getElementById(
            "productCount"
        );

    sizeFilter =
        document.getElementById(
            "sizeFilter"
        );

    colorFilter =
        document.getElementById(
            "colorFilter"
        );

    priceFilter =
        document.getElementById(
            "priceFilter"
        );

    noProducts =
        document.getElementById(
            "noProducts"
        );

    productModal =
        document.getElementById(
            "productModal"
        );

    cartDrawer =
        document.getElementById(
            "cartDrawer"
        );

    loadCart();
}


/* =========================================================
   INITIALIZE SUPABASE
========================================================= */

function initializeSupabase() {

    if (
        typeof window.supabase ===
        "undefined"
    ) {

        console.error(
            "Supabase library was not loaded."
        );

        return;
    }

    supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );
}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initializeDOM();

        initializeSupabase();

        if (!supabaseClient) {
            return;
        }

        setupNewsletter();

        setupFilters();

        setupModal();

        setupCart();

        setupGlobalActions();

        updateCartCount();

        await loadProducts();
        await loadFooterSocials();
        setupRealtime();

        await loadCouponBar();
    }
);


/* =========================================================
   CART STORAGE
========================================================= */

function loadCart() {

    try {

        const saved =
            localStorage.getItem(
                "figureScrubCart"
            );

        cart =
            saved
                ? JSON.parse(saved)
                : [];

        if (!Array.isArray(cart)) {
            cart = [];
        }

    } catch (error) {

        console.warn(
            "Could not load cart:",
            error
        );

        cart = [];
    }
}


function saveCart() {

    try {

        localStorage.setItem(
            "figureScrubCart",
            JSON.stringify(cart)
        );

    } catch (error) {

        console.warn(
            "Could not save cart:",
            error
        );
    }

    updateCartCount();
}


function updateCartCount() {

    const count =
        cart.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(
                    item.quantity || 0
                ),
            0
        );

    document
        .querySelectorAll(
            ".cart-count"
        )
        .forEach(
            element => {

                element.textContent =
                    count;
            }
        );
}


/* =========================================================
   PRODUCTS
========================================================= */
async function loadProducts() {

    try {

        const {
            data,
            error
        } = await supabaseClient
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

        /*
         * Keep active products only.
         * Supports boolean, string and number values.
         */

        products = (data || []).filter(product => {

            return (
                product.is_active === true ||
                product.is_active === "true" ||
                product.is_active === 1 ||
                product.is_active === "1"
            );

        });

        console.log(
            "FIGURE SCRUB PRODUCTS:",
            products
        );

        console.log(
            "PRODUCT COUNT:",
            products.length
        );

        cleanupCartAgainstProducts();

        populateDynamicFilters();

        renderHomeSections();

        activeFilter = "all";

        /*
         * Make sure ALL is selected
         */

        document
            .querySelectorAll(".filter-btn")
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    String(
                        button.dataset.filter || ""
                    ).toLowerCase() === "all"
                );

            });

        applyFilters();

    } catch (error) {

        console.error(
            "Products failed:",
            error
        );

        products = [];

        if (shopProducts) {
            shopProducts.innerHTML = "";
        }

        if (productCount) {
            productCount.textContent = "0";
        }

        if (noProducts) {
            noProducts.hidden = false;
            noProducts.style.display = "";
        }
    }
}
/* =========================================================
   REALTIME
========================================================= */

function setupRealtime() {

    if (!supabaseClient) {
        return;
    }

    supabaseClient
        .channel(
            "figure-scrub-products-realtime"
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
            }
        )
        .subscribe();
}


/* =========================================================
   PRODUCT IMAGES
========================================================= */

function getProductImages(product) {

    if (!product) {
        return [];
    }

    let images = [];

    if (
        Array.isArray(
            product.image_urls
        )
    ) {

        images =
            product.image_urls;

    } else if (
        typeof product.image_urls ===
        "string"
    ) {

        try {

            const parsed =
                JSON.parse(
                    product.image_urls
                );

            if (
                Array.isArray(parsed)
            ) {

                images = parsed;

            } else if (
                typeof parsed ===
                "string"
            ) {

                images = [parsed];
            }

        } catch {

            /*
             * In case the database contains
             * a comma-separated string.
             */

            images =
                product.image_urls
                    .split(",")
                    .map(
                        image =>
                            image.trim()
                    )
                    .filter(Boolean);
        }
    }

    if (
        !images.length &&
        product.image_url
    ) {

        images = [
            product.image_url
        ];
    }

    return images
        .map(
            image =>
                String(image || "")
                    .trim()
        )
        .filter(Boolean);
}


function getMainProductImage(product) {

    const images =
        getProductImages(
            product
        );

    return images[0] || "";
}


/* =========================================================
   SIZE HELPERS
========================================================= */

function normalizeSizes(value) {

    if (Array.isArray(value)) {

        return value
            .map(
                size =>
                    String(size)
                        .trim()
            )
            .filter(Boolean);
    }

    if (
        typeof value ===
        "string"
    ) {

        try {

            const parsed =
                JSON.parse(value);

            if (
                Array.isArray(parsed)
            ) {

                return parsed
                    .map(
                        size =>
                            String(size)
                                .trim()
                    )
                    .filter(Boolean);
            }

        } catch {
            // Continue with comma split.
        }

        return value
            .split(",")
            .map(
                size =>
                    size.trim()
            )
            .filter(Boolean);
    }

    return [];
}


/* =========================================================
   SIZE STOCK
========================================================= */

function getSizeStock(product) {

    if (!product) {
        return {};
    }

    let value =
        product.size_stock;

    if (!value) {
        return {};
    }

    if (
        typeof value ===
        "string"
    ) {

        try {

            value =
                JSON.parse(value);

        } catch {

            return {};
        }
    }

    if (
        typeof value !==
        "object" ||
        Array.isArray(value)
    ) {

        return {};
    }

    return value;
}


function hasSizeStockData(product) {

    const stock =
        getSizeStock(product);

    return (
        Object.keys(stock)
            .length > 0
    );
}


function getSizeStockValue(
    product,
    size
) {

    const stock =
        getSizeStock(product);

    if (
        Object.prototype.hasOwnProperty
            .call(
                stock,
                size
            )
    ) {

        return Math.max(
            0,
            Number(
                stock[size]
            ) || 0
        );
    }

    return 0;
}


function getAvailableStockForSize(
    product,
    size
) {

    if (!product) {
        return 0;
    }

    if (
        hasSizeStockData(product)
    ) {

        return getSizeStockValue(
            product,
            size
        );
    }

    return getStock(
        product
    );
}


/* =========================================================
   TOTAL STOCK
========================================================= */

function getStock(product) {

    if (!product) {
        return 0;
    }

    const sizeStock =
        getSizeStock(product);

    if (
        Object.keys(sizeStock)
            .length > 0
    ) {

        return Object.values(
            sizeStock
        ).reduce(
            (
                total,
                quantity
            ) =>
                total +
                Math.max(
                    0,
                    Number(
                        quantity
                    ) || 0
                ),
            0
        );
    }

    return Number(
        product.stock ??
        product.stock_quantity ??
        0
    ) || 0;
}


/* =========================================================
   GENDER
========================================================= */
function getProductGender(product) {

    if (!product) {
        return "both";
    }

    const gender = String(
        product.gender ??
        product.Gender ??
        product.product_gender ??
        ""
    )
        .trim()
        .toLowerCase();

    /* WOMEN */
    if (
        gender === "women" ||
        gender === "woman" ||
        gender === "female" ||
        gender === "girl" ||
        gender === "girls" ||
        gender === "ladies" ||
        gender === "lady" ||
        gender === "w"
    ) {
        return "women";
    }

    /* MEN */
    if (
        gender === "men" ||
        gender === "man" ||
        gender === "male" ||
        gender === "boy" ||
        gender === "boys" ||
        gender === "gentlemen" ||
        gender === "gentleman" ||
        gender === "m"
    ) {
        return "men";
    }

    /* BOTH / UNISEX */
    if (
        gender === "both" ||
        gender === "unisex" ||
        gender === "all"
    ) {
        return "both";
    }

    /* FALLBACK: boolean fields */

    if (
        product.is_women === true ||
        product.is_women === "true" ||
        product.is_women === 1 ||
        product.is_women === "1"
    ) {
        return "women";
    }

    if (
        product.is_men === true ||
        product.is_men === "true" ||
        product.is_men === 1 ||
        product.is_men === "1"
    ) {
        return "men";
    }

    return "both";
}
/* =========================================================
   TRUTHY FLAG
========================================================= */

function isTruthyFlag(value) {

    return (
        value === true ||
        value === "true" ||
        value === 1 ||
        value === "1"
    );
}


/* =========================================================
   PRICE
========================================================= */

function formatPrice(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-EG",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


/* =========================================================
   COLOR
========================================================= */

function getColorValue(color) {

    if (!color) {
        return "#A7A7A7";
    }

    const value =
        String(color)
            .trim()
            .toLowerCase();

    const colors = {

        navy: "#172A46",
        black: "#111111",
        beige: "#C8B8A6",
        grey: "#A7A7A7",
        gray: "#A7A7A7",
        green: "#526B5D",
        white: "#F5F3EF",
        cream: "#F5F3EF",
        brown: "#7A5C46",
        pink: "#D9A5AE",
        purple: "#8D759E",
        blue: "#456A8C",
        red: "#8C4A4A"
    };

    return (
        colors[value] ||
        color
    );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   HOME SECTIONS
========================================================= */

function renderHomeSections() {

    renderHomeProductSection(
        "featuredProducts",
        products.slice(
            0,
            3
        )
    );


    const bestProducts =
        products.filter(
            product =>
                isTruthyFlag(
                    product.is_best_seller
                ) ||
                isTruthyFlag(
                    product.is_most_ordered
                )
        );

    const bestSection =
        document.getElementById(
            "bestSellersSection"
        );

    if (bestSection) {

        if (
            bestProducts.length
        ) {

            bestSection.style.display =
                "";

            renderHomeProductSection(
                "bestSellersProducts",
                bestProducts.slice(
                    0,
                    3
                )
            );

        } else {

            bestSection.style.display =
                "none";
        }
    }


    const newProducts =
        products.filter(
            product =>
                isTruthyFlag(
                    product.is_just_arrived
                ) ||
                isTruthyFlag(
                    product.is_new
                )
        );


    const newSection =
        document.getElementById(
            "newArrivalsSection"
        );

    if (newSection) {

        if (
            newProducts.length
        ) {

            newSection.style.display =
                "";

            renderHomeProductSection(
                "newArrivalsProducts",
                newProducts.slice(
                    0,
                    3
                )
            );

        } else {

            newSection.style.display =
                "none";
        }
    }
}


/* =========================================================
   HOME PRODUCT SECTION
========================================================= */

function renderHomeProductSection(
    containerId,
    sectionProducts
) {

    const container =
        document.getElementById(
            containerId
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        sectionProducts
            .map(
                createProductCard
            )
            .join("");
}


/* =========================================================
   PRODUCT CARD
========================================================= */

function createProductCard(product) {

    const image =
        getMainProductImage(
            product
        );

    const stock =
        getStock(product);

    const soldOut =
        stock <= 0;

    const isNew =
        isTruthyFlag(
            product.is_new
        ) ||
        isTruthyFlag(
            product.is_just_arrived
        );

    const isBest =
        isTruthyFlag(
            product.is_best_seller
        ) ||
        isTruthyFlag(
            product.is_most_ordered
        );

    const oldPrice =
        Number(
            product.old_price || 0
        );

    const price =
        Number(
            product.price || 0
        );

    const badge =
        isNew
            ? "NEW"
            : isBest
                ? "BEST SELLER"
                : "";

    return `

        <article
            class="product-card"
            data-product-id="${escapeHTML(
                product.id
            )}"
        >

            <div
                class="product-image"
                data-action="quick-view"
                data-product-id="${escapeHTML(
                    product.id
                )}"
            >

                ${
                    image
                    ?
                    `
                    <img
                        src="${escapeHTML(
                            image
                        )}"
                        alt="${escapeHTML(
                            product.name
                        )}"
                        loading="lazy"
                    >
                    `
                    :
                    `
                    <div class="product-placeholder">
                        Figure Scrub
                    </div>
                    `
                }

                ${
                    badge
                    ?
                    `
                    <span class="product-badge">
                        ${badge}
                    </span>
                    `
                    :
                    ""
                }

                ${
                    soldOut
                    ?
                    `
                    <span class="product-sold-out">
                        SOLD OUT
                    </span>
                    `
                    :
                    ""
                }

            </div>


            <div class="product-info">

                <div class="product-color-row">

                    <span
                        class="color-dot"
                        style="background:${escapeHTML(
                            getColorValue(
                                product.color
                            )
                        )};">
                    </span>

                    <span>
                        ${escapeHTML(
                            product.color ||
                            ""
                        )}
                    </span>

                </div>


                <h3 class="product-name">
                    ${escapeHTML(
                        product.name
                    )}
                </h3>


                <div class="product-price">

                    ${
                        oldPrice > price
                        ?
                        `
                        <span class="old-price">
                            ${formatPrice(
                                oldPrice
                            )} EGP
                        </span>
                        `
                        :
                        ""
                    }

                    <span class="current-price">
                        ${formatPrice(
                            price
                        )} EGP
                    </span>

                </div>


                <div class="product-actions">

                    <button
                        type="button"
                        class="quick-view-btn"
                        data-action="quick-view"
                        data-product-id="${escapeHTML(
                            product.id
                        )}">
                        QUICK VIEW
                    </button>

                    <button
                        type="button"
                        class="add-to-cart-btn"
                        data-action="add-product"
                        data-product-id="${escapeHTML(
                            product.id
                        )}"
                        ${
                            soldOut
                            ? "disabled"
                            : ""
                        }>

                        ${
                            soldOut
                            ?
                            "SOLD OUT"
                            :
                            "ADD TO CART"
                        }

                    </button>

                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   SHOP FILTERS
========================================================= */

function setupFilters() {

    const filterButtons =
        document.querySelectorAll(".filter-btn");

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            const filter =
                String(button.dataset.filter || "all")
                    .trim()
                    .toLowerCase();

            activeFilter = filter;

            filterButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            applyFilters();
        });
    });


    /* =========================================
       ADVANCED FILTERS
    ========================================= */

    if (sizeFilter) {
        sizeFilter.addEventListener("change", applyFilters);
    }

    if (colorFilter) {
        colorFilter.addEventListener("change", applyFilters);
    }

    if (priceFilter) {
        priceFilter.addEventListener("change", applyFilters);
    }


    /* =========================================
       RESET
    ========================================= */

    const resetButton =
        document.getElementById("resetFilters");

    if (resetButton) {

        resetButton.addEventListener("click", () => {

            activeFilter = "all";

            filterButtons.forEach(btn => {
                btn.classList.toggle(
                    "active",
                    btn.dataset.filter === "all"
                );
            });

            if (sizeFilter) {
                sizeFilter.value = "";
            }

            if (colorFilter) {
                colorFilter.value = "";
            }

            if (priceFilter) {
                priceFilter.value = "";
            }

            applyFilters();
        });
    }
}


/* =========================================================
   FILTER NORMALIZATION
========================================================= */

function normalizeFilter(value) {

    const filter =
        String(
            value || "all"
        )
            .trim()
            .toLowerCase();

    if (
        [
            "women",
            "men",
            "new",
            "best",
            "available",
            "out"
        ].includes(filter)
    ) {

        return filter;
    }

    return "all";
}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

    let result = [...products];

    /* =========================================
   MAIN FILTER
========================================= */

if (activeFilter === "women") {

    result = result.filter(product => {

        const gender = getProductGender(product);

        return (
            gender === "women" ||
            gender === "both"
        );
    });

} else if (activeFilter === "men") {

    result = result.filter(product => {

        const gender = getProductGender(product);

        return (
            gender === "men" ||
            gender === "both"
        );
    });

} else if (activeFilter === "new") {

    result = result.filter(product =>
        isTruthyFlag(product.is_new) ||
        isTruthyFlag(product.is_just_arrived)
    );

} else if (activeFilter === "best") {

    result = result.filter(product =>
        isTruthyFlag(product.is_best_seller) ||
        isTruthyFlag(product.is_most_ordered)
    );

} else if (activeFilter === "available") {

    result = result.filter(product =>
        getStock(product) > 0
    );

} else if (activeFilter === "out") {

    result = result.filter(product =>
        getStock(product) <= 0
    );
}
    /* =========================================
       SIZE FILTER
    ========================================= */

   const selectedSize =
    sizeFilter?.value?.trim().toLowerCase() || "";

if (
    selectedSize &&
    selectedSize !== "all"
) {

    result = result.filter(product => {

        const sizes =
            normalizeSizes(product.sizes);

        return sizes.some(size =>
            String(size)
                .trim()
                .toLowerCase() === selectedSize
        );
    });
}
    /* =========================================
       COLOR FILTER
    ========================================= */

    const selectedColor =
        colorFilter?.value?.trim().toLowerCase() || "";

    if (
    selectedColor &&
    selectedColor !== "all"
) {

    result = result.filter(product => {

        return String(product.color || "")
            .trim()
            .toLowerCase() === selectedColor;

    });
}

    /* =========================================
       PRICE FILTER
    ========================================= */

    const selectedPrice =
        priceFilter?.value?.trim() || "";

    if (selectedPrice) {

        result = result.filter(product => {

            const price = Number(product.price || 0);

            if (selectedPrice === "under-1000") {
                return price < 1000;
            }

            if (selectedPrice === "1000-1500") {
                return price >= 1000 && price <= 1500;
            }

            if (selectedPrice === "over-1500") {
                return price > 1500;
            }

            return true;
        });
    }


    /* =========================================
       SAVE + RENDER
    ========================================= */

    filteredProducts = result;

    renderShopProducts();

    if (productCount) {
        productCount.textContent = filteredProducts.length;
    }

    if (noProducts) {
        noProducts.hidden = filteredProducts.length !== 0;
    }
}


/* =========================================================
   DYNAMIC FILTER OPTIONS
========================================================= */

function populateDynamicFilters() {

    if (colorFilter) {

        const current =
            colorFilter.value;

        const colors =
            [
                ...new Set(
                    products
                        .map(
                            product =>
                                String(
                                    product.color ||
                                    ""
                                ).trim()
                        )
                        .filter(Boolean)
                )
            ]
                .sort();

        colorFilter.innerHTML = `
            <option value="all">
                All Colors
            </option>

            ${
                colors
                    .map(
                        color =>
                            `
                            <option
                                value="${escapeHTML(
                                    color
                                )}">
                                ${escapeHTML(
                                    color
                                )}
                            </option>
                            `
                    )
                    .join("")
            }
        `;

        if (
            colors.includes(current)
        ) {

            colorFilter.value =
                current;
        }
    }


    if (sizeFilter) {

        const current =
            sizeFilter.value;

        const sizes =
            [
                ...new Set(
                    products
                        .flatMap(
                            product =>
                                normalizeSizes(
                                    product.sizes
                                )
                        )
                )
            ]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        String(a)
                            .localeCompare(
                                String(b),
                                undefined,
                                {
                                    numeric: true
                                }
                            )
                );

        sizeFilter.innerHTML = `
            <option value="all">
                All Sizes
            </option>

            ${
                sizes
                    .map(
                        size =>
                            `
                            <option
                                value="${escapeHTML(
                                    size
                                )}">
                                ${escapeHTML(
                                    size
                                )}
                            </option>
                            `
                    )
                    .join("")
            }
        `;

        if (
            sizes.includes(current)
        ) {

            sizeFilter.value =
                current;
        }
    }
}

/* =========================================================
   RENDER SHOP - FIXED
========================================================= */

function renderShopProducts() {

    if (!shopProducts) {
        console.warn("shopProducts element not found.");
        return;
    }

    /*
     * Make absolutely sure the products container
     * is visible.
     */
    shopProducts.hidden = false;
    shopProducts.removeAttribute("hidden");

    shopProducts.style.visibility = "visible";
    shopProducts.style.opacity = "1";

    if (productCount) {
        productCount.textContent =
            filteredProducts.length;
    }

    /*
     * No products
     */
    if (!filteredProducts.length) {

        shopProducts.innerHTML = "";

        if (noProducts) {
            noProducts.hidden = false;
            noProducts.style.display = "";
        }

        return;
    }

    /*
     * Products exist
     */
    if (noProducts) {
        noProducts.hidden = true;
        noProducts.style.display = "none";
    }

    /*
     * Render products
     */
    shopProducts.innerHTML =
        filteredProducts
            .map(product => createProductCard(product))
            .join("");

    /*
     * Force the cards to be visible in case
     * another CSS rule is hiding them.
     */
    shopProducts
        .querySelectorAll(".product-card")
        .forEach(card => {

            card.hidden = false;

            card.style.visibility = "visible";
            card.style.opacity = "1";
        });
}

/* =========================================================
   EMPTY PRODUCTS
========================================================= */

function renderEmptyProducts(
    message
) {

    if (!shopProducts) {
        return;
    }

    shopProducts.innerHTML = `
        <div class="empty-products">
            ${escapeHTML(
                message
            )}
        </div>
    `;
}


/* =========================================================
   MODAL
========================================================= */

function setupModal() {

    if (!productModal) {
        return;
    }


    productModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                productModal
            ) {

                closeProductModal();
            }
        }
    );


    document
        .querySelectorAll(
            "[data-close-modal]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    closeProductModal
                );
            }
        );


    document
        .querySelectorAll(
            ".size-chart-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    showSizeChart
                );
            }
        );


    const decrease =
        document.getElementById(
            "decreaseQty"
        );

    if (decrease) {

        decrease.addEventListener(
            "click",
            () => {

                if (
                    modalQuantity >
                    1
                ) {

                    modalQuantity--;

                    updateModalQuantity();
                }
            }
        );
    }


    const increase =
        document.getElementById(
            "increaseQty"
        );

    if (increase) {

        increase.addEventListener(
            "click",
            () => {

                const max =
                    getAvailableStockForSize(
                        selectedProduct,
                        selectedSize
                    );

                if (
                    modalQuantity <
                    max
                ) {

                    modalQuantity++;

                    updateModalQuantity();
                } else {

                    showNotification(
                        "Maximum available quantity reached.",
                        "warning"
                    );
                }
            }
        );
    }


    const previous =
        document.getElementById(
            "modalPrevImage"
        );

    if (previous) {

        previous.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                changeModalImage(
                    -1
                );
            }
        );
    }


    const next =
        document.getElementById(
            "modalNextImage"
        );

    if (next) {

        next.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                changeModalImage(
                    1
                );
            }
        );
    }
}


/* =========================================================
   OPEN PRODUCT MODAL
========================================================= */

function openProductModal(
    product
) {

    if (!productModal) {
        return;
    }

    selectedProduct =
        product;

    selectedSize =
        null;

    modalQuantity =
        1;


    const name =
        document.getElementById(
            "modalProductName"
        );

    const color =
        document.getElementById(
            "modalProductColor"
        );

    const oldPrice =
        document.getElementById(
            "modalOldPrice"
        );

    const price =
        document.getElementById(
            "modalPrice"
        );


    if (name) {

        name.textContent =
            product.name ||
            "Product";
    }


    if (color) {

        color.textContent =
            product.color ||
            "";
    }


    const old =
        Number(
            product.old_price ||
            0
        );

    const current =
        Number(
            product.price ||
            0
        );


    if (oldPrice) {

        if (
            old >
            current
        ) {

            oldPrice.textContent =
                `${formatPrice(
                    old
                )} EGP`;

            oldPrice.style.display =
                "";

        } else {

            oldPrice.textContent =
                "";

            oldPrice.style.display =
                "none";
        }
    }


    if (price) {

        price.textContent =
            `${formatPrice(
                current
            )} EGP`;
    }


    renderModalImages(
        product
    );

    renderModalDescription(
        product
    );

    renderModalSizes(
        product
    );

    updateSizeChartButton(
        product
    );

    updateModalQuantity();


    productModal.classList.add(
        "active"
    );

    document.body.classList.add(
        "modal-open"
    );
}


/* =========================================================
   MODAL IMAGES
========================================================= */

function renderModalImages(product) {

    currentModalImages = getProductImages(product);
    currentModalImageIndex = 0;

    const imageContainer =
        productModal?.querySelector(".modal-image");

    if (!imageContainer) {
        return;
    }

    if (!currentModalImages.length) {

        imageContainer.innerHTML = `
            <div class="product-placeholder">
                FIGURE SCRUB
            </div>
        `;

        return;
    }

    imageContainer.innerHTML = `

        <div class="modern-product-gallery">

            ${
                currentModalImages.length > 1
                ?
                `
                <div class="modern-gallery-thumbs">

                    ${currentModalImages
                        .map(
                            (image, index) => `
                                <button
                                    type="button"
                                    class="modern-gallery-thumb ${
                                        index === 0
                                            ? "active"
                                            : ""
                                    }"
                                    data-modal-image-index="${index}"
                                    aria-label="View image ${index + 1}"
                                >
                                    <img
                                        src="${escapeHTML(image)}"
                                        alt=""
                                    >
                                </button>
                            `
                        )
                        .join("")
                    }

                </div>
                `
                :
                ""
            }


            <div class="modern-gallery-main">

                <img
                    id="modalMainImage"
                    class="modern-main-image"
                    src="${escapeHTML(
                        currentModalImages[0]
                    )}"
                    alt="${escapeHTML(
                        product.name || "Figure Scrub"
                    )}"
                >

                ${
                    currentModalImages.length > 1
                    ?
                    `
                    <div class="modern-gallery-counter">
                        <span id="modalCurrentImage">
                            01
                        </span>

                        <span class="modern-gallery-line"></span>

                        <span>
                            ${String(
                                currentModalImages.length
                            ).padStart(2, "0")}
                        </span>
                    </div>
                    `
                    :
                    ""
                }

            </div>

        </div>
    `;


    /*
     * Thumbnail click
     */

    imageContainer
        .querySelectorAll(
            "[data-modal-image-index]"
        )
        .forEach(
            thumbnail => {

                thumbnail.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();
                        event.stopPropagation();

                        const index =
                            Number(
                                thumbnail.dataset
                                    .modalImageIndex
                            );

                        setModalImage(index);
                    }
                );
            }
        );


    /*
     * Mobile swipe
     */

    const mainImage =
        imageContainer.querySelector(
            ".modern-gallery-main"
        );

    if (mainImage) {

        let touchStartX = 0;
        let touchEndX = 0;

        mainImage.addEventListener(
            "touchstart",
            event => {

                touchStartX =
                    event.changedTouches[0].screenX;
            },
            {
                passive: true
            }
        );

        mainImage.addEventListener(
            "touchend",
            event => {

                touchEndX =
                    event.changedTouches[0].screenX;

                const difference =
                    touchStartX -
                    touchEndX;

                /*
                 * Swipe left
                 */

                if (difference > 50) {

                    changeModalImage(1);
                }

                /*
                 * Swipe right
                 */

                if (difference < -50) {

                    changeModalImage(-1);
                }
            },
            {
                passive: true
            }
        );
    }
}


/* =========================================================
   CHANGE MODAL IMAGE
========================================================= */

function changeModalImage(
    direction
) {

    if (
        currentModalImages.length <=
        1
    ) {

        return;
    }

    let nextIndex =
        currentModalImageIndex +
        direction;


    if (
        nextIndex < 0
    ) {

        nextIndex =
            currentModalImages.length -
            1;
    }


    if (
        nextIndex >=
        currentModalImages.length
    ) {

        nextIndex = 0;
    }


    setModalImage(
        nextIndex
    );
}


/* =========================================================
   SET MODAL IMAGE
========================================================= */

function setModalImage(index) {

    if (!currentModalImages[index]) {
        return;
    }

    currentModalImageIndex = index;

    const mainImage =
        document.getElementById(
            "modalMainImage"
        );

    if (mainImage) {

        /*
         * Small fade effect
         */

        mainImage.classList.add(
            "changing"
        );

        setTimeout(() => {

            mainImage.src =
                currentModalImages[index];

            mainImage.classList.remove(
                "changing"
            );

        }, 120);
    }


    /*
     * Active thumbnail
     */

    document
        .querySelectorAll(
            ".modern-gallery-thumb"
        )
        .forEach(
            thumbnail => {

                thumbnail.classList.toggle(
                    "active",
                    Number(
                        thumbnail.dataset
                            .modalImageIndex
                    ) === index
                );
            }
        );


    /*
     * Update counter
     */

    const currentImage =
        document.getElementById(
            "modalCurrentImage"
        );

    if (currentImage) {

        currentImage.textContent =
            String(
                index + 1
            ).padStart(
                2,
                "0"
            );
    }
}

/* =========================================================
   DESCRIPTION
========================================================= */

function renderModalDescription(
    product
) {

    let description =
        document.getElementById(
            "modalProductDescription"
        );


    /*
     * Your current shop.html does not have
     * a description element yet.
     *
     * So we create one automatically
     * inside the modal details area.
     */

    if (!description) {

        const details =
            productModal?.querySelector(
                ".modal-details"
            ) ||
            productModal?.querySelector(
                ".modal-content"
            );


        if (
            details
        ) {

            description =
                document.createElement(
                    "div"
                );

            description.id =
                "modalProductDescription";

            description.className =
                "modal-product-description";


            const price =
                document.getElementById(
                    "modalPrice"
                );


            if (
                price?.parentElement
            ) {

                price.parentElement
                    .insertAdjacentElement(
                        "afterend",
                        description
                    );

            } else {

                details.appendChild(
                    description
                );
            }
        }
    }


    if (!description) {
        return;
    }


    const text =
        String(
            product.description ||
            ""
        ).trim();


    if (!text) {

        description.innerHTML =
            "";

        description.style.display =
            "none";

        return;
    }


    description.innerHTML = `
        <div class="description-title">
            Description
        </div>

        <div class="description-text">
            ${escapeHTML(
                text
            ).replace(
                /\n/g,
                "<br>"
            )}
        </div>
    `;

    description.style.display =
        "";
}


/* =========================================================
   MODAL SIZES
========================================================= */

function renderModalSizes(
    product
) {

    const container =
        productModal?.querySelector(
            ".size-options"
        );

    if (!container) {
        return;
    }


    const sizes =
        normalizeSizes(
            product.sizes
        );


    if (!sizes.length) {

        container.innerHTML =
            "";

        selectedSize =
            null;

        return;
    }


    const hasStock =
        hasSizeStockData(
            product
        );


    container.innerHTML =
        sizes
            .map(
                size => {

                    const stock =
                        hasStock
                        ?
                        getSizeStockValue(
                            product,
                            size
                        )
                        :
                        getStock(
                            product
                        );


                    const soldOut =
                        stock <= 0;


                    return `

                        <button
                            type="button"
                            class="size-btn ${
                                soldOut
                                ? "sold-out"
                                : ""
                            }"
                            data-size="${escapeHTML(
                                size
                            )}"
                            ${
                                soldOut
                                ? "disabled"
                                : ""
                            }>

                            <span class="size-name">
                                ${escapeHTML(
                                    size
                                )}
                            </span>

                            ${
                                soldOut
                                ?
                                `
                                <span class="size-sold-label">
                                    SOLD OUT
                                </span>
                                `
                                :
                                ""
                            }

                        </button>

                    `;
                }
            )
            .join("");


    const available =
        sizes.filter(
            size =>
                (
                    hasStock
                    ?
                    getSizeStockValue(
                        product,
                        size
                    )
                    :
                    getStock(
                        product
                    )
                ) > 0
        );


    /*
     * Automatically select the first
     * available size.
     */

    if (
        available.length
    ) {

        selectedSize =
            available[0];

        const firstButton =
            container.querySelector(
                `[data-size="${CSS.escape(
                    selectedSize
                )}"]`
            );

        if (firstButton) {

            firstButton.classList.add(
                "active"
            );
        }

    } else {

        selectedSize =
            null;
    }


    container
        .querySelectorAll(
            ".size-btn:not(:disabled)"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        selectedSize =
                            button.dataset.size;

                        modalQuantity =
                            1;

                        container
                            .querySelectorAll(
                                ".size-btn"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        button.classList.add(
                            "active"
                        );

                        updateModalQuantity();
                    }
                );
            }
        );
}


/* =========================================================
   MODAL QUANTITY
========================================================= */

function updateModalQuantity() {

    const value =
        document.getElementById(
            "quantityValue"
        );

    if (value) {

        value.textContent =
            modalQuantity;
    }


    const addButton =
        document.querySelector(
            ".modal-add-cart"
        );


    if (!addButton) {
        return;
    }


    if (!selectedProduct) {

        addButton.disabled =
            true;

        return;
    }


    const stock =
        selectedSize
        ?
        getAvailableStockForSize(
            selectedProduct,
            selectedSize
        )
        :
        getStock(
            selectedProduct
        );


    addButton.disabled =
        stock <= 0 ||
        (
            normalizeSizes(
                selectedProduct.sizes
            ).length > 0 &&
            !selectedSize
        );


    if (
        stock > 0 &&
        modalQuantity > stock
    ) {

        modalQuantity =
            stock;

        if (value) {

            value.textContent =
                modalQuantity;
        }
    }
}


/* =========================================================
   SIZE CHART
========================================================= */

function updateSizeChartButton(
    product
) {

    const buttons =
        document.querySelectorAll(
            ".size-chart-btn"
        );

    buttons.forEach(
        button => {

            if (
                product.size_chart_url
            ) {

                button.style.display =
                    "";

                button.dataset.chartUrl =
                    product.size_chart_url;

            } else {

                button.style.display =
                    "none";
            }
        }
    );
}


function showSizeChart(
    event
) {

    const button =
        event.currentTarget;

    const url =
        button.dataset.chartUrl;

    if (!url) {
        return;
    }


    let overlay =
        document.getElementById(
            "sizeChartModal"
        );


    if (!overlay) {

        overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "sizeChartModal";

        overlay.className =
            "modal-overlay";


        overlay.innerHTML = `

            <div class="size-chart-modal-content">

                <button
                    type="button"
                    class="modal-close"
                    data-close-size-chart>
                    ×
                </button>

                <img
                    id="sizeChartModalImage"
                    src=""
                    alt="Size Chart"
                >

            </div>

        `;


        document.body.appendChild(
            overlay
        );


        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    overlay ||
                    event.target.closest(
                        "[data-close-size-chart]"
                    )
                ) {

                    overlay.classList.remove(
                        "active"
                    );
                }
            }
        );
    }


    const image =
        document.getElementById(
            "sizeChartModalImage"
        );

    if (image) {

        image.src =
            url;
    }


    overlay.classList.add(
        "active"
    );
}


/* =========================================================
   CLOSE PRODUCT MODAL
========================================================= */

function closeProductModal() {

    if (!productModal) {
        return;
    }

    productModal.classList.remove(
        "active"
    );

    document.body.classList.remove(
        "modal-open"
    );

    selectedProduct =
        null;

    selectedSize =
        null;

    modalQuantity =
        1;
}


/* =========================================================
   GLOBAL ACTIONS
========================================================= */

function setupGlobalActions() {

    document.addEventListener(
        "click",
        event => {

            const action =
                event.target.closest(
                    "[data-action]"
                );

            if (!action) {
                return;
            }


            const type =
                action.dataset.action;


            if (
                type ===
                "quick-view"
            ) {

                const product =
                    findProduct(
                        action.dataset.productId
                    );

                if (product) {

                    openProductModal(
                        product
                    );
                }

                return;
            }


            if (
                type ===
                "add-product"
            ) {

                const product =
                    findProduct(
                        action.dataset.productId
                    );

                if (product) {

                    openProductModal(
                        product
                    );
                }

                return;
            }


            if (
                type ===
                "open"
            ) {

                if (
                    action.dataset.cartAction ===
                    "open"
                ) {

                    openCart();
                }

                return;
            }
        }
    );


    document
        .querySelectorAll(
            ".modal-add-cart"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        if (
                            selectedProduct
                        ) {

                            addToCart(
                                selectedProduct,
                                selectedSize,
                                modalQuantity
                            );
                        }
                    }
                );
            }
        );


    /*
     * Some pages have cart buttons
     * without data-cart-action.
     */

    document
        .querySelectorAll(
            ".cart-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        openCart();
                    }
                );
            }
        );


    document
        .querySelectorAll(
            "[data-view-more]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        window.location.href =
                            "shop.html";
                    }
                );
            }
        );
}


/* =========================================================
   FIND PRODUCT
========================================================= */

function findProduct(
    id
) {

    return products.find(
        product =>
            String(
                product.id
            ) ===
            String(id)
    );
}


/* =========================================================
   ADD TO CART
========================================================= */

function addToCart(
    product,
    size,
    quantity = 1
) {

    if (!product) {
        return;
    }


    const sizes =
        normalizeSizes(
            product.sizes
        );


    if (
        sizes.length &&
        !size
    ) {

        showNotification(
            "Please select a size.",
            "warning"
        );

        return;
    }


    const availableStock =
        size
        ?
        getAvailableStockForSize(
            product,
            size
        )
        :
        getStock(
            product
        );


    if (
        availableStock <= 0
    ) {

        showNotification(
            "This product is sold out.",
            "error"
        );

        return;
    }


    quantity =
        Math.max(
            1,
            Number(
                quantity
            ) || 1
        );


    if (
        quantity >
        availableStock
    ) {

        showNotification(
            `Only ${availableStock} available.`,
            "warning"
        );

        quantity =
            availableStock;
    }


    const existing =
        cart.find(
            item =>
                String(
                    item.productId
                ) ===
                String(
                    product.id
                ) &&
                String(
                    item.size || ""
                ) ===
                String(
                    size || ""
                )
        );


    if (existing) {

        const newQuantity =
            Number(
                existing.quantity
            ) +
            quantity;


        if (
            newQuantity >
            availableStock
        ) {

            existing.quantity =
                availableStock;

        } else {

            existing.quantity =
                newQuantity;
        }

    } else {

        cart.push({

            productId:
                product.id,

            name:
                product.name,

            price:
                Number(
                    product.price || 0
                ),

            oldPrice:
                Number(
                    product.old_price || 0
                ),

            image:
                getMainProductImage(
                    product
                ),

            color:
                product.color ||
                "",

            size:
                size ||
                "",

            quantity:
                quantity
        });
    }


    saveCart();

    renderCart();

    showNotification(
        "Added to cart successfully.",
        "success"
    );


    closeProductModal();
}


/* =========================================================
   CART
========================================================= */

function setupCart() {

    const close =
        document.querySelector(
            "[data-cart-action='close']"
        );

    if (close) {

        close.addEventListener(
            "click",
            closeCart
        );
    }


    if (cartDrawer) {

        cartDrawer.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    cartDrawer
                ) {

                    closeCart();
                }
            }
        );
    }


    document
        .querySelectorAll(
            "[data-cart-action='checkout']"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    handleCheckout
                );
            }
        );


    renderCart();
}


function openCart() {

    if (!cartDrawer) {
        return;
    }

    renderCart();

    cartDrawer.classList.add(
        "active"
    );

    document.body.classList.add(
        "cart-open"
    );
}


function closeCart() {

    if (!cartDrawer) {
        return;
    }

    cartDrawer.classList.remove(
        "active"
    );

    document.body.classList.remove(
        "cart-open"
    );
}


/* =========================================================
   RENDER CART
========================================================= */

function renderCart() {

    const container =
        document.getElementById(
            "cartItems"
        );

    if (!container) {
        return;
    }


    if (!cart.length) {

        container.innerHTML = `
            <div class="cart-empty">
                <p>Your cart is empty.</p>
                <button
                    type="button"
                    class="continue-shopping"
                    data-cart-action="close">
                    Continue Shopping
                </button>
            </div>
        `;

        updateCartSubtotal();

        return;
    }


    container.innerHTML =
        cart
            .map(
                createCartItem
            )
            .join("");


    updateCartSubtotal();
}


/* =========================================================
   CART ITEM
========================================================= */

function createCartItem(
    item,
    index
) {

    const product =
        findProduct(
            item.productId
        );


    const image =
        item.image ||
        getMainProductImage(
            product
        );


    const availableStock =
        product
        ?
        (
            item.size
            ?
            getAvailableStockForSize(
                product,
                item.size
            )
            :
            getStock(
                product
            )
        )
        :
        Number(
            item.quantity || 0
        );


    return `

        <div
            class="cart-item"
            data-cart-index="${index}"
        >

            ${
                image
                ?
                `
                <img
                    class="cart-item-image"
                    src="${escapeHTML(
                        image
                    )}"
                    alt="${escapeHTML(
                        item.name
                    )}"
                >
                `
                :
                `
                <div class="cart-item-image product-placeholder">
                    FS
                </div>
                `
            }


            <div class="cart-item-info">

                <h4>
                    ${escapeHTML(
                        item.name
                    )}
                </h4>


                ${
                    item.color
                    ?
                    `
                    <span>
                        ${escapeHTML(
                            item.color
                        )}
                    </span>
                    `
                    :
                    ""
                }


                ${
                    item.size
                    ?
                    `
                    <span>
                        Size:
                        ${escapeHTML(
                            item.size
                        )}
                    </span>
                    `
                    :
                    ""
                }


                <strong>
                    ${formatPrice(
                        item.price
                    )} EGP
                </strong>


                <div class="cart-item-controls">

                    <button
                        type="button"
                        data-cart-change="decrease"
                        data-cart-index="${index}">
                        −
                    </button>


                    <span>
                        ${item.quantity}
                    </span>


                    <button
                        type="button"
                        data-cart-change="increase"
                        data-cart-index="${index}"
                        ${
                            item.quantity >=
                            availableStock
                            ? "disabled"
                            : ""
                        }>
                        +
                    </button>


                    <button
                        type="button"
                        class="cart-remove"
                        data-cart-change="remove"
                        data-cart-index="${index}">
                        Remove
                    </button>

                </div>

            </div>

        </div>
    `;
}


/* =========================================================
   CART EVENTS
========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-cart-change]"
            );

        if (!button) {
            return;
        }


        const index =
            Number(
                button.dataset.cartIndex
            );


        if (
            !cart[index]
        ) {
            return;
        }


        const action =
            button.dataset.cartChange;


        if (
            action ===
            "remove"
        ) {

            cart.splice(
                index,
                1
            );

        } else if (
            action ===
            "increase"
        ) {

            const item =
                cart[index];

            const product =
                findProduct(
                    item.productId
                );


            const max =
                product
                ?
                (
                    item.size
                    ?
                    getAvailableStockForSize(
                        product,
                        item.size
                    )
                    :
                    getStock(
                        product
                    )
                )
                :
                Infinity;


            if (
                item.quantity <
                max
            ) {

                item.quantity++;

            } else {

                showNotification(
                    "No more stock available.",
                    "warning"
                );
            }

        } else if (
            action ===
            "decrease"
        ) {

            cart[index].quantity--;

            if (
                cart[index].quantity <=
                0
            ) {

                cart.splice(
                    index,
                    1
                );
            }
        }


        saveCart();

        renderCart();
    }
);


/* =========================================================
   UPDATE CART SUBTOTAL
========================================================= */

function updateCartSubtotal() {

    const subtotal =
        cart.reduce(
            (
                total,
                item
            ) =>
                total +
                (
                    Number(
                        item.price || 0
                    ) *
                    Number(
                        item.quantity || 0
                    )
                ),
            0
        );


    document
        .querySelectorAll(
            "#cartSubtotal, .cart-subtotal"
        )
        .forEach(
            element => {

                element.textContent =
                    `${formatPrice(
                        subtotal
                    )} EGP`;
            }
        );
}


/* =========================================================
   CLEAN CART
========================================================= */

function cleanupCartAgainstProducts() {

    if (!Array.isArray(cart)) {
        cart = [];
    }


    cart =
        cart.filter(
            item => {

                const product =
                    findProduct(
                        item.productId
                    );

                if (!product) {
                    return false;
                }


                const stock =
                    item.size
                    ?
                    getAvailableStockForSize(
                        product,
                        item.size
                    )
                    :
                    getStock(
                        product
                    );


                if (
                    stock <= 0
                ) {
                    return false;
                }


                if (
                    Number(
                        item.quantity
                    ) >
                    stock
                ) {

                    item.quantity =
                        stock;
                }


                item.price =
                    Number(
                        product.price ||
                        item.price ||
                        0
                    );


                item.name =
                    product.name ||
                    item.name;


                item.color =
                    product.color ||
                    item.color;


                const mainImage =
                    getMainProductImage(
                        product
                    );


                if (
                    mainImage
                ) {

                    item.image =
                        mainImage;
                }


                return (
                    item.quantity >
                    0
                );
            }
        );


    saveCart();

    updateCartCount();

    renderCart();
}


/* =========================================================
   CHECKOUT
========================================================= */

function handleCheckout() {

    if (!cart.length) {

        showNotification(
            "Your cart is empty.",
            "warning"
        );

        return;
    }


    /*
     * If you already have a checkout page,
     * change this filename only.
     */

    window.location.href =
        "checkout.html";
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function showNotification(
    message,
    type = "success"
) {

    let notification =
        document.getElementById(
            "figureScrubNotification"
        );


    if (!notification) {

        notification =
            document.createElement(
                "div"
            );

        notification.id =
            "figureScrubNotification";

        notification.className =
            "figure-scrub-notification";


        document.body.appendChild(
            notification
        );
    }


    notification.className =
        `figure-scrub-notification ${type}`;


    notification.textContent =
        message;


    requestAnimationFrame(
        () => {

            notification.classList.add(
                "show"
            );
        }
    );


    clearTimeout(
        notification._timeout
    );


    notification._timeout =
        setTimeout(
            () => {

                notification.classList.remove(
                    "show"
                );

            },
            3500
        );
}


/* =========================================================
   NEWSLETTER
========================================================= */

function setupNewsletter() {

    const form =
        document.getElementById(
            "newsletterForm"
        );

    if (!form) {
        return;
    }


    /*
     * index.html already contains
     * its own newsletter handler.
     *
     * Do not attach another competing
     * handler when that inline handler
     * is present.
     */

    if (
        form.dataset.newsletterHandled ===
        "true"
    ) {

        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const input =
                document.getElementById(
                    "newsletterEmail"
                );

            const button =
                document.getElementById(
                    "newsletterButton"
                );

            const success =
                document.querySelector(
                    ".newsletter-success"
                );


            const email =
                input?.value
                    .trim()
                    .toLowerCase();


            if (
                !email ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    .test(email)
            ) {

                showNotification(
                    "Please enter a valid email.",
                    "warning"
                );

                return;
            }


            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "SUBSCRIBING...";
            }


            try {

                const {
                    error
                } =
                    await supabaseClient
                        .from(
                            "subscribers"
                        )
                        .insert({
                            email
                        });


                if (error) {

                    if (
                        error.code ===
                        "23505"
                    ) {

                        showNotification(
                            "You are already subscribed.",
                            "warning"
                        );

                    } else {

                        throw error;
                    }

                } else {

                    if (success) {

                        success.textContent =
                            "Thank you for subscribing!";

                        success.style.display =
                            "";
                    }

                    showNotification(
                        "Subscribed successfully.",
                        "success"
                    );


                    if (input) {
                        input.value =
                            "";
                    }
                }

            } catch (error) {

                console.error(
                    "Newsletter:",
                    error
                );

                showNotification(
                    "Could not subscribe right now.",
                    "error"
                );

            } finally {

                if (button) {

                    button.disabled =
                        false;

                    button.textContent =
                        "SUBSCRIBE";
                }
            }
        }
    );

    form.dataset.newsletterHandled =
        "true";
}


/* =========================================================
   COUPON BAR
========================================================= */

async function loadCouponBar() {

    const bar =
        document.getElementById(
            "couponBar"
        );

    const track =
        document.getElementById(
            "couponBarTrack"
        );


    if (
        !bar ||
        !track ||
        !supabaseClient
    ) {

        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("coupons")
                .select(
                    "code,discount_type,discount_value,is_active,starts_at,expires_at,usage_limit,used_count"
                )
                .eq(
                    "is_active",
                    true
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


        const activeCoupons =
            (
                data || []
            )
                .filter(
                    coupon =>
                        couponIsActive(
                            coupon
                        )
                );


        if (
            !activeCoupons.length
        ) {

            bar.style.display =
                "none";

            return;
        }


        track.innerHTML =
            activeCoupons
                .map(
                    coupon => {

                        const discount =
                            coupon.discount_type ===
                            "percentage"
                            ?
                            `${coupon.discount_value}% OFF`
                            :
                            `${formatPrice(
                                coupon.discount_value
                            )} EGP OFF`;


                        return `
                            <span>
                                Use code
                                <strong>
                                    ${escapeHTML(
                                        coupon.code
                                    )}
                                </strong>
                                for
                                <strong>
                                    ${escapeHTML(
                                        discount
                                    )}
                                </strong>
                            </span>
                        `;
                    }
                )
                .join(
                    `<span class="coupon-separator">•</span>`
                );


        bar.style.display =
            "";

    } catch (error) {

        console.warn(
            "Coupon bar:",
            error
        );

        bar.style.display =
            "none";
    }
}


function couponIsActive(
    coupon
) {

    if (
        !coupon ||
        coupon.is_active !== true
    ) {

        return false;
    }


    const now =
        Date.now();


    if (
        coupon.starts_at &&
        new Date(
            coupon.starts_at
        ).getTime() >
        now
    ) {

        return false;
    }


    if (
        coupon.expires_at &&
        new Date(
            coupon.expires_at
        ).getTime() <
        now
    ) {

        return false;
    }


    const limit =
        Number(
            coupon.usage_limit ||
            0
        );


    const used =
        Number(
            coupon.used_count ||
            0
        );


    if (
        limit > 0 &&
        used >= limit
    ) {

        return false;
    }


    return true;
}


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeProductModal();

            closeCart();

            document
                .querySelectorAll(
                    ".modal-overlay.active"
                )
                .forEach(
                    modal =>
                        modal.classList.remove(
                            "active"
                        )
                );
        }
    }
);


/* =========================================================
   GLOBAL CART CLOSE ACTION
========================================================= */

document.addEventListener(
    "click",
    event => {

        const action =
            event.target.closest(
                "[data-cart-action]"
            );

        if (!action) {
            return;
        }


        const type =
            action.dataset.cartAction;


        if (
            type ===
            "open"
        ) {

            event.preventDefault();

            openCart();

            return;
        }


        if (
            type ===
            "close"
        ) {

            event.preventDefault();

            closeCart();

            return;
        }


        if (
            type ===
            "checkout"
        ) {

            event.preventDefault();

            handleCheckout();

            return;
        }
    }
);


/* =========================================================
   MODAL ADD TO CART
========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".modal-add-cart"
            );

        if (!button) {
            return;
        }


        if (
            !selectedProduct
        ) {
            return;
        }


        addToCart(
            selectedProduct,
            selectedSize,
            modalQuantity
        );
    }
);


/* =========================================================
   HOME / SHOP IMAGE PRELOAD
========================================================= */

function preloadProductImages() {

    products.forEach(
        product => {

            getProductImages(
                product
            )
                .slice(
                    0,
                    3
                )
                .forEach(
                    url => {

                        const image =
                            new Image();

                        image.src =
                            url;
                    }
                );
        }
    );
}


/* =========================================================
   FINAL PRODUCT IMAGE PRELOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setTimeout(
            preloadProductImages,
            500
        );
    }
);


/* =========================================================
   OPTIONAL SEARCH
========================================================= */

function setupProductSearch() {

    const searchInputs =
        document.querySelectorAll(
            ".search-input, #searchInput"
        );


    searchInputs.forEach(
        input => {

            input.addEventListener(
                "input",
                () => {

                    const value =
                        input.value
                            .trim()
                            .toLowerCase();


                    if (!value) {

                        applyFilters();

                        return;
                    }


                    filteredProducts =
                        products.filter(
                            product => {

                                return [

                                    product.name,

                                    product.color,

                                    product.category,

                                    product.subcategory,

                                    product.description

                                ]
                                    .filter(Boolean)
                                    .some(
                                        text =>
                                            String(
                                                text
                                            )
                                                .toLowerCase()
                                                .includes(
                                                    value
                                                )
                                    );
                            }
                        );


                    renderShopProducts();
                }
            );
        }
    );
}


/* =========================================================
   SEARCH INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    setupProductSearch
);


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const menuButton =
            document.querySelector(
                ".mobile-menu-btn, .menu-toggle"
            );

        const nav =
            document.querySelector(
                ".nav-links"
            );


        if (
            !menuButton ||
            !nav
        ) {

            return;
        }


        menuButton.addEventListener(
            "click",
            () => {

                nav.classList.toggle(
                    "active"
                );

                menuButton.classList.toggle(
                    "active"
                );
            }
        );


        nav
            .querySelectorAll(
                "a"
            )
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        () => {

                            nav.classList.remove(
                                "active"
                            );

                            menuButton.classList.remove(
                                "active"
                            );
                        }
                    );
                }
            );
    }
);
/* =========================================================
   FIGURE SCRUB - FINAL FIX PATCH
   Fixes:
   - Product modal hidden attribute
   - Cart drawer hidden attribute
   - Modal close button
   - Modal overlay
   - Cart close button
   - Cart overlay
   - Checkout button
   - Duplicate Add To Cart
   - Duplicate Cart opening
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const modal =
        document.getElementById("productModal");

    const cartDrawer =
        document.getElementById("cartDrawer");


    /* =====================================================
       PRODUCT MODAL
    ===================================================== */

    if (modal) {

        /*
         * The HTML uses hidden="".
         * Make sure opening the modal removes it.
         */

        const originalOpenProductModal =
            window.openProductModal;

        /*
         * Remove direct listeners from the existing
         * modal add button by replacing the element.
         */

        const addButton =
            modal.querySelector(".modal-add-cart");

        if (addButton) {

            const cleanButton =
                addButton.cloneNode(true);

            addButton.replaceWith(
                cleanButton
            );


            cleanButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopImmediatePropagation();

                    if (!selectedProduct) {
                        return;
                    }

                    addToCart(
                        selectedProduct,
                        selectedSize,
                        modalQuantity
                    );
                }
            );
        }


        /*
         * Fix close button.
         */

        const closeButton =
            modal.querySelector(".modal-close");

        if (closeButton) {

            closeButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    closeProductModal();
                }
            );
        }


        /*
         * Fix overlay click.
         */

        const overlay =
            modal.querySelector(".modal-overlay");

        if (overlay) {

            overlay.addEventListener(
                "click",
                event => {

                    if (
                        event.target === overlay
                    ) {

                        closeProductModal();
                    }
                }
            );
        }


        /*
         * Make the modal actually visible.
         */

        const observer =
            new MutationObserver(() => {

                if (
                    modal.classList.contains(
                        "active"
                    )
                ) {

                    modal.hidden = false;

                } else {

                    modal.hidden = true;
                }
            });


        observer.observe(
            modal,
            {
                attributes: true,
                attributeFilter: [
                    "class"
                ]
            }
        );


        /*
         * Initial state.
         */

        if (
            !modal.classList.contains(
                "active"
            )
        ) {

            modal.hidden = true;
        }
    }


    /* =====================================================
       CART DRAWER
    ===================================================== */

    if (cartDrawer) {

        /*
         * Existing .cart-btn has its own listener
         * AND data-cart-action listener.
         *
         * Replace the button to remove the duplicate
         * direct listener.
         */

        document
            .querySelectorAll(".cart-btn")
            .forEach(button => {

                const cleanButton =
                    button.cloneNode(true);

                button.replaceWith(
                    cleanButton
                );
            });


        /*
         * Cart close button.
         */

        const closeButton =
            cartDrawer.querySelector(
                ".cart-close"
            );

        if (closeButton) {

            /*
             * Clone it so old listeners are removed.
             */

            const cleanButton =
                closeButton.cloneNode(true);

            closeButton.replaceWith(
                cleanButton
            );


            cleanButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    closeCart();
                }
            );
        }


        /*
         * Cart overlay.
         */

        const overlay =
            cartDrawer.querySelector(
                ".cart-overlay"
            );

        if (overlay) {

            overlay.addEventListener(
                "click",
                event => {

                    if (
                        event.target === overlay
                    ) {

                        closeCart();
                    }
                }
            );
        }


        /*
         * Checkout button.
         */

        const checkout =
            cartDrawer.querySelector(
                ".checkout-btn"
            );

        if (checkout) {

            const cleanCheckout =
                checkout.cloneNode(true);

            checkout.replaceWith(
                cleanCheckout
            );


            cleanCheckout.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    handleCheckout();
                }
            );
        }


        /*
         * Continue Shopping.
         */

        cartDrawer.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        ".continue-shopping"
                    );

                if (!button) {
                    return;
                }

                event.preventDefault();

                closeCart();
            }
        );


        /*
         * Keep hidden attribute synchronized.
         */

        const observer =
            new MutationObserver(() => {

                if (
                    cartDrawer.classList.contains(
                        "active"
                    )
                ) {

                    cartDrawer.hidden = false;

                } else {

                    cartDrawer.hidden = true;
                }
            });


        observer.observe(
            cartDrawer,
            {
                attributes: true,
                attributeFilter: [
                    "class"
                ]
            }
        );


        /*
         * Initial state.
         */

        if (
            !cartDrawer.classList.contains(
                "active"
            )
        ) {

            cartDrawer.hidden = true;
        }
    }


    /* =====================================================
       FIX OPEN / CLOSE FUNCTIONS
       Override the existing behavior safely.
    ===================================================== */

    const originalOpenCart =
        window.openCart;

    const originalCloseCart =
        window.closeCart;


    /*
     * We cannot redeclare the original functions,
     * so we use the existing functions and synchronize
     * the hidden attribute after every click.
     */

    document.addEventListener(
        "click",
        () => {

            setTimeout(() => {

                if (modal) {

                    modal.hidden =
                        !modal.classList.contains(
                            "active"
                        );
                }

                if (cartDrawer) {

                    cartDrawer.hidden =
                        !cartDrawer.classList.contains(
                            "active"
                        );
                }

            }, 0);
        },
        true
    );


    /* =====================================================
       INITIAL CART STATE
    ===================================================== */

    if (cartDrawer) {

        renderCart();

        cartDrawer.hidden =
            !cartDrawer.classList.contains(
                "active"
            );
    }

});
/* =========================================================
   FOOTER SOCIAL MEDIA
   LOAD FROM STORE SETTINGS
========================================================= */

async function loadFooterSocials() {

    try {

        if (!supabaseClient) {
            return;
        }

        const { data, error } =
            await supabaseClient
                .from("store-settings")
                .select("setting_key, setting_value");

        if (error) {
            console.error(
                "Failed to load social settings:",
                error
            );
            return;
        }

        if (!data || !data.length) {
            return;
        }

        const settings = {};

        data.forEach(setting => {

            settings[setting.setting_key] =
                setting.setting_value || "";

        });


        const footerSocials =
            document.getElementById("footerSocials");

        const instagram =
            document.getElementById("footerInstagram");

        const facebook =
            document.getElementById("footerFacebook");

        const whatsapp =
            document.getElementById("footerWhatsapp");


        if (!footerSocials) {
            return;
        }


        let hasSocial = false;


        /* =========================
           INSTAGRAM
        ========================= */

        if (
            instagram &&
            settings.instagram
        ) {

            instagram.href =
                settings.instagram.trim();

            instagram.hidden = false;

            hasSocial = true;
        }


        /* =========================
           FACEBOOK
        ========================= */

        if (
            facebook &&
            settings.facebook
        ) {

            facebook.href =
                settings.facebook.trim();

            facebook.hidden = false;

            hasSocial = true;
        }


        /* =========================
           WHATSAPP
        ========================= */

        if (
            whatsapp &&
            settings.whatsapp
        ) {

            let whatsappValue =
                settings.whatsapp.trim();


            if (
                whatsappValue.startsWith("http://") ||
                whatsappValue.startsWith("https://")
            ) {

                whatsapp.href =
                    whatsappValue;

            } else {

                whatsapp.href =
                    "https://wa.me/" +
                    whatsappValue.replace(
                        /\D/g,
                        ""
                    );

            }


            whatsapp.hidden = false;

            hasSocial = true;
        }


        footerSocials.hidden =
            !hasSocial;


    } catch (error) {

        console.error(
            "Footer socials error:",
            error
        );

    }
}

