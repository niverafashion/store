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

const imagesInput =
document.getElementById("images");

const saveBtn =
document.getElementById("save");


const list =
document.getElementById("list");



let editId = null;






// ==========================
// تحميل الأصناف
// ==========================


async function loadCategories(){


const {data,error}=

await supabase

.from("categories")

.select("*")

.order("id");



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




loadCategories();





categorySelect.onchange=()=>{


loadProducts(categorySelect.value);


};









// ==========================
// تحميل المنتجات
// ==========================


async function loadProducts(categoryId=""){



let query =

supabase

.from("products")

.select(`

*,

categories(
name
),

product_images(
image_url
)

`)

.order(
"id",
{
ascending:false
}

);




if(categoryId){

query=query.eq(
"category_id",
categoryId
);

}



const {data,error}=

await query;



if(error){

console.log(error);

return;

}




list.innerHTML="";





data.forEach(product=>{



list.innerHTML +=`



<div class="category-card">


<img 
src="
${
product.product_images?.[0]?.image_url 
||
product.main_image 
||
'../assets/images/default.jpg'
}
">




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




loadProducts();











// ==========================
// التحقق من البيانات
// ==========================


function validateProduct(){



let category =
categorySelect.value.trim();


let name =
nameInput.value.trim();


let description =
descriptionInput.value.trim();


let price =
priceInput.value.trim();


let image =
imageInput.value.trim();

let images =
imagesInput.value.trim();






if(!category){


alert("اختار الصنف");

return false;


}





if(!name){


alert("اكتب اسم المنتج");

nameInput.focus();

return false;


}







if(!description){


alert("اكتب وصف المنتج");

descriptionInput.focus();

return false;


}





if(description.length > 100){


alert("وصف المنتج يجب ان لا يتجاوز 100 حرف");

descriptionInput.focus();

return false;


}







if(!price || Number(price)<=0){


alert("ادخل سعر صحيح");

priceInput.focus();

return false;


}






if(!image){

alert("ادخل الصورة الرئيسية");

return false;

}

return true;


}









// ==========================
// فحص تكرار الاسم
// ==========================


async function checkDuplicateName(){



const {data,error}=

await supabase

.from("products")

.select("id")

.eq(
"name",
nameInput.value.trim()
)

.maybeSingle();





if(error){

return false;

}







if(data && data.id != editId){


alert("اسم المنتج موجود مسبقا");

return true;


}



return false;


}









// ==========================
// حفظ / تعديل
// ==========================



saveBtn.onclick = async ()=>{



if(!validateProduct())
return;






if(await checkDuplicateName())
return;







let product={



category_id:
categorySelect.value,



name:
nameInput.value.trim(),



description:
descriptionInput.value.trim(),



price:
Number(priceInput.value),



main_image:
imageInput.value.trim()



};









// تعديل


if(editId){



const {error}=

await supabase

.from("products")

.update(product)

.eq(
"id",
editId
);


// حذف الصور القديمة

await supabase

.from("product_images")

.delete()

.eq(
"product_id",
editId
);





// إعادة حفظ الصور الموجودة بالـ textbox فقط

if(imagesInput.value.trim()){



let images =

imagesInput.value

.split(",")

.map(x=>x.trim())

.filter(x=>x);



let rows = images.map((img,index)=>({


product_id: editId,

image_url: img,

sort_order:index + 1


}));




const {error:imageError}=

await supabase

.from("product_images")

.insert(rows);



if(imageError){

alert(imageError.message);

return;

}


}


if(error){


alert(error.message);

return;


}





alert("تم تعديل المنتج");



editId=null;



saveBtn.innerHTML=`

<i class="fa-solid fa-floppy-disk"></i>

حفظ المنتج

`;



}







// إضافة


else{



const {data:newProduct,error}=

await supabase

.from("products")

.insert(product)

.select()

.single();



if(error){

alert(error.message);

return;

}




// حفظ الصور الإضافية

if(imagesInput.value.trim()){


let images =

imagesInput.value

.split(/,|\n/)

.map(x=>x.trim())

.filter(x=>x);


let rows = images.map((img,index)=>({


product_id:newProduct.id,

image_url:img,

sort_order:index


}));



const {error:imageError}=

await supabase

.from("product_images")

.insert(rows);



if(imageError){

console.log(imageError);

}

}




if(error){


alert(error.message);

return;


}





alert("تم إضافة المنتج");



}







clearForm();


loadProducts(categorySelect.value);



};












// ==========================
// تعديل
// ==========================


window.editProduct = async function(id){



const {data,error}=

await supabase

.from("products")

.select(`

*,

product_images(
id,
image_url
)

`)

.eq(
"id",
id
)

.single();




if(error){

console.log(error);

return;

}




// تعبئة البيانات

categorySelect.value =
data.category_id;


nameInput.value =
data.name;


descriptionInput.value =
data.description;


priceInput.value =
data.price;


imageInput.value =
data.main_image;




// جلب الصور الإضافية

imagesInput.value =

data.product_images
?.map(x=>x.image_url)
.join(",\n") || "";





editId = id;




saveBtn.innerHTML = `

<i class="fa-solid fa-pen"></i>

تعديل المنتج

`;




window.scrollTo({

top:0,

behavior:"smooth"

});



};


// ==========================
// حذف المنتج
// ==========================

window.deleteProduct = async function(id){



let ok =

confirm(
"هل تريد حذف المنتج ؟"
);



if(!ok)

return;









// فحص الارتباط بالحجم واللون

const {data:variants,error:vError}=

await supabase

.from("product_variants")

.select("id")

.eq(
"product_id",
id
)

.limit(1);






if(vError){

console.log(vError);

return;

}






if(variants.length > 0){



alert(

"لا يمكن حذف المنتج لأنه مرتبط بالأحجام والألوان والمخزون. احذف الارتباطات أولا."

);


return;


}









// ==========================
// حذف الصور المرتبطة
// ==========================


const {error:imageError}=

await supabase

.from("product_images")

.delete()

.eq(

"product_id",

id

);





if(imageError){


console.log(imageError);

alert(
"خطأ بحذف صور المنتج"
);


return;


}









// ==========================
// حذف المنتج
// ==========================


const {error}=

await supabase

.from("products")

.delete()

.eq(

"id",

id

);






if(error){


alert(error.message);

return;


}





alert("تم حذف المنتج والصور");



loadProducts(categorySelect.value);



};






// ==========================
// تنظيف
// ==========================


function clearForm(){



categorySelect.value="";


nameInput.value="";


descriptionInput.value="";


priceInput.value="";


imageInput.value="";

imagesInput.value="";

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