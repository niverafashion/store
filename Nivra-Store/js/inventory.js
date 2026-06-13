import {supabase} from "./supabase.js";


// =========================
// عناصر الصفحة
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


const search =
document.getElementById("search");


const stockFilter =
document.getElementById("stockFilter");



let variants=[];

let inventory=[];



// =========================
// تحميل الأصناف
// =========================

async function loadCategories(){


const {data,error}=

await supabase

.from("categories")

.select("*");


if(error){

console.log(error);

return;

}



data.forEach(c=>{


category.innerHTML +=`

<option value="${c.id}">

${c.name}

</option>

`;


});


}






// =========================
// تحميل المنتجات
// =========================


category.onchange = async ()=>{


product.innerHTML =
`
<option>
اختار المنتج
</option>
`;


variant.innerHTML =
`
<option>
اختار التفاصيل
</option>
`;



const {data,error}=

await supabase

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
// تحميل التفاصيل
// =========================


product.onchange = async ()=>{


variant.innerHTML =
`
<option>
اختار التفاصيل
</option>
`;



const {data,error}=

await supabase

.from("product_variants")

.select(`

id,

color,

size,

stock_quantity,

products(

name,

price,

categories(name)

)

`)

.eq(
"product_id",
product.value
);



if(error)return;



variants=data;



data.forEach(v=>{


variant.innerHTML +=`

<option value="${v.id}">

${v.color}

-

${v.size}

</option>


`;



});


};









// =========================
// معلومات القطعة
// =========================


variant.onchange=()=>{


let v=

variants.find(

x=>x.id==variant.value

);



if(!v)return;



variantInfo.innerHTML=`

<div class="stock-card">


<h3>

${v.products.name}

</h3>


<p>

اللون:
${v.color}

</p>


<p>

القياس:
${v.size}

</p>


<h2>

المتوفر:

${v.stock_quantity}

</h2>


</div>

`;



};










// =========================
// حفظ حركة
// =========================


saveMovement.onclick = async ()=>{



let id =
variant.value;


let qty =
Number(quantity.value);



if(!id || qty<=0){

alert("اختار القطعة والكمية");

return;

}





const {data:item,error}=

await supabase

.from("product_variants")

.select("stock_quantity")

.eq("id",id)

.single();





if(error)return;



let old =
item.stock_quantity;



let newStock;



if(
movementType.value==="IN"
){


newStock =
old + qty;


}else{


if(qty>old){


alert("الكمية غير متوفرة");

return;

}


newStock =
old - qty;


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





alert("تم تحديث المخزون ✅");



quantity.value="";

note.value="";



loadInventory();

loadMovements();



};











// =========================
// تحميل المخزون
// =========================


async function loadInventory(){



const {data,error}=

await supabase

.from("product_variants")

.select(`


id,

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



}









// =========================
// عرض الجدول
// =========================


function renderInventory(list){


let html="";



list.forEach(v=>{


let status="";



if(v.stock_quantity<=0){


status=
`
<span class="badge rejected">

نفذ

</span>
`;


}

else if(v.stock_quantity<=5){


status=
`
<span class="badge delayed">

قليل

</span>
`;

}

else{


status=

`
<span class="badge done">

متوفر

</span>

`;

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
// البحث الذكي
// =========================


function filterInventory(){



let text =

search.value.toLowerCase();



let filter =

stockFilter.value;




let result =

inventory.filter(v=>{



let info =

`

${v.products.name}

${v.products.categories.name}

${v.color}

${v.size}

`

.toLowerCase();





let matchText =

info.includes(text);





let matchStock=true;



if(filter==="available"){


matchStock =
v.stock_quantity>5;


}


if(filter==="low"){


matchStock =
v.stock_quantity>0 &&
v.stock_quantity<=5;


}



if(filter==="out"){


matchStock =
v.stock_quantity<=0;


}



return matchText && matchStock;



});




renderInventory(result);



}



search.oninput =
filterInventory;


stockFilter.onchange =
filterInventory;









// =========================
// سجل الحركات
// =========================


async function loadMovements(){



const {data,error}=

await supabase

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


${

m.type==="IN"

?

"➕ إضافة"

:

"➖ خصم"

}


</td>



<td>

${m.quantity}

</td>



<td>

${m.note || "-"}

</td>



<td>

${

new Date(m.created_at)

.toLocaleDateString()

}

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



document
.getElementById("totalItems")
.innerText=

inventory.length;




document
.getElementById("lowStock")
.innerText=

inventory.filter(

x=>x.stock_quantity>0 &&
x.stock_quantity<=5

).length;





document
.getElementById("outStock")
.innerText=

inventory.filter(

x=>x.stock_quantity<=0

).length;



}









// تشغيل

loadCategories();

loadInventory();

loadMovements();