import { supabase } from "./supabase.js";


// =========================
// العناصر
// =========================

const category =
document.getElementById("category");


const product =
document.getElementById("product");

const size =
document.getElementById("size");

const color =
document.getElementById("color");

const variantInfo =
document.getElementById("variantInfo");



const movementType =
document.getElementById("movementType");


const quantity =
document.getElementById("quantity");


const note =
document.getElementById("note");


const saveMovement =
document.getElementById("saveMovement");



const inventoryList =
document.getElementById("inventoryList");



const movementList =
document.getElementById("movementList");



const searchSKU =
document.getElementById("searchSKU");

const stockFilter =
document.getElementById("stockFilter");

const stockCategory =
document.getElementById("stockCategory");

const stockProduct =
document.getElementById("stockProduct");

const stockSize =
document.getElementById("stockSize");

const stockColor =
document.getElementById("stockColor");

let inventory=[];

let variants=[];
let selectedVariant=null;




// =========================
// الأصناف
// =========================


async function loadCategories(){


const {data,error}=await supabase

.from("categories")

.select("*")

.order("created_at",{ascending:false});



if(error){

console.log(error);

return;

}



category.innerHTML=`

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









// =========================
// المنتجات
// =========================


category.onchange = async ()=>{


product.innerHTML=`

<option value="">

اختار المنتج

</option>

`;



size.innerHTML=`

<option value="">

اختار الحجم

</option>

`;


color.innerHTML=`

<option value="">

اختار اللون

</option>

`;



const {data,error}=await supabase

.from("products")

.select("*")

.eq(
"category_id",
category.value
);



if(error)return;



data.forEach(p=>{


product.innerHTML +=`

<option value="${p.id}">

${p.name}

</option>

`;

});


};









// =========================
// تحميل الاحجام
// =========================


product.onchange = async ()=>{


size.innerHTML = `
<option value="">
اختار الحجم
</option>
`;


color.innerHTML = `
<option value="">
اختار اللون
</option>
`;



const {data,error}=await supabase

.from("product_variants")

.select(`

id,
sku,
color,
size,
stock_quantity,

products(
name,
price
)

`)

.eq(
"product_id",
product.value
);



if(error) return;



variants=data;



let sizes=[...new Set(
variants.map(v=>v.size)
)];



sizes.forEach(s=>{


size.innerHTML +=`

<option value="${s}">
${s}
</option>

`;

});


};





size.onchange=()=>{


color.innerHTML=`

<option value="">
اختار اللون
</option>

`;



let colors=[...new Set(

variants

.filter(v=>

v.size == size.value

)

.map(v=>v.color)

)];



colors.forEach(c=>{


color.innerHTML +=`

<option value="${c}">
${c}
</option>

`;

});


};






// عند اختيار اللون
color.onchange=showVariantInfo;



function showVariantInfo(){



let v = variants.find(x=>

x.size == size.value &&

x.color == color.value

);



selectedVariant=v;



if(!v)return;



variantInfo.innerHTML=`

<div class="stock-info-box">


<h3>${v.products.name}</h3>


<p>
اللون : ${v.color}
</p>


<p>
الحجم : ${v.size}
</p>


<h2>
المتوفر : ${v.stock_quantity}
</h2>


<p>
SKU : ${v.sku ?? "-"}
</p>



</div>

`;



}





// عند اختيار اللون
color.onchange=showVariantInfo;






// =========================
// حفظ الحركة
// =========================


saveMovement.onclick=async()=>{


const id = selectedVariant?.id;

const qty = Number(quantity.value);



if(!id || qty<=0){

alert("اختار القطعة والكمية");

return;

}




const {data:item}=await supabase

.from("product_variants")

.select("stock_quantity")

.eq("id",id)

.single();




let oldStock=item.stock_quantity;


let newStock;




if(movementType.value==="IN"){


newStock=oldStock+qty;


}

else{


if(qty>oldStock){

alert("الكمية اكبر من المخزون");

return;

}


newStock=oldStock-qty;

}






await supabase

.from("product_variants")

.update({

stock_quantity:newStock

})

.eq(

"id",

id

);







await supabase

.from("stock_movements")

.insert({

variant_id:id,

type:movementType.value,

quantity:qty,

note:note.value

});




alert("تم تحديث المخزون");



quantity.value="";

note.value="";



loadInventory();

loadMovements();


};









// =========================
// تحميل المخزون
// =========================


async function loadInventory(){


const {data,error}=await supabase

.from("product_variants")

.select(`

id,

sku,

color,

size,

stock_quantity,


products(

name,

price,


categories(

name

)

)

`);




if(error){

console.log(error);

return;

}



inventory=data;



renderInventory(inventory);


updateCards();
loadStockFilters();


}



function loadStockFilters(){


let categories = new Set();

let products = new Set();

let sizes = new Set();

let colors = new Set();



inventory.forEach(v=>{


categories.add(
v.products.categories.name
);


products.add(
v.products.name
);


sizes.add(
v.size
);


colors.add(
v.color
);


});





stockCategory.innerHTML =
`
<option value="">
كل الأصناف
</option>
`;

categories.forEach(c=>{

stockCategory.innerHTML +=
`
<option value="${c}">
${c}
</option>
`;

});





stockProduct.innerHTML =
`
<option value="">
كل المنتجات
</option>
`;

products.forEach(p=>{

stockProduct.innerHTML +=
`
<option value="${p}">
${p}
</option>
`;

});






stockSize.innerHTML =
`
<option value="">
كل الأحجام
</option>
`;

sizes.forEach(s=>{

stockSize.innerHTML +=
`
<option value="${s}">
${s}
</option>
`;

});






stockColor.innerHTML =
`
<option value="">
كل الألوان
</option>
`;

colors.forEach(c=>{

stockColor.innerHTML +=
`
<option value="${c}">
${c}
</option>
`;

});


}





// =========================
// عرض الجدول
// =========================


function renderInventory(list){


let html="";



list.forEach(v=>{



let status;



if(v.stock_quantity<=0){


status="نفذ";


}

else if(v.stock_quantity<=5){


status="قليل";


}

else{


status="متوفر";

}



html +=`

<tr>


<td>

${v.products.categories.name}

</td>


<td>

${v.products.name}

</td>


<td>

${v.color}

</td>


<td>

${v.size}

</td>


<td>
${v.sku ?? "-"}
</td>

<td>
${v.products.price}
</td>

<td>
${v.stock_quantity}
</td>

<td>
${status}
</td>


</tr>

`;



});



inventoryList.innerHTML=html;


}









// =========================
// فلترة المخزون المتقدمة
// =========================

function filterInventory(){


const text =
searchSKU.value.toLowerCase();


const categoryValue =
stockCategory.value;


const productValue =
stockProduct.value;


const sizeValue =
stockSize.value;


const colorValue =
stockColor.value;



const statusValue =
stockFilter.value;




const result = inventory.filter(v=>{



const categoryMatch =

!categoryValue ||

v.products.categories.name === categoryValue;




const productMatch =

!productValue ||

v.products.name === productValue;




const sizeMatch =

!sizeValue ||

v.size === sizeValue;




const colorMatch =

!colorValue ||

v.color === colorValue;




const textMatch =

!text ||

`

${v.products.name}

${v.products.categories.name}

${v.size}

${v.color}

${v.sku ?? ""}

`

.toLowerCase()

.includes(text);






// حالة المخزون

let status = "";



if(v.stock_quantity <= 0){

status="out";

}

else if(v.stock_quantity <= 5){

status="low";

}

else{

status="available";

}






const statusMatch =

!statusValue ||

status === statusValue;







return (

categoryMatch &&

productMatch &&

sizeMatch &&

colorMatch &&

textMatch &&

statusMatch

);



});



renderInventory(result);


}





// تشغيل الفلترة عند أي تغيير


searchSKU.oninput=filterInventory;


stockCategory.onchange =
filterInventory;


stockProduct.onchange =
filterInventory;


stockSize.onchange =
filterInventory;


stockColor.onchange =
filterInventory;




searchSKU.oninput=filterInventory;
stockFilter.onchange=filterInventory;









// =========================
// الحركات
// =========================


async function loadMovements(){


const {data,error}=await supabase

.from("stock_movements")

.select(`


quantity,

type,

note,

created_at,


product_variants(

color,

size,

products(

name

)

)


`)

.order(

"created_at",

{

ascending:false

}

);



if(error)return;



let html="";



data.forEach(m=>{


html +=`

<tr>


<td>

${m.product_variants.products.name}

<br>

${m.product_variants.color}

${m.product_variants.size}

</td>



<td>

${m.type==="IN"?"➕ إضافة":"➖ خصم"}

</td>



<td>

${m.quantity}

</td>



<td>

${m.note || "-"}

</td>



<td>

${new Date(m.created_at)
.toLocaleDateString()}

</td>



</tr>

`;



});



movementList.innerHTML=html;



}




// =========================
// الكروت
// =========================


function updateCards(){



// مجموع كل الكميات بالمخزون

document.getElementById("totalProducts")
.innerText =

inventory.reduce(

(total,item)=>

total + item.stock_quantity

,0);



/* عدد القطع */

document.getElementById("totalItems")
.innerText =

inventory.length;



/* مخزون قليل */

document.getElementById("lowStock")
.innerText =

inventory.filter(

x =>

x.stock_quantity > 0 &&

x.stock_quantity <= 5

).length;



/* نافذ */

document.getElementById("outStock")
.innerText =

inventory.filter(

x =>

x.stock_quantity <= 0

).length;



}

// ==========================
// SCROLL TOP BUTTON
// ==========================


const scrollBtn =
document.getElementById("scrollTop");



window.addEventListener("scroll",()=>{


if(window.scrollY > 300){


scrollBtn.innerHTML = `

<i class="fa-solid fa-arrow-up"></i>

`;



}else{


scrollBtn.innerHTML = `

<i class="fa-solid fa-arrow-down"></i>

`;


}


});


scrollBtn.onclick=()=>{


if(window.scrollY > 300){


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


// تشغيل


loadCategories();

loadInventory();

loadMovements();