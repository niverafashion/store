import {supabase} from "./supabase.js";


// =====================
// العناصر
// =====================

let currentFilter = "new";
const table =
document.getElementById("ordersTable");


const search =
document.getElementById("search");


const modal =
document.getElementById("modal");


const details =
document.getElementById("details");


const changeStatus =
document.getElementById("changeStatus");


const saveStatus =
document.getElementById("saveStatus");


let orders=[];

let currentOrder=null;
let scanner=null;
let scannedCode="";


async function finishStatusUpdate(message){

alert(message);

resetChecks();

await loadOrders();

}

// =====================
// تصفير التحديد
// =====================

function resetChecks(){

document
.querySelectorAll(".order-check")
.forEach(x=>{

x.checked=false;

});


let all =
document.getElementById("selectAll");


if(all){

all.checked=false;

}


}
// =====================
// سجل النشاط
// =====================

async function addActivity(action,tableName,recordId){


await supabase

.from("activity_logs")

.insert({

action:action,

table_name:tableName,

record_id:recordId

});


}

// =====================
// تحميل الطلبات
// =====================


async function loadOrders(){

    // =====================
    // تحميل الطلبات
    // =====================

    const { data, error } = await supabase

    .from("orders")

    .select(`

        id,

        customer_id,

        customer_name,

        parent_order_id,

        order_type,

        finance_done,

        phone,

        governorate,

        address,

        nearest_point,

        delivery_price,

        total_price,

        status,

        has_return,

        has_partial_refund,

        refund_amount,

        completed_at,

        cancelled_reason,

        delivery_code,

        created_at,

        order_items(

            id,

            order_id,

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

    .order("created_at",{

        ascending:false

    });


    if(error){

        console.log(error);

        return;

    }



    // =====================
    // الطلبات التي تمت إعادة توصيلها
    // =====================

    const redeliveryParents = data

    .filter(o=>

        o.order_type==="re_delivery"

        &&

        o.parent_order_id

    )

    .map(o=>o.parent_order_id);



    // =====================
    // تحميل جميع الرواجع
    // =====================

    const {

        data:inventoryReturns,

        error:returnError

    } = await supabase

    .from("inventory_returns")

    .select("*");


    if(returnError){

        console.log(returnError);

        return;

    }



    // =====================
    // تجميع الرواجع حسب الطلب
    // =====================

    const returnsByOrder = {};

    inventoryReturns?.forEach(r=>{

        if(!returnsByOrder[r.order_id]){

            returnsByOrder[r.order_id]=[];

        }

        returnsByOrder[r.order_id].push(r);

    });

    // =====================
    // تجهيز بيانات كل طلب
    // =====================

    data.forEach(order => {
    order.inventoryReturns = returnsByOrder[order.id] || [];

    // القطع الراجعة التي لم تُستهلك بإعادة التوصيل
order.waitingReturns = order.inventoryReturns.filter(r =>
    Number(r.quantity || 0) > 0 &&
    r.status === "waiting" &&
    r.accounts_received === false
);

    order.hasWaitingReturns = order.waitingReturns.length > 0;

    order.isPartialReturn = order.waitingReturns.some(r =>
        r.type === "partial_return"
    );

    order.hasCancelledReturn = order.waitingReturns.some(r =>
        r.type === "cancelled"
    );

    // نبحث في جميع السجلات، حتى القطع المستخدمة سابقاً
    order.hasRedeliveryReturn = order.inventoryReturns.some(r =>
        r.status === "used_for_redelivery"
    );

    order.showReturnsOnly =
        order.finance_done === true && order.hasWaitingReturns;
});


    // =====================
    // فلترة الطلبات
    // =====================

    orders = data.filter(order=>{
// إخفاء الطلب الأصلي من قوائم الإدارة
// إذا استُخدمت كل قطعه في إعادة التوصيل
const hasActiveReturns = order.inventoryReturns?.some(r =>
    r.status === "waiting" &&
    Number(r.quantity || 0) > 0
);

const hasUsedReturns = order.inventoryReturns?.some(r =>
    r.status === "used_for_redelivery"
);

if (hasUsedReturns && !hasActiveReturns) {
    return false;
}
        if(

            order.finance_done === true

            &&

            !order.hasWaitingReturns

        ){

            return false;

        }



        // إخفاء الطلب الأصلي
        // إذا صار إعادة توصيل
        // وما بقت بيه قطع

        if(

            redeliveryParents.includes(order.id)

            &&

            order.order_type !== "re_delivery"

        ){

            const hasRemainingItems =

            order.order_items?.some(item=>{

                return Number(item.quantity || 0) > 0;

            });



            if(!hasRemainingItems){

                return false;

            }

        }



        return true;

    });

    // =====================
    // تجهيز حالات إضافية
    // =====================

    orders.forEach(order=>{

        // يظهر في كارت الراجع الجزئي
        // فقط إذا يوجد راجع جزئي غير مستلم

        order.isPartialReturn =

        order.waitingReturns.some(r=>

            r.type === "partial_return"

        );


        // يظهر في المرفوض
        // فقط إذا يوجد راجع مرفوض غير مستلم

        order.isCancelledReturn =

        order.waitingReturns.some(r=>

            r.type === "cancelled"

        );



        // إذا الحساب مستلم
        // ويوجد راجع
        // نخليه ظاهر بالرواجع فقط

        order.showReturnsOnly =

        order.finance_done === true

        &&

        order.hasWaitingReturns;

    });



    console.log(

        "طلبات الادارة:",

        orders

    );



    // =====================
    // العرض حسب الفلتر الحالي
    // =====================

    let result = [];



    if(currentFilter === "partial_return"){

        result =

        orders.filter(o=>

            o.isPartialReturn === true

        );

    }

else if (currentFilter === "cancelled") {

    result = orders.filter(o =>
        o.isCancelledReturn === true
    );

}

    else{

        result =

        orders.filter(o=>{

            // إذا الحساب مستلم
            // ويوجد راجع
            // لا يظهر بالمكتمل

            if(

                currentFilter === "completed"

                &&

                o.showReturnsOnly

            ){

                return false;

            }

            return o.status === currentFilter;

        });

    }



    renderOrders(result);

console.log("result", result);

    updateStatusCards();

    updateBulkButton();

    updateBulkDelete();
}


function updateBulkButton(){

const btn =
document.getElementById("bulkUpdate");


if(!btn)
return;


// تحديث جماعي يظهر فقط:
// مجهز
// قيد التوصيل
// مؤجل

if(
currentFilter === "prepared" ||
currentFilter === "delivery" ||
currentFilter === "postponed"
){

btn.style.display="block";

}

else{

btn.style.display="none";

}



// تحديد الكل

const selectAll =
document.getElementById("selectAll");


if(selectAll){

let parent =
selectAll.parentElement;


// يظهر فقط للحالات اللي تسمح بالتحديد

if(
currentFilter === "new" ||
currentFilter === "prepared" ||
currentFilter === "delivery" ||
currentFilter === "postponed"
){

parent.style.display="flex";

}

else{

parent.style.display="none";

}

}
}



function updateBulkDelete(){

const btn =
document.getElementById("bulkDelete");


if(!btn)
return;



// حذف جماعي يظهر فقط:
// جديد
// مجهز

if(
currentFilter === "new" ||
currentFilter === "prepared"
){

btn.style.display="block";

}

else{

btn.style.display="none";

}



}


// =====================
// عرض الطلبات
// =====================


function renderOrders(list){


let html="";



list.forEach(o=>{


let item=o.order_items?.[0];


let orderItems = 
currentFilter === "partial_return"
?
o.order_items.filter(i=>i.quantity === 0)
:
o.order_items;


let products = orderItems?.map(item=>{
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
📏 الحجم:
${item.product_variants?.size || "-"}
</div>


<div>
🔢 الكمية:
${
currentFilter === "partial_return"
?
(item.returned_quantity || 0)
:
(item.quantity === 0 ? "مسترجعة" : item.quantity)
}</div>


</div>



<img

src="${item.product_variants?.image || 'default.png'}"

class="variant-img"


>


</div>


`;

}).join("");
html += `


<tr>


<td class="order-number">


<div class="order-select-box">


${
o.isCancelledReturn === true?
""
:
`
<input 
type="checkbox"
class="order-check"
data-id="${o.id}">
`
}

<span 
class="order-id copy-code"
data-code="${o.delivery_code || o.id}"
title="اضغط للنسخ">

${o.delivery_code || "#" + o.id}

</span>
${o.has_return ? `

<span class="return-order-icon">

<i class="fa-solid fa-arrow-right-arrow-left"></i>

</span>

` : ""}

</div>


</td>

<td>${o.customer_name}</td>


<td>${o.phone}</td>


<td class="governorate-cell">

    <div class="order-governorate">
        ${o.governorate || "-"}
    </div>

    <div class="order-address">
        <i class="fa-solid fa-location-dot"></i>
        ${o.address || "-"}
    </div>

    <div class="order-nearest">
        <i class="fa-solid fa-map-pin"></i>
        ${o.nearest_point || "-"}
    </div>

</td>

<td class="products-cell">

${products}

</td>

<td>${o.total_price} د.ع</td>



<td>

<span class="badge ${
currentFilter === "partial_return"
? "partial_return"
: o.status
}">

${
currentFilter === "partial_return"
? "راجع جزئي"
: statusName(o.status)
}

</span>

</td>




<td>


${
(o.status !== "delivery" &&
 o.status !== "completed" &&
 o.status !== "cancelled" &&
 o.status !== "postponed")
?
`

<button class="action-btn edit-btn"

onclick="editOrder('${o.id}')">

<i class="fa-solid fa-pen"></i>

</button>

`
:
""
}

${
(
o.status==="cancelled"
||
o.isPartialReturn===true
)
?
`

<button 
class="action-btn redelivery-btn"
onclick="openRedelivery('${o.id}')"
title="إعادة توصيل">

<i class="fa-solid fa-truck-fast"></i>

</button>

`
:
""
}

${
(o.status !== "prepared" &&
 currentFilter !== "new" &&
 o.status !== "completed" &&
 o.status !== "cancelled")
?
`

<button class="action-btn view-btn"

onclick="openOrder('${o.id}')">

<i class="fa-solid fa-eye"></i>

</button>

`
:
""
}


${
(o.status !== "delivery" &&
 o.status !== "completed" &&
 o.status !== "cancelled" &&
 o.status !== "postponed")
?
`

<button class="action-btn delete-btn"

onclick="deleteOrder('${o.id}')">

<i class="fa-solid fa-trash"></i>

</button>

`
:
""
}


${
(
o.status === "new" ||
o.status === "prepared" ||
o.status === "delivery" ||
o.status === "postponed"
)
?
`

<button class="action-btn update-btn"

data-id="${o.id}">

<i class="fa-solid fa-rotate"></i>

</button>

`
:
""
}



</td>


</tr>


`;



});




table.innerHTML=html;
document
.querySelectorAll(".copy-code")
.forEach(el=>{

el.onclick = async()=>{

let code = el.dataset.code;


if(code === "-")
return;


await navigator.clipboard.writeText(code);


alert("تم نسخ الكود ✅");


};


});
document
.querySelectorAll(".update-btn")
.forEach(btn=>{

btn.onclick=()=>{

updateOrderStatus(btn.dataset.id);

};

});
}






// ==========================
// SCROLL TOP BUTTON
// ==========================


const scrollBtn =
document.getElementById("scrollTop");



window.addEventListener("scroll",()=>{


if(window.scrollY > 300){


scrollBtn.innerHTML = `

<i class="fa-solid fa-arrow-up"></i>

`;



}else{


scrollBtn.innerHTML = `

<i class="fa-solid fa-arrow-down"></i>

`;


}


});





scrollBtn.onclick=()=>{


if(window.scrollY > 300){


window.scrollTo({

top:0,

behavior:"smooth"

});


}else{


window.scrollTo({

top:document.body.scrollHeight,

behavior:"smooth"

});


}


};

// تحديد الكل

document
.addEventListener("change",(e)=>{


if(e.target.id==="selectAll"){


document
.querySelectorAll(".order-check")
.forEach(box=>{


box.checked = e.target.checked;


});


}



});



// =====================
// تحديث جماعي
// =====================

document.getElementById("bulkUpdate").onclick = async () => {

    let selected = [];

    document.querySelectorAll(".order-check:checked").forEach(box => {

        let order = orders.find(o => o.id == box.dataset.id);

        if(order) selected.push(order);

    });

    if(selected.length === 0){

        alert("حدد طلبات أولاً");
        return;

    }

    let statuses = [...new Set(selected.map(o => o.status))];

    // يجب أن تكون كل الطلبات من نفس الحالة
    if(statuses.length !== 1){

        alert("حدد طلبات من نفس الحالة حتى نتمكن من تحديثها معاً");
        return;

    }

    let currentStatus = statuses[0];

    // جديد ← مجهز
    if(currentStatus === "new"){

        alert("الطلبات الجديدة تحتاج إلى إضافة كود الشحن لكل طلب عن طريق الماسح");
        return;

    }

    // مجهز ← قيد التوصيل
    if(currentStatus === "prepared"){

        let ok = confirm(
            `تحويل ${selected.length} طلب إلى قيد التوصيل؟`
        );

        if(!ok) return;

        let ids = selected.map(o => o.id);

        const {error} = await supabase
            .from("orders")
            .update({status:"delivery"})
            .in("id", ids);

        if(error){

            alert(error.message);
            return;

        }

        for(let order of selected){

            await supabase
                .from("order_status_history")
                .insert({
                    order_id:order.id,
                    status:"delivery"
                });

            await addActivity(
                "تحويل الطلب إلى قيد التوصيل",
                "orders",
                order.id
            );

        }

        await finishStatusUpdate("تم تحويل الطلبات إلى قيد التوصيل 🚚");
        return;

    }

    // قيد التوصيل أو مؤجل ← استخدام نفس النافذة
    if(currentStatus === "delivery" || currentStatus === "postponed"){

        selectedBulkOrders = selected;

        openStatusModal(null,
            currentStatus === "delivery"
                ? ["completed", "postponed", "cancelled"]
                : ["completed", "cancelled"]
        );

        return;

    }

    alert("لا يمكن تحديث هذه الحالات جماعياً");

};





// =====================
// الحذف الجماعي
// =====================

document.getElementById("bulkDelete").onclick = function() {

    const ids = [];

    document.querySelectorAll(".order-check:checked").forEach(box => {
        ids.push(box.dataset.id);
    });

    if (ids.length === 0) {
        alert("حدد طلبات أولاً");
        return;
    }

    // السماح فقط بحذف الطلبات الجديدة والمجهزة
    const selectedOrders = ids
        .map(id => orders.find(o => String(o.id) === String(id)))
        .filter(Boolean);

    const invalidOrders = selectedOrders.filter(
        order => !["new", "prepared"].includes(order.status)
    );

    if (invalidOrders.length > 0) {
        alert("توجد طلبات لا يمكن حذفها. الحذف مسموح فقط للطلبات الجديدة والمجهزة.");
        return;
    }

    openDeleteModal(ids, "bulk");
};
// =====================
// تعديل الطلب
// =====================


window.editOrder=function(id){


window.location.href =

`edit-orders.html?id=${id}`;


}


async function executeDeleteOrder(id){
// التحقق من حالة الطلب قبل الحذف
const { data: order, error: orderCheckError } = await supabase
.from("orders")
.select("id,status")
.eq("id", id)
.single();

if(orderCheckError || !order){
    alert("تعذر العثور على الطلب");
    return;
}

if(!["new", "prepared"].includes(order.status)){
    alert("لا يمكن حذف الطلب إلا إذا كانت حالته جديد أو مجهز");
    return;
}

// حذف returns المرتبطة

let {data:returns,error:returnsCheckError}=await supabase
.from("returns")
.select("id,order_id")
.eq("order_id", id);


console.log("returns قبل الحذف:", returns);



if(returnsCheckError){

alert(returnsCheckError.message);

return;

}



if(returns?.length){

const {error}=await supabase
.from("returns")
.delete()
.eq("order_id", id);


console.log("حذف returns:",error);


if(error){

alert(error.message);

return;

}

}

// جلب قطع الطلب قبل الحذف

const {data:items}=await supabase

.from("order_items")

.select("variant_id,quantity")

.eq(
"order_id",
id
);


// إرجاع المخزون وتسجيل حركة الإرجاع

for (let item of items || []) {

    if (!item.variant_id || !item.quantity || item.quantity <= 0) {
        continue;
    }

    const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("stock_quantity")
        .eq("id", item.variant_id)
        .single();

    if (variantError || !variant) {
        alert("تعذر جلب بيانات أحد المنتجات: " + (variantError?.message || ""));
        return;
    }

    const newStock = (variant.stock_quantity || 0) + item.quantity;

    const { error: stockError } = await supabase
        .from("product_variants")
        .update({ stock_quantity: newStock })
        .eq("id", item.variant_id);

    if (stockError) {
        alert("فشل تحديث المخزون: " + stockError.message);
        return;
    }

    const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
            variant_id: item.variant_id,
            type: "IN",
            quantity: item.quantity,
            note: "إرجاع مخزون بسبب حذف الطلب رقم: " + id
        });

    if (movementError) {
        alert("تم تحديث المخزون لكن فشل تسجيل الحركة: " + movementError.message);
        return;
    }
}

// حذف order_items

const {error:itemError}=await supabase
.from("order_items")
.delete()
.eq("order_id",id);


console.log("حذف items:",itemError);



if(itemError){

alert(itemError.message);

return;

}




// حذف history

const {error:historyError}=await supabase
.from("order_status_history")
.delete()
.eq("order_id",id);


console.log("حذف history:",historyError);




// حذف النشاط

await supabase
.from("activity_logs")
.delete()
.eq("record_id",id);




// الآن حذف الطلب

const {error:orderError}=await supabase
.from("orders")
.delete()
.eq("id",id);



console.log("حذف الطلب:",orderError);



if(orderError){

alert(orderError.message);

return;

}



return true;

}
// ===============================
// نافذة تأكيد الحذف
// ===============================

let pendingDeleteIds = [];
let deleteMode = "single";

function openDeleteModal(ids, mode = "single") {
    pendingDeleteIds = ids;
    deleteMode = mode;

    const modal = document.getElementById("deleteConfirmModal");
    const title = document.getElementById("deleteModalTitle");
    const description = document.getElementById("deleteModalDescription");

    title.textContent = mode === "bulk"
        ? "تأكيد حذف الطلبات"
        : "تأكيد حذف الطلب";

    description.textContent = mode === "bulk"
        ? `هل أنت متأكد من حذف ${ids.length} طلب؟`
        : "هل أنت متأكد من حذف هذا الطلب؟";

    document.getElementById("confirmDeleteBtn").disabled = false;
    modal.classList.add("show");
}

// استدعاء الحذف الفردي من زر الجدول
window.deleteOrder = async function(id) {
    openDeleteModal([id], "single");
};

// إغلاق النافذة
function closeDeleteModal() {
    document.getElementById("deleteConfirmModal").classList.remove("show");
    pendingDeleteIds = [];
}

document.getElementById("closeDeleteModal").onclick = closeDeleteModal;
document.getElementById("cancelDeleteBtn").onclick = closeDeleteModal;

// تأكيد الحذف
document.getElementById("confirmDeleteBtn").onclick = async function() {
    if (!pendingDeleteIds.length) return;

    const ids = [...pendingDeleteIds];
    const button = this;

    button.disabled = true;

    try {
        let successCount = 0;

        for (const id of ids) {
            const result = await executeDeleteOrder(id);

            if (result === true) {
                successCount++;
            } else {
                break;
            }
        }

        closeDeleteModal();

        if (successCount > 0) {
            alert(`تم حذف ${successCount} طلب بنجاح`);
        }

        await loadOrders();

    } catch (error) {
        alert("حدث خطأ أثناء الحذف: " + error.message);
    } finally {
        button.disabled = false;
    }
};
async function confirmDeliveryCode(code,callback){


let ok = confirm(

`هل تريد إضافة هذا الكود؟\n\n${code}`

);


if(!ok){

closeScanner();

return;

}



// فحص التكرار

const {data,error}=await supabase

.from("orders")

.select(
"id,status,delivery_code,finance_done"
)

.eq(
"delivery_code",
code
);


if(error){

alert(error.message);

closeScanner();

return;

}



let duplicated = data?.find(o=>{

return (

o.finance_done === true

);

});


if(duplicated){


alert(

`⚠️ هذا الكود مرتبط بطلب مدفوع مسبقاً #${duplicated.id}`

);

closeScanner();
return;


}


// إضافة الكود

callback(code);


// إغلاق السكنر والكامرة

closeScanner();



}

async function closeScanner(){


if(scanner){


try{


await scanner.stop();


await scanner.clear();


}catch(e){

console.log(e);

}


scanner=null;


}



document
.getElementById("scanModal")
.style.display="none";


}
async function openScanner(callback){

if(scanner){

await closeScanner();

}
document
.getElementById("scanModal")
.style.display="flex";


document
.getElementById("manualCode")
.value="";



scanner = new Html5Qrcode("reader");



scanner.start(

{
facingMode:"environment"
},

{
fps:10,
qrbox:250
},


(code)=>{


console.log("scan:",code);


confirmDeliveryCode(code,callback);


}



)

.catch(err=>{

console.log(err);

});





// الإدخال اليدوي

document
.getElementById("addManualCode")
.onclick=()=>{


let code =
document
.getElementById("manualCode")
.value
.trim();



if(!code){

alert("اكتب الكود");

return;

}



confirmDeliveryCode(code,callback);



}


}
document
.getElementById("closeScanner")
.onclick = ()=>{


closeScanner();


};
async function checkReturnBeforeComplete(order){


const {data:returnItems,error}=await supabase

.from("returns")

.select("quantity")

.eq(
"order_id",
order.id
);



if(error){

alert(error.message);

return false;

}



let returnedQty = 0;


returnItems?.forEach(r=>{

returnedQty += Number(r.quantity || 0);

});




// اذا عنده استرجاع لكن ما رجع ولا قطعة

if(order.has_return && returnedQty < 1){


alert(
"⚠️ هذا الطلب يحتوي على استرجاع\n\nيجب إرجاع قطعة واحدة على الأقل للمخزن قبل الإكمال"
);


return false;


}



return true;


}
window.cancelReturn = async function(orderId){


let ok = confirm(
"هل تريد إلغاء الاسترجاع لهذا الطلب؟\n\nسيتم السماح بإكمال الطلب."
);


if(!ok)
return;



// حذف سجلات الاسترجاع

const {error:returnError}=await supabase

.from("returns")

.delete()

.eq(
"order_id",
orderId
);



if(returnError){

alert(returnError.message);

return;

}



// إلغاء حالة الاسترجاع من الطلب

const {error}=await supabase

.from("orders")

.update({

has_return:false,

has_partial_refund:false,

refund_amount:0,

finance_done:false

})

.eq(
"id",
orderId
);



if(error){

alert(error.message);

return;

}



await addActivity(

"إلغاء استرجاع طلب",

"orders",

orderId

);



alert(
"تم إلغاء الاسترجاع ✅"
);



modal.style.display="none";


await loadOrders();


}
// ===============================
// نافذة تحديث حالة الطلب
// ===============================

let selectedStatusOrderId = null;
let selectedBulkOrders = null;

function openStatusModal(id, allowedStatuses) {

    selectedStatusOrderId = id;

    const modal = document.getElementById("statusModal");
    const reasonBox = document.getElementById("cancelReasonBox");
    const reasonInput = document.getElementById("cancelReason");
    const confirmBtn = document.getElementById("confirmStatusUpdate");

    document.querySelectorAll('input[name="newOrderStatus"]').forEach(input => {

        input.checked = false;

        const label = input.closest(".status-option");

        label.style.display = allowedStatuses.includes(input.value)
            ? "flex"
            : "none";

    });

    reasonBox.style.display = "none";
    reasonInput.value = "";
    confirmBtn.disabled = false;

    modal.classList.add("show");
}


// إغلاق النافذة

document.getElementById("closeStatusModal").onclick = function() {

    document.getElementById("statusModal").classList.remove("show");

    selectedStatusOrderId = null;

};


// إظهار سبب الرفض عند اختيار مرفوض

document.querySelectorAll('input[name="newOrderStatus"]').forEach(input => {

    input.addEventListener("change", function() {

        document.getElementById("cancelReasonBox").style.display =
            this.value === "cancelled" ? "block" : "none";

    });

});


// ===============================
// تحديث حالة الطلب
// ===============================

window.updateOrderStatus = async function(id){

    let order = orders.find(o => o.id == id);

    if(!order){

        alert("الطلب غير موجود");
        return;

    }


    // الطلب الجديد: الماسح

    if(order.status === "new"){

        openScanner(async(code)=>{

            const {error} = await supabase

            .from("orders")

            .update({

                delivery_code:code,

                status:"prepared"

            })

            .eq("id",id);


            if(error){

                alert(error.message);
                return;

            }


            await supabase

            .from("order_status_history")

            .insert({

                order_id:id,

                status:"prepared"

            });


            await addActivity(

                `إضافة كود شحن ${code}`,

                "orders",

                id

            );


            await finishStatusUpdate(
                "تم تجهيز الطلب ✅"
            );

        });

        return;

    }


    // المجهز: انتقال مباشر إلى قيد التوصيل

    if(order.status === "prepared"){

        const {error} = await supabase

        .from("orders")

        .update({

            status:"delivery"

        })

        .eq("id",id);


        if(error){

            alert(error.message);
            return;

        }


        await supabase

        .from("order_status_history")

        .insert({

            order_id:id,

            status:"delivery"

        });


        await addActivity(

            "تحويل الطلب إلى قيد التوصيل",

            "orders",

            id

        );


        await finishStatusUpdate(
            "تم تحويل الطلب إلى قيد التوصيل 🚚"
        );

        return;

    }


    // قيد التوصيل: الخيارات الثلاثة

    if(order.status === "delivery"){

        openStatusModal(id, [
            "completed",
            "postponed",
            "cancelled"
        ]);

        return;

    }


    // المؤجل: مكتمل أو مرفوض

    if(order.status === "postponed"){

        openStatusModal(id, [
            "completed",
            "cancelled"
        ]);

        return;

    }

};


// ===============================
// زر تأكيد تحديث الحالة
// ===============================

document.getElementById("confirmStatusUpdate").onclick = async function(){

    const id = selectedStatusOrderId;

    if(!id) return;

    const order = orders.find(o => o.id == id);

    if(!order){

        alert("الطلب غير موجود");
        return;

    }


    const selected = document.querySelector(
        'input[name="newOrderStatus"]:checked'
    );


    if(!selected){

        alert("يرجى اختيار حالة الطلب");
        return;

    }


    const nextStatus = selected.value;


    // التأكد من أن الحالة مناسبة للطلب

    if(order.status === "delivery" &&
       !["completed","postponed","cancelled"].includes(nextStatus)){

        alert("اختيار غير صحيح");
        return;

    }


    if(order.status === "postponed" &&
       !["completed","cancelled"].includes(nextStatus)){

        alert("اختيار غير صحيح");
        return;

    }


    // التحقق من الرواجع قبل الإكمال

    if(nextStatus === "completed"){

        let canComplete = await checkReturnBeforeComplete(order);

        if(!canComplete) return;

    }


    let reason = "";


    if(nextStatus === "cancelled"){

        reason = document.getElementById("cancelReason").value.trim();

        let ok = confirm(
            "⚠️ سيتم رفض الطلب وتسجيل القطع كرواجع بانتظار الاستلام.\n\nهل أنت متأكد؟"
        );

        if(!ok) return;

    }


    this.disabled = true;

    try {

        // تسجيل الرواجع عند رفض الطلب

        if(nextStatus === "cancelled"){

            for(let item of order.order_items){

                if(Number(item.quantity) <= 0) continue;


                const {error:returnError} = await supabase

                .from("inventory_returns")

                .insert({

                    order_id:order.id,

                    order_item_id:item.id,

                    variant_id:item.variant_id,

                    quantity:Number(item.quantity),

                    price:Number(item.price),

                    type:"cancelled",

                    status:"waiting",

                    accounts_received:false,

                    reason:
                        order.order_type === "re_delivery"
                        ? "رفض إعادة توصيل"
                        : (reason || "رفض طلب")

                });


                if(returnError){

                    throw returnError;

                }

            }

        }


        // تحديث الطلب

        const {error} = await supabase

        .from("orders")

        .update({

            status:nextStatus,

            completed_at:
                nextStatus === "completed"
                ? new Date()
                : null,

            cancelled_reason:
                nextStatus === "cancelled"
                ? reason || "بدون سبب"
                : null,

            finance_done:false

        })

        .eq("id",id);


        if(error){

            throw error;

        }


        // سجل الحالة

        const {error:historyError} = await supabase

        .from("order_status_history")

        .insert({

            order_id:id,

            status:nextStatus

        });


        if(historyError){

            console.error("خطأ سجل الحالة:", historyError);

        }


        // تحديث عداد الزبون

        if(nextStatus === "completed"){

            const {error:counterError} = await supabase

            .rpc(
                "increment_completed_orders",
                {
                    customer_id_input:order.customer_id
                }
            );

            if(counterError) console.error(counterError);

        }


        if(nextStatus === "cancelled"){

            const {error:counterError} = await supabase

            .rpc(
                "increment_cancelled_orders",
                {
                    customer_id_input:order.customer_id
                }
            );

            if(counterError) console.error(counterError);

        }


        // تسجيل النشاط

        await addActivity(

            "تغيير حالة طلب",

            "orders",

            id

        );


        // إغلاق النافذة

        document.getElementById("statusModal").classList.remove("show");

        selectedStatusOrderId = null;


        await finishStatusUpdate(
            "تم تحديث الحالة بنجاح ✅"
        );


    } catch(error) {

        alert("حدث خطأ أثناء تحديث الطلب: " + error.message);

    } finally {

        this.disabled = false;

    }

};


// =====================
// اسم الحالة
// =====================


function statusName(status){

const names={

new:"جديد",

prepared:"مجهز",

delivery:"قيد التوصيل",

completed:"مكتمل",

postponed:"مؤجل",

cancelled:"مرفوض"

};


return names[status] || status;

}









// =====================
// كروت الحالات
// =====================


function updateStatusCards(){

    const states = [

        { status:"new", id:"newCount" },

        { status:"prepared", id:"preparedCount" },

        { status:"delivery", id:"deliveryCount" },

        { status:"completed", id:"completedCount" },

        { status:"postponed", id:"postponedCount" },

        { status:"cancelled", id:"cancelledCount" },

        { status:"partial_return", id:"partialReturnCount" }

    ];


    states.forEach(item=>{

        let count = 0;


        switch(item.status){

            case "partial_return":

                count = orders.filter(o=>

                    o.waitingReturns?.some(r=>

                        r.type==="partial_return"

                        &&

                        r.accounts_received===false

                    )

                ).length;

            break;


case "cancelled":

    count = orders.filter(o =>
        o.isCancelledReturn === true
    ).length;

break;

            case "completed":

                count = orders.filter(o=>

                    o.status==="completed"

                    &&

                    !o.showReturnsOnly

                ).length;

            break;


            default:

                count = orders.filter(o=>

                    o.status===item.status

                ).length;

        }


        const el = document.getElementById(item.id);

        if(el){

            el.innerText = count;

        }

    });

}







// =====================
// فلترة الكروت
// =====================

document
.querySelectorAll(".status-card")
.forEach(btn=>{

    btn.onclick = ()=>{

        document
        .querySelectorAll(".status-card")
        .forEach(b=>{
            b.classList.remove("active");
        });

        btn.classList.add("active");

        currentFilter = btn.dataset.status;

        search.value = "";

        let filtered = [];

        if(currentFilter === "partial_return"){

            filtered = orders.filter(o =>
                o.isPartialReturn === true
            );

        }
        else if(currentFilter === "cancelled"){

            filtered = orders.filter(o =>
                o.isCancelledReturn === true
            );

        }
        else{

            filtered = orders.filter(o =>
                o.status === currentFilter
            );

            if(currentFilter === "completed"){

                filtered = filtered.filter(o =>
                    !o.showReturnsOnly
                );

            }

        }

        renderOrders(filtered);

        updateBulkButton();
        updateBulkDelete();

    };

});


// =====================
// البحث مع احترام الحالة المحددة
// =====================

search.oninput = ()=>{

    let value = search.value
    .trim()
    .toLowerCase();

    let filtered = orders.filter(o=>{

        let matchesStatus = false;

        if(currentFilter === "partial_return"){

            matchesStatus = o.isPartialReturn === true;

        }
        else if(currentFilter === "cancelled"){

            matchesStatus = o.isCancelledReturn === true;

        }
        else{

            matchesStatus = o.status === currentFilter;

            if(currentFilter === "completed" && o.showReturnsOnly){
                matchesStatus = false;
            }

        }

        let matchesSearch =

            String(o.id).includes(value) ||

            (o.delivery_code || "").toLowerCase().includes(value) ||

            (o.customer_name || "").toLowerCase().includes(value) ||

            (o.phone || "").includes(value) ||

            (o.governorate || "").toLowerCase().includes(value);

        return matchesStatus && matchesSearch;

    });

    renderOrders(filtered);

};

// =====================
// المودال
// =====================


window.openOrder=function(id){


currentOrder=

orders.find(
o=>o.id==id
);



let o=currentOrder;



details.innerHTML = `

<div class="return-modal-header">


<div class="order-number-box">


<span 
class="order-id copy-code"
title="اضغط للنسخ"
data-code="${o.delivery_code || '-'}">

${o.delivery_code || "-"}

</span>


${o.has_return && 
(o.status==="delivery" || o.status==="completed") 
? `

<span class="return-order-icon" title="طلب يحتوي على استرجاع">

<i class="fa-solid fa-arrow-right-arrow-left"></i>

</span>

`
:""}


</div>


</div>

<div class="customer-box">


<div>
👤
<b>${o.customer_name || "-"}</b>
</div>


<div>
📱
${o.phone || "-"}
</div>



<div>
📍
${o.governorate || "-"}
</div>



<div>
🏠
${o.address || "-"}
</div>



<div>
📌
${o.nearest_point || "-"}
</div>



</div>



<hr>



<h3 class="products-title">
المنتجات
</h3>



${o.order_items?.map(i=>`


<div class="return-product-card">


<div class="return-info">


<b>
🛍 ${i.product_variants.products.name}
</b>


<p>
🎨 اللون:
${i.product_variants.color}
</p>


<p>
📏 الحجم:
${i.product_variants.size}
</p>


<p>
🔢 الكمية:
${i.quantity}
</p>


<button 
onclick="returnItem('${i.id}')"
class="return-btn"
title="استرجاع قطعة">

<i class="fa-solid fa-rotate-left"></i>

</button>


${
o.has_return
?
`

<button

onclick="cancelReturn('${o.id}')"

class="cancel-return-btn"

title="الغاء الاسترجاع">

<i class="fa-solid fa-ban"></i>

</button>

`
:
""

}


</div>




<img

src="${i.product_variants.image || 'default.png'}"

class="return-img"


>


</div>



`).join("")}




<h3 class="total-box">

💰 المجموع:
${o.total_price} د.ع

</h3>



`;



modal.style.display="flex";


}





// =====================
// ارجاع قطعة
// =====================


window.returnItem = async function(id){


if(!confirm("ارجاع قطعة واحدة للمخزن؟"))
return;



const {data:item,error}=await supabase

.from("order_items")

.select(`

id,

order_id,

variant_id,

quantity,

price,

returned_quantity,

product_variants(

stock_quantity

)

`)

.eq("id",id)

.single();



if(error){

alert(error.message);
return;

}



// اذا خلصت الكمية كلها
// فحص اذا القطعة رجعت بالكامل

let {data:alreadyReturned}=await supabase

.from("returns")

.select("quantity")

.eq(
"order_item_id",
item.id
);



let returnedBefore = 0;


alreadyReturned?.forEach(r=>{

returnedBefore += Number(r.quantity || 0);

});



if(returnedBefore >= item.quantity){


alert(
"⚠️ تم إرجاع هذه القطعة بالكامل مسبقاً"
);


return;


}



// كمية الاسترجاع وحدة فقط

let returnQty = 1;



// زيادة المخزون وحدة واحدة

await supabase

.from("inventory_returns")

.insert({

order_id:item.order_id,

order_item_id:item.id,

variant_id:item.variant_id,

quantity:returnQty,

price:item.price,   // ✅ مهم

type:"partial_return",

status:"waiting",

accounts_received:false,

reason:"استرجاع قطعة"

});





// حفظ سجل الرجوع

await supabase

.from("returns")

.insert({

order_id:item.order_id,

order_item_id:item.id,

variant_id:item.variant_id,

quantity:returnQty,

reason:"استرجاع قطعة"

});


// انقاص قطعة واحدة من الطلب

let updateResult;


if(item.quantity > 1){


updateResult = await supabase

.from("order_items")

.update({

quantity:item.quantity - 1,

returned_quantity:
(item.returned_quantity || 0)+1

})

.eq(
"id",
item.id
);


}
else{


updateResult = await supabase

.from("order_items")

.update({

quantity:0,

returned_quantity:
(item.returned_quantity || 0) + 1

})

.eq(
"id",
item.id
);


}

if(updateResult.error){

alert(updateResult.error.message);

return;

}




// تحديث مجموع الطلب

const {data:items}=await supabase

.from("order_items")

.select("price,quantity")

.eq(
"order_id",
item.order_id
);



let total=0;


items?.forEach(i=>{

total += Number(i.price) * Number(i.quantity);

});





await supabase

.from("orders")

.update({

total_price:total,

has_return:true,

finance_done:false

})

.eq(
"id",
item.order_id
);




await addActivity(

"ارجاع قطعة واحدة للمخزن",

"orders",

item.order_id

);



alert("تم ارجاع قطعة واحدة ✅");


modal.style.display="none";


await loadOrders();


}

close.onclick=()=>{


modal.style.display="none";


}
loadOrders();


// =====================
// إعادة التوصيل
// =====================


let redeliveryOrder = null;

let rdDeliveryPrice = 0;



const rdGovernorate =
document.getElementById("rdGovernorate");



// =====================
// فتح مودل إعادة التوصيل
// =====================


window.openRedelivery = async function(id){


redeliveryOrder =
orders.find(o=>o.id==id);



if(!redeliveryOrder){

alert("الطلب غير موجود");

return;

}




document.getElementById("rdName").value =
redeliveryOrder.customer_name || "";



document.getElementById("rdPhone").value =
redeliveryOrder.phone || "";



document.getElementById("rdAddress").value =
redeliveryOrder.address || "";



document.getElementById("rdNearest").value =
redeliveryOrder.nearest_point || "";




rdGovernorate.value =
redeliveryOrder.governorate || "";




document.getElementById("rdDelivery").value="";



document.getElementById("useReturnAmount").checked=false;

document.getElementById("useDiscount").checked=false;



document.getElementById("returnAmountBox")
.style.display="none";


document.getElementById("discountBox")
.style.display="none";



document.getElementById("returnAmount").value=5000;

document.getElementById("rdDiscount").value="";




rdDeliveryPrice=0;



calculateRedelivery();



document

.getElementById("redeliveryModal")

.style.display="flex";



}



// =====================
// تحميل المحافظات
// =====================


async function loadRedeliveryGovernorates(){



const {data,error}=await supabase

.from("governorates")

.select("*")

.order("name");



if(error){

console.log(error);

return;

}



rdGovernorate.innerHTML=`

<option value="">

اختر المحافظة

</option>

`;





data.forEach(g=>{


rdGovernorate.innerHTML += `


<option

value="${g.name}"

data-price="${g.delivery_price}">


${g.name}


</option>


`;


});


}



loadRedeliveryGovernorates();





// =====================
// التوصيل تلقائي
// =====================


rdGovernorate.onchange=()=>{


if(

document.getElementById("autoDelivery").checked

){



let price =

rdGovernorate

.options[rdGovernorate.selectedIndex]

.dataset.price || 0;



rdDeliveryPrice =
Number(price);



document.getElementById("rdDelivery").value =
rdDeliveryPrice;


}




calculateRedelivery();



}






// =====================
// تبديل تلقائي / يدوي
// =====================


document.getElementById("autoDelivery").onchange = () => {

    let box = document.getElementById("manualDeliveryBox");

    if(document.getElementById("autoDelivery").checked){

        box.style.display = "none";

        let price =
        rdGovernorate.options[
            rdGovernorate.selectedIndex
        ]?.dataset.price || 0;

        rdDeliveryPrice = Number(price);

        document.getElementById("rdDelivery").value =
        rdDeliveryPrice;

    }else{

        box.style.display = "block";

        rdDeliveryPrice =
        Number(
            document.getElementById("rdDelivery").value || 0
        );

    }

    calculateRedelivery();

}




document

.getElementById("rdDelivery")

.oninput=()=>{


rdDeliveryPrice =

Number(
document.getElementById("rdDelivery").value || 0
);



calculateRedelivery();



}







// =====================
// الاستقطاع
// =====================


document

.getElementById("useReturnAmount")

.onchange=()=>{


let box =
document.getElementById("returnAmountBox");



if(
document.getElementById("useReturnAmount").checked
){


box.style.display="block";


document.getElementById("returnAmount")
.value=5000;



}

else{


box.style.display="none";


document.getElementById("returnAmount")
.value="";



}



calculateRedelivery();



}







// =====================
// الخصم
// =====================


document

.getElementById("useDiscount")

.onchange=()=>{


let box =
document.getElementById("discountBox");



if(
document.getElementById("useDiscount").checked
){


box.style.display="block";


}

else{


box.style.display="none";


document.getElementById("rdDiscount")
.value="";


}



calculateRedelivery();



}







document

.getElementById("returnAmount")

.oninput =
calculateRedelivery;



document

.getElementById("rdDiscount")

.oninput =
calculateRedelivery;








// =====================
// الحساب
// =====================


function calculateRedelivery(){



if(!redeliveryOrder)
return;



let subtotal=0;




redeliveryOrder

.order_items

?.forEach(item=>{


let qty =
Number(item.quantity || 0);



let price =
Number(item.price || 0);



subtotal += qty * price;



});







let refund =

document.getElementById("useReturnAmount").checked

?

Number(
document.getElementById("returnAmount").value || 0
)

:
0;






let discount =


document.getElementById("useDiscount").checked

?

Number(
document.getElementById("rdDiscount").value || 0
)

:
0;






let final =
subtotal +
rdDeliveryPrice -
discount;


if(final <0)

final=0;



document.getElementById("rdSubtotal")
.innerText =
subtotal.toLocaleString();


document.getElementById("rdDeliveryShow")
.innerText =
rdDeliveryPrice.toLocaleString();

document.getElementById("rdRefundShow")
.innerText =
refund.toLocaleString();



document.getElementById("rdDiscountShow")
.innerText =
discount.toLocaleString();



document.getElementById("rdFinalTotal")
.innerText =
final.toLocaleString();



}








// =====================
// حفظ إعادة التوصيل
// =====================


document

.getElementById("saveRedelivery")

.onclick = async()=>{





// فحص الحقول


let fields=[


["rdName","ادخل الاسم"],

["rdPhone","ادخل الهاتف"],

["rdGovernorate","اختار المحافظة"],

["rdAddress","ادخل العنوان"],

["rdNearest","ادخل اقرب نقطة"]


];





for(let f of fields){


let el=document.getElementById(f[0]);


if(!el.value.trim()){


alert(f[1]);


el.focus();


return;


}


}







// =====================
// العميل
// =====================


let phone =

document.getElementById("rdPhone")

.value.trim();





let {data:customer}=await supabase

.from("customers")

.select("*")

.eq("phone",phone)

.maybeSingle();







if(!customer){



let {data:newCustomer,error}=await supabase

.from("customers")

.insert({

name:
document.getElementById("rdName").value,

phone,

address:
document.getElementById("rdAddress").value,

governorate:
document.getElementById("rdGovernorate").value

})

.select()

.single();



if(error){

alert(error.message);

return;

}



customer=newCustomer;



}







// =====================
// الرواجع
// =====================


const { data: returnItems, error: returnError } = await supabase
    .from("inventory_returns")
    .select("*")
    .eq("order_id", redeliveryOrder.id)
    .eq("status", "waiting")
    .gt("quantity", 0);

if (returnError) {
    alert("خطأ في جلب القطع الراجعة: " + returnError.message);
    return;
}




if(!returnItems.length){


alert(
"لا توجد قطع جاهزة لإعادة التوصيل"
);


return;


}







// =====================
// إنشاء الطلب
// =====================


let {data:newOrder,error:orderError}=await supabase

.from("orders")

.insert({

customer_id: customer.id,

parent_order_id: redeliveryOrder.id,

order_type: "re_delivery",

delivery_code: redeliveryOrder.delivery_code,

customer_name:
document.getElementById("rdName").value,

phone,

governorate:
document.getElementById("rdGovernorate").value,

address:
document.getElementById("rdAddress").value,

nearest_point:
document.getElementById("rdNearest").value,

source:
document.getElementById("rdSource").value || null,

notes:
document.getElementById("rdNotes").value || null,

subtotal_price:
Number(
document.getElementById("rdSubtotal")
.innerText.replace(/,/g,"")
),

delivery_price: rdDeliveryPrice,

discount_amount:
Number(
document.getElementById("rdDiscount").value || 0
),

refund_amount:
Number(
document.getElementById("returnAmount").value || 0
),

total_price:
Number(
document.getElementById("rdFinalTotal")
.innerText.replace(/,/g,"")
),

delivery_type:
document.getElementById("autoDelivery").checked
?
"auto"
:
"manual",

has_partial_refund:
document.getElementById("useReturnAmount").checked,

customer_type:"old",

payment_method:"cash",

status:"delivery",

finance_done:false

})

.select()

.single();






if(orderError){

alert(orderError.message);

return;

}


// =====================
// نسخ المنتجات من الرجع
// =====================


for(let item of returnItems){

    const { data:newItem, error:itemError } = await supabase

    .from("order_items")

    .insert({

        order_id: newOrder.id,

        variant_id: item.variant_id,

        quantity: item.quantity,

        price:

            item.price ||

            redeliveryOrder.order_items.find(

                x => x.variant_id === item.variant_id

            )?.price || 0

    })

    .select()

    .single();



    if(itemError){

        alert(itemError.message);

        return;

    }



    // تعليم الرجع بأنه استُخدم

const { error: updateReturnError } = await supabase
    .from("inventory_returns")
    .update({
        quantity: 0,
        status: "used_for_redelivery"
    })
    .eq("id", item.id);

if (updateReturnError) {
    alert("تعذر تحديث حالة القطعة الراجعة: " + updateReturnError.message);
    return;
}

}


await supabase

.from("order_status_history")

.insert({

order_id:newOrder.id,

status:"delivery"

});







await addActivity(

"إنشاء إعادة توصيل",

"orders",

newOrder.id

);

await supabase
.from("orders")
.update({
    status: "redelivery",
    finance_done: false
})
.eq("id", redeliveryOrder.id);

alert(
"تم إنشاء إعادة التوصيل بنجاح 🚚"
);






document

.getElementById("redeliveryModal")

.style.display="none";



await loadOrders();



}








document

.getElementById("closeRedelivery")

.onclick=()=>{


document

.getElementById("redeliveryModal")

.style.display="none";


}
function generateRedeliveryMessage(){

    if(!redeliveryOrder) return;

    let items = "";
    let subtotal = 0;

    redeliveryOrder.order_items?.forEach(item=>{

        let qty = Number(item.quantity || 0);
        let price = Number(item.price || 0);

        subtotal += qty * price;

        items +=
`🛍 ${item.products?.name || item.product_name || ""}
اللون: ${item.product_variants?.color || item.color || ""}
| المقاس: ${item.product_variants?.size || item.size || ""}
الكمية: ${qty} | السعر: ${price.toLocaleString()} دينار
`;

    });

    let refund =
        document.getElementById("useReturnAmount").checked
        ? Number(document.getElementById("returnAmount").value || 0)
        : 0;

    let discount =
        document.getElementById("useDiscount").checked
        ? Number(document.getElementById("rdDiscount").value || 0)
        : 0;

    let final =
        subtotal +
        rdDeliveryPrice -
        discount;

    if(final < 0) final = 0;

    let message =
`✨ NIVRA FASHION ✨

مرحباً ${document.getElementById("rdName").value} 🤍

تم إنشاء إعادة توصيل لطلبكم بنجاح ✅

👤 المعلومات الشخصية:
━━━━━━━━━━━━━
الاسم: ${document.getElementById("rdName").value}
الهاتف: ${document.getElementById("rdPhone").value}
المحافظة: ${document.getElementById("rdGovernorate").value} - ${document.getElementById("rdAddress").value}
أقرب نقطة: ${document.getElementById("rdNearest").value}
━━━━━━━━━━━━━

📦 تفاصيل الطلب:
━━━━━━━━━━━━━
${items}
━━━━━━━━━━━━━

💰 المبلغ الكلي:
━━━━━━━━━━━━━
كلفة المنتجات: ${subtotal.toLocaleString()} دينار
🚚 كلفة التوصيل: ${rdDeliveryPrice.toLocaleString()} دينار
`;

    if(discount > 0){

        message +=
`🏷 الخصم: ${discount.toLocaleString()} دينار
`;

    }

    message +=
`المجموع النهائي: ${final.toLocaleString()} دينار
`;

    if(document.getElementById("useReturnAmount").checked){

        message +=
`
⚠️ يوجد استقطاع مبلغ راجع جزئي بقيمة ${refund.toLocaleString()} دينار.
`;

    }

    if(redeliveryOrder.notes){

        message +=
`
📝 الملاحظات:
${redeliveryOrder.notes}
`;

    }

    message +=
`
━━━━━━━━━━━━━

🛒 زوروا موقعنا للتسوق الإلكتروني:
https://niverafashion.github.io/store/index.html

شكراً لثقتكم بـ NIVRA 🤍`;

    document.getElementById("rdWhatsappMessage").value = message;

}
document.getElementById("rdWhatsapp").onclick = () => {

    generateRedeliveryMessage();

    const phone = document.getElementById("rdPhone").value.trim();

    const text = document.getElementById("rdWhatsappMessage").value;

    window.location.href =
        `https://wa.me/964${phone.substring(1)}?text=${encodeURIComponent(text)}`;

};
document.getElementById("saveRedeliveryWhatsapp").onclick = async () => {

    generateRedeliveryMessage();

    const phone = document.getElementById("rdPhone").value.trim();

    if(phone.length !== 11){
        alert("رقم الهاتف غير صالح");
        return;
    }

    const text =
    document.getElementById("rdWhatsappMessage").value;

    // حفظ الطلب
    await document.getElementById("saveRedelivery").onclick();

    // فتح الواتساب
    window.open(
        `https://wa.me/964${phone.substring(1)}?text=${encodeURIComponent(text)}`,
        "_blank"
    );

};