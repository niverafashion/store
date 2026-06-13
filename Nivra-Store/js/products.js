import { supabase } from "./supabase.js";



const categorySelect =
document.getElementById("category");


const nameInput =
document.getElementById("name");


const descriptionInput =
document.getElementById("description");


const priceInput =
document.getElementById("price");


const imageInput =
document.getElementById("image");


const saveBtn =
document.getElementById("save");


const list =
document.getElementById("list");



let editId = null;







// =====================
// تحميل الأصناف
// =====================


async function loadCategories(){


const {

data,
error

}=

await supabase

.from("categories")

.select("*")

.order("id");



if(error){

console.log(error);

return;

}



data.forEach(cat=>{


categorySelect.innerHTML += `

<option value="${cat.id}">

${cat.name}

</option>


`;

});


}




loadCategories();








// =====================
// مراقبة تغيير الصنف
// =====================


categorySelect.addEventListener(
"change",
()=>{


loadProducts(
categorySelect.value
);


});








// =====================
// تحميل المنتجات
// =====================



async function loadProducts(categoryId=""){



let query =

supabase

.from("products")

.select(`

*,

categories(

name

)

`)

.order(
"id",
{
ascending:false
}

);






if(categoryId){


query = query.eq(
"category_id",
categoryId
);


}







const {

data,

error

}=

await query;






if(error){

console.log(error);

return;

}






list.innerHTML="";







data.forEach(product=>{





list.innerHTML += `



<div class="category-card">





<img src="${product.image || '../assets/images/default.jpg'}">






<div class="category-info">



<h3>

${product.name}

</h3>



<p>

${product.description || ""}

</p>



<p>

الصنف:

${product.categories?.name || ""}

</p>




<strong>

${product.price} دينار

</strong>



</div>







<div class="card-actions">





<button 

class="edit-btn"

onclick="editProduct('${product.id}')">


<i class="fa-solid fa-pen"></i>

تعديل


</button>






<button

class="delete-btn"

onclick="deleteProduct('${product.id}')">


<i class="fa-solid fa-trash"></i>

حذف


</button>





</div>





</div>



`;





});




}







// عرض الكل أول ما تفتح الصفحة


loadProducts();









// =====================
// حفظ / تعديل المنتج
// =====================



saveBtn.onclick = async ()=>{





let product = {


category_id:

categorySelect.value,


name:

nameInput.value.trim(),


description:

descriptionInput.value.trim(),


price:

Number(priceInput.value),


image:

imageInput.value.trim()



};







if(!product.category_id){


alert("اختار الصنف");

return;


}







if(!product.name){


alert("اكتب اسم المنتج");

return;


}








// تعديل


if(editId){



const {

error

}=

await supabase

.from("products")

.update(product)

.eq(
"id",
editId
);





if(error){

console.log(error);

return;

}





alert("تم تعديل المنتج");



editId=null;



saveBtn.innerHTML = `

<i class="fa-solid fa-floppy-disk"></i>

حفظ المنتج

`;



}








// إضافة


else{



const {

error

}=

await supabase

.from("products")

.insert(product);





if(error){

console.log(error);

return;

}





alert("تم إضافة المنتج");



}








clearForm();



loadProducts(
categorySelect.value
);



};












// =====================
// تعديل
// =====================



window.editProduct = async function(id){



const {

data,

error

}=

await supabase

.from("products")

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






categorySelect.value =
data.category_id;



nameInput.value =
data.name;



descriptionInput.value =
data.description;



priceInput.value =
data.price;



imageInput.value =
data.image;






editId=id;





saveBtn.innerHTML = `

<i class="fa-solid fa-pen"></i>

تعديل المنتج

`;





window.scrollTo({

top:0,

behavior:"smooth"

});



};











// =====================
// حذف
// =====================



window.deleteProduct = async function(id){



let ok =

confirm(
"هل تريد حذف المنتج ؟"
);



if(!ok)
return;





const {

error

}=

await supabase

.from("products")

.delete()

.eq(
"id",
id
);







if(error){

console.log(error);

return;

}





alert("تم حذف المنتج");



loadProducts(
categorySelect.value
);



};










// =====================
// تنظيف
// =====================


function clearForm(){



categorySelect.value="";


nameInput.value="";


descriptionInput.value="";


priceInput.value="";


imageInput.value="";



}