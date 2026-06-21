import {supabase} from "./supabase.js";


// =====================
// العناصر
// =====================

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

.select("*")

.order("created_at",{ascending:false});


if(error){

console.log(error);

return;

}



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



// =====================
// التحقق من الهاتف
// =====================


function validatePhone(){


let phone =
document.getElementById("phone").value.trim();



let regex =
/^(077|078|079|075)[0-9]{8}$/;



if(!regex.test(phone)){


alert(
"رقم الهاتف غير صالح"
);



document.getElementById("phone").focus();


return false;

}



return true;


}



// =====================
// البحث عن الزبون
// =====================


let phoneTimeout;



document

.getElementById("phone")

.addEventListener("input",function(){


let phone=this.value.trim();



if(phone.length < 11){


document

.getElementById("customerInfo")

.classList.remove("show");


return;


}



clearTimeout(phoneTimeout);



phoneTimeout=setTimeout(async()=>{



const {data,error}=await supabase

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





document

.getElementById("name")

.value=data.name || "";




document

.getElementById("address")

.value=data.address || "";





document

.getElementById("completedCount")

.innerText=data.completed_orders || 0;



document

.getElementById("cancelledCount")

.innerText=data.cancelled_orders || 0;




document

.getElementById("customerInfo")

.classList.add("show");



generateMessage();



},400);



});





// =====================
// المنتجات حسب الصنف
// =====================


categorySelect.onchange=async()=>{


productSelect.innerHTML=`

<option>
اختار المنتج
</option>

`;

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





const {data,error}=await supabase

.from("products")

.select("*")

.eq(
"category_id",
categorySelect.value
)

.eq(
"status",
true
);



if(error)return;



data.forEach(p=>{


productSelect.innerHTML +=`

<option value="${p.id}">

${p.name}

</option>

`;


});


};





// =====================
// الأحجام
// =====================


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




const {data}=await supabase

.from("product_variants")

.select(
"size,stock_quantity"
)

.eq(
"product_id",
productSelect.value
)

.gt(
"stock_quantity",
0
);




let sizes=[];



data.forEach(v=>{


if(!sizes.includes(v.size)){


sizes.push(v.size);


}



});




sizes.forEach(s=>{


sizeSelect.innerHTML +=`

<option value="${s}">

${s}

</option>

`;


});


};





// =====================
// الألوان
// =====================


sizeSelect.onchange=async()=>{


colorSelect.innerHTML=`

<option>
اختار اللون
</option>

`;




const {data}=await supabase

.from("product_variants")

.select("*")

.eq(
"product_id",
productSelect.value
)

.eq(
"size",
sizeSelect.value
)

.gt(
"stock_quantity",
0
);




data.forEach(v=>{


colorSelect.innerHTML +=`

<option value="${v.id}">

${v.color}
(متوفر ${v.stock_quantity})

</option>

`;


});


};





// =====================
// المحافظات
// =====================


async function loadGovernorates(){



const {data,error}=await supabase

.from("governorates")

.select("*");



if(error)return;



governorates=data;




governorateSelect.innerHTML=`

<option value="">
اختار المحافظة
</option>

`;





data.forEach(g=>{


governorateSelect.innerHTML +=`

<option

value="${g.name}"

data-price="${g.delivery_price}">

${g.name}

</option>

`;



});



}



// تغيير المحافظة


governorateSelect.onchange=()=>{


if(
document.getElementById("autoDelivery").checked
){


let price =
governorateSelect

.options[governorateSelect.selectedIndex]

.dataset.price || 0;



deliveryPrice =
Number(price);



document

.getElementById("deliveryPrice")

.value=deliveryPrice;



updateTotal();

generateMessage();


}



};





// =====================
// التوصيل اليدوي
// =====================



document

.getElementById("manualDelivery")

.onchange=()=>{


document

.getElementById("manualBox")

.style.display="block";


deliveryPrice=0;


document

.getElementById("deliveryPrice")

.value="";


updateTotal();


};





document

.getElementById("autoDelivery")

.onchange=()=>{


document

.getElementById("manualBox")

.style.display="none";



let price =
governorateSelect

.options[governorateSelect.selectedIndex]

?.dataset.price || 0;



deliveryPrice =
Number(price);



updateTotal();


generateMessage();


};





document

.getElementById("deliveryPrice")

.oninput=()=>{


if(
document.getElementById("manualDelivery").checked
){


deliveryPrice =

Number(
document.getElementById("deliveryPrice").value || 0
);



updateTotal();


}


};
// =====================
// إضافة قطعة للسلة
// =====================


document

.getElementById("addItem")

.onclick = async()=>{



let qty =
Number(qtyInput.value);



if(
!colorSelect.value ||
qty <=0
){


alert("اكمل بيانات القطعة");


return;


}




const {data:v,error}=await supabase

.from("product_variants")

.select(`

id,

color,

size,

image,

stock_quantity,

products(

name,

price

)

`)

.eq(
"id",
colorSelect.value
)

.single();





if(error || !v){


alert("خطأ بجلب المنتج");


return;


}






if(v.stock_quantity < qty){


alert(
"الكمية غير متوفرة بالمخزون"
);


return;


}





let existing =
cart.find(
x=>x.variant_id===v.id
);




if(existing){


existing.quantity += qty;



}else{


cart.push({


variant_id:v.id,


quantity:qty,


price:v.products.price,


product:v.products.name,


color:v.color,


size:v.size,


image:v.image


});


}



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



total +=
x.price * x.quantity;




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

الكمية ${x.quantity}

</span>


</div>



<div class="cart-price">

${x.price} دينار

</div>



<button onclick="removeItem(${i})">

🗑 حذف

</button>


</div>


`;



});




document

.getElementById("cart")

.innerHTML=html;




document

.getElementById("total")

.innerText=total;



updateTotal();

checkReturnVisibility();

}


function checkReturnVisibility(){


let box = document.getElementById("returnCheckBox");


// عدد الخيارات المختلفة (حجم + لون)
let variantsCount = new Set(

cart.map(x => 
x.size + "-" + x.color
)

).size;



if(variantsCount > 1){


box.style.display="block";


}else{


box.style.display="none";


document.getElementById("hasReturn").checked=false;


}



}


window.removeItem=function(index){


cart.splice(index,1);


renderCart();


generateMessage();


};








// =====================
// الحساب النهائي
// =====================



function updateTotal(){


let subtotal_price =

Number(
document.getElementById("total").innerText || 0
);



let discount =

Number(
document.getElementById("discount_amount")?.value || 0
);



let final =

subtotal_price + deliveryPrice - discount;



if(final < 0){

final = 0;

}



document

.getElementById("finalTotal")

.innerText = final;



generateMessage();


}







// =====================
// الاستقطاع
// =====================



document
.getElementById("hasRefund")
.onchange = ()=>{

let box = document.getElementById("refundBox");

let amount = document.getElementById("refundAmount");


if(document.getElementById("hasRefund").checked){


box.style.display="block";


// القيمة الابتدائية
amount.value = 5000;


}else{


box.style.display="none";

amount.value="";


}


generateMessage();

};



// =====================
// الخصم
// =====================


document

.getElementById("hasDiscount")

.onchange=()=>{


let box =

document.getElementById("discountBox");



if(
document.getElementById("hasDiscount").checked
){


box.style.display="block";


}else{


box.style.display="none";


document

.getElementById("discount_amount")

.value="";


}



updateTotal();


};




// =====================
// رسالة الواتساب
// =====================



function generateMessage(){


let items = "";

let total = 0;


// حساب المنتجات

cart.forEach(x=>{


let itemTotal = x.price * x.quantity;


// اذا يوجد تبديل نحسب القطعة مرة وحدة

if(document.getElementById("hasReturn").checked){


let exists = cart.findIndex(p=>

p.product === x.product &&
p.price === x.price &&
p.size === x.size &&
p.color === x.color

);

if(exists === cart.indexOf(x)){


total += x.price;


}



}else{


total += itemTotal;


}




items +=
`🛍 ${x.product}
اللون: ${x.color} | المقاس: ${x.size}
الكمية: ${x.quantity} | السعر: ${x.price.toLocaleString()} دينار

`;


});





let discount = Number(

document.getElementById("discount_amount").value || 0

);





let finalTotal =

total + deliveryPrice - discount;



if(finalTotal < 0){

finalTotal = 0;

}







let message =

`✨ NIVRA FASHION ✨
مرحباً ${document.getElementById("name").value} 🤍 تم تثبيت طلبك بنجاح ✅

👤 المعلومات الشخصية:
━━━━━━━━━━━━━
الاسم: ${document.getElementById("name").value}
الهاتف: ${document.getElementById("phone").value}
المحافظة: ${document.getElementById("governorate").value} - ${document.getElementById("address").value}
━━━━━━━━━━━━━

📦 تفاصيل الطلب:
━━━━━━━━━━━━━
${items}
━━━━━━━━━━━━━

💰 المبلغ الكلي:
━━━━━━━━━━━━━
كلفة المنتجات:${total.toLocaleString()} دينار
🚚 التوصيل:${deliveryPrice.toLocaleString()} دينار
${discount > 0 ? `🏷 الخصم:${discount.toLocaleString()} دينار` : ""}
المجموع النهائي:${finalTotal.toLocaleString()} دينار
${document.getElementById("notes").value.trim() ? `📝 الملاحظة:${document.getElementById("notes").value}` : ""}
━━━━━━━━━━━━━
`;

// الاسترجاع

if(document.getElementById("hasReturn").checked){


message +=

`
🔄 تم إرسال قطعتين للفحص. يرجى استلام القطعة المناسبة وإرجاع القطعة الأخرى مع مندوب التوصيل.

`;

}

// الاستقطاع

if(document.getElementById("hasRefund").checked){


message +=

`⚠️ في حال رفض الطلب يتوجب دفع مبلغ ${document.getElementById("refundAmount").value.toLocaleString()} ديناركأجور خدمة للمندوب.

`;

}





message +=

`🛒 زوروا موقعنا للتسوق الإلكتروني: https://niverafashion.github.io/store/index.html

شكراً لثقتكم بـ NIVRA 🤍`;





document

.getElementById("whatsappMessage")

.value = message;



}

// تحديث الرسالة تلقائياً


[
"name",
"phone",
"address",
"notes",
"refundAmount",
"discount_amount"
]
.forEach(id=>{


let el = document.getElementById(id);


if(el){

el.oninput = ()=>{


updateTotal();

generateMessage();


};


}


});



document

.getElementById("hasReturn")

.onchange=

generateMessage;





// =====================
// التحقق قبل الحفظ
// =====================


function validateOrder(){



let fields = [


{
id:"name",
msg:"ادخل اسم الزبون"
},


{
id:"phone",
msg:"ادخل رقم الهاتف"
},


{
id:"governorate",
msg:"اختار المحافظة"
},


{
id:"address",
msg:"ادخل العنوان"
},


{
id:"nearest_point",
msg:"ادخل أقرب نقطة دالة"
}


];





for(let field of fields){


let el =

document.getElementById(field.id);



if(
!el.value.trim()
){


alert(field.msg);


el.focus();


return false;


}


}





if(!validatePhone())

return false;




if(cart.length===0){


alert("ضيف منتج واحد على الاقل");


document.getElementById("category").focus();


return false;


}




if(

document.getElementById("manualDelivery").checked

&&

deliveryPrice<=0

){


alert("ادخل سعر التوصيل");


document.getElementById("deliveryPrice").focus();


return false;


}





if(

document.getElementById("hasDiscount").checked

&&

Number(document.getElementById("discount_amount").value)<=0

){


alert("ادخل مبلغ الخصم");


document.getElementById("discount_amount").focus();


return false;


}




return true;


}






// =====================
// حفظ الطلب
// =====================

async function saveOrder(clear=true){


if(!validateOrder())
return;



let phone =
document.getElementById("phone").value.trim();



// =====================
// العميل
// =====================


let {data:customer,error:customerError}=await supabase

.from("customers")

.select("*")

.eq(
"phone",
phone
)

.maybeSingle();



if(customerError){

console.log(customerError);
return;

}




let customerType="new";



if(!customer){



const {data:newCustomer,error}=await supabase

.from("customers")

.insert({

name:
document.getElementById("name").value,

phone:phone,

address:
document.getElementById("address").value,

governorate:
document.getElementById("governorate").value

})

.select()

.single();



if(error){

alert(error.message);

return;

}



customer=newCustomer;



}else{


customerType="old";


}






// تحديث بيانات العميل

await supabase

.from("customers")

.update({

orders_count:
(customer.orders_count || 0)+1,

last_order:
new Date()

})

.eq(
"id",
customer.id
);






// =====================
// إنشاء الطلب
// =====================


const {data:order,error}=await supabase

.from("orders")

.insert({


customer_id:customer.id,


customer_name:
document.getElementById("name").value,


phone:phone,


governorate:
document.getElementById("governorate").value,


address:
document.getElementById("address").value,


nearest_point:
document.getElementById("nearest_point").value,


source:
document.getElementById("source").value || null,


notes:
document.getElementById("notes").value || null,



subtotal_price:
Number(
document.getElementById("total").innerText || 0
),



delivery_price:
deliveryPrice,



discount_amount:
Number(
document.getElementById("discount_amount").value || 0
),



total_price:
Number(
document.getElementById("finalTotal").innerText || 0
),



delivery_type:

document.getElementById("manualDelivery").checked
?
"manual"
:
"auto",



has_return:

document.getElementById("hasReturn").checked,



has_partial_refund:

document.getElementById("hasRefund").checked,



refund_amount:

Number(
document.getElementById("refundAmount").value || 0
),



customer_type:

customerType,


payment_method:

"cash"


})

.select()

.single();





if(error){

alert(error.message);

return;

}





// =====================
// حالة الطلب
// =====================


await supabase

.from("order_status_history")

.insert({

order_id:order.id,

status:"new"

});







// =====================
// تفاصيل الطلب + المخزون
// =====================


for(let x of cart){



await supabase

.from("order_items")

.insert({

order_id:order.id,


variant_id:x.variant_id,


quantity:x.quantity,


price:x.price


});






let {data:stock}=await supabase

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
stock.stock_quantity - x.quantity

})

.eq(

"id",

x.variant_id

);






await supabase

.from("stock_movements")

.insert({

variant_id:x.variant_id,


type:"OUT",


quantity:x.quantity,


note:
`طلب جديد رقم ${order.id}`


});



}






// =====================
// سجل النشاط
// =====================


await supabase

.from("activity_logs")

.insert({

user_id:
document.getElementById("user_id")?.value || null,


action:
"CREATE_ORDER",


table_name:
"orders",


record_id:
order.id


});





alert("تم حفظ الطلب 🔥");



if(clear){

clearOrderForm();

}


}
// زر حفظ فقط
document
.getElementById("saveOrder")
.onclick=async()=>{

await saveOrder(true);

};
// =====================
// زر واتساب
// =====================

document
.getElementById("whatsapp")
.onclick=()=>{


if(!validateOrder())
return;


generateMessage();


let phone =
document
.getElementById("phone")
.value.trim();


let text =
document
.getElementById("whatsappMessage")
.value;



window.location.href =

`https://wa.me/964${phone.substring(1)}?text=${encodeURIComponent(text)}`;


// تنظيف بعد الخروج
setTimeout(()=>{

clearOrderForm();

},1000);


};




// =====================
// حفظ + واتساب
// =====================

document
.getElementById("saveAndWhatsapp")
.onclick=async()=>{


if(!validateOrder())
return;


// خزن الرسالة قبل التنظيف
generateMessage();

let phone =
document
.getElementById("phone")
.value.trim();


let text =
document
.getElementById("whatsappMessage")
.value;


// احفظ ونظف
await saveOrder(false);


// افتح الواتساب بعد التنظيف
window.location.href =

`https://wa.me/964${phone.substring(1)}?text=${encodeURIComponent(text)}`;


};






// =====================
// تنظيف الفورم
// =====================



function clearOrderForm(){

document

.getElementById("name")

.value="";


document

.getElementById("phone")

.value="";

// المحافظة
governorateSelect.selectedIndex = 0;

document

.getElementById("address")

.value="";

document

.getElementById("nearest_point")

.value="";

document

.getElementById("notes")

.value="";

categorySelect.value="";

productSelect.innerHTML=`

<option>

اختار المنتج

</option>

`;

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



qtyInput.value="1";





// السلة


cart=[];


renderCart();





// التوصيل


deliveryPrice=0;


document

.getElementById("deliveryPrice")

.value="";



document

.getElementById("total")

.innerText="0";



document

.getElementById("finalTotal")

.innerText="0";





// الاسترجاع


document

.getElementById("hasReturn")

.checked=false;



document

.getElementById("hasRefund")

.checked=false;

document

.getElementById("hasDiscount")

.checked=false;



document

.getElementById("discountBox")

.style.display="none";



document

.getElementById("discount_amount")

.value="";


document

.getElementById("refundBox")

.style.display="none";



document

.getElementById("refundAmount")

.value="";







// الرسالة


document

.getElementById("whatsappMessage")

.value="";





// كارد العميل


document

.getElementById("customerInfo")

.classList.remove("show");



}








// =====================
// زر السكرول
// =====================


const scrollBtn =

document

.getElementById("scrollTop");




window.addEventListener("scroll",()=>{



if(window.scrollY > 300){



scrollBtn.innerHTML=

`
<i class="fa-solid fa-arrow-up"></i>
`;



}else{


scrollBtn.innerHTML=

`
<i class="fa-solid fa-arrow-down"></i>
`;



}


});





scrollBtn.onclick=()=>{



if(window.scrollY>300){



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
// تشغيل الصفحة
// =====================



async function init(){



await loadCategories();


await loadGovernorates();



}



init();