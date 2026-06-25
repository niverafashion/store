import { supabase } from "./supabase.js";



let categories = [];
let products = [];
let variants = [];

let selectedProduct = null;

let cart = [];

let deliveryPrice = 0;





// عناصر الصفحة

const categorySelect =
document.getElementById("categorySelect");


const productsContainer =
document.getElementById("productsContainer");



const orderModal =
document.getElementById("orderModal");


const cartModal =
document.getElementById("cartModal");






// تحميل الأصناف

async function loadCategories(){


const {data,error}=await supabase
.from("categories")
.select("*");


if(error){

console.log(error);
return;

}


categories=data;



categorySelect.innerHTML=
`
<option value="">
اختاري الصنف
</option>
`;



data.forEach(cat=>{


categorySelect.innerHTML +=`

<option value="${cat.id}">
${cat.name}
</option>

`;

});




// اختيار اول صنف

if(data.length){


categorySelect.value=data[0].id;


showCategory(data[0]);


loadProducts(data[0].id);


}



}







categorySelect.onchange=()=>{


let cat =
categories.find(
x=>x.id == categorySelect.value
);



if(cat){


showCategory(cat);


loadProducts(cat.id);


}



};










function showCategory(cat){



document.getElementById("categoryImage")
.src =
cat.image || "";



document.getElementById("categoryTitle")
.innerText =
cat.name;



document.getElementById("categoryDescription")
.innerText =
cat.description || "";



}









// المنتجات

async function loadProducts(categoryId){



const {data,error}=await supabase

.from("products")

.select("*")

.eq("category_id",categoryId);




if(error){

console.log("INSERT ERROR:");
console.log(error);

alert(error.message);

return;

}



// جلب القياسات المتوفرة لكل المنتجات
const {data: variantsData, error: variantsError} = await supabase
.from("product_variants")
.select("product_id, stock_quantity");



if(variantsError){

console.log(variantsError);
return;

}



// عرض فقط المنتجات التي لها قياس متوفر
products = data.filter(product => {


let hasVariant = variantsData.some(v =>

v.product_id == product.id &&
Number(v.stock_quantity) > 0

);


return hasVariant;


});




productsContainer.innerHTML="";



products.forEach(product=>{


productsContainer.innerHTML +=`


<div class="product-card">


<img src="${product.main_image || product.image || './assets/images/no-image.jpg'}">

<h3>
${product.name}
</h3>


<p>
${product.price}
دينار
</p>


<div class="product-description">
${product.description || ""}
</div>


<div class="cart-action">


<button 
class="openProduct"
data-id="${product.id}">

🛒 إضافة للسلة

</button>


<div class="product-controls">


<span 
class="qtyPlus"
data-id="${product.id}"
style="display:none">

+

</span>



<button 
class="removeProduct"
data-id="${product.id}"
style="display:none">

❌

</button>


</div>


</div>


</div>


`;

});





document.querySelectorAll(".openProduct")

.forEach(btn=>{


btn.onclick=()=>{


openProduct(btn.dataset.id);


};


});

document.querySelectorAll(".qtyPlus")
.forEach(btn=>{

btn.onclick=()=>{

openProduct(btn.dataset.id);

};

});


document.querySelectorAll(".qtyPlus")
.forEach(btn=>{

btn.style.display="none";

});
}









// فتح مودل المنتج


async function openProduct(id){



selectedProduct =
products.find(
p=>p.id==id
);



if(!selectedProduct)return;



orderModal.style.display="flex";



document.getElementById("orderProductImage")
.src =
selectedProduct.main_image || selectedProduct.image || "./assets/images/no-image.jpg ";



document.getElementById("orderProductName")
.innerText =
selectedProduct.name;



document.getElementById("productPrice")
.innerText =
selectedProduct.price;



await loadVariants();



}









async function loadVariants(){


const {data,error}=await supabase

.from("product_variants")

.select("*")

.eq(
"product_id",
selectedProduct.id
);



if(error){

console.log(error);

return;

}





// فقط المتوفر

variants = data.filter(v =>

Number(v.stock_quantity) > 0

);





let colorBox =
document.getElementById("orderColor");


let sizeBox =
document.getElementById("orderSize");



let productImage =
document.getElementById("orderProductImage");





colorBox.innerHTML="";

sizeBox.innerHTML="";








// ======================
// عرض الألوان
// ======================


function loadColors(selectedSize=""){


colorBox.innerHTML="";


let filtered = variants;



if(selectedSize){


filtered = variants.filter(v =>

v.size == selectedSize

);


}





let colors = [

...new Set(

filtered.map(v=>v.color)

)

];






colors.forEach(color=>{


colorBox.innerHTML += `

<option value="${color}">

${color}

</option>

`;

});



}










// ======================
// عرض الأحجام
// ======================


function loadSizes(selectedColor=""){


sizeBox.innerHTML="";



let filtered = variants;



if(selectedColor){


filtered = variants.filter(v =>

v.color == selectedColor

);


}





let sizes = [

...new Set(

filtered.map(v=>v.size)

)

];





sizes.forEach(size=>{


sizeBox.innerHTML +=`

<option value="${size}">

${size}

</option>

`;

});


}










// ======================
// البداية
// ======================


// اختيار أول حجم متوفر
let firstSize = variants[0]?.size;


// تحميل الأحجام
loadSizes();


// تحديد أول حجم
if(firstSize){

sizeBox.value = firstSize;

}


// عرض الألوان حسب الحجم المختار
loadColors(firstSize);


// اختيار أول لون
let firstColor = colorBox.value;


// تحديث الصورة حسب اللون والحجم
let firstVariant = variants.find(v =>

v.size == firstSize &&
v.color == firstColor

);


if(firstVariant && firstVariant.image){

productImage.src = firstVariant.image;

}
else if(variants[0]){

productImage.src =
variants[0].image || selectedProduct.main_image;

}








// ======================
// عند تغيير الحجم فقط
// ======================

sizeBox.onchange = ()=>{


let size = sizeBox.value;


// تحديث الألوان حسب القياس

loadColors(size);


// تحديث الصورة حسب القياس + اللون الأول

let variant = variants.find(v =>

v.size == size

);



if(variant && variant.image){

productImage.src = variant.image;

}



};




// ======================
// اللون فقط يغير الصورة
// بدون تغيير الأحجام
// ======================

colorBox.onchange = ()=>{


let color = colorBox.value;


let size = sizeBox.value;



let variant = variants.find(v =>

v.color == color &&
v.size == size

);



if(variant && variant.image){

productImage.src = variant.image;

}



};





}

// اضافة للسلة


document.getElementById("addToCart")
.onclick=()=>{



let item={


id:selectedProduct.id,


name:selectedProduct.name,


image:
variants.find(v=>
v.color === document.getElementById("orderColor").value
)?.image || selectedProduct.main_image,

color:
document.getElementById("orderColor").value,


size:
document.getElementById("orderSize").value,


price:Number(selectedProduct.price)



};



let exists = cart.find(x =>

x.id === item.id &&
x.color === item.color &&
x.size === item.size

);



if(exists){


exists.qty += 1;


}else{


item.qty = 1;


cart.push(item);


}


updateCart();


let productBtn =
document.querySelector(
`.openProduct[data-id="${selectedProduct.id}"]`
);


let removeBtn =
document.querySelector(
`.removeProduct[data-id="${selectedProduct.id}"]`
);



if(productBtn){

productBtn.innerHTML="✔ تمت الإضافة";

productBtn.style.background="#25D366";

productBtn.style.color="white";

}


if(removeBtn){

removeBtn.style.display="inline-block";

}
let plus =
document.querySelector(
`.qtyPlus[data-id="${selectedProduct.id}"]`
);


if(plus){

plus.style.display="inline-flex";

}



orderModal.style.display="none";
};









// تحديث السلة


function updateCart(){



document.getElementById("cartCount")
.innerText =
cart.length;

let notify =
document.getElementById("cartNotify");


notify.innerText = cart.length;


if(cart.length > 0){

notify.style.display="flex";

}else{

notify.style.display="none";

}

let box =
document.getElementById("cartContainer");



box.innerHTML="";



let total=0;



cart.forEach((item,index)=>{


total += item.price * (item.qty || 1);


box.innerHTML +=`

<div class="cart-item">


<img src="${item.image || './assets/images/no-image.jpg'}" width="90">



<h3>
${item.name}
</h3>



<p>
اللون:
${item.color}
</p>



<p>
الحجم:
${item.size}
</p>



<p>
الكمية:
${item.qty || 1}
</p>
<br>
</p>

<p>
السعر:
${item.price * (item.qty || 1)}
دينار
</p>



<button 
class="delete-btn"
onclick="removeItem(${index})">

❌ 

</button>

</div>


`;



});




document.getElementById("cartProductsTotal")
.innerText =
total;


cart.forEach(item=>{


let btn =
document.querySelector(
`.openProduct[data-id="${item.id}"]`
);


let del =
document.querySelector(
`.removeProduct[data-id="${item.id}"]`
);


let plus =
document.querySelector(
`.qtyPlus[data-id="${item.id}"]`
);



if(btn){

btn.innerHTML="✔ تمت الإضافة";

btn.style.background="#25D366";

}



if(plus){

plus.style.display="inline-flex";

}



if(del){

del.style.display="inline-block";

}


});


// فحص المنتجات المحذوفة وترجيعها

document.querySelectorAll(".openProduct")
.forEach(btn=>{


let id = btn.dataset.id;


let موجود =
cart.some(item=>item.id == id);



let del =
document.querySelector(
`.removeProduct[data-id="${id}"]`
);



let plus =
document.querySelector(
`.qtyPlus[data-id="${id}"]`
);



if(!موجود){

btn.innerHTML="🛒 إضافة للسلة";

btn.style.background="";
btn.style.color="";


if(del){
del.style.display="none";
}


if(plus){
plus.style.display="none";
}

}
else{

// اذا موجود بالسلة يظهر الزائد
if(plus){
plus.style.display="inline-flex";
}


// ويظهر X
if(del){
del.style.display="inline-block";
}


// يحول الزر تمت الاضافة
btn.innerHTML="✔ تمت الإضافة";
btn.style.background="#25D366";
btn.style.color="white";

}



});
document.querySelectorAll(".removeProduct")
.forEach(btn=>{


btn.onclick=()=>{


let id = btn.dataset.id;


// حذف المنتج
cart = cart.filter(item => item.id != id);


// تحديث السلة
updateCart();

updateProductButtons();


// رجع زر الإضافة
let addBtn =
document.querySelector(
`.openProduct[data-id="${id}"]`
);


if(addBtn){

addBtn.innerHTML="🛒 إضافة للسلة";

addBtn.style.background="";

addBtn.style.color="";

}



// اخفاء X
btn.style.display="none";


// اخفاء الزائد
let plus =
document.querySelector(
`.qtyPlus[data-id="${id}"]`
);


if(plus){

plus.style.display="none";

}


};

});
// ترجيع المنتجات المحذوفة لحالتها الطبيعية

document.querySelectorAll(".openProduct")
.forEach(btn=>{


let id = btn.dataset.id;



let exists = cart.some(item =>

item.id == id

);



let del =
document.querySelector(
`.removeProduct[data-id="${id}"]`
);



if(!exists){


btn.innerHTML="🛒 إضافة للسلة";

btn.style.background="";


// اخفاء X

if(del){

del.style.display="none";

}


// اخفاء الزائد +

let plus =
document.querySelector(
`.qtyPlus[data-id="${id}"]`
);


if(plus){

plus.style.display="none";

}


}



});
calculateCart();
updateProductButtons();

}







window.removeItem=function(index){

document.querySelectorAll(".removeProduct")
.forEach(btn=>{


btn.onclick=()=>{


let id = btn.dataset.id;


cart =
cart.filter(item=>item.id != id);



updateCart();



let addBtn =
document.querySelector(
`.openProduct[data-id="${id}"]`
);


btn.style.display="none";


if(addBtn){

addBtn.innerHTML="🛒 إضافة للسلة";

addBtn.style.background="";
let plus =
document.querySelector(
`.qtyPlus[data-id="${id}"]`
);

if(plus){

plus.style.display="none";

}
}


};


});
cart.splice(index,1);


updateCart();


};


// فتح السلة


document.getElementById("cartButton")
.onclick=()=>{


cartModal.style.display="flex";


updateCart();


};

// المحافظات


async function loadGovernorates(){



const {data,error}=await supabase

.from("governorates")

.select("*");



if(error)return;



let box =
document.getElementById("customerGovernorate");



data.forEach(g=>{


box.innerHTML +=`

<option value="${g.delivery_price}">

${g.name}

</option>

`;

});




box.onchange=()=>{


deliveryPrice =
Number(box.value);



document.getElementById("cartDelivery")
.innerText =
deliveryPrice;



document.getElementById("cartDeliveryTotal")
.innerText =
deliveryPrice;



calculateCart();


};



}









function calculateCart(){


let productsTotal =
Number(
document.getElementById("cartProductsTotal").innerText
);



document.getElementById("cartFinalTotal")
.innerText =

productsTotal + deliveryPrice;



}









// حجز واتساب

function updateProductButtons(){
    

document.querySelectorAll(".qtyPlus").forEach(plus=>{

let id = plus.dataset.id;

let exists = cart.some(item=>item.id == id);


if(exists){

plus.style.display="inline-flex";

}else{

plus.style.display="none";

}

});



document.querySelectorAll(".removeProduct").forEach(del=>{

let id = del.dataset.id;

let exists = cart.some(item=>item.id == id);


if(exists){

del.style.display="inline-block";

}else{

del.style.display="none";

}

});


}
document.getElementById("reserveOrder").onclick = ()=>{


// فحص وجود منتجات بالسلة
if(cart.length === 0){

alert("الرجاء تحديد منتج واحد على الاقل");
return;

}



let name =
document.getElementById("customerName").value.trim();


let phoneInput =
document.getElementById("customerPhone");


let phone =
phoneInput.value
.replace(/\s+/g,"")
.replace(/-/g,"");



let governorate =
document.getElementById("customerGovernorate");


let area =
document.getElementById("customerArea").value.trim();


let addressInput =
document.getElementById("customerAddress");


let address = "";

if(addressInput){

address = addressInput.value.trim();

}


// الاسم
if(name === ""){

alert("يرجى ادخال الاسم");

return;

}


if(name.length > 150){

alert("الاسم يجب ان لا يتجاوز 150 حرف");

return;

}




// تنظيف الرقم وعرضه مرتب
phoneInput.value = phone;



// رقم الهاتف
let phoneRegex =
/^(077|078|079|075)[0-9]{8}$/;



if(!phoneRegex.test(phone)){


alert("رقم الهاتف يجب ان يبدأ 077 او 078 او 079 او 075 ويكون 11 رقم");


return;

}




// المحافظة

if(governorate.value === ""){


alert("يرجى اختيار المحافظة");


return;

}





// المنطقة

if(area === ""){


alert("يرجى ادخال المنطقة");


return;

}





// أقرب نقطة دالة
let nearestInput = document.querySelector("#nearestPoint");

if(!nearestInput){
    console.log("nearestPoint غير موجود");
    alert("خطأ: حقل أقرب نقطة دالة غير موجود");
    return;
}

let nearest = nearestInput.value.trim();

if(nearest === ""){


alert("يرجى ادخال أقرب نقطة دالة");


return;

}





let msg = 
`مرحبا NIVRA الرجاء تثبيت الحجز

-المعلومات الشخصية-
----------------
الاسم:${name}
الهاتف:${phone}
المحافظة:${governorate.options[governorate.selectedIndex].text}
المنطقة:${area}
أقرب نقطة دالة:${nearest}

-المنتجات-
`;
cart.forEach(item=>{
msg +=`----------------
المنتج:${item.name}
اللون:${item.color}
المقاس:${item.size}
الكمية:${item.qty}
السعر:${item.price} دينار
`;

});



msg +=
`
-المجموع النهائي-
----------------
${cartFinalTotal.innerText} دينار مع التوصيل

شكراً لاختياركم NIVRA
`;



window.location.href =
"https://wa.me/9647741478145?text=" 
+
encodeURIComponent(msg);

};











// اغلاق المودلات


document.getElementById("closeOrderModal")
.onclick=()=>{

orderModal.style.display="none";

};



document.getElementById("closeCartModal")
.onclick=()=>{

cartModal.style.display="none";

};






document.getElementById("continueShopping")
.onclick=()=>{


cartModal.style.display="none";


window.scrollTo({

top:
document.getElementById("products").offsetTop,

behavior:"smooth"

});


};







document.getElementById("scrollTop")
.onclick=()=>{


window.scrollTo({

top:0,

behavior:"smooth"

});


};








loadCategories();

loadGovernorates();
let deferredPrompt = null;

const installBtn = document.getElementById("installApp");

// =========================
// 🔍 فحص التثبيت الحقيقي
// =========================
function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

// =========================
// 📱 كشف iOS
// =========================
function isIOS() {
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
}

// =========================
// 🌐 إخفاء الزر نهائياً إذا مثبت
// =========================
function handleInstallUI() {
  if (isInstalled()) {
    console.log("✔ App Installed");

    installBtn.style.display = "none"; // 🔥 أهم تعديل

    return true;
  }

  console.log("ℹ️ App NOT installed");

  installBtn.style.display = "flex";

  installBtn.innerHTML = `
    📲 تثبيت التطبيق
    <i class="fa-solid fa-download download-icon"></i>
  `;

  return false;
}

handleInstallUI();


// =========================
// 🔥 beforeinstallprompt (Chrome / Edge فقط)
// =========================
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();

  deferredPrompt = e;

  console.log("🔥 Install prompt ready");

  if (!isInstalled()) {
    installBtn.style.display = "flex";
  }
});


// =========================
// 🧠 زر التثبيت
// =========================
installBtn.addEventListener("click", async () => {
  console.log("📲 Install clicked");

  // إذا مثبت
  if (isInstalled()) {
    installBtn.style.display = "none";
    return;
  }

  // Chrome / Edge install
  if (deferredPrompt) {
    deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;

    console.log("User choice:", choice);

    deferredPrompt = null;

    handleInstallUI();

    return;
  }

  // fallback iOS / others
  showInstallGuide();
});


// =========================
// 🍎 iOS / fallback guide
// =========================
function showInstallGuide() {
  if (isIOS()) {
    alert(
      "📲 تثبيت التطبيق على الآيفون:\n\n" +
      "1- اضغط زر المشاركة ⬆️\n" +
      "2- اختر Add to Home Screen\n" +
      "3- اضغط Add"
    );
  } else {
    alert(
      "📲 لتثبيت التطبيق:\n\n" +
      "افتح Chrome ➜ ⋮ ➜ Add to Home Screen"
    );
  }
}


// =========================
// 🎉 بعد التثبيت الحقيقي
// =========================
window.addEventListener("appinstalled", () => {
  console.log("🎉 App installed");

  installBtn.style.display = "none"; // 🔥 يخفي الزر نهائياً
});