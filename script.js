
/* =====================================================
   FIGURE SCRUB
   HOME + SHOP + CART + QUICK VIEW + FILTERS
   SUPABASE + REALTIME
===================================================== */


/* =====================================================
   SUPABASE
===================================================== */

const SUPABASE_URL =
    "https://fsbzopacumiuwjsegsgu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_KBYOhE4HKCT-BsrKHgOlPg_Iry7wFWY";

let supabaseClient = null;


/* =====================================================
   GLOBAL STATE
===================================================== */

let products = [];
let filteredProducts = [];

let activeFilter = "all";

let selectedProduct = null;
let selectedSize = null;
let modalQuantity = 1;

let cart = [];


/* =====================================================
   LOAD CART
===================================================== */

try {

    const savedCart =
        localStorage.getItem("figureScrubCart");

    cart =
        savedCart
            ? JSON.parse(savedCart)
            : [];

    if (!Array.isArray(cart)) {
        cart = [];
    }

} catch (error) {

    console.error(
        "Cart loading error:",
        error
    );

    cart = [];
}


/* =====================================================
   DOM ELEMENTS
===================================================== */

let shopProducts = null;
let productCount = null;

let sizeFilter = null;
let colorFilter = null;
let priceFilter = null;

let noProducts = null;

let productModal = null;
let cartDrawer = null;


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        initializeDOM();

        initializeSupabase();

        setupNewsletter();

        setupFilters();

        setupModal();

        setupCart();

        setupGlobalActions();

        updateCartCount();

        await loadProducts();

        setupRealtime();

        await loadCouponBar();

    }
);


/* =====================================================
   INITIALIZE SUPABASE
===================================================== */

function initializeSupabase() {

    if (
        window.supabase &&
        typeof window.supabase.createClient === "function"
    ) {

        supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY
            );

        console.log(
            "Figure Scrub Supabase connected."
        );

    } else {

        console.error(
            "Supabase CDN was not loaded."
        );

        showSiteMessage(
            "Unable to connect to the store database."
        );

    }

}


/* =====================================================
   INITIALIZE DOM
===================================================== */

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

}


/* =====================================================
   LOAD PRODUCTS FROM SUPABASE
===================================================== */

async function loadProducts() {

    if (!supabaseClient) {

        console.error(
            "Supabase is not initialized."
        );

        showNoProducts();

        return;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("products")
                .select("*")
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

            console.error(
                "Supabase products error:",
                error
            );

            showNoProducts();

            showSiteMessage(
                "Could not load products."
            );

            return;

        }


        products =
            Array.isArray(data)
                ? data
                : [];


        console.log(
            "Products loaded:",
            products
        );


        cleanupCartAgainstProducts();


        populateDynamicFilters();

        renderHomeSections();

        applyFilters();

    } catch (error) {

        console.error(
            "Unexpected products error:",
            error
        );

        showNoProducts();

    }

}


/* =====================================================
   REALTIME
===================================================== */

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
            async function () {

                console.log(
                    "Products changed. Reloading..."
                );

                await loadProducts();

            }
        )
        .subscribe(
            function (status) {

                console.log(
                    "Products realtime:",
                    status
                );

            }
        );

}


/* =====================================================
   HOME SECTIONS
===================================================== */

function renderHomeSections() {

    /* =================================================
       FEATURED
       First 3 active products
    ================================================= */

    const featuredContainer =
        document.getElementById(
            "featuredProducts"
        );


    if (featuredContainer) {

        const featured =
            products.slice(0, 3);

        renderHomeProductList(
            featuredContainer,
            featured
        );

    }


    /* =================================================
       MOST LOVED
       is_best_seller OR is_most_ordered
    ================================================= */

    const bestSection =
        document.getElementById(
            "bestSellersSection"
        );

    const bestContainer =
        document.getElementById(
            "bestSellersProducts"
        );


    if (
        bestSection &&
        bestContainer
    ) {

        const bestProducts =
            products
                .filter(
                    function (product) {

                        return (
                            product.is_best_seller === true ||
                            product.is_most_ordered === true
                        );

                    }
                )
                .slice(0, 3);


        if (bestProducts.length) {

            bestSection.style.display =
                "";

            renderHomeProductList(
                bestContainer,
                bestProducts
            );

        } else {

            bestSection.style.display =
                "none";

            bestContainer.innerHTML =
                "";

        }

    }


    /* =================================================
       JUST IN
       is_just_arrived OR is_new
    ================================================= */

    const newSection =
        document.getElementById(
            "newArrivalsSection"
        );

    const newContainer =
        document.getElementById(
            "newArrivalsProducts"
        );


    if (
        newSection &&
        newContainer
    ) {

        const newProducts =
            products
                .filter(
                    function (product) {

                        return (
                            product.is_just_arrived === true ||
                            product.is_new === true
                        );

                    }
                )
                .slice(0, 3);


        if (newProducts.length) {

            newSection.style.display =
                "";

            renderHomeProductList(
                newContainer,
                newProducts
            );

        } else {

            newSection.style.display =
                "none";

            newContainer.innerHTML =
                "";

        }

    }

}


/* =====================================================
   HOME PRODUCT LIST
===================================================== */

function renderHomeProductList(
    container,
    productList
) {

    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    productList.forEach(
        function (product) {

            container.appendChild(
                createProductCard(product)
            );

        }
    );

}


/* =====================================================
   DYNAMIC FILTERS
===================================================== */

function populateDynamicFilters() {

    populateColorFilter();

    populateSizeFilter();

}


/* =====================================================
   COLOR FILTER
===================================================== */

function populateColorFilter() {

    if (!colorFilter) {
        return;
    }


    const currentValue =
        colorFilter.value;


    const colorMap =
        new Map();


    products.forEach(
        function (product) {

            const color =
                String(
                    product.color || ""
                ).trim();


            if (!color) {
                return;
            }


            const key =
                color.toLowerCase();


            if (!colorMap.has(key)) {

                colorMap.set(
                    key,
                    color
                );

            }

        }
    );


    const colors =
        Array.from(
            colorMap.values()
        ).sort(
            function (a, b) {

                return a.localeCompare(
                    b,
                    undefined,
                    {
                        sensitivity: "base"
                    }
                );

            }
        );


    colorFilter.innerHTML =
        "";


    addFilterOption(
        colorFilter,
        "all",
        "COLOR"
    );


    colors.forEach(
        function (color) {

            addFilterOption(
                colorFilter,
                color,
                color.toUpperCase()
            );

        }
    );


    if (
        Array.from(
            colorFilter.options
        ).some(
            function (option) {

                return (
                    option.value ===
                    currentValue
                );

            }
        )
    ) {

        colorFilter.value =
            currentValue;

    } else {

        colorFilter.value =
            "all";

    }

}


/* =====================================================
   SIZE FILTER
===================================================== */

function populateSizeFilter() {

    if (!sizeFilter) {
        return;
    }


    const currentValue =
        sizeFilter.value;


    const sizeMap =
        new Map();


    products.forEach(
        function (product) {

            normalizeSizes(
                product.sizes
            ).forEach(
                function (size) {

                    const key =
                        size.toLowerCase();


                    if (
                        !sizeMap.has(key)
                    ) {

                        sizeMap.set(
                            key,
                            size
                        );

                    }

                }
            );

        }
    );


    const sizes =
        Array.from(
            sizeMap.values()
        ).sort(
            function (a, b) {

                return a.localeCompare(
                    b,
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                );

            }
        );


    sizeFilter.innerHTML =
        "";


    addFilterOption(
        sizeFilter,
        "all",
        "SIZE"
    );


    sizes.forEach(
        function (size) {

            addFilterOption(
                sizeFilter,
                size,
                size
            );

        }
    );


    if (
        Array.from(
            sizeFilter.options
        ).some(
            function (option) {

                return (
                    option.value ===
                    currentValue
                );

            }
        )
    ) {

        sizeFilter.value =
            currentValue;

    } else {

        sizeFilter.value =
            "all";

    }

}


/* =====================================================
   ADD FILTER OPTION
===================================================== */

function addFilterOption(
    select,
    value,
    text
) {

    const option =
        document.createElement(
            "option"
        );

    option.value =
        value;

    option.textContent =
        text;

    select.appendChild(
        option
    );

}


/* =====================================================
   CREATE PRODUCT CARD
===================================================== */

function createProductCard(product) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "product-card";


    const price =
        Number(
            product.price || 0
        );


    const oldPrice =
        Number(
            product.old_price || 0
        );


    const stock =
        getStock(product);


    const available =
        stock > 0;


    const color =
        String(
            product.color || ""
        ).trim();


    const sizes =
        normalizeSizes(
            product.sizes
        );


    /* =================================================
       BADGE
    ================================================= */

    let badge = "";


    if (
        product.is_just_arrived ||
        product.is_new
    ) {

        badge =
            '<span class="product-badge">NEW</span>';

    } else if (
        product.is_best_seller ||
        product.is_most_ordered
    ) {

        badge =
            '<span class="product-badge">BEST SELLER</span>';

    }


    /* =================================================
       IMAGE
    ================================================= */

    let imageHTML = "";


    if (
        product.image_url &&
        String(product.image_url).trim()
    ) {

        imageHTML =

            '<img ' +
                'src="' +
                    escapeHTML(
                        product.image_url
                    ) +
                '" ' +
                'alt="' +
                    escapeHTML(
                        product.name ||
                        "Figure Scrub product"
                    ) +
                '" ' +
                'loading="lazy">';

    } else {

        imageHTML =

            '<div class="product-placeholder">' +
                'FIGURE SCRUB' +
            '</div>';

    }


    /* =================================================
       COLOR DOT
    ================================================= */

    let colorHTML = "";


    if (color) {

        colorHTML =

            '<div class="color-options">' +

                '<span ' +
                    'class="color-dot" ' +
                    'title="' +
                        escapeHTML(color) +
                    '" ' +
                    'style="background:' +
                        getColorValue(color) +
                    ';">' +
                '</span>' +

            '</div>';

    }


    /* =================================================
       OLD PRICE
    ================================================= */

    let oldPriceHTML = "";


    if (
        oldPrice > price
    ) {

        oldPriceHTML =

            '<span class="old-price">' +
                formatPrice(oldPrice) +
            '</span>';

    }


    /* =================================================
       CARD DATA
    ================================================= */

    card.dataset.category =
        product.category || "";


    card.dataset.available =
        String(available);


    card.dataset.best =
        (
            product.is_best_seller ||
            product.is_most_ordered
        )
            ? "true"
            : "false";


    card.dataset.new =
        (
            product.is_new ||
            product.is_just_arrived
        )
            ? "true"
            : "false";


    card.dataset.size =
        sizes.join(",");


    card.dataset.color =
        color;


    card.dataset.price =
        String(price);


    /* =================================================
       CARD HTML
    ================================================= */

    card.innerHTML =

        '<div ' +
            'class="product-image" ' +
            'data-action="quick-view">' +

            imageHTML +

            badge +

            '<button ' +
                'class="quick-view" ' +
                'type="button" ' +
                'data-action="quick-view">' +

                'QUICK VIEW' +

            '</button>' +

        '</div>' +


        '<div class="product-info">' +

            '<div class="product-main-info">' +

                '<h3>' +
                    escapeHTML(
                        product.name ||
                        "FIGURE SCRUB"
                    ) +
                '</h3>' +

                '<p>' +
                    escapeHTML(
                        color ||
                        "Premium Medical Scrub"
                    ) +
                '</p>' +

                colorHTML +

            '</div>' +


            '<div class="product-pricing">' +

                oldPriceHTML +

                '<span class="current-price">' +
                    formatPrice(price) +
                '</span>' +

            '</div>' +

        '</div>' +


        '<button ' +
            'class="add-to-cart" ' +
            'type="button" ' +
            'data-action="add-to-cart" ' +
            (
                available
                    ? ""
                    : "disabled"
            ) +
        '>' +

            (
                available
                    ? "ADD TO CART"
                    : "OUT OF STOCK"
            ) +

        '</button>';


    /* =================================================
       CARD ACTIONS
    ================================================= */

    card.addEventListener(
        "click",
        function (event) {

            const actionElement =
                event.target.closest(
                    "[data-action]"
                );


            if (!actionElement) {
                return;
            }


            const action =
                actionElement.dataset.action;


            if (
                action ===
                "quick-view"
            ) {

                openProductModal(
                    product
                );

            }


            if (
                action ===
                "add-to-cart"
            ) {

                if (
                    getStock(product) <= 0
                ) {

                    showSiteMessage(
                        "This product is out of stock."
                    );

                    return;

                }


                openProductModal(
                    product
                );

            }

        }
    );


    return card;

}


/* =====================================================
   FILTER SETUP
===================================================== */

function setupFilters() {

    const filterButtons =
        document.querySelectorAll(
            ".filter-btn"
        );


    filterButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    filterButtons.forEach(
                        function (btn) {

                            btn.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );


                    activeFilter =
                        normalizeFilter(
                            button.dataset.filter
                        );


                    applyFilters();

                }
            );

        }
    );


    [
        sizeFilter,
        colorFilter,
        priceFilter
    ].forEach(
        function (select) {

            if (!select) {
                return;
            }


            select.addEventListener(
                "change",
                applyFilters
            );

        }
    );


    const resetButton =
        document.getElementById(
            "resetFilters"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetFilters
        );

    }

}


/* =====================================================
   NORMALIZE FILTER
===================================================== */

function normalizeFilter(value) {

    const filter =
        String(
            value || ""
        )
            .trim()
            .toLowerCase();


    if (
        filter === "new" ||
        filter === "new arrivals"
    ) {

        return "new";

    }


    if (
        filter === "best" ||
        filter === "best sellers" ||
        filter === "most ordered"
    ) {

        return "best";

    }


    if (
        filter === "available"
    ) {

        return "available";

    }


    if (
        filter === "out" ||
        filter === "out of stock"
    ) {

        return "out";

    }


    return "all";

}


/* =====================================================
   APPLY FILTERS
===================================================== */

function applyFilters() {

    filteredProducts =
        products.filter(
            function (product) {

                /* MAIN FILTER */

                if (
                    activeFilter ===
                    "new"
                ) {

                    if (
                        !product.is_new &&
                        !product.is_just_arrived
                    ) {

                        return false;

                    }

                }


                if (
                    activeFilter ===
                    "best"
                ) {

                    if (
                        !product.is_best_seller &&
                        !product.is_most_ordered
                    ) {

                        return false;

                    }

                }


                if (
                    activeFilter ===
                    "available"
                ) {

                    if (
                        getStock(product) <= 0
                    ) {

                        return false;

                    }

                }


                if (
                    activeFilter ===
                    "out"
                ) {

                    if (
                        getStock(product) > 0
                    ) {

                        return false;

                    }

                }


                /* SIZE FILTER */

                if (
                    sizeFilter &&
                    sizeFilter.value !==
                        "all"
                ) {

                    const selectedSizeValue =
                        String(
                            sizeFilter.value
                        ).toLowerCase();


                    const hasSize =
                        normalizeSizes(
                            product.sizes
                        ).some(
                            function (size) {

                                return (
                                    String(size)
                                        .toLowerCase() ===
                                    selectedSizeValue
                                );

                            }
                        );


                    if (!hasSize) {

                        return false;

                    }

                }


                /* COLOR FILTER */

                if (
                    colorFilter &&
                    colorFilter.value !==
                        "all"
                ) {

                    const productColor =
                        String(
                            product.color || ""
                        )
                            .trim()
                            .toLowerCase();


                    const selectedColor =
                        String(
                            colorFilter.value || ""
                        )
                            .trim()
                            .toLowerCase();


                    if (
                        productColor !==
                        selectedColor
                    ) {

                        return false;

                    }

                }


                /* PRICE FILTER */

                if (
                    priceFilter &&
                    priceFilter.value !==
                        "all"
                ) {

                    const price =
                        Number(
                            product.price || 0
                        );


                    if (
                        priceFilter.value ===
                        "under1000"
                    ) {

                        if (
                            price >= 1000
                        ) {

                            return false;

                        }

                    }


                    if (
                        priceFilter.value ===
                        "1000-1500"
                    ) {

                        if (
                            price < 1000 ||
                            price > 1500
                        ) {

                            return false;

                        }

                    }


                    if (
                        priceFilter.value ===
                        "over1500"
                    ) {

                        if (
                            price <= 1500
                        ) {

                            return false;

                        }

                    }

                }


                return true;

            }
        );


    renderProducts();

}


/* =====================================================
   RENDER SHOP
===================================================== */

function renderProducts() {

    if (!shopProducts) {
        return;
    }


    shopProducts.innerHTML =
        "";


    if (
        !filteredProducts.length
    ) {

        showNoProducts();

        updateProductCount(
            0
        );

        return;

    }


    hideNoProducts();


    filteredProducts.forEach(
        function (product) {

            shopProducts.appendChild(
                createProductCard(
                    product
                )
            );

        }
    );


    updateProductCount(
        filteredProducts.length
    );

}


/* =====================================================
   RESET FILTERS
===================================================== */

function resetFilters() {

    activeFilter =
        "all";


    document
        .querySelectorAll(
            ".filter-btn"
        )
        .forEach(
            function (button) {

                button.classList.toggle(
                    "active",
                    button.dataset.filter ===
                    "all"
                );

            }
        );


    if (sizeFilter) {
        sizeFilter.value = "all";
    }


    if (colorFilter) {
        colorFilter.value = "all";
    }


    if (priceFilter) {
        priceFilter.value = "all";
    }


    applyFilters();

}


/* =====================================================
   MODAL SETUP
===================================================== */

function setupModal() {

    if (!productModal) {
        return;
    }


    const closeButton =
        productModal.querySelector(
            ".modal-close"
        );


    const overlay =
        productModal.querySelector(
            ".modal-overlay"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeProductModal
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeProductModal
        );

    }


    setupSizeChartButton();


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                if (
                    !productModal.hidden
                ) {

                    closeProductModal();

                }


                const chart =
                    document.querySelector(
                        ".size-chart-overlay"
                    );


                if (chart) {

                    closeSizeChart();

                }

            }

        }
    );

}


/* =====================================================
   SIZE CHART BUTTON
===================================================== */

function setupSizeChartButton() {

    if (!productModal) {
        return;
    }


    const sizeContainer =
        productModal.querySelector(
            ".size-options"
        );


    if (!sizeContainer) {
        return;
    }


    if (
        productModal.querySelector(
            ".view-size-chart"
        )
    ) {

        return;

    }


    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.className =
        "view-size-chart";


    button.textContent =
        "VIEW SIZE CHART";


    button.style.display =
        "none";


    sizeContainer.insertAdjacentElement(
        "afterend",
        button
    );


    button.addEventListener(
        "click",
        function () {

            if (
                !selectedProduct
            ) {

                return;

            }


            if (
                !selectedProduct.size_chart_url
            ) {

                showSiteMessage(
                    "Size chart is not available for this product."
                );

                return;

            }


            openSizeChart(
                selectedProduct.size_chart_url,
                selectedProduct.name
            );

        }
    );

}


/* =====================================================
   UPDATE SIZE CHART BUTTON
===================================================== */

function updateSizeChartButton(
    product
) {

    if (!productModal) {
        return;
    }


    const button =
        productModal.querySelector(
            ".view-size-chart"
        );


    if (!button) {
        return;
    }


    button.style.display =
        (
            product &&
            product.size_chart_url
        )
            ? "inline-flex"
            : "none";

}


/* =====================================================
   OPEN SIZE CHART
===================================================== */

function openSizeChart(
    imageURL,
    productName
) {

    const existing =
        document.querySelector(
            ".size-chart-overlay"
        );


    if (existing) {
        existing.remove();
    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "size-chart-overlay";


    overlay.innerHTML =

        '<div class="size-chart-box">' +

            '<button ' +
                'class="size-chart-close" ' +
                'type="button">' +

                '×' +

            '</button>' +

            '<div class="size-chart-header">' +

                '<p>SIZE GUIDE</p>' +

                '<h3>' +
                    escapeHTML(
                        productName ||
                        "FIGURE SCRUB"
                    ) +
                '</h3>' +

            '</div>' +

            '<div class="size-chart-image-wrapper">' +

                '<img ' +
                    'src="' +
                        escapeHTML(
                            imageURL
                        ) +
                    '" ' +
                    'alt="Size chart">' +

            '</div>' +

        '</div>';


    document.body.appendChild(
        overlay
    );


    addSizeChartStyles();


    const closeButton =
        overlay.querySelector(
            ".size-chart-close"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeSizeChart
        );

    }


    overlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                overlay
            ) {

                closeSizeChart();

            }

        }
    );


    document.body.style.overflow =
        "hidden";


    requestAnimationFrame(
        function () {

            overlay.classList.add(
                "visible"
            );

        }
    );

}


/* =====================================================
   CLOSE SIZE CHART
===================================================== */

function closeSizeChart() {

    const overlay =
        document.querySelector(
            ".size-chart-overlay"
        );


    if (!overlay) {
        return;
    }


    overlay.remove();


    if (
        productModal &&
        !productModal.hidden
    ) {

        document.body.style.overflow =
            "hidden";

    } else if (
        cartDrawer &&
        !cartDrawer.hidden
    ) {

        document.body.style.overflow =
            "hidden";

    } else {

        document.body.style.overflow =
            "";

    }

}


/* =====================================================
   SIZE CHART STYLES
===================================================== */

function addSizeChartStyles() {

    if (
        document.getElementById(
            "figureScrubSizeChartStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "figureScrubSizeChartStyles";


    style.textContent = `

        .view-size-chart {
            margin-top: 12px;
            padding: 10px 16px;
            border: 1px solid currentColor;
            background: transparent;
            cursor: pointer;
            font-size: 11px;
            letter-spacing: 1.5px;
            font-weight: 600;
            align-items: center;
            justify-content: center;
            transition: all 0.25s ease;
        }

        .view-size-chart:hover {
            opacity: 0.75;
        }

        .size-chart-overlay {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(20,20,20,0.72);
            opacity: 0;
            transition: opacity 0.25s ease;
        }

        .size-chart-overlay.visible {
            opacity: 1;
        }

        .size-chart-box {
            position: relative;
            width: min(900px,96vw);
            max-height: 92vh;
            overflow: auto;
            background: #ffffff;
            padding: 28px;
            box-shadow: 0 20px 70px rgba(0,0,0,0.25);
        }

        .size-chart-close {
            position: absolute;
            top: 12px;
            right: 14px;
            width: 36px;
            height: 36px;
            border: 0;
            background: transparent;
            font-size: 28px;
            line-height: 1;
            cursor: pointer;
            z-index: 2;
        }

        .size-chart-header {
            text-align: center;
            margin-bottom: 20px;
            padding-right: 30px;
        }

        .size-chart-header p {
            margin: 0 0 5px;
            font-size: 10px;
            letter-spacing: 2px;
        }

        .size-chart-header h3 {
            margin: 0;
            font-size: 22px;
        }

        .size-chart-image-wrapper {
            width: 100%;
            text-align: center;
        }

        .size-chart-image-wrapper img {
            display: block;
            max-width: 100%;
            width: auto;
            max-height: 72vh;
            height: auto;
            margin: 0 auto;
            object-fit: contain;
        }

        @media (max-width: 600px) {

            .size-chart-overlay {
                padding: 12px;
            }

            .size-chart-box {
                padding: 18px;
                width: 100%;
                max-height: 94vh;
            }

            .size-chart-header h3 {
                font-size: 18px;
            }

            .size-chart-image-wrapper img {
                max-height: 76vh;
            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =====================================================
   OPEN PRODUCT MODAL
===================================================== */

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
        productModal.querySelector(
            "#modalProductName"
        );


    const color =
        productModal.querySelector(
            "#modalProductColor"
        );


    const oldPrice =
        productModal.querySelector(
            "#modalOldPrice"
        );


    const price =
        productModal.querySelector(
            "#modalPrice"
        );


    const modalImage =
        productModal.querySelector(
            ".modal-image"
        );


    if (name) {

        name.textContent =
            product.name ||
            "FIGURE SCRUB";

    }


    if (color) {

        color.textContent =
            product.color ||
            "Premium Medical Scrub";

    }


    if (oldPrice) {

        const old =
            Number(
                product.old_price || 0
            );


        const current =
            Number(
                product.price || 0
            );


        if (
            old > current
        ) {

            oldPrice.textContent =
                formatPrice(old);

            oldPrice.style.display =
                "inline";

        } else {

            oldPrice.style.display =
                "none";

        }

    }


    if (price) {

        price.textContent =
            formatPrice(
                product.price
            );

    }


    if (modalImage) {

        if (
            product.image_url
        ) {

            modalImage.innerHTML =

                '<img ' +
                    'src="' +
                        escapeHTML(
                            product.image_url
                        ) +
                    '" ' +
                    'alt="' +
                        escapeHTML(
                            product.name ||
                            "Figure Scrub"
                        ) +
                    '" ' +
                    'style="width:100%;height:100%;object-fit:cover;">';

        } else {

            modalImage.innerHTML =

                '<div class="product-placeholder">' +
                    'FIGURE SCRUB' +
                '</div>';

        }

    }


    renderModalSizes(
        product
    );


    updateSizeChartButton(
        product
    );


    updateModalQuantity();


    productModal.hidden =
        false;


    document.body.style.overflow =
        "hidden";

}


/* =====================================================
   CLOSE PRODUCT MODAL
===================================================== */

function closeProductModal() {

    if (!productModal) {
        return;
    }


    closeSizeChart();


    productModal.hidden =
        true;


    document.body.style.overflow =
        "";


    selectedProduct =
        null;


    selectedSize =
        null;

}


/* =====================================================
   MODAL SIZES
===================================================== */

function renderModalSizes(
    product
) {

    const sizeContainer =
        productModal?.querySelector(
            ".size-options"
        );


    if (!sizeContainer) {
        return;
    }


    sizeContainer.innerHTML =
        "";


    const sizes =
        normalizeSizes(
            product.sizes
        );


    if (!sizes.length) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "selected";


        button.dataset.size =
            "One Size";


        button.textContent =
            "ONE SIZE";


        sizeContainer.appendChild(
            button
        );


        selectedSize =
            "One Size";


        return;

    }


    sizes.forEach(
        function (size, index) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.textContent =
                size;


            button.dataset.size =
                size;


            if (index === 0) {

                button.classList.add(
                    "selected"
                );

                selectedSize =
                    size;

            }


            button.addEventListener(
                "click",
                function () {

                    sizeContainer
                        .querySelectorAll(
                            "button"
                        )
                        .forEach(
                            function (btn) {

                                btn.classList.remove(
                                    "selected"
                                );

                            }
                        );


                    button.classList.add(
                        "selected"
                    );


                    selectedSize =
                        size;

                }
            );


            sizeContainer.appendChild(
                button
            );

        }
    );

}


/* =====================================================
   MODAL QUANTITY
===================================================== */

function updateModalQuantity() {

    const quantityElement =
        productModal?.querySelector(
            "#quantityValue"
        );


    if (quantityElement) {

        quantityElement.textContent =
            modalQuantity;

    }


    const buttons =
        productModal?.querySelectorAll(
            ".quantity-selector button"
        );


    if (!buttons) {
        return;
    }


    buttons.forEach(
        function (button) {

            button.onclick =
                function () {

                    if (
                        !selectedProduct
                    ) {

                        return;

                    }


                    const action =
                        button.dataset.action ||
                        button.textContent.trim();


                    const stock =
                        getStock(
                            selectedProduct
                        );


                    if (
                        action ===
                            "plus" ||
                        action === "+"
                    ) {

                        if (
                            modalQuantity <
                            stock
                        ) {

                            modalQuantity++;

                        } else {

                            showSiteMessage(
                                "You cannot add more than available stock."
                            );

                        }

                    }


                    if (
                        action ===
                            "minus" ||
                        action ===
                            "−" ||
                        action === "-"
                    ) {

                        if (
                            modalQuantity >
                            1
                        ) {

                            modalQuantity--;

                        }

                    }


                    updateModalQuantity();

                };

        }
    );

}


/* =====================================================
   GLOBAL ACTIONS
===================================================== */

function setupGlobalActions() {

    document.addEventListener(
        "click",
        function (event) {

            /* =================================================
               MODAL ADD TO CART
            ================================================= */

            const modalAdd =
                event.target.closest(
                    ".modal-add-cart"
                );


            if (modalAdd) {

                if (
                    !selectedProduct
                ) {

                    return;

                }


                const sizes =
                    normalizeSizes(
                        selectedProduct.sizes
                    );


                if (
                    sizes.length &&
                    !selectedSize
                ) {

                    showSiteMessage(
                        "Please select a size."
                    );

                    return;

                }


                addToCart(
                    selectedProduct,
                    selectedSize,
                    modalQuantity
                );


                closeProductModal();

                openCartDrawer();

                return;

            }


            /* =================================================
               CART
            ================================================= */

            const cartButton =
                event.target.closest(
                    ".cart-btn, .cart-button, [data-cart-action='open']"
                );


            if (cartButton) {

                openCartDrawer();

                return;

            }


            /* =================================================
               CHECKOUT
            ================================================= */

            const checkoutButton =
                event.target.closest(
                    ".checkout-btn"
                );


            if (checkoutButton) {

                if (!cart.length) {

                    showSiteMessage(
                        "Your cart is empty."
                    );

                    return;

                }


                window.location.href =
                    "checkout.html";

            }

        }
    );

}


/* =====================================================
   ADD TO CART
===================================================== */

function addToCart(
    product,
    size,
    quantity
) {

    if (!product) {
        return;
    }


    const stock =
        getStock(product);


    if (
        stock <= 0
    ) {

        showSiteMessage(
            "This product is out of stock."
        );

        return;

    }


    const finalSize =
        size ||
        "One Size";


    const safeQuantity =
        Math.max(
            1,
            Number(quantity) || 1
        );


    const existingIndex =
        cart.findIndex(
            function (item) {

                return (
                    String(
                        item.product_id
                    ) ===
                    String(
                        product.id
                    ) &&

                    String(
                        item.size
                    ) ===
                    String(
                        finalSize
                    )
                );

            }
        );


    if (
        existingIndex !==
        -1
    ) {

        const newQuantity =
            Number(
                cart[
                    existingIndex
                ].quantity || 0
            ) +
            safeQuantity;


        cart[
            existingIndex
        ].quantity =
            Math.min(
                newQuantity,
                stock
            );

    } else {

        cart.push({

            product_id:
                product.id,

            name:
                product.name ||
                "FIGURE SCRUB",

            price:
                Number(
                    product.price || 0
                ),

            image_url:
                product.image_url ||
                "",

            color:
                product.color ||
                "",

            size:
                finalSize,

            quantity:
                Math.min(
                    safeQuantity,
                    stock
                )

        });

    }


    saveCart();

    updateCartCount();


    showCartNotification(
        (
            product.name ||
            "Product"
        ) +
        " added to cart"
    );

}


/* =====================================================
   CART SETUP
===================================================== */

function setupCart() {

    if (!cartDrawer) {
        return;
    }


    const closeButton =
        cartDrawer.querySelector(
            ".cart-close"
        );


    const overlay =
        cartDrawer.querySelector(
            ".cart-overlay"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeCartDrawer
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeCartDrawer
        );

    }


    renderCart();

}


/* =====================================================
   OPEN CART
===================================================== */

function openCartDrawer() {

    if (!cartDrawer) {
        return;
    }


    cartDrawer.hidden =
        false;


    document.body.style.overflow =
        "hidden";


    renderCart();

}


/* =====================================================
   CLOSE CART
===================================================== */

function closeCartDrawer() {

    if (!cartDrawer) {
        return;
    }


    cartDrawer.hidden =
        true;


    document.body.style.overflow =
        "";

}


/* =====================================================
   RENDER CART
===================================================== */

function renderCart() {

    if (!cartDrawer) {
        return;
    }


    const itemsContainer =
        cartDrawer.querySelector(
            ".cart-items"
        );


    if (!itemsContainer) {
        return;
    }


    if (!cart.length) {

        itemsContainer.innerHTML =

            '<div class="empty-cart">' +

                '<p>' +
                    'Your cart is currently empty.' +
                '</p>' +

                '<button ' +
                    'class="continue-shopping" ' +
                    'type="button">' +

                    'CONTINUE SHOPPING' +

                '</button>' +

            '</div>';


        const continueButton =
            itemsContainer.querySelector(
                ".continue-shopping"
            );


        if (continueButton) {

            continueButton.addEventListener(
                "click",
                closeCartDrawer
            );

        }

    } else {

        itemsContainer.innerHTML =
            "";


        cart.forEach(
            function (item, index) {

                itemsContainer.appendChild(
                    createCartItem(
                        item,
                        index
                    )
                );

            }
        );

    }


    updateCartSubtotal();

}


/* =====================================================
   CART ITEM
===================================================== */

function createCartItem(
    item,
    index
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "cart-item";


    let imageHTML =
        '<div class="product-placeholder">' +
            'FIGURE SCRUB' +
        '</div>';


    if (
        item.image_url
    ) {

        imageHTML =

            '<img ' +
                'src="' +
                    escapeHTML(
                        item.image_url
                    ) +
                '" ' +
                'alt="' +
                    escapeHTML(
                        item.name
                    ) +
                '" ' +
                'style="width:100%;height:100%;object-fit:cover;">';

    }


    const sizeHTML =
        item.size
            ? " • " +
                escapeHTML(
                    item.size
                )
            : "";


    element.innerHTML =

        '<div class="cart-item-image">' +

            imageHTML +

        '</div>' +


        '<div class="cart-item-info">' +

            '<h3>' +
                escapeHTML(
                    item.name
                ) +
            '</h3>' +

            '<p>' +

                escapeHTML(
                    item.color || ""
                ) +

                sizeHTML +

            '</p>' +

            '<span class="cart-item-price">' +
                formatPrice(
                    item.price
                ) +
            '</span>' +


            '<div class="cart-quantity">' +

                '<button ' +
                    'type="button" ' +
                    'data-action="minus">' +

                    '−' +

                '</button>' +

                '<span>' +
                    Number(
                        item.quantity || 0
                    ) +
                '</span>' +

                '<button ' +
                    'type="button" ' +
                    'data-action="plus">' +

                    '+' +

                '</button>' +

            '</div>' +

        '</div>' +


        '<button ' +
            'class="cart-item-remove" ' +
            'type="button">' +

            'REMOVE' +

        '</button>';


    element
        .querySelectorAll(
            ".cart-quantity button"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const action =
                            button.dataset.action;


                        const product =
                            products.find(
                                function (
                                    productItem
                                ) {

                                    return (
                                        String(
                                            productItem.id
                                        ) ===
                                        String(
                                            item.product_id
                                        )
                                    );

                                }
                            );


                        const stock =
                            product
                                ? getStock(
                                    product
                                )
                                : 0;


                        if (
                            action ===
                            "plus"
                        ) {

                            if (
                                stock <=
                                Number(
                                    item.quantity
                                )
                            ) {

                                showSiteMessage(
                                    "You cannot add more than available stock."
                                );

                                return;

                            }


                            item.quantity++;

                        }


                        if (
                            action ===
                            "minus"
                        ) {

                            item.quantity--;


                            if (
                                item.quantity <=
                                0
                            ) {

                                cart.splice(
                                    index,
                                    1
                                );

                            }

                        }


                        saveCart();

                        updateCartCount();

                        renderCart();

                    }
                );

            }
        );


    const removeButton =
        element.querySelector(
            ".cart-item-remove"
        );


    if (removeButton) {

        removeButton.addEventListener(
            "click",
            function () {

                cart.splice(
                    index,
                    1
                );


                saveCart();

                updateCartCount();

                renderCart();

            }
        );

    }


    return element;

}


/* =====================================================
   CLEAN CART
===================================================== */

function cleanupCartAgainstProducts() {

    if (!products.length) {
        return;
    }


    const validIds =
        new Set(
            products.map(
                function (product) {

                    return String(
                        product.id
                    );

                }
            )
        );


    const oldLength =
        cart.length;


    cart =
        cart.filter(
            function (item) {

                return validIds.has(
                    String(
                        item.product_id
                    )
                );

            }
        );


    if (
        cart.length !==
        oldLength
    ) {

        saveCart();

        updateCartCount();

        renderCart();

    }

}


/* =====================================================
   CART SUBTOTAL
===================================================== */

function updateCartSubtotal() {

    if (!cartDrawer) {
        return;
    }


    const subtotal =
        cart.reduce(
            function (
                total,
                item
            ) {

                return (
                    total +
                    Number(
                        item.price || 0
                    ) *
                    Number(
                        item.quantity || 0
                    )
                );

            },
            0
        );


    const subtotalElement =
        cartDrawer.querySelector(
            "#cartSubtotal"
        );


    if (subtotalElement) {

        subtotalElement.textContent =
            formatPrice(
                subtotal
            );

    }

}


/* =====================================================
   CART COUNT
===================================================== */

function updateCartCount() {

    const count =
        cart.reduce(
            function (
                total,
                item
            ) {

                return (
                    total +
                    Number(
                        item.quantity || 0
                    )
                );

            },
            0
        );


    document
        .querySelectorAll(
            ".cart-count"
        )
        .forEach(
            function (element) {

                element.textContent =
                    count;

            }
        );

}


/* =====================================================
   SAVE CART
===================================================== */

function saveCart() {

    try {

        localStorage.setItem(
            "figureScrubCart",
            JSON.stringify(
                cart
            )
        );

    } catch (error) {

        console.error(
            "Cart save error:",
            error
        );

    }

}


/* =====================================================
   CART NOTIFICATION
===================================================== */

function showCartNotification(
    message
) {

    const old =
        document.querySelector(
            ".cart-notification"
        );


    if (old) {
        old.remove();
    }


    const notification =
        document.createElement(
            "div"
        );


    notification.className =
        "cart-notification";


    notification.innerHTML =

        '<span>' +
            escapeHTML(
                message
            ) +
        '</span>' +

        '<button ' +
            'type="button" ' +
            'aria-label="Close">' +

            '×' +

        '</button>';


    document.body.appendChild(
        notification
    );


    const closeButton =
        notification.querySelector(
            "button"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function () {

                notification.remove();

            }
        );

    }


    setTimeout(
        function () {

            if (
                notification.parentNode
            ) {

                notification.remove();

            }

        },
        3500
    );

}


/* =====================================================
   SITE MESSAGE
===================================================== */

function showSiteMessage(
    message
) {

    const old =
        document.querySelector(
            ".site-message"
        );


    if (old) {
        old.remove();
    }


    const messageBox =
        document.createElement(
            "div"
        );


    messageBox.className =
        "site-message";


    messageBox.innerHTML =

        '<span>' +
            escapeHTML(
                message
            ) +
        '</span>' +

        '<button ' +
            'type="button" ' +
            'aria-label="Close">' +

            '×' +

        '</button>';


    document.body.appendChild(
        messageBox
    );


    const closeButton =
        messageBox.querySelector(
            "button"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function () {

                messageBox.remove();

            }
        );

    }


    setTimeout(
        function () {

            if (
                messageBox.parentNode
            ) {

                messageBox.remove();

            }

        },
        3000
    );

}


/* =====================================================
   NO PRODUCTS
===================================================== */

function showNoProducts() {

    if (!noProducts) {
        return;
    }


    noProducts.hidden =
        false;

}


function hideNoProducts() {

    if (!noProducts) {
        return;
    }


    noProducts.hidden =
        true;

}


/* =====================================================
   PRODUCT COUNT
===================================================== */

function updateProductCount(
    count
) {

    if (!productCount) {
        return;
    }


    const span =
        productCount.querySelector(
            "span"
        );


    if (span) {

        span.textContent =
            count +
            " PRODUCTS";

    } else {

        productCount.textContent =
            count +
            " PRODUCTS";

    }

}


/* =====================================================
   STOCK
===================================================== */

function getStock(
    product
) {

    if (!product) {
        return 0;
    }


    return Number(
        product.stock ??
        product.stock_quantity ??
        0
    );

}


/* =====================================================
   NORMALIZE SIZES
===================================================== */

function normalizeSizes(
    sizes
) {

    if (!sizes) {
        return [];
    }


    if (
        Array.isArray(
            sizes
        )
    ) {

        return sizes
            .map(
                String
            )
            .map(
                function (size) {

                    return size.trim();

                }
            )
            .filter(
                Boolean
            );

    }


    if (
        typeof sizes ===
        "string"
    ) {

        const trimmed =
            sizes.trim();


        if (
            trimmed.startsWith("[") &&
            trimmed.endsWith("]")
        ) {

            try {

                const parsed =
                    JSON.parse(
                        trimmed
                    );


                if (
                    Array.isArray(
                        parsed
                    )
                ) {

                    return parsed
                        .map(
                            String
                        )
                        .map(
                            function (size) {

                                return size.trim();

                            }
                        )
                        .filter(
                            Boolean
                        );

                }

            } catch (error) {

                console.warn(
                    "Could not parse sizes:",
                    error
                );

            }

        }


        return sizes
            .split(",")
            .map(
                function (size) {

                    return size.trim();

                }
            )
            .filter(
                Boolean
            );

    }


    return [];

}


/* =====================================================
   FORMAT PRICE
===================================================== */

function formatPrice(
    price
) {

    const number =
        Number(
            price || 0
        );


    return (
        number.toLocaleString(
            "en-US"
        ) +
        " EGP"
    );

}


/* =====================================================
   COLOR VALUES
===================================================== */

function getColorValue(
    color
) {

    const normalized =
        String(
            color || ""
        )
            .trim()
            .toLowerCase();


    const colors = {

        black: "#171717",
        white: "#F7F7F5",
        ivory: "#F3EEE3",
        cream: "#EEE6D5",

        navy: "#1F2A44",
        blue: "#547DA7",
        "baby blue": "#A8C8DC",

        green: "#50665B",
        "forest green": "#315648",
        sage: "#9CAF9F",
        olive: "#737B4D",

        beige: "#C8B8A6",
        brown: "#765844",
        mocha: "#9A7761",

        pink: "#D59AAA",
        rose: "#BC7C8F",
        blush: "#E7B9C3",

        lavender: "#9B7CAB",
        purple: "#80658D",

        grey: "#8B8B8B",
        gray: "#8B8B8B",

        burgundy: "#6E3444",
        maroon: "#692F3D",

        red: "#B5535E",

        orange: "#C9824A",
        yellow: "#C9AE58",
        mustard: "#B59A4A",

        teal: "#4F7C78",
        turquoise: "#5C9C9C"

    };


    if (
        colors[
            normalized
        ]
    ) {

        return colors[
            normalized
        ];

    }


    const arabicColors = {

        "اسود": "#171717",

        "أبيض": "#F7F7F5",
        "ابيض": "#F7F7F5",

        "كحلي": "#1F2A44",

        "أزرق": "#547DA7",
        "ازرق": "#547DA7",

        "أخضر": "#50665B",
        "اخضر": "#50665B",

        "زيتوني": "#737B4D",

        "بيج": "#C8B8A6",

        "بني": "#765844",

        "موف": "#80658D",

        "لافندر": "#9B7CAB",

        "وردي": "#D59AAA",

        "نبيتي": "#6E3444",
        "عنابي": "#6E3444",

        "أحمر": "#B5535E",
        "احمر": "#B5535E"

    };


    if (
        arabicColors[
            normalized
        ]
    ) {

        return arabicColors[
            normalized
        ];

    }


    /* Deterministic fallback */

    let hash = 0;


    for (
        let i = 0;
        i < normalized.length;
        i++
    ) {

        hash =
            normalized.charCodeAt(i) +
            (
                (hash << 5) -
                hash
            );

    }


    const hue =
        Math.abs(
            hash
        ) % 360;


    return (
        "hsl(" +
        hue +
        ", 30%, 62%)"
    );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
    value
) {

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


/* =====================================================
   COUPON BAR
===================================================== */

async function loadCouponBar() {

    const couponBar =
        document.getElementById(
            "couponBar"
        );


    const couponTrack =
        document.getElementById(
            "couponBarTrack"
        );


    if (
        !couponBar ||
        !couponTrack
    ) {

        return;

    }


    couponBar.style.display =
        "none";


    couponTrack.innerHTML =
        "";


    if (!supabaseClient) {

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
                    "code, discount_type, discount_value, created_at"
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

            console.error(
                "Coupon error:",
                error
            );

            return;

        }


        if (
            !data ||
            !data.length
        ) {

            return;

        }


        const couponHTML =
            data
                .map(
                    function (coupon) {

                        const type =
                            String(
                                coupon.discount_type ||
                                ""
                            ).toLowerCase();


                        let discountText;


                        if (
                            type ===
                            "percentage"
                        ) {

                            discountText =
                                Number(
                                    coupon.discount_value ||
                                    0
                                ) +
                                "% OFF";

                        } else {

                            discountText =
                                Number(
                                    coupon.discount_value ||
                                    0
                                ) +
                                " EGP OFF";

                        }


                        return (

                            '<span class="coupon-item">' +

                                '<span class="coupon-icon">' +
                                    '✦' +
                                '</span>' +

                                '<span>' +

                                    'USE CODE ' +

                                    '<span class="coupon-code">' +
                                        escapeHTML(
                                            coupon.code
                                        ) +
                                    '</span>' +

                                '</span>' +

                                '<span class="coupon-discount">' +
                                    escapeHTML(
                                        discountText
                                    ) +
                                '</span>' +

                            '</span>'

                        );

                    }
                )
                .join("");


        couponTrack.innerHTML =
            couponHTML +
            couponHTML;


        couponBar.style.display =
            "flex";

    } catch (error) {

        console.error(
            "Coupon bar error:",
            error
        );

        couponBar.style.display =
            "none";

    }

}


/* =====================================================
   NEWSLETTER
   SAVE EMAIL TO SUPABASE
===================================================== */

function setupNewsletter() {

    const newsletterForm =
        document.querySelector(
            ".newsletter-form"
        );


    const newsletterSuccess =
        document.querySelector(
            ".newsletter-success"
        );


    if (!newsletterForm) {

        console.warn(
            "Newsletter form was not found."
        );

        return;

    }


    const emailInput =
        newsletterForm.querySelector(
            'input[type="email"]'
        );


    const submitButton =
        newsletterForm.querySelector(
            "button"
        );


    if (
        !emailInput ||
        !submitButton
    ) {

        console.warn(
            "Newsletter email input or button was not found."
        );

        return;

    }


    newsletterForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();


            if (!email) {

                showSiteMessage(
                    "Please enter your email address."
                );

                return;

            }


            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(email)
            ) {

                showSiteMessage(
                    "Please enter a valid email address."
                );

                return;

            }


            if (!supabaseClient) {

                console.error(
                    "Supabase is not initialized."
                );

                showSiteMessage(
                    "Unable to connect to the store. Please try again."
                );

                return;

            }


            const originalButtonText =
                submitButton.textContent;


            submitButton.disabled =
                true;


            submitButton.textContent =
                "JOINING...";


            try {

                console.log(
                    "Saving newsletter email:",
                    email
                );


                const {
                    data,
                    error
                } =
                    await supabaseClient
                        .from("subscribers")
                        .insert([
                            {
                                email: email
                            }
                        ])
                        .select()
                        .single();


                if (error) {

                    console.error(
                        "Newsletter Supabase error:",
                        error
                    );


                    const errorMessage =
                        String(
                            error.message || ""
                        ).toLowerCase();


                    /*
                     * Duplicate email
                     */

                    if (
                        error.code === "23505" ||
                        errorMessage.includes(
                            "duplicate"
                        ) ||
                        errorMessage.includes(
                            "unique"
                        )
                    ) {

                        showNewsletterSuccess(
                            newsletterForm,
                            newsletterSuccess,
                            "You're Already In.",
                            "This email is already subscribed."
                        );

                        return;

                    }


                    showSiteMessage(
                        "Could not save your email. Please try again."
                    );

                    return;

                }


                console.log(
                    "Newsletter subscriber saved:",
                    data
                );


                emailInput.value =
                    "";


                showNewsletterSuccess(
                    newsletterForm,
                    newsletterSuccess,
                    "You're In.",
                    "Your 5% discount is ready."
                );

            } catch (error) {

                console.error(
                    "Newsletter unexpected error:",
                    error
                );


                showSiteMessage(
                    "Something went wrong. Please try again."
                );

            } finally {

                submitButton.disabled =
                    false;


                submitButton.textContent =
                    originalButtonText;

            }

        }
    );

}


/* =====================================================
   NEWSLETTER SUCCESS MESSAGE
===================================================== */

function showNewsletterSuccess(
    newsletterForm,
    newsletterSuccess,
    title,
    message
) {

    if (newsletterForm) {

        newsletterForm.style.display =
            "none";

    }


    if (newsletterSuccess) {

        newsletterSuccess.hidden =
            false;


        newsletterSuccess.innerHTML =

            '<span class="success-icon">✓</span>' +

            '<span>' +

                '<strong>' +
                    escapeHTML(
                        title
                    ) +
                '</strong>' +

                '<small>' +
                    escapeHTML(
                        message
                    ) +
                '</small>' +

            '</span>';


        newsletterSuccess.classList.add(
            "show"
        );

    } else {

        showSiteMessage(
            message
        );

    }

}
