import {supabase} from "./supabase.js";




// عناصر الصفحة

const usersList =
document.getElementById("usersList");


const search =
document.getElementById("search");


const filterRole =
document.getElementById("filterRole");



let users=[];








// ==========================
// تحميل المستخدمين
// ==========================


async function loadUsers(){



const {data,error}=

await supabase

.from("users")

.select("*")

.order(

"created_at",

{

ascending:false

}

);





if(error){

console.log(error);

return;

}





users=data;



renderUsers();



updateCards();



}









// ==========================
// عرض المستخدمين
// ==========================


function renderUsers(){



let html="";





let keyword=

search.value.toLowerCase();



let role=

filterRole.value;






users

.filter(u=>{


let matchSearch =

u.name

.toLowerCase()

.includes(keyword)

||

(u.phone ?? "")

.includes(keyword);





let matchRole =

role ?

u.role===role

:

true;





return matchSearch && matchRole;



})



.forEach(u=>{





html +=`


<tr>


<td>

${u.name}

</td>



<td>

${u.phone ?? ""}

</td>




<td>

${u.email ?? ""}

</td>




<td>

${roleName(u.role)}

</td>




<td>

${new Date(u.created_at)
.toLocaleDateString()}

</td>




<td>



<button

onclick="deleteUser('${u.id}')"

>

حذف

</button>



</td>



</tr>



`;



});






usersList.innerHTML=html;



}









// ==========================
// اسم الصلاحية
// ==========================


function roleName(role){


if(role==="admin")

return "مدير النظام";


if(role==="manager")

return "مدير";


if(role==="employee")

return "موظف";


return role;


}









// ==========================
// الكروت
// ==========================


function updateCards(){



document

.getElementById("usersCount")

.innerText=

users.length;






document

.getElementById("adminsCount")

.innerText=

users.filter(

u=>u.role==="admin"

).length;







document

.getElementById("employeesCount")

.innerText=

users.filter(

u=>u.role==="employee"

).length;




}









// ==========================
// إضافة مستخدم
// ==========================


document

.getElementById("saveUser")

.onclick=async()=>{



let name =

document.getElementById("name").value;



let phone =

document.getElementById("phone").value;



let email =

document.getElementById("email").value;



let role =

document.getElementById("role").value;





if(!name){

alert("ادخل الاسم");

return;

}





const {data,error}=

await supabase

.from("users")

.insert({

name,

phone,

email,

role

})

.select()

.single();





if(error){

console.log(error);

alert("حدث خطأ");

return;

}





// سجل العملية

await supabase

.from("activity_logs")

.insert({

user_id:data.id,

action:"CREATE USER",

table_name:"users",

record_id:data.id

});





alert("تمت إضافة المستخدم");



clearForm();


loadUsers();



}









function clearForm(){


document.getElementById("name").value="";


document.getElementById("phone").value="";


document.getElementById("email").value="";


}









// ==========================
// حذف مستخدم
// ==========================


window.deleteUser=async(id)=>{



let ok=

confirm("هل تريد حذف المستخدم؟");



if(!ok)return;






const {error}=

await supabase

.from("users")

.delete()

.eq(

"id",

id

);






if(error){

console.log(error);

return;

}





loadUsers();



}









// ==========================
// بحث وفلترة
// ==========================


search

.oninput=()=>{


renderUsers();


}







filterRole

.onchange=()=>{


renderUsers();


}









loadUsers();