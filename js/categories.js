import { supabase } from "./supabase.js";



const nameInput =
document.getElementById("name");


const descriptionInput =
document.getElementById("description");


const imageInput =
document.getElementById("image");


const saveBtn =
document.getElementById("save");


const list =
document.getElementById("list");



let editId = null;





// ==========================
// تحميل الأصناف
// ==========================


async function loadCategories(){



const {

data,
error

}=

await supabase

.from("categories")

.select("*")

.order(
"id",
{
ascending:false
}

);



if(error){

console.log(error);

return;

}



list.innerHTML="";





data.forEach(item=>{



list.innerHTML += `



<div class="category-card">



<img src="${item.image || '../assets/images/default.jpg'}">





<div class="category-info">


<h3>

${item.name}

</h3>


<p>

${item.description || ""}

</p>


</div>






<div class="card-actions">



<button 

class="edit-btn"

onclick="editCategory('${item.id}')">


<i class="fa-solid fa-pen"></i>

تعديل


</button>







<button

class="delete-btn"

onclick="deleteCategory('${item.id}')">


<i class="fa-solid fa-trash"></i>

حذف


</button>



</div>





</div>



`;



});



}





loadCategories();









// ==========================
// حفظ / تعديل
// ==========================



saveBtn.onclick = async ()=>{


let name =
nameInput.value.trim();


let description =
descriptionInput.value.trim();


let image =
imageInput.value.trim();



// التحقق من الحقول

if(!name){


alert("اكتب اسم الصنف");

nameInput.focus();

return;


}



if(!description){


alert("اكتب وصف الصنف");

descriptionInput.focus();

return;


}



if(!image){


alert("ادخل رابط صورة الصنف");

imageInput.focus();

return;


}



// منع الوصف اكثر من 100 حرف

if(description.length > 100){


alert("وصف الصنف يجب ان لا يتجاوز 100 حرف");


descriptionInput.focus();


return;


}



// ==========================
// تعديل
// ==========================


if(editId){



const {data:exist}=

await supabase

.from("categories")

.select("id")

.eq("name",name)

.neq("id",editId)
.maybeSingle();




if(exist){

alert("اسم الصنف موجود مسبقاً");

return;

}




const {

error

}=

await supabase

.from("categories")

.update({

name,
description,
image

})

.eq(
"id",
editId
);





if(error){

console.log(error);

return;

}




alert("تم تعديل الصنف");



editId=null;



saveBtn.innerHTML = `

<i class="fa-solid fa-floppy-disk"></i>

حفظ الصنف

`;



}





// ==========================
// إضافة جديد
// ==========================


else{



const {data:exist}=

await supabase

.from("categories")

.select("id")

.eq("name",name)

.maybeSingle();





if(exist){


alert("هذا الصنف موجود مسبقاً");

return;


}







const {

error

}=

await supabase

.from("categories")

.insert({

name,

description,

image

});






if(error){

console.log(error);

return;

}





alert("تمت إضافة الصنف");



}






clearForm();


loadCategories();



};








// ==========================
// تعديل
// ==========================



window.editCategory = async function(id){



const {

data,

error

}=

await supabase

.from("categories")

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






nameInput.value =
data.name;



descriptionInput.value =
data.description;



imageInput.value =
data.image;






editId=id;



saveBtn.innerHTML = `

<i class="fa-solid fa-pen"></i>

تعديل الصنف

`;




window.scrollTo({

top:0,

behavior:"smooth"

});



};









// ==========================
// حذف
// ==========================


window.deleteCategory = async function(id){



let confirmDelete =

confirm(
"هل تريد حذف هذا الصنف ؟"
);



if(!confirmDelete)
return;





// فحص المنتجات المرتبطة

const {data:products,error:checkError}=

await supabase

.from("products")

.select("id")

.eq(
"category_id",
id
)

.limit(1);






if(checkError){

console.log(checkError);

return;

}





if(products.length > 0){


alert(
"لا يمكن حذف هذا الصنف لأنه يحتوي على منتجات مرتبطة"
);


return;


}







// حذف الصنف

const {

error

}=

await supabase

.from("categories")

.delete()

.eq(
"id",
id
);






if(error){

console.log(error);

alert("حدث خطأ أثناء الحذف");

return;

}






alert("تم حذف الصنف");


loadCategories();



};









// ==========================
// تنظيف الفورم
// ==========================


function clearForm(){


nameInput.value="";


descriptionInput.value="";


imageInput.value="";


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