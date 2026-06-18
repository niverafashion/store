import { supabase } from "./supabase.js";


// =========================
// العناصر
// =========================


const category =
document.getElementById("category");


const product =
document.getElementById("product");


const variant =
document.getElementById("variant");


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



variant.innerHTML=`

<option value="">

اختار التفاصيل

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
// التفاصيل
// =========================


product.onchange = async ()=>{


variant.innerHTML=`

<option>

اختار التفاصيل

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

)

.gt(

"stock_quantity",

0

);



if(error)return;



variants=data;



data.forEach(v=>{


variant.innerHTML +=`

<option value="${v.id}">

${v.color} - ${v.size}

</option>

`;

});


};









// =========================
// معلومات القطعة
// =========================


variant.onchange=()=>{


const v = variants.find(

x=>x.id == variant.value

);



if(!v)return;



variantInfo.innerHTML=`

<div class="stock-info-box">


<h3>

${v.products.name}

</h3>


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



};









// =========================
// حفظ الحركة
// =========================


saveMovement.onclick=async()=>{


const id = variant.value;


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



return (

categoryMatch &&

productMatch &&

sizeMatch &&

colorMatch &&

textMatch

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



document.getElementById("totalItems")
.innerText=

inventory.length;



document.getElementById("lowStock")
.innerText=

inventory.filter(

x=>x.stock_quantity>0 &&
x.stock_quantity<=5

).length;



document.getElementById("outStock")
.innerText=

inventory.filter(

x=>x.stock_quantity<=0

).length;


}









// تشغيل


loadCategories();

loadInventory();

loadMovements();