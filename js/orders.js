import {supabase} from "./supabase.js";


const urlParams = new URLSearchParams(
window.location.search
);

const editId = urlParams.get("id");


const categorySelect =
document.getElementById("category");


const productSelect =
document.getElementById("product");

const sizeSelect =
document.getElementById("size");


const colorSelect =
document.getElementById("color");
const qtyInput =
document.getElementById("qty");

const sourceSelect =
document.getElementById("source");

const governorateSelect =
document.getElementById("governorate");



let cart = [];

let deliveryPrice = 0;

let governorates = [];



// =====================
// تحميل الأصناف
// =====================


async function loadCategories(){

const {data,error}=await supabase
.from("categories")
.select("*");


if(error) return;


categorySelect.innerHTML=`

<option value="">
اختار الصنف
</option>

`;


data.forEach(c=>{

categorySelect.innerHTML +=`

<option value="${c.id}">
${c.name}
</option>

`;

});


}

function validatePhone(){


let phone=
document.getElementById("phone").value;



let regex=/^(077|078|079|075)[0-9]{8}$/;



if(!regex.test(phone)){


alert("رقم الهاتف غير صالح يجب ان يبدأ بـ 077 او 078 او 079 او 075");


document.getElementById("phone").focus();


return false;


}


return true;


}


// =====================
// بحث مباشر عن الزبون
// =====================

let phoneSearchTimeout = null;


document
.getElementById("phone")
.addEventListener("input", function(){


let phone = this.value.trim();


// اخفاء مباشر اذا ناقص

if(phone.length < 11){

document
.getElementById("customerInfo")
.classList.remove("show");

return;

}



// انتظار بسيط

clearTimeout(phoneSearchTimeout);



phoneSearchTimeout = setTimeout(async()=>{



const {data,error}=

await supabase

.from("customers")

.select("*")

.eq("phone",phone)

.maybeSingle();





if(error || !data){


document
.getElementById("customerInfo")
.classList.remove("show");


return;


}





// الاسم

document
.getElementById("name")
.value =
data.name || "";



// العدادات

document
.getElementById("completedCount")
.innerText =
data.completed_orders || 0;



document
.getElementById("cancelledCount")
.innerText =
data.cancelled_orders || 0;



// اظهار

document
.getElementById("customerInfo")
.classList.add("show");



generateMessage();



},300);



});
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


sizeSelect.innerHTML=
`
<option>
اختار الحجم
</option>
`;


colorSelect.innerHTML=
`
<option>
اختار اللون
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




productSelect.onchange=async()=>{


sizeSelect.innerHTML=`

<option>

اختار الحجم

</option>

`;


colorSelect.innerHTML=`

<option>

اختار اللون

</option>

`;



const {data}=

await supabase

.from("product_variants")

.select("size")

.eq(
"product_id",
productSelect.value
);



let sizes=[];


data.forEach(x=>{

if(!sizes.includes(x.size)){

sizes.push(x.size);

}

});



sizes.forEach(s=>{


sizeSelect.innerHTML +=`

<option value="${s}">

${s}

</option>

`;


});


}
sizeSelect.onchange=async()=>{


colorSelect.innerHTML=`

<option>

اختار اللون

</option>

`;



const {data}=

await supabase

.from("product_variants")

.select(`

id,

color,

stock_quantity

`)

.eq(
"product_id",
productSelect.value
)

.eq(
"size",
sizeSelect.value
);




data.forEach(c=>{


colorSelect.innerHTML +=`

<option value="${c.id}">

${c.color}

(متوفر ${c.stock_quantity})

</option>

`;


});


}
async function loadGovernorates(){

const {data,error}=await supabase
.from("governorates")
.select("*");


if(error){

console.log(error);
return;

}


governorates = data;



const box = governorateSelect;


box.innerHTML = `

<option value="">
اختار المحافظة
</option>

`;



data.forEach(g=>{


box.innerHTML += `

<option 
value="${g.name}"
data-price="${g.delivery_price}">

${g.name}

</option>

`;

});




// =====================
// تغيير المحافظة
// =====================

box.onchange = ()=>{


// إذا التوصيل تلقائي

if(
document.getElementById("autoDelivery").checked
){


let price = 0;

if(box.selectedIndex >= 0){

    price = box.options[box.selectedIndex].getAttribute("data-price") || 0;

}


deliveryPrice =
Number(price || 0);


updateTotal();

generateMessage();


}



};




// =====================
// تلقائي حسب المحافظة
// =====================


document
.getElementById("autoDelivery")
.onchange = ()=>{


document
.getElementById("manualBox")
.style.display="none";

let price = 0;

if(box.selectedIndex >= 0){

    price = box.options[box.selectedIndex].getAttribute("data-price") || 0;

}

deliveryPrice =
Number(price || 0);



document
.getElementById("deliveryPrice")
.value =
deliveryPrice;



updateTotal();

generateMessage();



};




// =====================
// تحديد يدوي
// =====================


document
.getElementById("manualDelivery")
.onchange = ()=>{


document
.getElementById("manualBox")
.style.display="block";



deliveryPrice =

Number(

document
.getElementById("deliveryPrice")
.value || 0

);



updateTotal();

generateMessage();



};




// =====================
// تغيير سعر التوصيل يدوي
// =====================


document
.getElementById("deliveryPrice")
.oninput = ()=>{


if(

document
.getElementById("manualDelivery")
.checked

){



deliveryPrice =

Number(

document
.getElementById("deliveryPrice")
.value || 0

);



updateTotal();

generateMessage();


}


};



}

// =====================
// إضافة للسلة
// =====================


document
.getElementById("addItem")
.onclick = async()=>{


let qty = Number(qtyInput.value);


if(
!categorySelect.value ||
!productSelect.value ||
!sizeSelect.value ||
!colorSelect.value ||
qty <= 0
){

alert("اكمل اختيار الصنف والمنتج والحجم واللون والكمية");
return;

}



let id = colorSelect.value;



const {data:v,error}=

await supabase

.from("product_variants")

.select(`

stock_quantity,

color,

size,

image,

products(

name,

price,

categories(name)

)

`)

.eq("id",id)

.single();





if(error || !v){

alert("لا يوجد هذا المنتج بالمخزون");
return;

}





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

image:v.image,

product:v.products.name,

category:v.products.categories.name,

price:v.products.price

});



renderCart();

generateMessage();

};

// =====================
// عرض السلة
// =====================

function renderCart(){


let html="";

let total=0;



cart.forEach((x,i)=>{


total += x.price * x.quantity;



html +=`

<div class="cart-item">


<img src="${x.image || '../images/default.jpg'}">


<h3>

${x.product}

</h3>



<div class="cart-info">


<span>

${x.color}

</span>


<span>

${x.size}

</span>



<span>

الكمية: ${x.quantity}

</span>


</div>





<div class="cart-price">


${x.price} دينار


</div>





<button onclick="removeItem(${i})">


حذف


</button>



</div>

`;



});





document.getElementById("cart").innerHTML = html;


document.getElementById("total").innerText = total;


updateTotal();


}


window.removeItem=(i)=>{


cart.splice(i,1);

renderCart();

generateMessage();

}




// إذا التلقائي شغال
if(document.getElementById("autoDelivery").checked){



let g = governorates.find(
x=>x.name === governorateSelect.value
);



if(g){


deliveryPrice =
Number(g.delivery_price);



document
.getElementById("deliveryPrice")
.value = deliveryPrice;


}



updateTotal();

generateMessage();


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


let items = "";


cart.forEach(x=>{


items += `🛍️ ${x.product}
اللون: ${x.color}  الحجم: ${x.size}  الكمية: ${x.quantity}
السعر: ${x.price} دينار`;


});





let message = `✨ NIVRA FASHION ✨
مرحباً ${document.getElementById("name").value} تم تثبيت حجزك بنجاح 🤍

👤 معلومات الزبون:
━━━━━━━━━━━━━━
الاسم:${document.getElementById("name").value}
رقم الهاتف:${document.getElementById("phone").value}
المحافظة:${document.getElementById("governorate").value}
العنوان:${document.getElementById("address").value}
📅 تاريخ الطلب:${new Date().toLocaleDateString()}
━━━━━━━━━━━━━━

📦 تفاصيل الطلب:
━━━━━━━━━━━━━━
${items}
🚚 التوصيل:${deliveryPrice} دينار
💰 المجموع النهائي:${document.getElementById("finalTotal").innerText} دينار
━━━━━━━━━━━━━━`;

// تبديل واسترجاع

if(document.getElementById("hasReturn").checked){


message += `
🔄 تم إرسال قطعتين مع المندوب
قطعة للاستلام والقطعة الأخرى يتم تسليمها لمندوب الشركة لإرجاعها.
`;

}





// استقطاع

if(document.getElementById("hasRefund").checked){


let amount =
document.getElementById("refundAmount").value;


if(amount){


message += `
⚠️ في حال رفض الطلب:سيتم استقطاع مبلغ ${amount} دينار لمندوب الشركة.`;

}


}





message += `

🛒 زوروا متجرنا الإلكتروني:https://niverafashion.github.io/store/index.html
شكراً لثقتك بـ NIVRA 🤍 نتمنى لك تجربة جميلة ✨`;






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
.getElementById("autoDelivery")
.onchange = ()=>{


document
.getElementById("manualBox")
.style.display="none";


let price = 0;

if(box.selectedIndex >= 0){

price =
box.options[box.selectedIndex]
.getAttribute("data-price") || 0;

}


deliveryPrice = Number(price);


updateTotal();

generateMessage();


};
function validateOrder(){


const phone =
document.getElementById("phone").value.trim();


const governorate =
document.getElementById("governorate").value.trim();


const address =
document.getElementById("address").value.trim();


const source =
document.getElementById("source").value.trim();




// رقم الهاتف

if(!phone){

alert("ادخل رقم الهاتف");

document.getElementById("phone").focus();

return false;

}


if(!validatePhone()){

return false;

}



// المحافظة

if(!governorate){

alert("اختار المحافظة");

document.getElementById("governorate").focus();

return false;

}



// العنوان

if(!address){

alert("ادخل العنوان");

document.getElementById("address").focus();

return false;

}




// مصدر الطلب

if(!source){

alert("اختار طريقة الطلب");

document.getElementById("source").focus();

return false;

}




// لازم يكون اكو منتج

if(cart.length === 0){

alert("ضيف منتج واحد على الاقل للطلب");

document.getElementById("addItem").focus();

return false;

}




// إذا التوصيل يدوي

if(
document.getElementById("manualDelivery").checked
){


let price =
document.getElementById("deliveryPrice").value.trim();



if(!price || Number(price)<=0){


alert("ادخل مبلغ التوصيل");

document
.getElementById("deliveryPrice")
.focus();


return false;

}


}




// إذا يوجد استقطاع

if(
document.getElementById("hasRefund").checked
){


let refund =
document.getElementById("refundAmount")
.value
.trim();



if(!refund || Number(refund)<=0){


alert("ادخل مبلغ الاستقطاع");

document
.getElementById("refundAmount")
.focus();


return false;


}


}



return true;


}
// =====================
// حفظ الطلب
// =====================


document
.getElementById("saveOrder")
.onclick=async()=>{


if(!validateOrder()) return;


let {data:customer,error:customerError}=

await supabase

.from("customers")

.select("*")

.eq(
"phone",
phone.value
)

.single();





if(!customer){


const {data:newCustomer,error}=

await supabase

.from("customers")

.insert({

name:name.value,

phone:phone.value,

address:address.value,

governorate:governorate.value

})

.select()

.single();


customer = newCustomer;


}




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


if(!validateOrder()) return;


// أولا حفظ الطلب

document
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


if(!validateOrder()) return;


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

