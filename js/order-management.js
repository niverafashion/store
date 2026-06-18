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
// تحميل الطلبات
// =====================


async function loadOrders(){


const {data,error}=await supabase

.from("orders")

.select(`

id,

customer_name,

phone,

governorate,

address,

total_price,

status,

created_at,


order_items(

quantity,

product_variants(

color,

size,

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

renderOrders(orders);


updateStatusCards();


}








// =====================
// عرض الطلبات
// =====================


function renderOrders(list){


let html="";



list.forEach(o=>{


let item=o.order_items?.[0];


let product =
item?.product_variants?.products?.name || "-";


let color =
item?.product_variants?.color || "-";


let size =
item?.product_variants?.size || "-";




html += `


<tr>


<td>#${o.id}</td>


<td>${o.customer_name}</td>


<td>${o.phone}</td>


<td>${o.governorate}</td>


<td>${product}</td>


<td>${color}</td>


<td>${size}</td>


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


// =====================
// تعديل الطلب
// =====================


window.editOrder=function(id){


window.location.href =

`orders.html?id=${id}`;


}











// =====================
// حذف الطلب
// =====================


window.deleteOrder=async function(id){



let ok = confirm(
"هل تريد حذف الطلب؟"
);



if(!ok)
return;



const {error}=await supabase

.from("orders")

.delete()

.eq(
"id",
id
);



if(error){

alert("فشل الحذف");

return;

}



alert("تم حذف الطلب");


loadOrders().then(()=>{

renderOrders(
orders.filter(
o=>o.status==="new"
)
);

});


}











// =====================
// تحديث الحالة
// =====================

window.updateOrderStatus = async function(id){

console.log("1 - دخلت دالة التحديث", id);


let order = orders.find(o=>o.id==id);


console.log("2 - الطلب الموجود:", order);


if(!order){

alert("الطلب غير موجود");

return;

}


console.log("3 - حالة الطلب داخل القاعدة:", JSON.stringify(order.status));
console.log("طول الحالة:", order.status.length);


let nextStatus = null;

console.log("الحالة الجديدة بالبداية:", nextStatus);

// جديد -> مجهز

if(order.status === "new"){


nextStatus = "prepared";


}


// مجهز -> توصيل

else if(order.status === "prepared"){


nextStatus = "delivery";


}


// توصيل -> خيارات

else if(order.status === "delivery"){


let choice = prompt(
"اختر الحالة الجديدة:\n\n1 - مكتمل\n2 - مؤجل\n3 - مرفوض"
);



if(choice === "1"){

nextStatus="completed";

}


else if(choice==="2"){

nextStatus="postponed";

}


else if(choice==="3"){

nextStatus="cancelled";

}


else{

alert("لم يتم اختيار حالة");

return;

}


}



else{


alert("لا يمكن تحديث هذا الطلب");

return;


}






let confirmUpdate = confirm(

`تغيير الحالة من ${statusName(order.status)} إلى ${statusName(nextStatus)} ؟`

);



if(!confirmUpdate)

return;





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




console.log(data);

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


btn.onclick=()=>{


let status = btn.dataset.status;


currentFilter = status;


renderOrders(

orders.filter(
o=>o.status===status
)

);


};


});









// =====================
// البحث
// =====================


search.oninput=()=>{


let value=

search.value.toLowerCase();



let result=

orders.filter(o=>{


return (

o.customer_name

.toLowerCase()

.includes(value)



||



o.phone

.includes(value)



||



String(o.id)

.includes(value)



);


});



renderOrders(result);



}









// =====================
// المودال
// =====================


window.openOrder=function(id){


currentOrder=

orders.find(
o=>o.id==id
);



let o=currentOrder;



details.innerHTML=`


<p>👤 ${o.customer_name}</p>

<p>📱 ${o.phone}</p>

<p>📍 ${o.governorate}</p>

<p>🏠 ${o.address || "-"}</p>


<hr>


${

o.order_items.map(i=>`

<p>

🛍 ${i.product_variants.products.name}

<br>

اللون:
${i.product_variants.color}

<br>

الحجم:
${i.product_variants.size}

<br>

الكمية:
${i.quantity}

</p>


`).join("")

}


<h3>

المبلغ:
${o.total_price}

</h3>



`;



modal.style.display="flex";


}








close.onclick=()=>{


modal.style.display="none";


}


loadOrders().then(()=>{

renderOrders(
orders.filter(
o=>o.status==="new"
)
);

});