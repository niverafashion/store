import {supabase} from "./supabase.js";


// =====================
// العناصر
// =====================


let orders=[];

let currentFilter="";



const table =
document.getElementById("accountsTable");


const search =
document.getElementById("search");


const modal =
document.getElementById("modal");


const details =
document.getElementById("details");


const close =
document.getElementById("close");


const selectAll =
document.getElementById("selectAllAccounts");


const receiveMoney =
document.getElementById("receiveMoney");


const receiveReturns =
document.getElementById("receiveReturns");





// =====================
// النشاط
// =====================


async function addActivity(action,id){


await supabase

.from("activity_logs")

.insert({

action,

table_name:"orders",

record_id:id

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

total_price,

status,

finance_done,

has_return,

refund_amount,

completed_at,

cancelled_reason,

created_at,


order_items(

id,

quantity,

price,


product_variants(

color,

size,


products(

name,

main_image

)

)

)

`)


.in(

"status",

[
"completed",
"cancelled"
]

)


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



updateCards();



renderOrders(

filterOrders()

);



}









// =====================
// فلترة
// =====================


function filterOrders(){


if(!currentFilter)

return orders;



return orders.filter(o=>

o.status===currentFilter

);


}








// =====================
// عرض الطلبات
// =====================


function renderOrders(list){



let html="";



list.forEach(o=>{


html+=`


<tr>



<td>


<input

type="checkbox"

class="account-check"

data-id="${o.id}">


<br>

#${o.id}


</td>





<td>

${o.customer_name || "-"}

</td>




<td>

${o.phone || "-"}

</td>





<td>

${o.governorate || "-"}

</td>




<td>

${o.total_price || 0} د.ع

</td>





<td>


${o.has_return ?


`
<i class="fa-solid fa-rotate-left"></i>
يوجد

`

:

"لا"

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

onclick="finishFinance('${o.id}')">


${o.finance_done ?

"تم"

:

"تسديد"

}


</button>



</td>





<td>


<button

class="view-btn"

onclick="openAccount('${o.id}')">


<i class="fa-solid fa-eye"></i>


</button>


</td>



</tr>



`;



});



table.innerHTML=html;


}











// =====================
// تحديث الكروت
// =====================



function updateCards(){


let completed = orders.filter(o=>

o.status==="completed"

);



let cancelled = orders.filter(o=>

o.status==="cancelled"

);




document.getElementById("allCount").innerText=

orders.length;



document.getElementById("completedCount").innerText=

completed.length;




document.getElementById("cancelledCount").innerText=

cancelled.length;






let total = completed.reduce((a,b)=>

a + Number(b.total_price||0)

,0);





document.getElementById("totalFinance").innerText=

total+" د.ع";





document.getElementById("pendingReturns").innerText=

orders.filter(o=>

o.has_return

).length;




}









// =====================
// فلترة الكروت
// =====================


document

.querySelectorAll(".status-card")

.forEach(btn=>{


btn.onclick=()=>{


currentFilter=

btn.dataset.status || "";


renderOrders(

filterOrders()

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

filterOrders()

.filter(o=>{


return (

(o.customer_name||"")

.toLowerCase()

.includes(value)


||

(o.phone||"")

.includes(value)



||

String(o.id)

.includes(value)


);


});



renderOrders(result);


};









// =====================
// تحديد الكل
// =====================


selectAll.onchange=()=>{


document

.querySelectorAll(".account-check")

.forEach(c=>{


c.checked=

selectAll.checked;



});


};









// =====================
// تسديد الأموال
// =====================


window.finishFinance = async function(id){


const order=

orders.find(o=>o.id===id);



if(order.status!=="completed"){

alert("فقط الطلب المكتمل يتم تسديده");

return;

}




await supabase

.from("orders")

.update({

finance_done:true

})

.eq(

"id",

id

);



await addActivity(

"استلام مبلغ الطلب",

id

);



alert("تم استلام الحساب ✅");



loadOrders();



}










// =====================
// زر استلام الأموال جماعي
// =====================


receiveMoney.onclick=async()=>{


let selected=getSelected();



if(!selected.length){

alert("حدد الطلبات");

return;

}




let wrong=

selected.some(o=>

o.status!=="completed"

);



if(wrong){

alert("حدد طلبات مكتملة فقط");

return;

}





for(let o of selected){


await supabase

.from("orders")

.update({

finance_done:true

})

.eq(

"id",

o.id

);



await addActivity(

"استلام مبلغ الطلب",

o.id

);


}




alert("تم استلام الأموال");


loadOrders();


};










// =====================
// استلام الرواجع
// =====================


receiveReturns.onclick=async()=>{


let selected=getSelected();



if(!selected.length){

alert("حدد الطلبات");

return;

}





for(let o of selected){



if(o.has_return){



await supabase

.from("returns")

.insert({

order_id:o.id,

reason:"تم استلام الرجع"

});





await supabase

.from("orders")

.update({

has_return:false

})

.eq(

"id",

o.id

);



await addActivity(

"استلام رجوع الطلب",

o.id

);



}


}



alert("تم استلام الرواجع");


loadOrders();


};








function getSelected(){


let ids=[];



document

.querySelectorAll(".account-check:checked")

.forEach(c=>{


ids.push(c.dataset.id);


});



return orders.filter(o=>

ids.includes(o.id)

);



}










// =====================
// تفاصيل
// =====================


window.openAccount=function(id){



let o = orders.find(x=>x.id===id);



let productsHTML="";


o.order_items?.forEach(item=>{


productsHTML+=`

<div class="product-mini">


<img 

src="${item.product_variants?.products?.main_image || ''}"

>


<div>


<b>
${item.product_variants?.products?.name || "-"}
</b>


<br>

الكمية:
${item.quantity}


<br>

السعر:
${item.price} د.ع


</div>


</div>


`;


});






details.innerHTML=`

<h2>
تفاصيل الطلب
</h2>


<p>
👤 ${o.customer_name}
</p>


<p>
📱 ${o.phone}
</p>


<p>
📍 ${o.governorate}
</p>


<p>
💰 ${o.total_price} د.ع
</p>


<hr>


<h3>
المنتجات
</h3>


${productsHTML || "لا توجد منتجات"}



<p>

الحالة:

${statusName(o.status)}

</p>



<p>

الحساب:

${o.finance_done?

"مستلم"

:

"غير مستلم"

}

</p>


`;



modal.style.display="flex";


}


function statusName(s){


let x={

completed:"مكتمل",

cancelled:"ملغي"


};



return x[s] || s;


}





close.onclick=()=>{


modal.style.display="none";


};






loadOrders();