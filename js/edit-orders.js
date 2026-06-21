import {supabase} from "./supabase.js";


// =====================
// المتغيرات
// =====================

const name =
document.getElementById("name");

const phone =
document.getElementById("phone");

const address =
document.getElementById("address");

const nearest_point =
document.getElementById("nearest_point");

const source =
document.getElementById("source");

const notes =
document.getElementById("notes");

const status =
document.getElementById("status");

const payment_method =
document.getElementById("payment_method");

const governorate =
document.getElementById("governorate");

const hasReturn =
document.getElementById("hasReturn");

const hasRefund =
document.getElementById("hasRefund");

const refundAmount =
document.getElementById("refundAmount");

const qty =
document.getElementById("qty");

const saveEdit =
document.getElementById("saveEdit");

const saveAndWhatsapp =
document.getElementById("saveAndWhatsapp");

const finalTotal =
document.getElementById("finalTotal");

const deliveryTotal =
document.getElementById("deliveryTotal");
const params =
new URLSearchParams(location.search);


const orderId =
params.get("id");



let cart=[];

let oldItems=[];

let deliveryPrice=0;

let currentOrder=null;



// =====================
// العناصر
// =====================


const category =
document.getElementById("category");


const product =
document.getElementById("product");


const size =
document.getElementById("size");


const color =
document.getElementById("color");





// =====================
// تحميل الأصناف
// =====================


async function loadCategories(){


const {data}=await supabase

.from("categories")

.select("*");



category.innerHTML=
`
<option value="">
اختار الصنف
</option>
`;



data.forEach(c=>{


category.innerHTML +=`

<option value="${c.id}">

${c.name}

</option>

`;

});


}







// =====================
// المحافظات
// =====================



async function loadGovernorates(){


const {data}=await supabase

.from("governorates")

.select("*");



governorate.innerHTML=
`
<option value="">
اختار المحافظة
</option>
`;



data.forEach(g=>{


governorate.innerHTML +=`

<option

value="${g.name}"

data-price="${g.delivery_price}"

>

${g.name}

</option>


`;

});


}









// =====================
// تحميل الطلب
// =====================



async function loadOrder(){



const {data,error}=await supabase

.from("orders")

.select("*")

.eq("id",orderId)

.single();



if(error){

alert(error.message);

return;

}



currentOrder=data;



document.getElementById("orderId").value=data.id;


name.value=data.customer_name || "";

phone.value=data.phone || "";

address.value=data.address || "";

nearest_point.value=data.nearest_point || "";


source.value=data.source || "";


notes.value=data.notes || "";


status.value=data.status;



payment_method.value=data.payment_method || "cash";



hasReturn.checked=data.has_return;


hasRefund.checked=data.has_partial_refund;


refundAmount.value=data.refund_amount || 0;




governorate.value=data.governorate;



deliveryPrice=

Number(data.delivery_price ||0);



deliveryPriceInput();



await loadItems();



updateTotal();



}









// =====================
// تحميل القطع
// =====================



async function loadItems(){



const {data}=await supabase

.from("order_items")

.select(`

id,

quantity,

price,

variant_id,

product_variants(

id,

color,

size,

image,

products(

name

)

)

`)

.eq(

"order_id",

orderId

);




oldItems=data;



cart=[];



data.forEach(i=>{


cart.push({


id:i.id,


variant_id:i.variant_id,


quantity:i.quantity,


price:i.price,


product:

i.product_variants.products.name,


color:

i.product_variants.color,


size:

i.product_variants.size,


image:

i.product_variants.image


});


});



renderCart();


}









// =====================
// المنتجات
// =====================



category.onchange=async()=>{


product.innerHTML="";


const {data}=await supabase

.from("products")

.select("*")

.eq(

"category_id",

category.value

);



data.forEach(p=>{


product.innerHTML +=`

<option value="${p.id}">

${p.name}

</option>

`;

});


};






product.onchange=async()=>{


size.innerHTML="";


const {data}=await supabase

.from("product_variants")

.select("*")

.eq(

"product_id",

product.value

);



let sizes=[];



data.forEach(v=>{


if(!sizes.includes(v.size))

sizes.push(v.size);



});



sizes.forEach(s=>{


size.innerHTML+=`

<option>

${s}

</option>

`;

});


};






size.onchange=async()=>{


color.innerHTML="";


const {data}=await supabase

.from("product_variants")

.select("*")

.eq(

"product_id",

product.value

)

.eq(

"size",

size.value

);



data.forEach(v=>{


color.innerHTML +=`

<option value="${v.id}">

${v.color}

متوفر ${v.stock_quantity}

</option>

`;

});


};









// =====================
// إضافة قطعة
// =====================



addItem.onclick=async()=>{


const {data:v}=await supabase

.from("product_variants")

.select(`

*,

products(

name,

price

)

`)

.eq(

"id",

color.value

)

.single();





let q=

Number(qty.value);



if(v.stock_quantity < q){

alert("المخزون غير كافي");

return;

}




cart.push({


variant_id:v.id,


quantity:q,


price:v.products.price,


product:v.products.name,


color:v.color,


size:v.size,


image:v.image


});




renderCart();


};









// =====================
// عرض السلة
// =====================



function renderCart(){


let html="";


let total=0;



cart.forEach((x,i)=>{


total+=x.price*x.quantity;



html+=`

<div class="cart-item">


<img src="${x.image || '../images/default.jpg'}">


<h3>

${x.product}

</h3>


<p>

${x.color}

-

${x.size}

</p>


<p>

الكمية:
${x.quantity}

</p>



<b>

${x.price}

دينار

</b>



<button onclick="removeItem(${i})">

حذف

</button>


</div>


`;


});



document.getElementById("cart").innerHTML=html;

// اظهار الاسترجاع فقط اذا اكثر من منتج

let returnCheck = document.getElementById("returnCheckBox");


let uniqueVariants = new Set(
    cart.map(x => x.variant_id)
);



if(uniqueVariants.size > 1){

    returnCheck.style.display = "block";


}else{

    returnCheck.style.display = "none";

    document.getElementById("hasReturn").checked = false;

}
document.getElementById("total").innerText=total;


updateTotal();


}




window.removeItem=function(i){

cart.splice(i,1);

renderCart();

};









// =====================
// الحساب
// =====================


function updateTotal(){


let t=

Number(document.getElementById("total").innerText);


deliveryTotal.innerText=

deliveryPrice;


finalTotal.innerText=

t+deliveryPrice;


}






function deliveryPriceInput(){

deliveryTotal.innerText=deliveryPrice;

}





governorate.onchange=()=>{


let price=

governorate.options[

governorate.selectedIndex

].dataset.price ||0;



deliveryPrice=

Number(price);



updateTotal();


};







// =====================
// الحفظ
// =====================



saveEdit.onclick=async()=>{


// 1 تعديل العميل



let {data:customer}=await supabase

.from("customers")

.select("*")

.eq(

"phone",

phone.value

)

.maybeSingle();





if(!customer){


const {data:newC}=await supabase

.from("customers")

.insert({

name:name.value,

phone:phone.value,

address:address.value,

governorate:governorate.value

})

.select()

.single();



customer=newC;


}





await supabase

.from("customers")

.update({

name:name.value,

address:address.value,

governorate:governorate.value

})

.eq(

"id",

customer.id

);








// 2 رجع المخزون القديم



for(let x of oldItems){


const {data:v}=await supabase

.from("product_variants")

.select("stock_quantity")

.eq(

"id",

x.variant_id

)

.single();




await supabase

.from("product_variants")

.update({

stock_quantity:

v.stock_quantity+x.quantity

})

.eq(

"id",

x.variant_id

);



}







// 3 حذف القطع القديمة


await supabase

.from("order_items")

.delete()

.eq(

"order_id",

orderId

);







// 4 خصم الجديدة



for(let x of cart){



const {data:v}=await supabase

.from("product_variants")

.select("stock_quantity")

.eq(

"id",

x.variant_id

)

.single();




await supabase

.from("product_variants")

.update({

stock_quantity:

v.stock_quantity-x.quantity

})

.eq(

"id",

x.variant_id);



await supabase

.from("order_items")

.insert({

order_id:orderId,

variant_id:x.variant_id,

quantity:x.quantity,

price:x.price

});



}








// 5 تحديث الطلب



await supabase

.from("orders")

.update({


customer_id:customer.id,


customer_name:name.value,


phone:phone.value,


address:address.value,


governorate:governorate.value,


nearest_point:nearest_point.value,


source:source.value,


notes:notes.value,


status:status.value,


delivery_price:deliveryPrice,


total_price:Number(finalTotal.innerText),


has_return:hasReturn.checked,


has_partial_refund:hasRefund.checked,


refund_amount:Number(refundAmount.value||0),


payment_method:payment_method.value


})

.eq(

"id",

orderId

);







// history


await supabase

.from("order_status_history")

.insert({

order_id:orderId,

status:status.value

});







await supabase

.from("activity_logs")

.insert({

action:"UPDATE_ORDER",

table_name:"orders",

record_id:orderId

});







alert("تم تعديل الطلب ✅");


};









// =====================
// واتساب
// =====================



saveAndWhatsapp.onclick=()=>{


saveEdit.click();



setTimeout(()=>{


let msg=

`

NIVRA FASHION

الاسم:
${name.value}


المبلغ:

${finalTotal.innerText}

دينار


`;



window.open(

`https://wa.me/964${phone.value.substring(1)}?text=${encodeURIComponent(msg)}`

);


},1200);



};









// تشغيل



async function init(){


await loadCategories();

await loadGovernorates();

await loadOrder();


}



init();