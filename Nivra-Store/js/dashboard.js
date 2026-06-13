import { supabase } from "./supabase.js";


// =========================
// فتح واغلاق القائمة الجانبية
// =========================


const menuToggle =
document.getElementById("menuToggle");


const menu =
document.querySelector(".menu");


const main =
document.querySelector("main");



menuToggle.onclick = ()=>{


menu.classList.toggle("active");


main.classList.toggle("shift");


};




// =========================
// تسجيل الخروج
// =========================


document
.getElementById("logout")
.onclick = async ()=>{


await supabase.auth.signOut();


window.location.href =
"../login.html";


};






// =========================
// حماية الداش بورد
// =========================


async function checkUser(){


const {

data:{user}

}=

await supabase.auth.getUser();



if(!user){


window.location.href =
"../login.html";


return;


}



}


checkUser();










// =========================
// جلب الاحصائيات
// =========================



async function loadStats(){



try{



// الاصناف


let categories =

await supabase

.from("categories")

.select("*",
{
count:"exact",
head:true
});




document
.getElementById("categoriesCount")
.innerText =

categories.count || 0;






// المنتجات


let products =

await supabase

.from("products")

.select("*",
{
count:"exact",
head:true
});




document
.getElementById("productsCount")
.innerText =

products.count || 0;






// الطلبات


let orders =

await supabase

.from("orders")

.select("*",
{
count:"exact",
head:true
});



document
.getElementById("ordersCount")
.innerText =

orders.count || 0;








// الزبائن


let customers =

await supabase

.from("customers")

.select("*",
{
count:"exact",
head:true
});



document
.getElementById("customersCount")
.innerText =

customers.count || 0;








// المخزون


let stock =

await supabase

.from("product_variants")

.select("stock_quantity");





let totalStock = 0;



if(stock.data){


stock.data.forEach(x=>{


totalStock +=

Number(x.stock_quantity || 0);


});


}



document
.getElementById("stockCount")
.innerText =

totalStock;









// الطلبات الجديدة


let newOrders =

await supabase

.from("orders")

.select("*")

.eq(
"status",
"new"
);




document
.getElementById("newOrders")
.innerText =

newOrders.data?.length || 0;





}

catch(error){


console.log(error);


}



}




loadStats();










// =========================
// اغلاق القائمة عند الضغط خارجها
// =========================



document.addEventListener(
"click",
(e)=>{


if(

menu.classList.contains("active")

&&

!menu.contains(e.target)

&&

!menuToggle.contains(e.target)

){


menu.classList.remove("active");


main.classList.remove("shift");


}



});








// =========================
// تحديث تلقائي
// =========================


setInterval(()=>{


loadStats();


},30000);