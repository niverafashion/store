import { supabase } from "./supabase.js";
import { BrowserMultiFormatReader } from "https://esm.sh/@zxing/browser@0.1.5";

// ==================================================
// NIVRA ACCOUNTS & RETURNS
// ==================================================

let orders = [];
let currentFilter = "";
let currentSearch = "";

let scannerReader = null;
let scannerControls = null;
let scannerActive = false;
let scannerType = "cancelled";
let scanLocked = false;
let scannerStarting = false;

// ==================================================
// DOM ELEMENTS
// ==================================================

const table = document.getElementById("accountsTable");
const search = document.getElementById("search");

const modal = document.getElementById("modal");
const details = document.getElementById("details");
const close = document.getElementById("close");

const selectAll = document.getElementById("selectAllAccounts");

const receiveMoney = document.getElementById("receiveMoney");
const receiveReturns = document.getElementById("receiveReturns");

const scannerModal = document.getElementById("returnsScannerModal");
const scannerVideo = document.getElementById("returnsScannerVideo");
const scannerMessage = document.getElementById("scannerMessage");
const scannerResult = document.getElementById("scannerResult");

const startScannerBtn = document.getElementById("startReturnsScan");
const stopScannerBtn = document.getElementById("stopReturnsScan");
const closeScannerBtn = document.getElementById("closeReturnsScanner");
const openScannerBtn = document.getElementById("openReturnsScanner");

// ==================================================
// HELPERS
// ==================================================

function money(value) {
    return Number(value || 0).toLocaleString("en-US") + " د.ع";
}

function statusName(status) {
    return {
        completed: "مكتمل",
        cancelled: "مرفوض"
    }[status] || status || "-";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function getOrderCode(order) {
    return String(order.delivery_code || order.id);
}

function isUnreceivedReturn(row) {
    return row.accounts_received === false;
}

function getReturnRows(order) {
    return (order.inventoryReturns || []).filter(isUnreceivedReturn);
}

function getReturnType(order) {
    const rows = getReturnRows(order);

    if (rows.some(row => row.type === "cancelled")) {
        return "cancelled";
    }

    if (rows.some(row => row.type === "partial_return")) {
        return "partial_return";
    }

    return null;
}

function getSelectedOrders() {
    const ids = [...document.querySelectorAll(".account-check:checked")]
        .map(input => String(input.dataset.id));

    return orders.filter(order => ids.includes(String(order.id)));
}

function getReturnQuantity(rows) {
    return rows.reduce(
        (sum, row) => sum + Number(row.quantity || 0),
        0
    );
}

function setScannerMessage(message) {
    if (scannerMessage) {
        scannerMessage.innerText = message;
    }
}

function setScannerResult(icon, message) {
    if (!scannerResult) return;

    scannerResult.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${escapeHTML(message)}</span>
    `;
}

// ==================================================
// LOAD ORDERS
// ==================================================

async function loadOrders() {

    const { data, error } = await supabase
        .from("orders")
        .select(`
            id,
            delivery_code,
            customer_id,
            customer_name,
            phone,
            governorate,
            address,
            delivery_price,
            subtotal_price,
            discount_amount,
            total_price,
            status,
            finance_done,
            has_return,
            has_partial_refund,
            refund_amount,
            completed_at,
            cancelled_reason,
            created_at,
            order_items(
                id,
                variant_id,
                quantity,
                returned_quantity,
                price,
                product_variants(
                    id,
                    color,
                    size,
                    stock_quantity,
                    image,
                    products(
                        id,
                        name
                    )
                )
            )
        `)
        .in("status", ["completed", "cancelled"])
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Orders loading error:", error);
        alert("حدث خطأ أثناء تحميل الطلبات");
        return;
    }

    const { data: inventoryReturns, error: returnsError } =
        await supabase
            .from("inventory_returns")
            .select("*")
            .eq("accounts_received", false);

    if (returnsError) {
        console.error("Returns loading error:", returnsError);
        alert("تعذر تحميل سجلات الرواجع");
        return;
    }

    const returnsByOrder = {};

    (inventoryReturns || []).forEach(row => {

        if (!returnsByOrder[row.order_id]) {
            returnsByOrder[row.order_id] = [];
        }

        returnsByOrder[row.order_id].push(row);

    });

    orders = (data || []).map(order => ({
        ...order,
        inventoryReturns: returnsByOrder[order.id] || []
    }));

    updateCards();
    renderOrders(filterOrders());
}

// ==================================================
// FILTERS
// ==================================================

function filterOrders() {

    let result = [...orders];

    if (currentFilter === "completed") {

        result = result.filter(order =>
            order.status === "completed" &&
            order.finance_done !== true
        );

    } else if (currentFilter === "cancelled") {

        result = result.filter(order =>
            order.status === "cancelled" &&
            getReturnRows(order).some(row =>
                row.type === "cancelled"
            )
        );

    } else if (currentFilter === "returns") {

        result = result.filter(order =>
            getReturnRows(order).some(row =>
                row.type === "partial_return"
            )
        );

    }

    if (currentSearch) {

        const value = currentSearch.toLowerCase();

        result = result.filter(order => {

            return (
                getOrderCode(order).toLowerCase().includes(value) ||
                String(order.id).toLowerCase().includes(value) ||
                (order.customer_name || "").toLowerCase().includes(value) ||
                (order.phone || "").toLowerCase().includes(value)
            );

        });

    }

    return result;
}

// ==================================================
// RENDER ORDERS
// ==================================================

function renderOrders(list) {

    if (!table) return;

    let html = "";

    if (!list.length) {

        table.innerHTML = `
            <tr>
                <td colspan="9" class="empty-accounts">
                    <i class="fa-solid fa-folder-open"></i>
                    <p>لا توجد مستحقات في هذا القسم</p>
                </td>
            </tr>
        `;

        if (selectAll) selectAll.checked = false;

        return;
    }

    list.forEach(order => {

        const returnType = getReturnType(order);

        const isCompleted =
            order.status === "completed" &&
            order.finance_done !== true;

        const returnRows = getReturnRows(order);

        const returnLabel = returnType === "partial_return"
            ? "راجع جزئي"
            : returnType === "cancelled"
                ? "مرفوض"
                : "-";

        const actionButton = isCompleted
            ? `
                <button
                    type="button"
                    class="action-btn finance-btn"
                    onclick="confirmFinance('${order.id}')"
                    title="تسديد الحساب">
                    <i class="fa-solid fa-money-bill-transfer"></i>
                </button>
            `
            : `
                <button
                    type="button"
                    class="action-btn receive-return-btn"
                    onclick="confirmReturnReceipt('${order.id}')"
                    title="استلام الرجع من الشركة">
                    <i class="fa-solid fa-arrow-rotate-left"></i>
                </button>
            `;

        html += `
            <tr>

                <td class="order-number">
                    <div class="order-select-box">

                        <input
                            type="checkbox"
                            class="order-check account-check"
                            data-id="${escapeHTML(order.id)}">

                        <span
                            class="order-id copy-code"
                            data-code="${escapeHTML(getOrderCode(order))}"
                            title="اضغط لنسخ الكود">
                            ${escapeHTML(getOrderCode(order))}
                        </span>

                    </div>
                </td>

                <td>${escapeHTML(order.customer_name || "-")}</td>

                <td>${escapeHTML(order.phone || "-")}</td>

                <td class="governorate-cell">
                    <div class="order-governorate">
                        ${escapeHTML(order.governorate || "-")}
                    </div>

                    <div class="order-address">
                        <i class="fa-solid fa-location-dot"></i>
                        ${escapeHTML(order.address || "-")}
                    </div>
                </td>

                <td>
                    <strong>${money(order.total_price)}</strong>
                    <br>
                    <small>التوصيل: ${money(order.delivery_price)}</small>
                </td>

                <td>
                    ${
                        returnRows.length
                        ? `<span class="badge return">${returnLabel}</span>`
                        : "-"
                    }
                </td>

                <td>
                    <span class="badge ${escapeHTML(order.status)}">
                        ${statusName(order.status)}
                    </span>
                </td>

                <td>
                    ${
                        isCompleted
                        ? `<span class="badge waiting">غير مستلم</span>`
                        : `<span class="badge return">بانتظار الاستلام</span>`
                    }
                </td>

                <td>
                    ${actionButton}

                    <button
                        type="button"
                        class="action-btn view-btn"
                        onclick="openAccount('${order.id}')"
                        title="تفاصيل الطلب">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>

            </tr>
        `;

    });

    table.innerHTML = html;

    attachEvents();
}

// ==================================================
// TABLE EVENTS
// ==================================================

function attachEvents() {

    document.querySelectorAll(".copy-code").forEach(element => {

        element.onclick = async () => {

            try {
                await navigator.clipboard.writeText(element.dataset.code);
                alert("تم نسخ الكود");
            } catch (error) {
                console.error(error);
                alert("تعذر النسخ");
            }

        };

    });

    document.querySelectorAll(".account-check").forEach(input => {

        input.onchange = () => {

            const all = [
                ...document.querySelectorAll(".account-check")
            ];

            if (selectAll) {
                selectAll.checked =
                    all.length > 0 &&
                    all.every(item => item.checked);
            }

        };

    });

    if (selectAll) {
        selectAll.checked = false;
    }
}

// ==================================================
// UPDATE SUMMARY CARDS
// ==================================================

function updateCards() {

    const completedOrders = orders.filter(order =>
        order.status === "completed" &&
        order.finance_done !== true
    );

    const cancelledOrders = orders.filter(order =>
        order.status === "cancelled" &&
        getReturnRows(order).some(row =>
            row.type === "cancelled"
        )
    );

    const partialReturnOrders = orders.filter(order =>
        getReturnRows(order).some(row =>
            row.type === "partial_return"
        )
    );

    const grossTotal = completedOrders.reduce((sum, order) => {

        return sum +
            Number(order.total_price || 0) +
            Number(order.delivery_price || 0);

    }, 0);

    const refundTotal = partialReturnOrders.reduce((sum, order) => {
        return sum + Number(order.refund_amount || 0);
    }, 0);

    const netTotal = grossTotal - refundTotal;

    const completedCount = document.getElementById("completedCount");
    const cancelledCount = document.getElementById("cancelledCount");
    const pendingReturns = document.getElementById("pendingReturns");
    const totalFinance = document.getElementById("totalFinance");
    const netFinance = document.getElementById("netFinance");

    if (completedCount) completedCount.innerText = completedOrders.length;
    if (cancelledCount) cancelledCount.innerText = cancelledOrders.length;
    if (pendingReturns) pendingReturns.innerText = partialReturnOrders.length;

    if (totalFinance) totalFinance.innerText = money(grossTotal);
    if (netFinance) netFinance.innerText = money(netTotal);
}

// ==================================================
// STATUS CARD FILTERS
// ==================================================

document.querySelectorAll(".status-card[data-status]").forEach(button => {

    button.addEventListener("click", () => {

        document.querySelectorAll(".status-card[data-status]")
            .forEach(card => card.classList.remove("active"));

        button.classList.add("active");

        currentFilter = button.dataset.status || "";

        renderOrders(filterOrders());

    });

});

// ==================================================
// SEARCH
// ==================================================

if (search) {

    search.addEventListener("input", () => {

        currentSearch = search.value.trim();

        renderOrders(filterOrders());

    });

}

// ==================================================
// SELECT ALL
// ==================================================

if (selectAll) {

    selectAll.onchange = () => {

        document.querySelectorAll(".account-check")
            .forEach(input => {
                input.checked = selectAll.checked;
            });

    };

}

// ==================================================
// CONFIRMATION MODAL
// ==================================================

function showModal(content) {

    if (!modal || !details) return;

    details.innerHTML = content;
    modal.style.display = "flex";

}

function hideModal() {

    if (!modal || !details) return;

    modal.style.display = "none";
    details.innerHTML = "";

}

if (close) {
    close.onclick = hideModal;
}

window.addEventListener("click", event => {

    if (event.target === modal) {
        hideModal();
    }

});

window.closeAccountModal = hideModal;

// ==================================================
// FINANCE CONFIRMATION
// ==================================================

window.confirmFinance = function(id) {

    const order = orders.find(item =>
        String(item.id) === String(id)
    );

    if (
        !order ||
        order.status !== "completed" ||
        order.finance_done === true
    ) {
        alert("هذا الحساب غير متاح للتسديد");
        return;
    }

    const amount =
        Number(order.total_price || 0) +
        Number(order.delivery_price || 0);

    showModal(`
        <div class="confirmation-content">

            <div class="confirmation-icon">
                <i class="fa-solid fa-money-bill-transfer"></i>
            </div>

            <h2>تسديد حساب الطلب</h2>

            <p>هل تريد تأكيد استلام حساب هذا الطلب من الشركة؟</p>

            <div class="confirmation-details">
                <p>رقم الطلب: <strong>${escapeHTML(getOrderCode(order))}</strong></p>
                <p>الزبون: <strong>${escapeHTML(order.customer_name || "-")}</strong></p>
                <p>المبلغ: <strong>${money(amount)}</strong></p>
            </div>

            <div class="confirmation-actions">

                <button
                    type="button"
                    class="confirm-btn"
                    onclick="executeFinance('${order.id}')">
                    <i class="fa-solid fa-check"></i>
                    تأكيد التسديد
                </button>

                <button
                    type="button"
                    class="cancel-btn"
                    onclick="closeAccountModal()">
                    إلغاء
                </button>

            </div>

        </div>
    `);

};

// ==================================================
// EXECUTE FINANCE
// ==================================================

window.executeFinance = async function(id) {

    const order = orders.find(item =>
        String(item.id) === String(id)
    );

    if (
        !order ||
        order.status !== "completed" ||
        order.finance_done === true
    ) {
        alert("الحساب مستلم مسبقاً أو غير موجود");
        return;
    }

    const { data, error } = await supabase
        .from("orders")
        .update({
            finance_done: true
        })
        .eq("id", id)
        .eq("finance_done", false)
        .select("id");

    if (error) {
        console.error(error);
        alert("تعذر تسجيل استلام الحساب");
        return;
    }

    if (!data?.length) {
        alert("تم استلام هذا الحساب مسبقاً");
        await loadOrders();
        hideModal();
        return;
    }

    hideModal();
    await loadOrders();

    alert("تم تسجيل استلام الحساب بنجاح");
};

// ==================================================
// SAFE INVENTORY RETURN RPC
// ==================================================

async function receiveReturnRecords(returnIds) {

    const uniqueIds = [...new Set(returnIds)];

    if (!uniqueIds.length) {
        throw new Error("لم يتم تحديد سجلات الإرجاع");
    }

    const { data, error } = await supabase.rpc(
        "receive_inventory_returns",
        {
            p_return_ids: uniqueIds
        }
    );

    if (error) {
        console.error("Inventory return RPC error:", error);
        throw error;
    }

    return Number(data || 0);
}

// ==================================================
// RETURN RECEIPT CONFIRMATION
// ==================================================

window.confirmReturnReceipt = function(id) {

    const order = orders.find(item =>
        String(item.id) === String(id)
    );

    if (!order) return;

    const returnRows = getReturnRows(order);

    if (!returnRows.length) {
        alert("لا توجد قطع بانتظار الاستلام لهذا الطلب");
        return;
    }

    const quantity = getReturnQuantity(returnRows);

    const title = returnRows.some(row => row.type === "cancelled")
        ? "استلام المرفوض"
        : "استلام الراجع الجزئي";

    showModal(`
        <div class="confirmation-content">

            <div class="confirmation-icon">
                <i class="fa-solid fa-arrow-rotate-left"></i>
            </div>

            <h2>${title}</h2>

            <p>هل تؤكد استلام القطع من الشركة وإضافتها إلى المخزون؟</p>

            <div class="confirmation-details">
                <p>رقم الطلب: <strong>${escapeHTML(getOrderCode(order))}</strong></p>
                <p>الزبون: <strong>${escapeHTML(order.customer_name || "-")}</strong></p>
                <p>عدد القطع: <strong>${quantity}</strong></p>
            </div>

            <div class="confirmation-actions">

                <button
                    type="button"
                    class="confirm-btn"
                    onclick="executeReturnReceipt('${order.id}')">
                    <i class="fa-solid fa-check"></i>
                    تأكيد الاستلام
                </button>

                <button
                    type="button"
                    class="cancel-btn"
                    onclick="closeAccountModal()">
                    إلغاء
                </button>

            </div>

        </div>
    `);

};

// ==================================================
// EXECUTE RETURN RECEIPT
// ==================================================

window.executeReturnReceipt = async function(id) {

    const order = orders.find(item =>
        String(item.id) === String(id)
    );

    if (!order) return;

    const returnRows = getReturnRows(order);
    const returnIds = returnRows.map(row => row.id);

    if (!returnIds.length) {
        alert("لا توجد رواجع غير مستلمة");
        return;
    }

    try {

        const count = await receiveReturnRecords(returnIds);

        hideModal();
        await loadOrders();

        alert(
            `تم استلام ${count} سجل بنجاح وإضافة الكميات إلى المخزون`
        );

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "تعذر استلام الرواجع. لم يتم اعتماد العملية."
        );

    }

};

// ==================================================
// BULK RECEIVE MONEY
// ==================================================

if (receiveMoney) {

    receiveMoney.onclick = () => {

        const selected = getSelectedOrders().filter(order =>
            order.status === "completed" &&
            order.finance_done !== true
        );

        if (!selected.length) {
            alert("حدد طلبات مكتملة غير مستلمة أولاً");
            return;
        }

        const total = selected.reduce((sum, order) =>
            sum +
            Number(order.total_price || 0) +
            Number(order.delivery_price || 0),
            0
        );

        showModal(`
            <div class="confirmation-content">

                <div class="confirmation-icon">
                    <i class="fa-solid fa-money-bill-transfer"></i>
                </div>

                <h2>استلام حسابات متعددة</h2>

                <p>هل تريد تأكيد استلام حسابات الطلبات المحددة؟</p>

                <div class="confirmation-details">
                    <p>عدد الطلبات: <strong>${selected.length}</strong></p>
                    <p>المبلغ الإجمالي: <strong>${money(total)}</strong></p>
                </div>

                <div class="confirmation-actions">

                    <button
                        type="button"
                        class="confirm-btn"
                        onclick="executeBulkFinance()">
                        تأكيد الاستلام
                    </button>

                    <button
                        type="button"
                        class="cancel-btn"
                        onclick="closeAccountModal()">
                        إلغاء
                    </button>

                </div>

            </div>
        `);

    };

}

window.executeBulkFinance = async function() {

    const selected = getSelectedOrders().filter(order =>
        order.status === "completed" &&
        order.finance_done !== true
    );

    if (!selected.length) return;

    const ids = selected.map(order => order.id);

    const { data, error } = await supabase
        .from("orders")
        .update({
            finance_done: true
        })
        .in("id", ids)
        .eq("finance_done", false)
        .select("id");

    if (error) {
        console.error(error);
        alert("تعذر استلام الحسابات المحددة");
        return;
    }

    hideModal();
    await loadOrders();

    alert(`تم استلام حسابات ${data?.length || 0} طلب بنجاح`);
};

// ==================================================
// BULK RECEIVE RETURNS
// ==================================================

if (receiveReturns) {

    receiveReturns.onclick = () => {

        const selected = getSelectedOrders().filter(order =>
            getReturnRows(order).length > 0
        );

        const ids = selected.flatMap(order =>
            getReturnRows(order).map(row => row.id)
        );

        if (!ids.length) {
            alert("حدد طلبات تحتوي على رواجع غير مستلمة أولاً");
            return;
        }

        const quantity = selected.reduce((sum, order) => {
            return sum + getReturnQuantity(getReturnRows(order));
        }, 0);

        showModal(`
            <div class="confirmation-content">

                <div class="confirmation-icon">
                    <i class="fa-solid fa-arrow-rotate-left"></i>
                </div>

                <h2>استلام الرواجع المحددة</h2>

                <p>هل تؤكد استلام القطع وإضافتها إلى المخزون؟</p>

                <div class="confirmation-details">
                    <p>عدد الطلبات: <strong>${selected.length}</strong></p>
                    <p>عدد سجلات الرواجع: <strong>${ids.length}</strong></p>
                    <p>مجموع القطع: <strong>${quantity}</strong></p>
                </div>

                <div class="confirmation-actions">

                    <button
                        type="button"
                        class="confirm-btn"
                        onclick="executeBulkReturns()">
                        تأكيد الاستلام
                    </button>

                    <button
                        type="button"
                        class="cancel-btn"
                        onclick="closeAccountModal()">
                        إلغاء
                    </button>

                </div>

            </div>
        `);

    };

}

window.executeBulkReturns = async function() {

    const selected = getSelectedOrders().filter(order =>
        getReturnRows(order).length > 0
    );

    const ids = selected.flatMap(order =>
        getReturnRows(order).map(row => row.id)
    );

    if (!ids.length) {
        alert("لا توجد رواجع محددة");
        return;
    }

    try {

        const count = await receiveReturnRecords(ids);

        hideModal();
        await loadOrders();

        alert(
            `تم استلام ${count} سجل بنجاح وإضافة الكميات إلى المخزون`
        );

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "تعذر استلام الرواجع المحددة"
        );

    }

};

// ==================================================
// ACCOUNT DETAILS
// ==================================================

window.openAccount = function(id) {

    const order = orders.find(item =>
        String(item.id) === String(id)
    );

    if (!order) return;

    const productsHTML = (order.order_items || []).map(item => {

        const product = item.product_variants?.products?.name || "-";
        const color = item.product_variants?.color || "-";
        const size = item.product_variants?.size || "-";

        return `
            <div class="product-box">

                <b>${escapeHTML(product)}</b>

                <div>اللون: ${escapeHTML(color)}</div>
                <div>الحجم: ${escapeHTML(size)}</div>
                <div>الكمية: ${Number(item.quantity || 0)}</div>
                <div>السعر: ${money(item.price)}</div>

            </div>
        `;

    }).join("");

    const total =
        Number(order.total_price || 0) +
        Number(order.delivery_price || 0);

    details.innerHTML = `
        <div class="account-details-content">

            <h2>تفاصيل الحساب</h2>

            <p>رقم الطلب: ${escapeHTML(getOrderCode(order))}</p>
            <p>الزبون: ${escapeHTML(order.customer_name || "-")}</p>
            <p>الهاتف: ${escapeHTML(order.phone || "-")}</p>
            <p>المحافظة: ${escapeHTML(order.governorate || "-")}</p>
            <p>العنوان: ${escapeHTML(order.address || "-")}</p>

            <hr>

            <h3>المنتجات</h3>
            ${productsHTML}

            <hr>

            <p>حالة الطلب: ${statusName(order.status)}</p>
            <p>المبلغ: ${money(order.total_price)}</p>
            <p>التوصيل: ${money(order.delivery_price)}</p>
            <p><strong>الإجمالي: ${money(total)}</strong></p>

        </div>
    `;

    modal.style.display = "flex";

};

// ==================================================
// MANUAL SCANNER INPUT
// ==================================================

function prepareManualScannerInput() {

    const scannerBox = scannerModal?.querySelector(".scanner-box");

    if (!scannerBox || document.getElementById("manualReturnCode")) {
        return;
    }

    const manualBox = document.createElement("div");

    manualBox.className = "manual-scanner-input";

    manualBox.innerHTML = `
        <label for="manualReturnCode">
            أو أدخل كود الطلب يدوياً
        </label>

        <div class="manual-code-row">

            <input
                type="text"
                id="manualReturnCode"
                placeholder="أدخل كود الطلب..."
                autocomplete="off">

            <button type="button" id="searchReturnCode">
                <i class="fa-solid fa-magnifying-glass"></i>
                بحث
            </button>

        </div>
    `;

    scannerBox.appendChild(manualBox);

    document.getElementById("searchReturnCode").onclick =
        searchManualReturnCode;

    document.getElementById("manualReturnCode").onkeydown = event => {

        if (event.key === "Enter") {
            searchManualReturnCode();
        }

    };

}

function searchManualReturnCode() {

    const input = document.getElementById("manualReturnCode");
    const code = input?.value.trim();

    if (!code) {
        alert("أدخل كود الطلب أولاً");
        return;
    }

    scanLocked = false;
    handleScannedCode(code);

}

// ==================================================
// OPEN SCANNER
// ==================================================

function openReturnsScanner() {

    if (!scannerModal) {
        alert("نافذة الماسح غير موجودة في HTML");
        return;
    }

    scannerModal.style.display = "flex";

    prepareManualScannerInput();

    scanLocked = false;

    setScannerResult(
        "fa-barcode",
        "بانتظار قراءة الباركود..."
    );

    setScannerMessage("اضغط بدء المسح لتشغيل الكاميرا");

}

if (openScannerBtn) {
    openScannerBtn.onclick = openReturnsScanner;
}

if (closeScannerBtn) {

    closeScannerBtn.onclick = () => {

        stopReturnsScanner();

        if (scannerModal) {
            scannerModal.style.display = "none";
        }

    };

}

// ==================================================
// SCANNER TYPE
// ==================================================

document.querySelectorAll(".scanner-type").forEach(button => {

    button.onclick = () => {

        document.querySelectorAll(".scanner-type")
            .forEach(item => item.classList.remove("active"));

        button.classList.add("active");

        scannerType = button.dataset.scanType;

        scanLocked = false;

        setScannerResult(
            "fa-barcode",
            scannerType === "cancelled"
                ? "نوع البحث: المرفوضات"
                : "نوع البحث: الرواجع الجزئية"
        );

    };

});

// ==================================================
// START ZXING CAMERA SCANNER
// ==================================================

if (startScannerBtn) {
    startScannerBtn.onclick = startReturnsScanner;
}

async function startReturnsScanner() {

    if (scannerStarting || scannerActive) return;

    if (!navigator.mediaDevices?.getUserMedia) {

        setScannerMessage(
            "الكاميرا تحتاج متصفحاً يدعم الوصول إليها واتصال HTTPS"
        );

        return;
    }

    if (!scannerVideo) {

        setScannerMessage(
            "عنصر عرض الكاميرا غير موجود في HTML"
        );

        return;
    }

    scannerStarting = true;

    setScannerMessage("جاري تشغيل الكاميرا...");

    try {

        scannerReader = new BrowserMultiFormatReader();

        scannerControls = await scannerReader.decodeFromVideoDevice(
            undefined,
            scannerVideo,
            (result, error, controls) => {

                if (controls && !scannerControls) {
                    scannerControls = controls;
                }

                if (!result || scanLocked) return;

                const code = result.getText();

                if (!code) return;

                scanLocked = true;

                setScannerResult(
                    "fa-circle-check",
                    `تمت قراءة الكود: ${code}`
                );

                stopReturnsScanner();

                handleScannedCode(code);

            }
        );

        scannerActive = true;

        setScannerMessage(
            "وجّه الكاميرا نحو باركود أو QR الخاص بالطلب"
        );

    } catch (error) {

        console.error("ZXing scanner error:", error);

        stopReturnsScanner();

        setScannerMessage(
            "تعذر تشغيل الكاميرا. تأكد من السماح للمتصفح باستخدام الكاميرا."
        );

    } finally {

        scannerStarting = false;

    }

}

// ==================================================
// STOP CAMERA
// ==================================================

function stopReturnsScanner() {

    scannerActive = false;

    if (scannerControls) {

        try {
            scannerControls.stop();
        } catch (error) {
            console.warn("Scanner stop warning:", error);
        }

        scannerControls = null;

    }

    if (scannerVideo) {

        const stream = scannerVideo.srcObject;

        if (stream?.getTracks) {
            stream.getTracks().forEach(track => track.stop());
        }

        scannerVideo.srcObject = null;

    }

}

if (stopScannerBtn) {
    stopScannerBtn.onclick = stopReturnsScanner;
}

// ==================================================
// HANDLE SCANNED OR MANUAL CODE
// ==================================================

function handleScannedCode(code) {

    const normalizedCode = String(code).trim().toLowerCase();

    const order = orders.find(item => {

        const deliveryCode = getOrderCode(item).toLowerCase();
        const id = String(item.id).toLowerCase();

        return (
            deliveryCode === normalizedCode ||
            id === normalizedCode
        );

    });

    if (!order) {

        if (scannerModal) {
            scannerModal.style.display = "flex";
        }

        setScannerResult(
            "fa-circle-exclamation",
            "لم يتم العثور على الطلب بهذا الكود"
        );

        scanLocked = false;

        return;
    }

    const requiredType = scannerType === "cancelled"
        ? "cancelled"
        : "partial_return";

    const validRows = getReturnRows(order).filter(row =>
        row.type === requiredType
    );

    if (!validRows.length) {

        if (scannerModal) {
            scannerModal.style.display = "flex";
        }

        setScannerResult(
            "fa-circle-exclamation",
            scannerType === "cancelled"
                ? "الطلب ليس ضمن المرفوضات غير المستلمة"
                : "الطلب ليس ضمن الرواجع الجزئية غير المستلمة"
        );

        scanLocked = false;

        return;
    }

    stopReturnsScanner();

    if (scannerModal) {
        scannerModal.style.display = "none";
    }

    showScannedOrderConfirmation(order);

}

// ==================================================
// SHOW SCANNED ORDER
// ==================================================

function showScannedOrderConfirmation(order) {

    const requiredType = scannerType === "cancelled"
        ? "cancelled"
        : "partial_return";

    const rows = getReturnRows(order).filter(row =>
        row.type === requiredType
    );

    const quantity = getReturnQuantity(rows);

    const title = requiredType === "cancelled"
        ? "استلام المرفوض"
        : "استلام الراجع الجزئي";

    showModal(`
        <div class="confirmation-content">

            <div class="confirmation-icon">
                <i class="fa-solid fa-barcode"></i>
            </div>

            <h2>${title}</h2>

            <p>تم العثور على الطلب بنجاح</p>

            <div class="confirmation-details">

                <p>رقم الطلب: <strong>${escapeHTML(getOrderCode(order))}</strong></p>

                <p>الزبون: <strong>${escapeHTML(order.customer_name || "-")}</strong></p>

                <p>عدد القطع: <strong>${quantity}</strong></p>

            </div>

            <div class="confirmation-actions">

                <button
                    type="button"
                    class="confirm-btn"
                    onclick="executeScannedReturn('${order.id}', '${requiredType}')">
                    <i class="fa-solid fa-check"></i>
                    تأكيد الاستلام وإضافة للمخزون
                </button>

                <button
                    type="button"
                    class="cancel-btn"
                    onclick="closeAccountModal()">
                    إلغاء
                </button>

            </div>

        </div>
    `);

}

// ==================================================
// EXECUTE SCANNED RETURN
// ==================================================

window.executeScannedReturn = async function(id, type) {

    const order = orders.find(item =>
        String(item.id) === String(id)
    );

    if (!order) return;

    const rows = getReturnRows(order).filter(row =>
        row.type === type
    );

    const ids = rows.map(row => row.id);

    if (!ids.length) {
        alert("لا توجد سجلات غير مستلمة لهذا الطلب");
        return;
    }

    try {

        const count = await receiveReturnRecords(ids);

        hideModal();

        if (scannerModal) {
            scannerModal.style.display = "none";
        }

        await loadOrders();

        alert(
            `تم استلام ${count} سجل بنجاح وإضافة الكميات إلى المخزون`
        );

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "تعذر تسجيل الاستلام. لم يتم اعتماد العملية."
        );

    }

};

// ==================================================
// INITIAL LOAD
// ==================================================

loadOrders();