/* =========================================================
   FIGURE SCRUB
   CHECKOUT
   Supabase + Cart + Shipping + Coupons + Subscribers
   Customers + Orders + Order Items
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
   CONSTANTS
========================================================= */

const CART_KEY =
    "figureScrubCart";

const EMAIL_SUBSCRIBER_DISCOUNT =
    5;

/*
   Payment screenshot WhatsApp number
   01021996424
   International format:
   201021996424
*/

const PAYMENT_WHATSAPP =
    "201021996424";

let cart = [];

let shippingRates = [];

let appliedCoupon = null;

let paymentSettings = {
    instapay: "",
    vodafone_cash: ""
};

let submittingOrder = false;

let subscriberEmailChecked =
    false;

let isEmailSubscriber =
    false;

let lastCheckedSubscriberEmail =
    "";


/* =========================================================
   HELPERS
========================================================= */

function $(id) {

    return document.getElementById(id);
}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function money(value) {

    return `${Number(value || 0).toFixed(2)} EGP`;
}


/* =========================================================
   CART
========================================================= */

function loadCart() {

    try {

        const stored =
            localStorage.getItem(
                CART_KEY
            );

        if (!stored) {

            cart = [];

            return;
        }

        const parsed =
            JSON.parse(stored);

        cart =
            Array.isArray(parsed)
                ? parsed
                : [];

    } catch (error) {

        console.error(
            "Cart loading error:",
            error
        );

        cart = [];
    }
}


function saveCart() {

    localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
    );
}


function getPrice(item) {

    return Number(
        item?.new_price ??
        item?.price ??
        item?.newPrice ??
        0
    );
}


function getProductId(item) {

    return (
        item?.product_id ??
        item?.id ??
        item?.productId ??
        null
    );
}


function getImage(item) {

    return (
        item?.image_url ??
        item?.image ??
        item?.imageUrl ??
        ""
    );
}


function getQuantity(item) {

    const quantity =
        Number(
            item?.quantity ?? 1
        );

    return quantity > 0
        ? quantity
        : 1;
}


function getItemSubtotal(item) {

    return (
        getPrice(item) *
        getQuantity(item)
    );
}


function getSubtotal() {

    return cart.reduce(
        (total, item) =>
            total +
            getItemSubtotal(item),
        0
    );
}


/* =========================================================
   GOVERNORATES + SHIPPING
========================================================= */

const governorates = [

    "Cairo",
    "Giza",
    "Cairo & Giza Outskirts",
    "Alexandria",
    "Qalyubia",
    "Dakahlia",
    "Sharqia",
    "Gharbia",
    "Monufia",
    "Beheira",
    "Kafr El Sheikh",
    "Damietta",
    "Port Said",
    "Ismailia",
    "Suez",
    "North Sinai",
    "South Sinai",
    "Fayoum",
    "Beni Suef",
    "Minya",
    "Assiut",
    "Sohag",
    "Qena",
    "Luxor",
    "Aswan",
    "Red Sea",
    "New Valley",
    "Matrouh"

];

/* =========================================================
   SHIPPING RATES
========================================================= */

const shippingData = {

    "Assiut": {
        fee: 112,
        days: 3
    },

    "Cairo": {
        fee: 107,
        days: 2
    },

    "Giza": {
        fee: 107,
        days: 2
    },
  "Cairo & Giza Outskirts": {
        fee: 129,
        days: 2
    },

    "Dakahlia": {
        fee: 146,
        days: 3
    },

    "Beheira": {
        fee: 146,
        days: 3
    },

    "Minya": {
        fee: 96,
        days: 3
    },

    "Qalyubia": {
        fee: 118,
        days: 3
    },

    "Alexandria": {
        fee: 118,
        days: 3
    },

    "Gharbia": {
        fee: 146,
        days: 3
    },

    "Sohag": {
        fee: 96,
        days: 3
    },

    "Monufia": {
        fee: 146,
        days: 3
    },

    "Kafr El Sheikh": {
        fee: 146,
        days: 3
    },

    "Fayoum": {
        fee: 96,
        days: 3
    },

    "Qena": {
        fee: 107,
        days: 3
    },

    "Beni Suef": {
        fee: 96,
        days: 3
    },

    "Aswan": {
        fee: 107,
        days: 3
    },

    "Damietta": {
        fee: 146,
        days: 3
    },

    "Ismailia": {
        fee: 146,
        days: 3
    },

    "Luxor": {
        fee: 107,
        days: 3
    },

    "Port Said": {
        fee: 146,
        days: 3
    },

    "Suez": {
        fee: 146,
        days: 3
    },

    "Matrouh": {
        fee: 224,
        days: 7
    },

    "North Sinai": {
        fee: 224,
        days: 7
    },

    "Red Sea": {
        fee: 224,
        days: 7
    },

    "New Valley": {
        fee: 224,
        days: 7
    },

    "South Sinai": {
        fee: 224,
        days: 7
    },

    "Sharqia": {
        fee: 146,
        days: 3
    }

};


/* =========================================================
   LOAD SHIPPING RATES
========================================================= */

async function loadShippingRates() {

    /*
       Use the local shipping data above.
       No database changes are required.
    */

    shippingRates =
        governorates.map(
            governorate => ({

                governorate:

                    governorate,

                fee:

                    shippingData[
                        governorate
                    ]?.fee || 0,

                delivery_days:

                    shippingData[
                        governorate
                    ]?.days || 0,

                is_active:

                    true

            })
        );


    renderGovernorates();
}


/* =========================================================
   RENDER GOVERNORATES
========================================================= */

function renderGovernorates() {

    const select =
        $("governorate");

    if (!select) {

        return;
    }

    const currentValue =
        select.value;

    select.innerHTML = `
        <option value="">
            Select your governorate
        </option>
    `;

    shippingRates.forEach(
        rate => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                rate.governorate;

            option.textContent =
                `${rate.governorate} — ${money(rate.fee)}`;

            select.appendChild(
                option
            );

        }
    );

    if (currentValue) {

        select.value =
            currentValue;

    }

    updateShippingDisplay();
}


/* =========================================================
   GET SHIPPING FEE
========================================================= */

function getShippingFee(
    governorate
) {

    if (!governorate) {

        return 0;
    }

    const rate =
        shippingRates.find(
            item =>
                String(
                    item.governorate
                ).toLowerCase() ===
                String(
                    governorate
                ).toLowerCase()
        );

    return rate
        ? Number(
            rate.fee || 0
        )
        : 0;
}


/* =========================================================
   GET DELIVERY DAYS
========================================================= */

function getDeliveryDays(
    governorate
) {

    if (!governorate) {

        return 0;
    }

    const rate =
        shippingRates.find(
            item =>
                String(
                    item.governorate
                ).toLowerCase() ===
                String(
                    governorate
                ).toLowerCase()
        );

    return rate
        ? Number(
            rate.delivery_days || 0
        )
        : 0;
}


/* =========================================================
   UPDATE SHIPPING DISPLAY
========================================================= */

function updateShippingDisplay() {

    const governorate =
        $("governorate")?.value || "";

    const shipping =
        getShippingFee(
            governorate
        );

    const days =
        getDeliveryDays(
            governorate
        );

    const shippingElement =
        $("shipping");

    const deliveryElement =
        $("deliveryEstimate");


    /* Shipping price */

    if (shippingElement) {

        shippingElement.textContent =
            money(shipping);
    }


    /* Delivery time */

    if (deliveryElement) {

        if (!governorate) {

            deliveryElement.textContent =
                "Select governorate";

        } else if (days > 0) {

            deliveryElement.textContent =
                `${days} days`;

        } else {

            deliveryElement.textContent =
                "Not available";
        }
    }
}

/* =========================================================
   PAYMENT SETTINGS
========================================================= */

function normalizeSettingValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }

    if (
        typeof value ===
        "string"
    ) {

        return value;
    }

    if (
        typeof value ===
        "object"
    ) {

        return (
            value.value ??
            value.number ??
            value.account ??
            value.phone ??
            ""
        );
    }

    return String(value);
}


async function loadPaymentSettings() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("store-settings")
                .select(
                    "setting_key,setting_value"
                )
                .in(
                    "setting_key",
                    [
                        "instapay",
                        "vodafone_cash"
                    ]
                );

        if (error) {

            console.error(
                "Payment settings error:",
                error
            );

            return;
        }

        (
            data || []
        ).forEach(
            setting => {

                const value =
                    normalizeSettingValue(
                        setting.setting_value
                    );

                if (
                    setting.setting_key ===
                    "instapay"
                ) {

                    paymentSettings.instapay =
                        value;
                }

                if (
                    setting.setting_key ===
                    "vodafone_cash"
                ) {

                    paymentSettings.vodafone_cash =
                        value;
                }
            }
        );

        updatePaymentUI();

    } catch (error) {

        console.error(
            "Payment settings loading failed:",
            error
        );
    }
}


function updatePaymentUI() {

    const instaElement =
        $("instapayAccount");

    const vodafoneElement =
        $("vodafoneAccount");

    if (instaElement) {

        instaElement.textContent =
            paymentSettings.instapay ||
            "Not available";
    }

    if (vodafoneElement) {

        vodafoneElement.textContent =
            paymentSettings.vodafone_cash ||
            "Not available";
    }
}


/* =========================================================
   PAYMENT WHATSAPP
========================================================= */

/*
   This function DOES NOT open automatically.

   It is called only when the customer clicks
   the WhatsApp payment button on the success page.
*/

function openPaymentWhatsApp(
    order
) {

    const paymentMethod =
        order?.payment_method ||
        "";

    const orderNumber =
        order?.order_number ||
        "";

    const total =
        money(
            order?.total
        );

    const message =
        `Hello Figure Scrub,

I have placed an order and selected ${paymentMethod}.

Order Number: ${orderNumber}
Payment Method: ${paymentMethod}
Total: ${total}

I am sending the payment screenshot here for verification.`;

    const url =
        `https://wa.me/${PAYMENT_WHATSAPP}?text=${encodeURIComponent(message)}`;

    /*
       Open WhatsApp only after the customer
       clicks the button.
    */

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


/* =========================================================
   PAYMENT UI
========================================================= */

function setupPaymentUI() {

    const paymentInputs =
        document.querySelectorAll(
            'input[name="paymentMethod"]'
        );

    const cardInfo =
        $("cardInfo");

    const instaInfo =
        $("instapayInfo");

    const vodafoneInfo =
        $("vodafoneInfo");

    function update() {

        const selected =
            document.querySelector(
                'input[name="paymentMethod"]:checked'
            );

        const value =
            selected
                ? selected.value
                : "";

        if (cardInfo) {

            cardInfo.classList.toggle(
                "show",
                value ===
                    "Visa / Mastercard"
            );
        }

        if (instaInfo) {

            instaInfo.classList.toggle(
                "show",
                value ===
                    "InstaPay"
            );
        }

        if (vodafoneInfo) {

            vodafoneInfo.classList.toggle(
                "show",
                value ===
                    "Vodafone Cash"
            );
        }
    }

    paymentInputs.forEach(
        input => {

            input.addEventListener(
                "change",
                update
            );
        }
    );

    update();
}


/* =========================================================
   CART RENDER
========================================================= */

function renderCart() {

    const container =
        $("cartItems");

    if (!container) {

        updateTotals();

        return;
    }

    if (!cart.length) {

        container.innerHTML = `
            <div class="empty-cart">

                <p>
                    Your cart is empty.
                </p>

                <a href="index.html">
                    Continue Shopping
                </a>

            </div>
        `;

        updateTotals();

        return;
    }

    container.innerHTML =
        cart.map(
            (
                item,
                index
            ) => {

                const image =
                    getImage(item);

                const name =
                    item?.name ||
                    item?.product_name ||
                    "Product";

                const price =
                    getPrice(item);

                const quantity =
                    getQuantity(item);

                const size =
                    item?.size ||
                    "";

                const color =
                    item?.color ||
                    "";

                return `
                    <div class="cart-item">

                        ${
                            image
                                ? `
                                    <img
                                        class="cart-image"
                                        src="${escapeHtml(image)}"
                                        alt="${escapeHtml(name)}"
                                    >
                                `
                                : `
                                    <div class="cart-image"></div>
                                `
                        }

                        <div>

                            <div class="cart-product-name">
                                ${escapeHtml(name)}
                            </div>

                            ${
                                size || color
                                    ? `
                                        <div class="cart-meta">

                                            ${
                                                size
                                                    ? `Size: ${escapeHtml(size)}`
                                                    : ""
                                            }

                                            ${
                                                size &&
                                                color
                                                    ? " • "
                                                    : ""
                                            }

                                            ${
                                                color
                                                    ? `Color: ${escapeHtml(color)}`
                                                    : ""
                                            }

                                        </div>
                                    `
                                    : ""
                            }

                            <div class="cart-price">
                                ${money(price)}
                            </div>

                            <div class="quantity-control">

                                <button
                                    type="button"
                                    onclick="changeQuantity(${index}, -1)"
                                >
                                    −
                                </button>

                                <span class="quantity-value">
                                    ${quantity}
                                </span>

                                <button
                                    type="button"
                                    onclick="changeQuantity(${index}, 1)"
                                >
                                    +
                                </button>

                            </div>

                        </div>

                        <div class="cart-item-total">
                            ${money(
                                getItemSubtotal(item)
                            )}
                        </div>

                    </div>
                `;
            }
        ).join("");

    updateTotals();
}


function changeQuantity(
    index,
    amount
) {

    if (!cart[index]) {

        return;
    }

    const current =
        getQuantity(
            cart[index]
        );

    const next =
        current + amount;

    if (next <= 0) {

        cart.splice(
            index,
            1
        );

    } else {

        cart[index].quantity =
            next;
    }

    saveCart();

    renderCart();
}


/* =========================================================
   COUPONS
========================================================= */

function getCouponPercent() {

    if (!appliedCoupon) {

        return 0;
    }

    return Number(
        appliedCoupon.discount_percent ??
        appliedCoupon.percent ??
        appliedCoupon.discount ??
        0
    );
}


function getCouponDiscountAmount() {

    const subtotal =
        getSubtotal();

    const percent =
        getCouponPercent();

    if (
        !appliedCoupon ||
        percent <= 0
    ) {

        return 0;
    }

    return Math.min(
        subtotal,
        subtotal *
            percent /
            100
    );
}


async function applyCoupon() {

    const input =
        $("couponInput");

    const message =
        $("couponMessage");

    if (!input) {

        return;
    }

    const code =
        String(
            input.value || ""
        )
            .trim()
            .toUpperCase();

    if (!code) {

        showCheckoutMessage(
            "Please enter a coupon code.",
            "error"
        );

        if (message) {

            message.textContent =
                "Please enter a coupon code.";

            message.className =
                "coupon-message error";
        }

        return;
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("coupons")
                .select("*")
                .ilike(
                    "code",
                    code
                )
                .eq(
                    "is_active",
                    true
                )
                .maybeSingle();

        if (error) {

            console.error(
                "Coupon error:",
                error
            );

            if (message) {

                message.textContent =
                    "Unable to verify the coupon.";

                message.className =
                    "coupon-message error";
            }

            return;
        }

        if (!data) {

            appliedCoupon =
                null;

            updateTotals();

            if (message) {

                message.textContent =
                    "This coupon is not valid.";

                message.className =
                    "coupon-message error";
            }

            return;
        }

        const maxUses =
            Number(
                data.max_uses || 0
            );

        const usedCount =
            Number(
                data.used_count || 0
            );

        if (
            maxUses > 0 &&
            usedCount >= maxUses
        ) {

            appliedCoupon =
                null;

            updateTotals();

            if (message) {

                message.textContent =
                    "This coupon has reached its usage limit.";

                message.className =
                    "coupon-message error";
            }

            return;
        }

        appliedCoupon =
            data;

        updateTotals();

        if (message) {

            message.textContent =
                `Coupon ${code} applied successfully.`;

            message.className =
                "coupon-message success";
        }

    } catch (error) {

        console.error(
            "Apply coupon failed:",
            error
        );

        showCheckoutMessage(
            "Unable to apply this coupon.",
            "error"
        );
    }
}


/* =========================================================
   EMAIL SUBSCRIBER DISCOUNT
========================================================= */

function getCheckoutEmail() {

    const emailInput =
        $("email");

    if (!emailInput) {

        return "";
    }

    return String(
        emailInput.value || ""
    )
        .trim()
        .toLowerCase();
}


async function checkSubscriberEmail(
    email
) {

    const normalizedEmail =
        String(
            email || ""
        )
            .trim()
            .toLowerCase();

    if (
        !normalizedEmail ||
        !normalizedEmail.includes("@")
    ) {

        subscriberEmailChecked =
            false;

        isEmailSubscriber =
            false;

        lastCheckedSubscriberEmail =
            "";

        updateTotals();

        return false;
    }

    if (
        subscriberEmailChecked &&
        lastCheckedSubscriberEmail ===
            normalizedEmail
    ) {

        return isEmailSubscriber;
    }

    subscriberEmailChecked =
        false;

    isEmailSubscriber =
        false;

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("subscribers")
                .select(
                    "id,email"
                )
                .ilike(
                    "email",
                    normalizedEmail
                )
                .limit(1)
                .maybeSingle();

        if (error) {

            console.error(
                "Subscriber check error:",
                error
            );

            subscriberEmailChecked =
                true;

            isEmailSubscriber =
                false;

            lastCheckedSubscriberEmail =
                normalizedEmail;

            updateTotals();

            return false;
        }

        isEmailSubscriber =
            !!data;

        subscriberEmailChecked =
            true;

        lastCheckedSubscriberEmail =
            normalizedEmail;

        updateTotals();

        return isEmailSubscriber;

    } catch (error) {

        console.error(
            "Subscriber email check failed:",
            error
        );

        subscriberEmailChecked =
            true;

        isEmailSubscriber =
            false;

        lastCheckedSubscriberEmail =
            normalizedEmail;

        updateTotals();

        return false;
    }
}


function getEmailSubscriberDiscountBase() {

    const subtotal =
        getSubtotal();

    const couponDiscount =
        getCouponDiscountAmount();

    return Math.max(
        0,
        subtotal -
            couponDiscount
    );
}


function getEmailSubscriberDiscountAmount() {

    if (!isEmailSubscriber) {

        return 0;
    }

    const base =
        getEmailSubscriberDiscountBase();

    const discount =
        base *
        EMAIL_SUBSCRIBER_DISCOUNT /
        100;

    return Math.min(
        discount,
        base
    );
}


/* =========================================================
   TOTALS
========================================================= */

function getTotalDiscount() {

    return (
        getCouponDiscountAmount() +
        getEmailSubscriberDiscountAmount()
    );
}


function getGrandTotal() {

    const subtotal =
        getSubtotal();

    const discount =
        getTotalDiscount();

    const governorate =
        $("governorate")?.value ||
        "";

    const shipping =
        getShippingFee(
            governorate
        );

    return Math.max(
        0,
        subtotal -
            discount +
            shipping
    );
}


function updateTotals() {

    const subtotal =
        getSubtotal();

    const couponDiscount =
        getCouponDiscountAmount();

    const subscriberDiscount =
        getEmailSubscriberDiscountAmount();

    const totalDiscount =
        couponDiscount +
        subscriberDiscount;

    const governorate =
        $("governorate")?.value ||
        "";

    const shipping =
        getShippingFee(
            governorate
        );

    const total =
        Math.max(
            0,
            subtotal -
                totalDiscount +
                shipping
        );

    const subtotalElement =
        $("subtotal");

    const discountElement =
        $("discount");

    const shippingElement =
        $("shipping");

    const totalElement =
        $("total");

    if (subtotalElement) {

        subtotalElement.textContent =
            money(subtotal);
    }

    if (discountElement) {

        discountElement.textContent =
            totalDiscount > 0
                ? `-${money(totalDiscount)}`
                : money(0);
    }

    if (shippingElement) {

        shippingElement.textContent =
            money(shipping);
    }

    if (totalElement) {

        totalElement.textContent =
            money(total);
    }
}


/* =========================================================
   CHECKOUT MESSAGE
========================================================= */

function showCheckoutMessage(
    message,
    type = "success"
) {

    const box =
        $("checkoutNotification");

    if (!box) {

        return;
    }

    box.textContent =
        message;

    box.className =
        `checkout-notification ${type} show`;

    box.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

    setTimeout(
        () => {

            box.classList.remove(
                "show"
            );

        },
        5000
    );
}


/* =========================================================
   ORDER NUMBER
========================================================= */

function generateOrderNumber() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    const random =
        Math.floor(
            1000 +
            Math.random() *
            9000
        );

    return `FS-${year}${month}${day}-${random}`;
}


/* =========================================================
   PAYMENT VALIDATION
========================================================= */

function validatePaymentMethod() {

    const paymentInput =
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        );

    if (!paymentInput) {

        showCheckoutMessage(
            "Please select a payment method.",
            "error"
        );

        return null;
    }

    const method =
        paymentInput.value;

    if (
        method ===
        "Visa / Mastercard"
    ) {

        showCheckoutMessage(
            "Card payment is not available yet.",
            "error"
        );

        return null;
    }

    return method;
}


/* =========================================================
   CREATE ORDER
========================================================= */

async function createOrder(
    formData
) {

    if (!cart.length) {

        throw new Error(
            "Your cart is empty."
        );
    }


    /* =========================================
       GET FORM VALUES
    ========================================= */

    const customerName =
        String(
            formData.get(
                "customerName"
            ) || ""
        ).trim();

    const customerEmail =
        String(
            formData.get(
                "email"
            ) || ""
        )
            .trim()
            .toLowerCase();

    const phone =
        String(
            formData.get(
                "phone"
            ) || ""
        ).trim();

    const whatsapp =
        String(
            formData.get(
                "whatsapp"
            ) || ""
        ).trim();

    const governorate =
        String(
            formData.get(
                "governorate"
            ) || ""
        ).trim();

    const address =
        String(
            formData.get(
                "address"
            ) || ""
        ).trim();


    /* =========================================
       VALIDATION
    ========================================= */

    if (!customerName) {

        throw new Error(
            "Please enter your name."
        );
    }

    if (!customerEmail) {

        throw new Error(
            "Please enter your email."
        );
    }

    if (!phone) {

        throw new Error(
            "Please enter your phone number."
        );
    }

    if (!governorate) {

        throw new Error(
            "Please select your governorate."
        );
    }

    if (!address) {

        throw new Error(
            "Please enter your address."
        );
    }


    /* =========================================
       EMAIL SUBSCRIBER CHECK
    ========================================= */

    await checkSubscriberEmail(
        customerEmail
    );


    /* =========================================
       TOTALS
    ========================================= */

    const subtotal =
        getSubtotal();

    const couponDiscount =
        getCouponDiscountAmount();

    const subscriberDiscount =
        getEmailSubscriberDiscountAmount();

    const discount =
        couponDiscount +
        subscriberDiscount;

    const shipping =
        getShippingFee(
            governorate
        );

    const total =
        Math.max(
            0,
            subtotal -
                discount +
                shipping
        );


    /* =========================================
       SHIPPING VALIDATION
    ========================================= */

    const shippingRate =
        shippingRates.find(
            rate =>
                String(
                    rate.governorate
                ).toLowerCase() ===
                governorate.toLowerCase()
        );

    if (!shippingRate) {

        throw new Error(
            "Shipping is not available for this governorate."
        );
    }


    /* =========================================
       PAYMENT
    ========================================= */

    const paymentMethod =
        validatePaymentMethod();

    if (!paymentMethod) {

        throw new Error(
            "Please select a valid payment method."
        );
    }


    /* =========================================
       ORDER NUMBER
    ========================================= */

    const orderNumber =
        generateOrderNumber();


    /* =========================================
       PAYMENT STATUS
    ========================================= */

    const paymentStatus =
        paymentMethod ===
        "Cash on Delivery"
            ? "not_required"
            : "pending";


    /* =========================================
       CREATE ORDER
    ========================================= */

    const orderPayload = {

        order_number:
            orderNumber,

        customer_name:
            customerName,

        customer_phone:
            phone,

        whatsapp:
            whatsapp ||
            null,

        customer_email:
            customerEmail,

        governorate:
            governorate,

        address:
            address,

        payment_method:
            paymentMethod,

        payment_status:
            paymentStatus,

        status:
            "Pending",

        subtotal:
            subtotal,

        discount:
            discount,

        shipping:
            shipping,

        total:
            total,

        coupon_code:
            appliedCoupon?.code ||
            null
    };


    const {
        data: order,
        error: orderError
    } =
        await supabaseClient
            .from("orders")
            .insert(
                orderPayload
            )
            .select()
            .single();


    if (orderError) {

        console.error(
            "Order creation error:",
            orderError
        );

        throw new Error(
            orderError.message ||
            "Unable to create your order."
        );
    }


    /* =========================================
       CREATE ORDER ITEMS
    ========================================= */

    const orderItems =
        cart.map(
            item => ({

                order_id:
                    order.id,

                product_id:
                    getProductId(
                        item
                    ),

                product_name:
                    item?.name ||
                    item?.product_name ||
                    "Product",

                product_image:
                    getImage(
                        item
                    ),

                size:
                    item?.size ||
                    null,

                color:
                    item?.color ||
                    null,

                quantity:
                    getQuantity(
                        item
                    ),

                price:
                    getPrice(
                        item
                    ),

                subtotal:
                    getItemSubtotal(
                        item
                    )
            })
        );


    const {
        error: itemsError
    } =
        await supabaseClient
            .from("order-items")
            .insert(
                orderItems
            );


    if (itemsError) {

        console.error(
            "Order items error:",
            itemsError
        );

        throw new Error(
            itemsError.message ||
            "Order was created, but order items could not be saved."
        );
    }


    /* =========================================
       UPDATE COUPON
    ========================================= */

    if (appliedCoupon?.id) {

        const usedCount =
            Number(
                appliedCoupon.used_count ||
                0
            );

        const {
            error
        } =
            await supabaseClient
                .from("coupons")
                .update({
                    used_count:
                        usedCount + 1
                })
                .eq(
                    "id",
                    appliedCoupon.id
                );

        if (error) {

            console.error(
                "Coupon usage update error:",
                error
            );
        }
    }


    return {
        order
    };
}


/* =========================================================
   SEND ORDER EMAIL
========================================================= */

async function sendOrderConfirmationEmail(
    orderId
) {

    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/functions/v1/send-order-email`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "apikey":
                            SUPABASE_KEY,

                        "Authorization":
                            `Bearer ${SUPABASE_KEY}`
                    },

                    body:
                        JSON.stringify({
                            order_id:
                                orderId
                        })
                }
            );


        if (!response.ok) {

            const text =
                await response
                    .text()
                    .catch(
                        () => ""
                    );

            console.warn(
                "Order created successfully, but email could not be sent.",
                text
            );

            return;
        }

        console.log(
            "Order confirmation email request sent."
        );

    } catch (error) {

        console.warn(
            "Email request failed:",
            error
        );
    }
}

/* =========================================================
   SHOW SUCCESS PAGE
========================================================= */

function showOrderSuccess(
    orderNumber,
    email,
    order = null
) {

    const checkoutContent =
        $("checkoutContent");

    const successPage =
        $("successPage");

    const successOrderNumber =
        $("successOrderNumber");

    const successEmail =
        $("successEmail");


    if (
        checkoutContent &&
        successPage
    ) {

        /* Hide checkout */

        checkoutContent.style.display =
            "none";


        /* Show success page */

        successPage.classList.add(
            "show"
        );


        /* Order number */

        if (successOrderNumber) {

            successOrderNumber.textContent =
                `Order #${orderNumber}`;
        }


        /* Success message */

        if (successEmail) {

            successEmail.textContent =
                "Your order has been placed successfully. We will contact you regarding your order.";
        }


        /* =========================================
           REMOVE OLD WHATSAPP BUTTON
        ========================================= */

        const existingButton =
            $("paymentWhatsAppBtn");

        if (existingButton) {

            existingButton.remove();
        }


        /* =========================================
           WHATSAPP PAYMENT BUTTON
           
           Only for:
           - InstaPay
           - Vodafone Cash
           
           COD = no button
        ========================================= */

        if (
            order &&
            (
                order.payment_method ===
                    "InstaPay" ||

                order.payment_method ===
                    "Vodafone Cash"
            )
        ) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.id =
                "paymentWhatsAppBtn";


            button.className =
                "payment-whatsapp-btn";


            /* Button content */

            button.innerHTML = `
                <span>↗</span>
                <span>
                    Send Payment Screenshot on WhatsApp
                </span>
            `;


            /* =========================================
               OPEN WHATSAPP ONLY AFTER CLICK
            ========================================= */

            button.addEventListener(
                "click",
                () => {

                    openPaymentWhatsApp(
                        order
                    );

                }
            );


            /* Add button to success page */

            successPage.appendChild(
                button
            );
        }


        /* =========================================
           SCROLL TO TOP
        ========================================= */

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });


        return;
    }


    /* =========================================
       FALLBACK
    ========================================= */

    showCheckoutMessage(
        `Order ${orderNumber} placed successfully!`,
        "success"
    );
}

/* =========================================================
   HANDLE CHECKOUT
========================================================= */

async function handleCheckout(
    event
) {

    event.preventDefault();

    event.stopPropagation();


    if (submittingOrder) {

        return;
    }


    const form =
        $("checkoutForm");

    if (!form) {

        showCheckoutMessage(
            "Checkout form was not found.",
            "error"
        );

        return;
    }


    /* =========================================
       BROWSER VALIDATION
    ========================================= */

    if (!form.checkValidity()) {

        form.reportValidity();

        return;
    }


    const formData =
        new FormData(
            form
        );


    submittingOrder =
        true;


    const submitButton =
        $("placeOrderBtn");


    const originalText =
        submitButton
            ? submitButton.textContent
            : "Place Order";


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Processing...";
    }


    try {

        const result =
            await createOrder(
                formData
            );


        /* =========================================
           CLEAR CART
        ========================================= */

        localStorage.removeItem(
            CART_KEY
        );

        cart = [];


        /* =========================================
           SUCCESS
        ========================================= */

        showOrderSuccess(
            result.order.order_number,
            formData.get("email"),
            result.order
        );


        /*
           =========================================
           IMPORTANT
           =========================================

           WhatsApp is NO LONGER opened automatically.

           The customer sees a button on the
           success page and must click it.
        */


        /* =========================================
           EMAIL
        ========================================= */

        await sendOrderConfirmationEmail(
            result.order.id
        );


        /* =========================================
           RESET STATE
        ========================================= */

        form.reset();

        appliedCoupon =
            null;

        isEmailSubscriber =
            false;

        subscriberEmailChecked =
            false;

        lastCheckedSubscriberEmail =
            "";

        updateTotals();

        renderCart();


    } catch (error) {

        console.error(
            "Checkout failed:",
            error
        );

        showCheckoutMessage(
            error?.message ||
                "Something went wrong. Please try again.",
            "error"
        );


    } finally {

        submittingOrder =
            false;

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                originalText ||
                "Place Order";
        }
    }
}


/* =========================================================
   EMAIL SUBSCRIBER CHECK
========================================================= */

function setupEmailSubscriberCheck() {

    const emailInput =
        $("email");

    if (!emailInput) {

        return;
    }

    let timeout =
        null;


    emailInput.addEventListener(
        "input",
        () => {

            clearTimeout(
                timeout
            );

            subscriberEmailChecked =
                false;

            isEmailSubscriber =
                false;

            lastCheckedSubscriberEmail =
                "";

            updateTotals();


            timeout =
                setTimeout(
                    () => {

                        checkSubscriberEmail(
                            getCheckoutEmail()
                        );

                    },
                    500
                );
        }
    );


    emailInput.addEventListener(
        "blur",
        () => {

            checkSubscriberEmail(
                getCheckoutEmail()
            );
        }
    );
}


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    const form =
        $("checkoutForm");


    if (form) {

        form.addEventListener(
            "submit",
            handleCheckout
        );
    }


    const governorateSelect =
        $("governorate");


    if (governorateSelect) {

        governorateSelect.addEventListener(
            "change",
            () => {

                updateTotals();

                updateShippingDisplay();

            }
        );
    }


    const couponButton =
        $("applyCouponBtn");


    if (couponButton) {

        couponButton.addEventListener(
            "click",
            applyCoupon
        );
    }


    const couponInput =
        $("couponInput");


    if (couponInput) {

        couponInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    applyCoupon();
                }
            }
        );
    }


    setupPaymentUI();

    setupEmailSubscriberCheck();
}

/* =========================================================
   INIT
========================================================= */

async function initCheckout() {

    loadCart();

    renderCart();

    setupEvents();


    await Promise.all([

        loadShippingRates(),

        loadPaymentSettings()

    ]);


    updateTotals();


    /* =========================================
       EMPTY CART MESSAGE
    ========================================= */

    if (!cart.length) {

        showCheckoutMessage(
            "Your cart is empty. Please add a product before checking out.",
            "error"
        );
    }
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initCheckout
);
