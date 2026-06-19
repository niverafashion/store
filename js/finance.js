import { supabase } from "./supabase.js";




// =========================
// تحميل بيانات الحسابات
// =========================

async function loadFinance(){


const { data, error } = await supabaseClient

.from("orders")

.select(`
*,

order_items(

quantity,

price,

product_variants(

color,

size,

image,

products(

name

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

.eq(
"finance_done",
false
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



financeOrders = data || [];



renderFinance();


}






// =========================
// عرض الطلبات
// =========================


function renderFinance(){



const table =
document.getElementById(
"financeOrders"
);



table.innerHTML="";



let completed = 0;

let cancelled = 0;

let returns = 0;

let total = 0;





financeOrders.forEach(o=>{



if(o.status==="completed"){


completed++;

total += Number(o.total_price || 0);


}



if(o.status==="cancelled"){


cancelled++;


}



if(o.has_return){


returns++;


}






table.innerHTML += `


<tr>



<td>


<input 

type="checkbox"

class="finance-check"

value="${o.id}">


</td>





<td>


<div class="order-number">


#${o.id.slice(0,8)}



${o.has_return ? `


<span class="return-order-icon"
title="يوجد استرجاع">


<i class="fa-solid fa-rotate-left"></i>


</span>


`:""}




</div>


</td>







<td>


<b>

${o.customer_name || "-"}

</b>


<br>


<small>

${o.phone || ""}

</small>


</td>






<td>


<span class="badge ${o.status}">


${statusName(o.status)}


</span>



</td>






<td>


${Number(o.total_price).toLocaleString()}

د.ع


</td>






<td>


${new Date(o.created_at)

.toLocaleDateString(
"ar-IQ"
)

}


</td>






</tr>



`;




});






document.getElementById(
"completedCount"
).innerHTML =
completed;



document.getElementById(
"cancelledCount"
).innerHTML =
cancelled;



document.getElementById(
"returnCount"
).innerHTML =
returns;



document.getElementById(
"totalCompleted"
).innerHTML =

total.toLocaleString()
+
" د.ع";




}







// =========================
// تحديد الكل
// =========================



document
.getElementById(
"selectAll"
)
.addEventListener(
"change",
function(){



document
.querySelectorAll(
".finance-check"
)

.forEach(c=>{


c.checked=this.checked;


});



});








// =========================
// استلام الأموال
// =========================



document
.getElementById(
"receiveMoney"
)

.onclick = async function(){



let ids = getSelected();




if(!ids.length){


alert(
"حدد الطلبات اولا"
);


return;


}







const {error}= await supabaseClient

.from("orders")

.update({

finance_done:true

})

.in(
"id",
ids
);





if(error){


console.log(error);

return;


}





alert(
"تم استلام الأموال وترحيل الطلبات"
);



loadFinance();



};









// =========================
// استلام الرواجع
// =========================



document
.getElementById(
"receiveReturns"
)

.onclick = async function(){



let ids = getSelected();





if(!ids.length){


alert(
"حدد الطلبات اولا"
);


return;


}





const returnIds = financeOrders

.filter(o=>

ids.includes(o.id)

&&

o.has_return

)

.map(o=>o.id);







if(!returnIds.length){


alert(
"لا توجد طلبات تحتوي على رواجع"
);


return;


}







const {error}=await supabaseClient

.from("orders")

.update({

finance_done:true

})

.in(
"id",
returnIds
);






if(error){


console.log(error);

return;


}






alert(
"تم استلام الرواجع"
);



loadFinance();




};









// =========================
// الطلبات المحددة
// =========================


function getSelected(){


return [

...document
.querySelectorAll(
".finance-check:checked"
)

]

.map(
x=>x.value
);


}








// =========================
// البحث
// =========================


const search = document.getElementById(
"searchFinance"
);



if(search){


search.oninput=function(){


let value=this.value;


document
.querySelectorAll(
"#financeOrders tr"
)

.forEach(row=>{


row.style.display =

row.innerText
.includes(value)

?
""
:
"none";


});



};


}









// =========================
// اسم الحالة
// =========================


function statusName(status){



let names={


completed:
"مكتمل",


cancelled:
"ملغي"


};




return names[status] || status;



}







loadFinance();