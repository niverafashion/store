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





if(!name){


alert("اكتب اسم الصنف");

return;


}







// تعديل


if(editId){



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






// إضافة جديد


else{



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