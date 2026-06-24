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


const close =
document.getElementById("close");



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


const {data,error}=await supabase

.from("orders")

.select(`

id,

customer_id,

customer_name,

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

price,

product_variants(

color,

size,

stock_quantity,

image,

products(

name

)

)

)

`)

.order(
"created_at",
{
ascending:false
}
);



if(error){

console.log(error);

return;

}



// الطلبات الظاهرة بالإدارة
// نخفي فقط الطلبات اللي تم إغلاقها مالياً

orders = data.filter(order => {

return (
order.finance_done === false
||
order.finance_done === null
||
order.finance_done === undefined
);

});


console.log(
"طلبات الادارة:",
orders
);


// عرض حسب الحالة الحالية

renderOrders(
    orders.filter(o =>
        o.status === currentFilter
    )
);


updateStatusCards();
updateBulkButton();
updateBulkDelete();
}



function updateBulkButton(){

const btn =
document.getElementById("bulkUpdate");


if(!btn)
return;


if(
currentFilter === "new" ||
currentFilter === "completed" ||
currentFilter === "cancelled"
){

btn.style.display="none";

}
else{

btn.style.display="block";

}
const selectAll =
document.getElementById("selectAll");


if(selectAll){


let parent =
selectAll.parentElement;



if(
currentFilter === "completed" ||
currentFilter === "cancelled"
){

parent.style.display="none";


}
else{

parent.style.display="flex";


}


}
}

function updateBulkDelete(){

const btn =
document.getElementById("bulkDelete");


if(!btn)
return;


let selectedStatus = currentFilter;



if(
selectedStatus === "delivery" ||
selectedStatus === "completed" ||
selectedStatus === "cancelled" ||
selectedStatus === "postponed"
){

btn.style.display="none";

}
else{

btn.style.display="block";

}


}


// =====================
// عرض الطلبات
// =====================


function renderOrders(list){


let html="";



list.forEach(o=>{


let item=o.order_items?.[0];


let products = o.order_items?.map(item=>{

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
${item.quantity === 0 ? "مسترجعة" : item.quantity}
</div>


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
(o.status === "completed" || o.status === "cancelled")
?
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


<td>${o.governorate}</td>


<td class="products-cell">

${products}

</td>

<td>${o.total_price} د.ع</td>



<td>

<span class="badge ${o.status}">

${statusName(o.status)}

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

document
.getElementById("bulkUpdate")
.onclick = async()=>{


let selected=[];


document
.querySelectorAll(".order-check:checked")
.forEach(box=>{


let order = orders.find(
o=>o.id == box.dataset.id
);


if(order){

selected.push(order);

}


});



if(selected.length===0){

alert("حدد طلبات اولا");

return;

}




let nextStatus = null;


// حالة الطلبات الحالية

let statuses = [
...new Set(
selected.map(o=>o.status)
)
];




// جديد -> مجهز

if(
statuses.length === 1 &&
statuses[0] === "new"
){


nextStatus="prepared";


}




// مجهز -> توصيل

else if(

statuses.length === 1 &&
statuses[0] === "prepared"

){


nextStatus="delivery";


}




// توصيل -> اختيار

else if(

statuses.length === 1 &&
(
statuses[0] === "delivery" ||
statuses[0] === "postponed"
)

){

let choice = prompt(
"اختر الحالة:\n\n1 - مكتمل\n2 - مرفوض"
);



if(choice==="1"){


// فحص الاسترجاع لكل الطلبات

for(let order of selected){


let canComplete =
await checkReturnBeforeComplete(order);


if(!canComplete){

return;

}


}


nextStatus="completed";


}



else if(choice==="2"){


nextStatus="cancelled";


}



else{


alert("اختيار غير صحيح");

return;

}


}


let ok = confirm(

`تغيير حالة ${selected.length} طلب إلى ${statusName(nextStatus)} ؟`

);



if(!ok)

return;





let ids = selected.map(
o=>o.id
);



const {error}=await supabase

.from("orders")

.update({

status:nextStatus,

completed_at:

nextStatus==="completed"
?
new Date()
:
null

})

.in(

"id",

ids

);



if(error){

alert(error.message);

return;

}



// حفظ تاريخ الحالات + تحديث بيانات الزبون

for(let order of selected){



await supabase

.from("order_status_history")

.insert({

order_id:order.id,

status:nextStatus

});





// الطلب مكتمل

if(nextStatus==="completed"){


await supabase

.rpc(

"increment_completed_orders",

{

customer_id_input:order.customer_id

}

);


}





// الطلب مرفوض

if(nextStatus==="cancelled"){


await supabase

.rpc(

"increment_cancelled_orders",

{

customer_id_input:order.customer_id

}

);


}

await addActivity(

"تحديث حالة طلب",

"orders",

order.id

);

}

await finishStatusUpdate(
"تم تحديث الطلبات 🔥"
);

};





// =====================
// حذف جماعي
// =====================


document
.getElementById("bulkDelete")
.onclick = async()=>{


let ids=[];


document
.querySelectorAll(".order-check:checked")
.forEach(box=>{

ids.push(box.dataset.id);

});


if(ids.length===0){

alert("حدد طلبات اولا");

return;

}



let ok=confirm(
`هل تريد حذف ${ids.length} طلب؟`
);


if(!ok)
return;



for(let id of ids){


await window.deleteOrder(id);


}


alert("تم حذف الطلبات");


await loadOrders();


};
// =====================
// تعديل الطلب
// =====================


window.editOrder=function(id){


window.location.href =

`edit-orders.html?id=${id}`;


}


window.deleteOrder = async function(id){

let ok = confirm("هل تريد حذف الطلب؟");

if(!ok) return;



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


// رجاع المخزون

for(let item of items || []){


const {data:variant}=await supabase

.from("product_variants")

.select("stock_quantity")

.eq(
"id",
item.variant_id
)

.single();



await supabase

.from("product_variants")

.update({

stock_quantity:
(variant.stock_quantity || 0)
+
item.quantity

})

.eq(
"id",
item.variant_id
);



// حركة مخزن

await supabase

.from("stock_movements")

.insert({

variant_id:item.variant_id,

type:"return",

quantity:item.quantity,

note:`حذف طلب رقم ${id}`

});


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



alert("تم الحذف ✅");


loadOrders();


}

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
// =====================
// تحديث الحالة
// =====================

window.updateOrderStatus = async function(id){

let order = orders.find(o=>o.id==id);


if(!order){

alert("الطلب غير موجود");
return;

}



let nextStatus=null;
let reason="";


// =====================
// انتقال الحالات
// =====================


if(order.status==="new"){


openScanner(async(code)=>{


const {error}=await supabase

.from("orders")

.update({

delivery_code:code,

status:"prepared"

})

.eq(
"id",
id
);



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



else if(order.status==="prepared"){

nextStatus="delivery";

}




else if(order.status==="delivery"){


let choice = prompt(
"اختر الحالة:\n\n1 - مكتمل\n2 - مرفوض\n3 - مؤجل"
);



if(choice==="1"){


let canComplete =
await checkReturnBeforeComplete(order);


if(!canComplete)
return;



nextStatus="completed";


}




else if(choice==="2"){



let ok = confirm(

"⚠️ سيتم رفض الطلب وإرجاع جميع القطع للمخزن\n\nهل أنت متأكد؟"

);

if(!ok){
return;
}


reason = prompt(
"اكتب سبب الرفض:"
);



nextStatus="cancelled";

}



else if(choice==="3"){


nextStatus="postponed";


}



else{


alert("اختيار غير صحيح");

return;


}


}



else if(order.status==="postponed"){


let choice = prompt(
"اختر:\n\n1 - مكتمل\n2 - مرفوض"
);


if(choice==="1"){


let canComplete =
await checkReturnBeforeComplete(order);


if(!canComplete)
return;



nextStatus="completed";


}




else if(choice==="2"){



let ok = confirm(

"⚠️ سيتم رفض الطلب وإرجاع جميع القطع للمخزن\n\nهل أنت متأكد؟"

);

if(!ok){
return;
}


reason = prompt(
"اكتب سبب الرفض:"
);


nextStatus="cancelled";


}



else{

return;

}


}


if(!nextStatus)
return;



// =====================
// رفض الطلب
// رجع كل القطع للمخزن
// =====================


if(nextStatus==="cancelled"){

for(let item of order.order_items){

// فحص الكمية المتبقية فقط

if(item.quantity <= 0)
continue;



const {data:returned}=await supabase

.from("returns")

.select("quantity")

.eq(
"order_item_id",
item.id
);



let returnedQty=0;


returned?.forEach(r=>{

returnedQty += Number(r.quantity || 0);

});



let availableQty =
item.quantity - returnedQty;



if(availableQty <= 0)
continue;

// جلب المخزون الحالي

const {data:variant}=await supabase

.from("product_variants")

.select("stock_quantity")

.eq(
"id",
item.variant_id
)

.single();





// زيادة المخزون

await supabase

.from("product_variants")

.update({

stock_quantity:

(variant.stock_quantity || 0)
+
item.quantity


})

.eq(

"id",

item.variant_id

);





// حركة مخزن

await supabase

.from("stock_movements")

.insert({

variant_id:item.variant_id,

type:"RETURN",

quantity:item.quantity,

note:"رفض طلب"

});



}



}





// =====================
// تحديث الطلب
// =====================



const {error}=await supabase

.from("orders")

.update({

status:nextStatus,

completed_at:

nextStatus==="completed"
?
new Date()
:
null,


cancelled_reason:

nextStatus==="cancelled"
?
reason || "بدون سبب"
:
null,


finance_done:false

})

.eq(
"id",
id
);





if(error){

alert(error.message);
return;

}





// =====================
// سجل الحالة
// =====================


await supabase

.from("order_status_history")

.insert({

order_id:id,

status:nextStatus

});






// =====================
// تحديث العميل
// =====================


if(nextStatus==="completed"){


await supabase

.rpc(
"increment_completed_orders",
{
customer_id_input:order.customer_id
}
);



}





if(nextStatus==="cancelled"){


await supabase

.rpc(
"increment_cancelled_orders",
{
customer_id_input:order.customer_id
}
);



}





await addActivity(

"تغيير حالة طلب",

"orders",

id

);



await finishStatusUpdate(
"تم تحديث الحالة ✅"
);



}






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


console.log("تحديث الكروت");


let states=[

{
status:"new",
id:"newCount"
},

{
status:"prepared",
id:"preparedCount"
},

{
status:"delivery",
id:"deliveryCount"
},

{
status:"completed",
id:"completedCount"
},

{
status:"postponed",
id:"postponedCount"
},

{
status:"cancelled",
id:"cancelledCount"
}

];


states.forEach(item=>{


let count = orders.filter(o=>{

return o.status === item.status;

}).length;



console.log(
item.status,
count
);



let el=document.getElementById(item.id);



if(el){

el.innerText=count;

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


renderOrders(

orders.filter(o=>

o.status === currentFilter

)

);

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


return (

o.status === currentFilter &&

(

String(o.id).includes(value)

||

(o.delivery_code || "")
.toLowerCase()
.includes(value)

||

(o.customer_name || "")
.toLowerCase()
.includes(value)

||

(o.phone || "")
.includes(value)

||

(o.governorate || "")
.toLowerCase()
.includes(value)

)

);


});



console.log("الحالة الحالية:", currentFilter);
console.log("نتائج البحث:", filtered);



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

.from("product_variants")

.update({

stock_quantity:

(item.product_variants.stock_quantity || 0)
+
returnQty

})

.eq(
"id",
item.variant_id
);




// تسجيل حركة مخزن

await supabase

.from("stock_movements")

.insert({

variant_id:item.variant_id,

type:"return",

quantity:returnQty,

note:"استرجاع قطعة واحدة من طلب"

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