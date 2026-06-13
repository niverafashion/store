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

const sku = skuInput.value.trim();

const stock_quantity =
Number(stockInput.value);



const image = imageInput.value.trim();





if(!product_id || !color || !size){


alert("اكمل البيانات");

return;

}






let result;



if(editMode){


result = await supabase

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




}else{



result = await supabase

.from("product_variants")

.insert({

product_id,

color,

size,

sku,

stock_quantity,

image

});



}






if(result.error){


console.log(result.error);

alert("حدث خطأ");

return;


}




alert(

editMode ?

"تم تعديل التفاصيل"

:

"تمت إضافة التفاصيل"

);




clearForm();


loadVariants();



};









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





<td>



<button

onclick="editVariant('${item.id}')"

class="edit-btn">


تعديل

</button>




<button

onclick="deleteVariant('${item.id}')"

class="delete-btn">


حذف

</button>



</td>



</tr>


`;



});





variantList.innerHTML=html;



}










// ==========================
// حذف
// ==========================


window.deleteVariant = async(id)=>{


if(!confirm("حذف هذه التفاصيل؟"))

return;



const {error}=await supabase

.from("product_variants")

.delete()

.eq(
"id",
id
);



if(error){

console.log(error);

return;

}



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