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

console.log(error);

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


<img src="${product.image || ''}">


<h3>

${product.name}

</h3>



<p>

${product.price}

دينار

</p>



<button class="openProduct"
data-id="${product.id}">

🛒 إضافة للسلة

</button>



</div>


`;

});





document.querySelectorAll(".openProduct")

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
selectedProduct.image || "";



document.getElementById("orderProductName")
.innerText =
selectedProduct.name;



document.getElementById("productPrice")
.innerText =
selectedProduct.price;



await loadVariants();



}









// جلب الاحجام والالوان

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



// هنا الفلترة الصحيحة
variants = data.filter(v => 
Number(v.stock_quantity) > 0
);



let colorBox =
document.getElementById("orderColor");


let sizeBox =
document.getElementById("orderSize");



colorBox.innerHTML = "";

sizeBox.innerHTML = "";



if(variants.length === 0){


colorBox.innerHTML = `
<option>
لا يوجد لون متوفر
</option>
`;


sizeBox.innerHTML = `
<option>
لا يوجد حجم متوفر
</option>
`;

return;

}



let colors = [
...new Set(
variants.map(v=>v.color)
)
];


let sizes = [
...new Set(
variants.map(v=>v.size)
)
];




colors.forEach(c=>{


colorBox.innerHTML += `

<option value="${c}">
${c}
</option>

`;

});




sizes.forEach(s=>{


sizeBox.innerHTML += `

<option value="${s}">
${s}
</option>

`;

});


}


// اضافة للسلة


document.getElementById("addToCart")
.onclick=()=>{



let item={


id:selectedProduct.id,


name:selectedProduct.name,


image:selectedProduct.image,


color:
document.getElementById("orderColor").value,


size:
document.getElementById("orderSize").value,


price:Number(selectedProduct.price)



};



cart.push(item);



updateCart();



orderModal.style.display="none";



};









// تحديث السلة


function updateCart(){



document.getElementById("cartCount")
.innerText =
cart.length;



let box =
document.getElementById("cartContainer");



box.innerHTML="";



let total=0;



cart.forEach((item,index)=>{


total += item.price;



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
السعر:
${item.price}
دينار
</p>



<button onclick="removeItem(${index})">

❌ حذف

</button>


</div>


`;



});




document.getElementById("cartProductsTotal")
.innerText =
total;



calculateCart();



}







window.removeItem=function(index){


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