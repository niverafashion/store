import {supabase} from "./supabase.js";


// =====================
// عناصر الصفحة
// =====================


const table =
document.getElementById("ordersTable");


const search =
document.getElementById("search");


const date =
document.getElementById("date");


const modal =
document.getElementById("modal");


const details =
document.getElementById("details");


const changeStatus =
document.getElementById("changeStatus");



let orders=[];

let currentOrder=null;



// =====================
// تحميل الطلبات
// =====================


async function loadOrders(){



const {data,error}=

await supabase

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

notes,


order_items(

quantity,

price,


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



renderOrders(orders);


updateStats();


drawCharts();


}









// =====================
// عرض الجدول
// =====================


function renderOrders(list){


let html="";



list.forEach(o=>{


let item =
o.order_items?.[0];


let product =
item?.product_variants?.products?.name || "-";


let color =
item?.product_variants?.color || "-";


let size =
item?.product_variants?.size || "-";




html +=`


<tr>


<td>

#${o.id}

</td>



<td>

${o.customer_name}

</td>



<td>

${o.phone}

</td>



<td>

${o.governorate}

</td>




<td>

${product}

</td>




<td>

${color}

</td>




<td>

${size}

</td>




<td>

${o.total_price} د.ع

</td>





<td>

<span class="badge ${o.status}">

${statusName(o.status)}

</span>

</td>





<td>


<button

class="view-btn"

onclick="openOrder('${o.id}')"
<i class="fa-solid fa-eye"></i>

</button>


</td>




</tr>


`;


});



table.innerHTML=html;


}









// =====================
// اسم الحالة
// =====================


function statusName(s){


let map={


new:"جديد",

ready:"مجهز",

delivery:"قيد التوصيل",

done:"مكتمل",

delayed:"مؤجل",

rejected:"مرفوض"


};



return map[s] || s;


}









// =====================
// فلترة الكروت
// =====================


document
.querySelectorAll(".status-card")
.forEach(btn=>{


btn.onclick=()=>{


let status =
btn.dataset.status;


if(status===""){


renderOrders(orders);


return;

}



renderOrders(

orders.filter(
x=>x.status===status
)

);


}



});









// =====================
// البحث
// =====================


function searchOrders(){



let text =
search.value;



let selectedDate =
date.value;



let result =
orders.filter(o=>{


let matchText =

o.customer_name.includes(text)

||

o.phone.includes(text);



let matchDate = true;



if(selectedDate){


matchDate =

o.created_at
.startsWith(selectedDate);


}



return matchText && matchDate;



});



renderOrders(result);



}




search.oninput=searchOrders;

date.onchange=searchOrders;









// =====================
// فتح التفاصيل
// =====================


window.openOrder=function(id){



currentOrder =

orders.find(
x=>x.id===id
);



let o=currentOrder;



details.innerHTML=`


<div class="order-info">


<p>

👤 الزبون:

${o.customer_name}

</p>


<p>

📱 الهاتف:

${o.phone}

</p>



<p>

📍 المحافظة:

${o.governorate}

</p>



<p>

🏠 العنوان:

${o.address}

</p>



<hr>


<h3>
القطع
</h3>



${

o.order_items.map(i=>`

<p>

🛍

${i.product_variants.products.name}

<br>

اللون:

${i.product_variants.color}

<br>

القياس:

${i.product_variants.size}

<br>

الكمية:

${i.quantity}

</p>


`).join("")

}



<hr>


💰 المبلغ:

${o.total_price}

</div>



`;





changeStatus.value=o.status;



modal.style.display="flex";


}









// اغلاق


document
.getElementById("close")
.onclick=()=>{


modal.style.display="none";


};









// =====================
// تحديث الحالة
// =====================


document
.getElementById("saveStatus")
.onclick=async()=>{



if(!currentOrder)
return;



const {error}=

await supabase

.from("orders")

.update({

status:

changeStatus.value


})

.eq(

"id",

currentOrder.id

);




if(error){

alert("خطأ");

return;

}



alert("تم تحديث الحالة");



modal.style.display="none";



loadOrders();



}









// =====================
// الاحصائيات
// =====================


function updateStats(){



document
.getElementById("ordersCount")
.innerText =
orders.length;




let sales=0;



orders.forEach(o=>{


sales += Number(o.total_price);


});




document
.getElementById("sales")
.innerText=sales;




let done =

orders.filter(
x=>x.status==="done"
);



document
.getElementById("profits")
.innerText=

done.reduce(

(a,b)=>

a+Number(b.total_price)

,0);



document
.getElementById("vipCustomers")
.innerText=

orders.filter(
x=>x.total_price>100000
).length;





// الحالات


let count={};


orders.forEach(o=>{


count[o.status]=

(count[o.status]||0)+1;



});



for(let x in count){


let el=

document
.getElementById(
x+"Count"
);


if(el)
el.innerText=count[x];


}



document
.getElementById("allCount")
.innerText=

orders.length;


}









// =====================
// Charts
// =====================


function drawCharts(){



new Chart(

document
.getElementById("statusChart"),

{


type:"doughnut",


data:{


labels:[

"جديد",

"مجهز",

"توصيل",

"مكتمل",

"مؤجل",

"مرفوض"

],


datasets:[{


data:[

countStatus("new"),

countStatus("ready"),

countStatus("delivery"),

countStatus("done"),

countStatus("delayed"),

countStatus("rejected")

]


}]


}


}

);



}




function countStatus(s){


return orders.filter(

x=>x.status===s

).length;


}



document
.getElementById("editOrder")
.onclick=()=>{


if(!currentOrder)
return;



window.location.href =

`orders.html?id=${currentOrder.id}`;



};



loadOrders();