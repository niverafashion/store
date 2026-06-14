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



products = data.filter(p => {

if(p.stock === undefined || p.stock === null){

return true;

}

return Number(p.stock) > 0;

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



<div class="cart-action">

<div class="cart-action">

<button 
class="openProduct"
data-id="${product.id}">

🛒 إضافة للسلة

</button>

<button 
class="removeProduct"
data-id="${product.id}"
style="display:none">

❌

</button>


<span 
class="qtyPlus"
data-id="${product.id}"
style="display:none">

+

</span>

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


loadColors();

loadSizes();





// عرض صورة اول لون

if(variants.length){


productImage.src =

variants[0].image || selectedProduct.main_image;


}









// ======================
// عند تغيير اللون
// ======================


colorBox.onchange = ()=>{


let color = colorBox.value;





// تحديث الأحجام

loadSizes(color);







// تحديث الصورة حسب اللون

let variant = variants.find(v =>

v.color == color

);





if(variant && variant.image){


productImage.src = variant.image;


}



};









// ======================
// عند تغيير الحجم
// ======================


sizeBox.onchange = ()=>{


let size = sizeBox.value;





// تحديث الألوان حسب الحجم

loadColors(size);





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
<br>

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


if(del){

del.style.display="none";

}


if(plus){

plus.style.display="none";

}



}



});
document.querySelectorAll(".removeProduct")
.forEach(btn=>{


btn.onclick=()=>{


let id = btn.dataset.id;



cart = cart.filter(item =>

item.id != id

);



updateCart();



let addBtn =
document.querySelector(
`.openProduct[data-id="${id}"]`
);



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



btn.style.display="none";



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


document.getElementById("reserveOrder")

.onclick=()=>{



let phone =
document.getElementById("customerPhone").value;



if(phone.length !== 11){

alert("رقم الهاتف يجب ان يكون 11 رقم");

return;

}




let msg = `

مرحبا NIVRA 🌸

طلب جديد:

`;




cart.forEach(item=>{


msg +=`

المنتج:
${item.name}

اللون:
${item.color}

الحجم:
${item.size}

السعر:
${item.price}

`;

});



msg +=`

الاسم:

${customerName.value}



الهاتف:

${phone}



المحافظة:

${customerGovernorate.options[
customerGovernorate.selectedIndex
].text}



المنطقة:

${customerArea.value}



العنوان:

${customerAddress.value}



المجموع:

${cartFinalTotal.innerText}

دينار

`;





window.open(

"https://wa.me/?text="+
encodeURIComponent(msg)

);



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
