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



if(menuToggle){

menuToggle.onclick = ()=>{

menu.classList.toggle("active");

main.classList.toggle("shift");

};

}




// =========================
// تسجيل الخروج
// =========================


document
.getElementById("logout")
.onclick = async ()=>{


try{


await supabase.auth.signOut();


// حذف أي جلسة محفوظة

localStorage.clear();

sessionStorage.clear();



// منع الرجوع

window.location.replace("./login.html");


}

catch(error){


console.log(error);


alert("حدث خطأ أثناء تسجيل الخروج");


}


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
// هوية الموظف الحالي
// =========================

let currentProfile = null;

async function loadCurrentProfile() {

    const { data, error } = await supabase
        .rpc("get_my_chat_profile");

    if (error) {
        console.log("Profile Error:", error);
        return;
    }

    currentProfile = Array.isArray(data) ? data[0] : data;

}
// =========================
// عدد الرسائل غير المقروءة
// =========================

async function loadUnreadMessages() {

    if (!currentProfile?.id) return;

    const { count, error } = await supabase
        .from("direct_messages")
        .select("id", {
            count: "exact",
            head: true
        })
        .neq("sender_user_id", currentProfile.id)
        .is("read_at", null);

    if (error) {
        console.log("Unread Messages Error:", error);
        return;
    }

    const badge = document.getElementById(
        "quickUnreadMessagesCount"
    );

    if (!badge) return;

    const unread = count || 0;

    badge.innerText = unread > 99 ? "99+" : unread;

    badge.style.display = unread > 0 ? "flex" : "none";

}

// =========================
// تشغيل وتحديث عداد الرسائل
// =========================

async function initUnreadMessages() {

    await loadCurrentProfile();

    await loadUnreadMessages();

    // تحديث تلقائي كل 10 ثوانٍ
    setInterval(() => {
        loadUnreadMessages();
    }, 10000);

}

initUnreadMessages();
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
menu &&
menuToggle &&
main &&
menu.classList.contains("active") &&
!menu.contains(e.target) &&
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


