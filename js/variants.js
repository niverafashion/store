import { supabase } from "./supabase.js";


// العناصر

const categorySelect = document.getElementById("category");
const productSelect = document.getElementById("product");

const colorInput = document.getElementById("color");
const sizeInput = document.getElementById("size");
const skuInput = document.getElementById("sku");
const stockInput = document.getElementById("stock");
const imageInput = document.getElementById("image");

const saveBtn = document.getElementById("saveVariant");

const variantList = document.getElementById("variantList");

const searchInput =
document.getElementById("searchVariant");

let editMode = false;
let editId = null;





// ==========================
// تحميل الأصناف
// ==========================


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




data.forEach(cat=>{


categorySelect.innerHTML +=`

<option value="${cat.id}">

${cat.name}

</option>

`;



});



}






// ==========================
// تحميل المنتجات حسب الصنف
// ==========================


categorySelect.addEventListener("change",async()=>{


productSelect.innerHTML=`

<option value="">

اختار المنتج

</option>

`;



if(!categorySelect.value){

return;

}



const {data,error}=await supabase

.from("products")

.select("*")

.eq(
"category_id",
categorySelect.value
);



if(error){

console.log(error);

return;

}




data.forEach(product=>{


productSelect.innerHTML +=`

<option value="${product.id}">

${product.name}

</option>

`;


});



});








// ==========================
// حفظ / تعديل
// ==========================


saveBtn.onclick = async ()=>{


const product_id = productSelect.value;

const color = colorInput.value.trim();

const size = sizeInput.value.trim();

let sku = skuInput.value.trim();

let stock_quantity = Number(stockInput.value);

let image = imageInput.value.trim();





// التحقق

if(!product_id){

alert("اختار المنتج");

return;

}



if(!color){

alert("اكتب اللون");

return;

}



if(!size){

alert("اكتب الحجم");

return;

}



if(!stock_quantity || stock_quantity <=0){

alert("ادخل كمية صحيحة");

return;

}








// ==========================
// تعديل
// ==========================


if(editMode){



const {error}=await supabase

.from("product_variants")

.update({

product_id,

color,

size,

sku,

stock_quantity,

image

})


.eq("id",editId);




if(error){

console.log(error);

alert(error.message);

return;

}



alert("تم تعديل التفاصيل");



clearForm();

loadVariants();


return;

}









// ==========================
// إضافة جديد
// ==========================


// البحث عن نفس المنتج + اللون + الحجم


const {data:existing,error:findError}=

await supabase

.from("product_variants")

.select("*")

.eq("product_id",product_id)

.eq("color",color)

.eq("size",size)

.single();





if(findError && findError.code !== "PGRST116"){


console.log(findError);

return;

}






// موجود مسبقاً

if(existing){



const newStock =

Number(existing.stock_quantity)

+

stock_quantity;





const {error}=await supabase

.from("product_variants")

.update({

stock_quantity:newStock

})

.eq(

"id",

existing.id

);





if(error){

console.log(error);

alert(error.message);

return;

}






alert(

`تم تحديث الكمية، المخزون الحالي ${newStock}`

);




}






// غير موجود

else{



// توليد SKU تلقائي

if(!sku){


sku =

"NIV-" +

Date.now();



}






const {error}=await supabase

.from("product_variants")

.insert({

product_id,

color,

size,

sku,

stock_quantity,

image

});





if(error){

console.log(error);

alert(error.message);

return;

}





alert("تمت إضافة التفاصيل");



}





clearForm();


loadVariants();



};




// ==========================
// جلب SKU والصورة تلقائيا
// عند وجود نفس المنتج + اللون + الحجم
// ==========================


async function checkExistingVariant(){


const product_id = productSelect.value;

const color = colorInput.value.trim();

const size = sizeInput.value.trim();




if(!product_id || !color || !size){

return;

}






const {data,error}=await supabase

.from("product_variants")

.select("*")

.eq("product_id",product_id)

.eq("color",color)

.eq("size",size)

.single();






if(error){

// اذا غير موجود نمسح القديم

if(error.code === "PGRST116"){

skuInput.value="";

imageInput.value="";

}


return;

}






// موجود

skuInput.value = data.sku ?? "";

imageInput.value = data.image ?? "";



}





// تشغيل الفحص عند تغيير البيانات


productSelect.addEventListener(
"change",
checkExistingVariant
);


colorInput.addEventListener(
"input",
checkExistingVariant
);


sizeInput.addEventListener(
"input",
checkExistingVariant
);




// ==========================
// عرض البيانات
// ==========================


async function loadVariants(){



const {data,error}=await supabase


.from("product_variants")

.select(`

id,

color,

size,

stock_quantity,

sku,

image,

products(

name

)

`)


.order("id",{ascending:false});





if(error){


console.log(error);

return;

}





let html="";





data.forEach(item=>{


// اخفاء القطع المنتهية
if(item.stock_quantity <= 0){

return;

}



html +=`
<tr>

<td>


${
item.image

?

`<img src="${item.image}" 
style="
width:70px;
height:70px;
object-fit:cover;
border-radius:15px;
">`

:

"لا توجد"

}



</td>





<td>

${item.products?.name ?? ""}

</td>





<td>

${item.color}

</td>





<td>

${item.size}

</td>





<td>

${item.stock_quantity}

</td>





<td>

${item.sku ?? ""}

</td>



<td class="action-cell">


<button

onclick="editVariant('${item.id}')"

class="icon-edit">

<i class="fa-solid fa-pen"></i>

</button>

<button

onclick="deleteVariant('${item.id}')"

class="icon-delete">

<i class="fa-solid fa-trash"></i>

</button>


</td>


</tr>


`;



});





variantList.innerHTML=html;



}


searchInput.addEventListener("input",()=>{


let value =
searchInput.value.toLowerCase();



document.querySelectorAll("#variantList tr")
.forEach(row=>{


let text =
row.innerText.toLowerCase();



row.style.display =
text.includes(value)
?
""
:
"none";



});


});







window.deleteVariant = async(id)=>{


if(!confirm("حذف هذه التفاصيل؟"))

return;




// جلب بيانات القطعة قبل الحذف

const {data:variant,error:variantError}=await supabase

.from("product_variants")

.select("id,sku")

.eq("id",id)

.single();



if(variantError){

console.log(variantError);

return;

}





// فحص الحركات المخزنية

const {data:stockMoves}=await supabase

.from("stock_movements")

.select("id")

.eq("variant_id",id)

.limit(1);






// فحص الطلبات

const {data:orders}=await supabase

.from("order_items")

.select("id")

.eq("variant_id",id)

.limit(1);







// فحص ارتباط SKU

const {data:skuLinks}=await supabase

.from("product_variants")

.select("id")

.eq("sku",variant.sku)

.limit(1);







if(

(stockMoves && stockMoves.length > 0)

||

(orders && orders.length > 0)

){

alert(

"لا يمكن حذف هذا المنتج لأنه مرتبط بحركات مخزون أو طلبات"

);

return;

}







// اذا ماكو ارتباط يحذف

const {error}=await supabase

.from("product_variants")

.delete()

.eq("id",id);





if(error){

console.log(error);

alert(error.message);

return;

}



alert("تم الحذف");

loadVariants();



};









// ==========================
// تعديل
// ==========================


window.editVariant = async(id)=>{



const {data,error}=await supabase

.from("product_variants")

.select("*")

.eq(
"id",
id
)

.single();




if(error){

console.log(error);

return;

}




editMode=true;

editId=id;




productSelect.value=data.product_id;


colorInput.value=data.color;

sizeInput.value=data.size;

skuInput.value=data.sku ?? "";

stockInput.value=data.stock_quantity;

imageInput.value=data.image ?? "";





saveBtn.innerHTML=`

<i class="fa-solid fa-pen"></i>

تعديل التفاصيل

`;



window.scrollTo({

top:0,

behavior:"smooth"

});



};









function clearForm(){


productSelect.value="";


colorInput.value="";

sizeInput.value="";

skuInput.value="";

stockInput.value="";

imageInput.value="";



editMode=false;

editId=null;




saveBtn.innerHTML=`

<i class="fa-solid fa-floppy-disk"></i>

حفظ التفاصيل

`;



}









loadCategories();

loadVariants();