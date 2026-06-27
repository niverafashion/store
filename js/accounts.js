import { supabase } from "./supabase.js";

// =====================
// العناصر
// =====================

let orders = [];
let currentFilter = "";

// DOM
const table = document.getElementById("accountsTable");
const search = document.getElementById("search");
const modal = document.getElementById("modal");
const details = document.getElementById("details");
const close = document.getElementById("close");
const selectAll = document.getElementById("selectAllAccounts");
const receiveMoney = document.getElementById("receiveMoney");
const receiveReturns = document.getElementById("receiveReturns");

// =====================
// تحميل الطلبات
// =====================

async function loadOrders() {

const { data, error } = await supabase
.from("orders")
.select(`
id,
customer_id,
customer_name,
phone,
governorate,
address,
total_price,
delivery_price,
status,
finance_done,
has_return,
refund_amount,
created_at,
order_items(
id,
quantity,
price,
variant_id,
product_variants(
color,
size,
image,
products(name)
)
)
`)
.in("status", ["completed", "cancelled"])
.order("created_at", { ascending: false });

if (error) {
console.log(error);
return;
}

// =====================
// الطلبات غير المستلمة مالياً
// =====================

orders = data.filter(o => !o.finance_done);

// =====================
// تحديث كل الواجهة
// =====================

renderOrders(orders);
updateCards();

}

// =====================
// الفلتر
// =====================

function filterOrders() {
if (!currentFilter) return orders;

if (currentFilter === "returns") {
return orders.filter(o => o.has_return);
}

return orders.filter(o => o.status === currentFilter);
}

// =====================
// عرض الطلبات
// =====================

function renderOrders(list) {

let html = "";

list.forEach(o => {

// المنتجات
let products = (o.order_items || []).map(item => {

return `
<div class="product-box">

<div class="product-info">

<b>🛍 ${item.product_variants?.products?.name || "-"}</b>

<div>🎨 ${item.product_variants?.color || "-"}</div>
<div>📏 ${item.product_variants?.size || "-"}</div>
<div>🔢 ${item.quantity}</div>

</div>

<img src="${item.product_variants?.image || 'default.png'}" class="variant-img">

</div>
`;

}).join("");

// حسابات الطلب
let delivery = Number(o.delivery_price || 0);
let total = Number(o.total_price || 0);
let net = total - delivery;

// رواجع جزئية
let returnedQty = (o.order_items || []).reduce((a, b) => a + Number(b.quantity || 0), 0);
let hasPartialReturn = o.has_return && returnedQty > 0;

// HTML
html += `
<tr>

<td>
<input type="checkbox" class="account-check" data-id="${o.id}">
<br>
#${o.id}
</td>

<td>${o.customer_name || "-"}</td>
<td>${o.phone || "-"}</td>
<td>${o.governorate || "-"}</td>

<td>
${total} د.ع
<br>
<small>صافي: ${net} د.ع</small>
</td>

<td>
${o.has_return ? "يوجد" : "لا"}

${hasPartialReturn ? `<small>(جزئي)</small>` : ""}
</td>

<td>
<span class="badge ${o.status}">
${statusName(o.status)}
</span>
</td>

<td>
<button class="finance-btn" onclick="finishFinance('${o.id}')">
${o.finance_done ? "تم" : "استلام"}
</button>
</td>

<td>
<button class="view-btn" onclick="openAccount('${o.id}')">
<i class="fa-solid fa-eye"></i>
</button>
</td>

</tr>
`;

});

table.innerHTML = html;

attachEvents();

}

// =====================
// أحداث بعد الرندر
// =====================

function attachEvents() {

// تحديد الكل
selectAll.onchange = () => {
document.querySelectorAll(".account-check")
.forEach(c => c.checked = selectAll.checked);
};

// نسخ كود
document.querySelectorAll(".copy-code").forEach(el => {
el.onclick = () => {
navigator.clipboard.writeText(el.dataset.code);
alert("تم النسخ");
};
});

}

// =====================
// الكروت
// =====================

function updateCards(){

let completed = orders.filter(o =>
o.status === "completed"
);

let cancelled = orders.filter(o =>
o.status === "cancelled"
);

// 🔵 المجموع الكلي (مع التوصيل)
let grossTotal = completed.reduce((a,b)=>
a + Number(b.total_price || 0) + Number(b.delivery_price || 0)
,0);

// 🟢 الرواجع الجزئية
let partialReturns = orders.filter(o => o.has_return);

let refundTotal = partialReturns.reduce((sum, o) => {
return sum + Number(o.refund_amount || 0);
}, 0);

// 🔴 الصافي
let netTotal =
grossTotal - refundTotal;


document.getElementById("allCount").innerText =
orders.length;

document.getElementById("completedCount").innerText =
completed.length;

document.getElementById("cancelledCount").innerText =
cancelled.length;

// 💰 الكلي
document.getElementById("totalFinance").innerText =
grossTotal + " د.ع";

// 💰 الصافي (مهم)
let netEl = document.getElementById("netFinance");
if(netEl){
netEl.innerText = netTotal + " د.ع";
}

// 🔁 الرواجع
document.getElementById("pendingReturns").innerText =
orders.filter(o => o.has_return).length;

}
// =====================
// الفلاتر
// =====================

document.querySelectorAll(".status-card").forEach(btn => {

btn.onclick = () => {

document.querySelectorAll(".status-card")
.forEach(b => b.classList.remove("active"));

btn.classList.add("active");

currentFilter = btn.dataset.status || "";

renderOrders(filterOrders());

};

});

// =====================
// البحث
// =====================

search.oninput = () => {

let value = search.value.toLowerCase();

let result = filterOrders().filter(o =>

String(o.id).includes(value) ||
(o.customer_name || "").toLowerCase().includes(value) ||
(o.phone || "").includes(value)

);

renderOrders(result);

};

// =====================
// استلام الأموال
// =====================

window.finishFinance = async function(id) {

await supabase
.from("orders")
.update({ finance_done: true })
.eq("id", id);

await loadOrders();

};

// =====================
// تفاصيل
// =====================

window.openAccount = function(id) {

let o = orders.find(x => x.id == id);

let productsHTML = (o.order_items || []).map(item => `
<div class="product-box">

<b>${item.product_variants?.products?.name}</b>
<br>
الكمية: ${item.quantity}
<br>
السعر: ${item.price}

</div>
`).join("");

details.innerHTML = `
<h2>تفاصيل الحساب</h2>

<p>👤 ${o.customer_name}</p>
<p>📱 ${o.phone}</p>
<p>📍 ${o.governorate}</p>

<hr>

${productsHTML}

<p>الحالة: ${statusName(o.status)}</p>
<p>المبلغ: ${o.total_price} د.ع</p>
`;

modal.style.display = "flex";

};

close.onclick = () => {
modal.style.display = "none";
};

// =====================
// اسم الحالة
// =====================

function statusName(s) {
return {
completed: "مكتمل",
cancelled: "ملغي"
}[s] || s;
}

// =====================
// تشغيل
// =====================

loadOrders();