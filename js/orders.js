import {supabase} from "./supabase.js";


const urlParams = new URLSearchParams(
window.location.search
);

const editId = urlParams.get("id");


const categorySelect =
document.getElementById("category");


const productSelect =
document.getElementById("product");


const variantSelect =
document.getElementById("variant");


const governorateSelect =
document.getElementById("governorate");



let cart = [];

let deliveryPrice = 0;

let governorates = [];





// =====================
// المحافظات
// =====================

async function loadGovernorates(){


const {data,error}=

await supabase

.from("governorates")

.select("*");



if(error){

console.log(error);

return;

}



governorates=data;



data.forEach(g=>{


governorateSelect.innerHTML +=`

<option value="${g.name}">

${g.name}

</option>

`;


});


}





// تغيير المحافظة

governorateSelect.onchange=()=>{


let g =
governorates.find(
x=>x.name === governorateSelect.value
);



if(g){

deliveryPrice =
Number(g.delivery_price);

updateTotal();

generateMessage();

}


}









// =====================
// تحميل الأصناف
// =====================


async function loadCategories(){


const {data,error}=

await supabase

.from("categories")

.select("*");



if(error)return;



data.forEach(c=>{


categorySelect.innerHTML +=`

<option value="${c.id}">

${c.name}

</option>


`;


});


}







// =====================
// المنتجات حسب الصنف
// =====================


categorySelect.onchange=async()=>{


productSelect.innerHTML=
`
<option>
اختار المنتج
</option>
`;


variantSelect.innerHTML=
`
<option>
اختار التفاصيل
</option>
`;



const {data}=

await supabase

.from("products")

.select("*")

.eq(
"category_id",
categorySelect.value
);



data.forEach(p=>{


productSelect.innerHTML +=`

<option value="${p.id}">

${p.name}

</option>

`;


});


}









// =====================
// تفاصيل المنتج
// =====================


productSelect.onchange=async()=>{


variantSelect.innerHTML=

`
<option>
اختار اللون والحجم
</option>
`;



const {data}=

await supabase

.from("product_variants")

.select(`

id,
color,
size,
stock_quantity,
products(price,name)

`)

.eq(
"product_id",
productSelect.value
);



data.forEach(v=>{


variantSelect.innerHTML +=`

<option value="${v.id}">

${v.color} - ${v.size}
(متوفر ${v.stock_quantity})

</option>

`;



});


}








// =====================
// إضافة للسلة
// =====================


document
.getElementById("addItem")
.onclick=async()=>{


let id =
variantSelect.value;



let qty =
Number(
document.getElementById("qty").value
);



const {data:v}=

await supabase

.from("product_variants")

.select(`

stock_quantity,

color,

size,

products(

name,

price,

categories(name)

)

`)

.eq("id",id)

.single();




if(qty > v.stock_quantity){


alert(
`المتوفر فقط ${v.stock_quantity}`
);


return;

}



cart.push({

variant_id:id,

quantity:qty,

color:v.color,

size:v.size,

product:v.products.name,

category:v.products.categories.name,

price:v.products.price

});



renderCart();

generateMessage();


}









// =====================
// عرض السلة
// =====================


function renderCart(){


let html="";

let total=0;



cart.forEach((x,i)=>{


total +=
x.price*x.quantity;



html +=`

<tr>

<td>${x.category}</td>

<td>${x.product}</td>

<td>${x.color}</td>

<td>${x.size}</td>

<td>${x.price}</td>

<td>${x.quantity}</td>


<td>

<button onclick="removeItem(${i})">

حذف

</button>

</td>


</tr>

`;



});




document.getElementById("cart").innerHTML=html;


document.getElementById("total").innerText=total;


updateTotal();



}




window.removeItem=(i)=>{


cart.splice(i,1);

renderCart();

generateMessage();

}









// =====================
// التوصيل
// =====================


document
.getElementById("autoDelivery")
.onclick=()=>{


document
.getElementById("manualBox")
.style.display="none";


let g = governorates.find(
x=>x.name === governorateSelect.value
);


deliveryPrice =
g ? Number(g.delivery_price):0;



updateTotal();


}




document
.getElementById("manualDelivery")
.onclick=()=>{


document
.getElementById("manualBox")
.style.display="block";


}






document
.getElementById("deliveryPrice")
.oninput=()=>{


deliveryPrice =

Number(
document.getElementById("deliveryPrice").value
);


updateTotal();


}







function updateTotal(){


let items =

Number(
document.getElementById("total").innerText
);



document
.getElementById("finalTotal")
.innerText =
items + deliveryPrice;


}




// =====================
// الاستقطاع
// =====================


document
.getElementById("hasRefund")
.onchange = ()=>{


let box =
document.getElementById("refundBox");



if(
document.getElementById("hasRefund").checked
){


box.style.display="block";


}else{


box.style.display="none";


document
.getElementById("refundAmount")
.value="";


}



generateMessage();


}






document

.getElementById("refundAmount")

.oninput = ()=>{


generateMessage();


}









// =====================
// قالب رسالة الواتساب
// =====================


function generateMessage(){



let items="";



cart.forEach(x=>{


items += `

${x.product}

اللون: ${x.color}

الحجم: ${x.size}

الكمية: ${x.quantity}

السعر: ${x.price} دينار


`;



});






let message = `


مرحبا ${document.getElementById("name").value} 🌸



تم تثبيت حجزك من NIVRA 🤍



تفاصيل الطلب:



${items}



المحافظة:

${document.getElementById("governorate").value}



العنوان:

${document.getElementById("address").value}



رقم الهاتف:

${document.getElementById("phone").value}



مبلغ التوصيل:

${deliveryPrice} دينار



المجموع:

${document.getElementById("finalTotal").innerText} دينار



تاريخ الحجز:

${new Date().toLocaleDateString()}



`;







// استرجاع

if(
document.getElementById("hasReturn").checked
){


message += `


ملاحظة:

يوجد تبديل/استرجاع قطعة



`;



}







// استقطاع

if(

document.getElementById("hasRefund").checked

){


let amount =

document.getElementById("refundAmount").value;



if(amount){


message +=`


في حال رفض الطلب يوجد استقطاع مبلغ:

${amount} دينار



`;



}


}






message +=`


شكراً لاختيارك NIVRA 🤍



`;







document

.getElementById("whatsappMessage")

.value = message;



}








// =====================
// تحديث الرسالة مباشرة
// =====================



[

"name",

"phone",

"address",

"notes",

"refundAmount"


].forEach(id=>{


document

.getElementById(id)

.oninput = generateMessage;



});






document

.getElementById("governorate")

.onchange = generateMessage;





document

.getElementById("hasReturn")

.onchange = generateMessage;






// تحديث بعد التوصيل


document

.getElementById("deliveryPrice")

.oninput = ()=>{


deliveryPrice =

Number(

document.getElementById("deliveryPrice").value

);


updateTotal();


generateMessage();



};


// =====================
// حفظ الطلب
// =====================


document
.getElementById("saveOrder")
.onclick=async()=>{


const {data:customer}=

await supabase

.from("customers")

.insert({

name:
name.value,

phone:
phone.value,

address:
address.value,

governorate:
governorate.value

})

.select()

.single();




const {data:order}=

await supabase

.from("orders")

.insert({

customer_id:customer.id,

source:source.value,

customer_name:name.value,

phone:phone.value,

governorate:governorate.value,

address:address.value,

delivery_price:deliveryPrice,

total_price:
Number(finalTotal.innerText),

notes:notes.value,

has_return:
hasReturn.checked,

has_partial_refund:
hasRefund.checked,

refund_amount:
Number(refundAmount.value || 0)

})

.select()

.single();





for(let x of cart){



await supabase

.from("order_items")

.insert({

order_id:order.id,

variant_id:x.variant_id,

quantity:x.quantity,

price:x.price

});





await supabase

.from("stock_movements")

.insert({

variant_id:x.variant_id,

type:"OUT",

quantity:x.quantity,

note:`Order ${order.id}`

});





const {data:s}=

await supabase

.from("product_variants")

.select("stock_quantity")

.eq("id",x.variant_id)

.single();





await supabase

.from("product_variants")

.update({

stock_quantity:
s.stock_quantity-x.quantity

})

.eq("id",x.variant_id);



}




alert("تم حفظ الطلب 🔥");


}

// =====================
// حفظ + ارسال واتساب
// =====================


document
.getElementById("saveAndWhatsapp")
.onclick = async ()=>{


// أولا حفظ الطلب

await document
.getElementById("saveOrder")
.click();



// انتظار بسيط حتى يكتمل الحفظ

setTimeout(()=>{


// بعدها ارسال الواتساب

document
.getElementById("whatsapp")
.click();



},1000);



};

// =====================
// زر ارسال واتساب
// =====================


document

.getElementById("whatsapp")

.onclick = ()=>{


generateMessage();



let phone =

document

.getElementById("phone")

.value;



if(!phone){


alert("ادخل رقم الهاتف");

return;


}




let text =

document

.getElementById("whatsappMessage")

.value;




window.open(

`https://wa.me/964${phone.substring(1)}?text=${encodeURIComponent(text)}`

);


};






loadGovernorates();

loadCategories();

loadGovernorates();

loadCategories();


// =====================
// تحميل الطلب للتعديل
// =====================

async function loadOrderForEdit(id){


const {data,error}=await supabase

.from("orders")

.select(`

*,

order_items(

quantity,

price,

variant_id,

product_variants(

color,

size,

products(

name,

price,

categories(

name

)

)

)

)

`)

.eq("id",id)

.single();



if(error){

console.log(error);

return;

}



document.getElementById("name").value =
data.customer_name || "";


document.getElementById("phone").value =
data.phone || "";


document.getElementById("governorate").value =
data.governorate || "";


document.getElementById("address").value =
data.address || "";


document.getElementById("notes").value =
data.notes || "";



deliveryPrice =
Number(data.delivery_price || 0);



document.getElementById("deliveryPrice").value =
deliveryPrice;




cart=[];



data.order_items.forEach(item=>{


cart.push({

variant_id:item.variant_id,

quantity:item.quantity,

color:item.product_variants.color,

size:item.product_variants.size,

product:item.product_variants.products.name,

category:
item.product_variants.products.categories.name,

price:item.price


});


});



renderCart();

generateMessage();



window.editingOrder = id;



document.getElementById("saveOrder").innerHTML=`

<i class="fa-solid fa-pen"></i>

تحديث الطلب

`;



}





// تشغيل التعديل اذا موجود ID

if(editId){

loadOrderForEdit(editId);

}