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
.in("status", ["completed","cancelled"])
.order("created_at",{ ascending:false });

if(error){
console.error(error);
return;
}
const { data: inventoryReturns } = await supabase
.from("inventory_returns")
.select("*")
.eq("accounts_received", false);

const returnsByOrder = {};

inventoryReturns?.forEach(r => {

    if(!returnsByOrder[r.order_id]){
        returnsByOrder[r.order_id] = [];
    }

    returnsByOrder[r.order_id].push(r);

});
orders = data || [];
orders.forEach(order => {

    order.inventoryReturns =
        returnsByOrder[order.id] || [];

});
// تحديث الكروت
updateCards();

// عرض حسب الفلتر الحالي
renderOrders(filterOrders());

}

// =====================
// الفلتر
// =====================

function filterOrders() {
if (!currentFilter) return orders;

if (currentFilter === "returns") {

return orders.filter(o =>

o.inventoryReturns.length > 0

);

}

return orders.filter(o => o.status === currentFilter);
}

// =====================
// عرض الطلبات
// =====================

function renderOrders(list){

let html = "";

list.forEach(o=>{

const delivery = Number(o.delivery_price || 0);
const total = Number(o.total_price || 0);
const net = total - delivery;

const hasPartialReturn =
o.inventoryReturns.some(r=>
r.type === "partial_return"
);

let orderItems = o.order_items || [];

let products = orderItems.map(item=>{

return `

<div class="product-box">

<div class="product-info">

<b>
🛍 ${item.product_variants?.products?.name || "-"}
</b>

<div>
🎨 اللون:
${item.product_variants?.color || "-"}
</div>

<div>
📏 المقاس:
${item.product_variants?.size || "-"}
</div>

<div>
🔢 الكمية:
${item.quantity}
</div>

</div>

<img
src="${item.product_variants?.image || "default.png"}"
class="variant-img">

</div>

`;

}).join("");

html += `

<tr>

<td class="order-number">

<div class="order-select-box">

<input
type="checkbox"
class="account-check"
data-id="${o.id}">

<span
class="order-id copy-code"
data-code="${o.delivery_code || o.id}"
title="اضغط للنسخ">

${o.delivery_code || "#" + o.id}

</span>

${
o.inventoryReturns.length
?
`
<span class="return-order-icon">
<i class="fa-solid fa-arrow-right-arrow-left"></i>
</span>
`
:
""
}

</div>

</td>

<td>${o.customer_name || "-"}</td>

<td>${o.phone || "-"}</td>

<td>${o.governorate || "-"}</td>

<td class="products-cell">

${products}

</td>

<td>

${total.toLocaleString()} د.ع

<br>

<small>

الصافي :
${net.toLocaleString()} د.ع

</small>

</td>

<td>

${
o.inventoryReturns.length
?
`
<span class="badge return">

${hasPartialReturn ? "راجع جزئي" : "راجع كامل"}

</span>
`
:
"-"
}

</td>

<td>

<span class="badge ${o.status}">

${statusName(o.status)}

</span>

</td>

<td>

<button
class="finance-btn"
onclick="finishFinance('${o.id}')"
title="استلام الحساب">

<i class="fa-solid fa-money-bill-transfer"></i>

</button>

</td>

<td>

<button
class="view-btn"
onclick="openAccount('${o.id}')"
title="عرض التفاصيل">

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
let partialReturns = orders.filter(o =>

o.inventoryReturns.length > 0

);
let refundTotal = partialReturns.reduce((sum, o) => {
return sum + Number(o.refund_amount || 0);
}, 0);

// 🔴 الصافي
let netTotal =
grossTotal - refundTotal;


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
orders.filter(o =>

o.inventoryReturns.length > 0

).length;
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
async function restoreStock(order) {

  for (const item of (order.order_items || [])) {

    let qty = 0;

    if (order.status === "cancelled") {

      qty = Number(item.quantity || 0);

} else if (order.inventoryReturns.length) {

    const row = order.inventoryReturns.find(r =>

        r.variant_id === item.variant_id

    );

    qty = Number(row?.quantity || 0);

}

    if (qty <= 0) continue;

    // جلب الكمية الحالية
    const { data: variant } = await supabase
      .from("product_variants")
      .select("stock_quantity")
      .eq("id", item.variant_id)
      .single();

    const current = Number(variant.stock_quantity || 0);

    // تحديث المخزون
    await supabase
      .from("product_variants")
      .update({
        stock_quantity: current + qty
      })
      .eq("id", item.variant_id);

    // حركة مخزون
    await supabase
      .from("stock_movements")
      .insert({
        variant_id: item.variant_id,
        type: "return",
        quantity: qty,
        note: `رجوع من الطلب ${order.delivery_code}`
      });

  }

}
// =====================
// استلام الأموال
// =====================

window.finishFinance = async function(id) {

  const order = orders.find(o => o.id === id);

  if (!order) return;
// استلام الجزء المكتمل فقط
await supabase
.from("orders")
.update({
    finance_done: true
})
.eq("id", id);

// تعليم الرواجع أنها لم تستلم بعد
await supabase
.from("orders")
.update({
    finance_done: true
})
.eq("id", id);

await loadOrders();

}

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


loadOrders();