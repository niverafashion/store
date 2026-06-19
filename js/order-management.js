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



orders=data;
console.log(
"كل الحالات:",
orders.map(o=>o.status)
);

renderOrders(
orders.filter(o=>o.status === currentFilter)
);

updateStatusCards();


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


<input 
type="checkbox"
class="order-check"
data-id="${o.id}">

<span class="order-id">

#${o.id}

</span>
${o.has_return ? `

<span class="return-order-icon" title="طلب يحتوي على استرجاع">

<i class="fa-solid fa-arrow-right-arrow-left"></i></span>

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


<button class="action-btn edit-btn"

onclick="editOrder('${o.id}')">

<i class="fa-solid fa-pen"></i>

</button>



<button class="action-btn view-btn"

onclick="openOrder('${o.id}')">

<i class="fa-solid fa-eye"></i>

</button>



<button class="action-btn delete-btn"

onclick="deleteOrder('${o.id}')">

<i class="fa-solid fa-trash"></i>

</button>


<button class="action-btn update-btn"
data-id="${o.id}">

<i class="fa-solid fa-rotate"></i>

</button>


</td>


</tr>


`;



});




table.innerHTML=html;

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


let checked =
document.getElementById("selectAll").checked;



document
.querySelectorAll(".order-check")
.forEach(box=>{


box.checked = checked;


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
statuses[0] === "delivery"

){



let choice = prompt(

"اختار الحالة:\n\n1 - مكتمل\n2 - مؤجل\n3 - مرفوض"

);



if(choice==="1"){

nextStatus="completed";

}


else if(choice==="2"){

nextStatus="postponed";

}


else if(choice==="3"){

nextStatus="cancelled";

}


else{

alert("اختيار غير صحيح");

return;

}



}



else{


alert(
"لازم تكون الطلبات بنفس الحالة حتى تتحدث"
);

return;


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

status:nextStatus

})

.in(

"id",

ids

);




if(error){

alert(error.message);

return;

}
// حفظ تاريخ الحالات

for(let order of selected){


await supabase

.from("order_status_history")

.insert({

order_id:order.id,

status:nextStatus

});



// تحديث الزبون

if(nextStatus==="completed"){


await supabase

.from("customers")

.update({

completed_orders:
orders.find(x=>x.id===order.id)
?.customer_id

})

.eq(
"id",
order.customer_id
);


}



if(nextStatus==="cancelled"){


await supabase

.from("customers")

.update({

cancelled_orders:
orders.find(x=>x.id===order.id)
?.customer_id

})

.eq(
"id",
order.customer_id
);


}



await addActivity(

"تحديث حالة طلب",

"orders",

order.id

);


}


alert("تم تحديث الطلبات 🔥");


resetChecks();


await loadOrders();

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





let ok = confirm(

`هل تريد حذف ${ids.length} طلب؟`

);



if(!ok)
return;




const {error}=await supabase

.from("orders")

.delete()

.in(
"id",
ids
);



if(error){

alert(error.message);

return;

}



alert("تم حذف الطلبات");
resetChecks();


await loadOrders();



};
// =====================
// تعديل الطلب
// =====================


window.editOrder=function(id){


window.location.href =

`orders.html?id=${id}`;


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




// =====================
// ارجاع قطعة للمخزن
// =====================


async function returnSingleItem(item){


let variant =
item.variant_id;



let qty =
item.quantity;



// جلب المخزون الحالي

const {data:variantData,error:vError}=

await supabase

.from("product_variants")

.select("stock_quantity")

.eq("id",variant)

.single();



if(vError)
return;



// زيادة المخزون


await supabase

.from("product_variants")

.update({

stock_quantity:

variantData.stock_quantity + qty

})

.eq(

"id",

variant

);





// تسجيل حركة


await supabase

.from("stock_movements")

.insert({

variant_id:variant,

type:"return",

quantity:qty,

note:"ارجاع من طلب"

});





// تسجيل returns


await supabase

.from("returns")

.insert({

order_id:item.order_id,

order_item_id:item.id,

variant_id:variant,

quantity:qty,

reason:"استرجاع من الطلب"

});




await supabase

// اذا الكمية اكثر من 1 نقص وحدة فقط

if(item.quantity > 1){


await supabase

.from("order_items")

.update({

quantity: 1

})

.eq(

"id",

item.id

);



}

else{

await supabase

.from("order_items")

.delete()

.eq(

"id",

item.id

);


}
const {data:remainingItems}=await supabase

.from("order_items")

.select("id")

.eq(
"order_id",
item.order_id
);


if(!remainingItems || remainingItems.length===0){


await supabase

.from("orders")

.update({

total_price:0

})

.eq(
"id",
item.order_id
);


}
// تحديث مجموع الطلب

const {data:items}=await supabase

.from("order_items")

.select("price,quantity")

.eq(
"order_id",
item.order_id
);



let newTotal=0;


items?.forEach(i=>{


newTotal += i.price*i.quantity;


});



await supabase

.from("orders")

.update({

total_price:newTotal

})

.eq(

"id",

item.order_id

);


await addActivity(

"ارجاع قطعة للمخزن",

"orders",

item.order_id

);


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


let nextStatus = null;

console.log("الحالة الجديدة بالبداية:", nextStatus);

// جديد -> مجهز

if(order.status === "new"){

nextStatus="prepared";

}


else if(order.status === "prepared"){

nextStatus="delivery";

}



// توصيل -> اختيار الحالات النهائية

else if(order.status === "delivery"){


let choice = prompt(
"اختر الحالة:\n\n1 - مكتمل\n2 - ملغي\n3 - مؤجل"
);



if(choice === "1"){

nextStatus = "completed";

}



else if(choice === "2"){

nextStatus = "cancelled";

}



else if(choice === "3"){

nextStatus = "postponed";

}



else{

alert("اختيار غير صحيح");

return;

}


}

// مؤجل -> فقط مكتمل او ملغي

else if(order.status === "postponed"){


let choice = prompt(
"اختر الحالة النهائية:\n\n1 - مكتمل\n2 - ملغي"
);



if(choice==="1"){

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


// حماية اذا ماكو حالة

if(!nextStatus){

alert("لم يتم اختيار حالة جديدة");

return;

}


// اذا مكتمل او ملغي رسالة إنهاء

if(
nextStatus === "completed" ||
nextStatus === "cancelled"
){


let confirmUpdate = confirm(

`تم اختيار حالة ${statusName(nextStatus)}.\n\nهذه الحالة نهائية ولا يمكن تعديلها لاحقاً.\n\nهل تريد تأكيد إنهاء الطلب؟`

);



if(!confirmUpdate)

return;



}

else{


let confirmUpdate = confirm(

`تغيير الحالة من ${statusName(order.status)} إلى ${statusName(nextStatus)} ؟`

);



if(!confirmUpdate)

return;


}




const {data,error}=await supabase

.from("orders")

.update({

status:nextStatus

})

.eq("id",id)

.select();







if(error){


console.log(error);


alert(error.message);


return;


}

// حفظ حالة الطلب

await supabase

.from("order_status_history")

.insert({

order_id:id,

status:nextStatus

});




// تحديث بيانات العميل

if(nextStatus==="completed"){


await supabase

.from("customers")

.update({

completed_orders:
(order.customer_id)

})

.eq(
"id",
order.customer_id
);


}




if(nextStatus==="cancelled"){


await supabase

.from("customers")

.update({

cancelled_orders:
(order.customer_id)

})

.eq(
"id",
order.customer_id
);


}




await addActivity(

"تغيير حالة طلب",

"orders",

id

);

alert("تم تحديث الحالة بنجاح");


await loadOrders();


renderOrders(

orders.filter(

o=>o.status===currentFilter

)

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


<span class="order-id">
#${o.id}
</span>


${o.has_return ? `

<span class="return-order-icon" title="يوجد استرجاع">

<i class="fa-solid fa-arrow-right-arrow-left"></i></span>

` : ""}


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



${o.order_items.map(i=>`


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
class="return-btn">

<i class="fa-solid fa-rotate-left"></i>

</button>


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


if(!confirm("ارجاع هذه القطعة للمخزن؟"))

return;



// جلب القطعة

const {data:item,error}=

await supabase

.from("order_items")

.select(`

id,

order_id,

variant_id,

quantity,

price,

product_variants(

stock_quantity

)

`)

.eq("id",id)

.single();



if(error){

console.log(error);

alert(error.message);

return;

}




// زيادة المخزون قطعة واحدة فقط

await supabase

.from("product_variants")

.update({

stock_quantity:
(item.product_variants.stock_quantity || 0)
+
1

})

.eq(

"id",

item.variant_id

);




// تسجيل حركة المخزن

await supabase

.from("stock_movements")

.insert({

variant_id:item.variant_id,

type:"return",

quantity:item.quantity,

note:"استرجاع من طلب"

});




// تسجيل جدول returns

await supabase

.from("returns")

.insert({

order_id:item.order_id,

order_item_id:item.id,

variant_id:item.variant_id,

quantity:item.quantity,

reason:"استرجاع"

});


// تصفير الكمية فقط وابقاء المنتج ظاهر

const {error:updateItemError}=await supabase

.from("order_items")

.update({

quantity:item.quantity - 1

})

.eq(
"id",
item.id
);


if(updateItemError){

console.log(updateItemError);

alert(updateItemError.message);

return;

}



// تحديث سعر الطلب

const {data:items}=await supabase

.from("order_items")

.select("price,quantity")

.eq(
"order_id",
item.order_id
);



let total=0;


items?.forEach(i=>{

if(i.quantity > 0){

total += Number(i.price) * Number(i.quantity);

}

});



await supabase

.from("orders")

.update({

total_price:total

})

.eq(

"id",

item.order_id

);


alert("تم ارجاع القطعة للمخزن ✅");

modal.style.display="none";

await loadOrders();

// تحديث الجدول من البيانات الجديدة
const updatedList = orders.filter(o =>
    o.status === currentFilter
);

renderOrders(updatedList);


}

close.onclick=()=>{


modal.style.display="none";


}

loadOrders().then(()=>{


renderOrders(

orders.filter(o=>

o.status === currentFilter

)

);


});