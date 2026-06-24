import { supabase } from "./supabase.js";




// ===============================
// GLOBAL DATA
// ===============================


let customers=[];
let orders=[];
let products=[];
let returns=[];



let vipAudience=[];
let hotAudience=[];
let lostAudience=[];



// ===============================
// START
// ===============================


document.addEventListener(
"DOMContentLoaded",
()=>{

loadAI();

});




// ===============================
// LOAD DATABASE
// ===============================


async function loadAI(){


try{


const [
customersRes,
ordersRes,
productsRes,
returnsRes

]= await Promise.all([



supabase
.from("customers")
.select("*"),



supabase
.from("orders")
.select("*"),



supabase
.from("products")
.select("*"),



supabase
.from("returns")
.select("*")



]);




customers =
customersRes.data || [];

orders =
ordersRes.data || [];

products =
productsRes.data || [];

returns =
returnsRes.data || [];




analyzeCustomers();


drawCharts();


generateMetaAI();


}


catch(error){

console.log(error);

}


}






// ===============================
// CUSTOMER AI ENGINE
// ===============================



function analyzeCustomers(){



customers =
customers.map(customer=>{


let userOrders =
orders.filter(
o=>o.customer_id===customer.id
);



let totalSpend =
userOrders.reduce(

(a,b)=>
a+
Number(b.total_price||0)

,0);




let completed =
userOrders.filter(
o=>o.status==="completed"
).length;



let cancelled =
userOrders.filter(
o=>o.status==="cancelled"
).length;



let daysInactive=999;



if(customer.last_order){


daysInactive =
Math.floor(

(
Date.now()
-
new Date(customer.last_order)

)
/
86400000

);


}





// AI SCORE


let score=0;



score +=
userOrders.length*10;



score +=
totalSpend/10;



score +=
completed*15;



score -=
cancelled*20;



if(daysInactive<60)

score+=30;



if(daysInactive>180)

score-=40;




return {


...customer,


orders:userOrders.length,


spend:Math.round(totalSpend),


completed,


cancelled,


score:



Math.max(
0,
Math.min(
100,
Math.round(score)
)

)



};



});





vipAudience =
customers.filter(
c=>c.score>=80
);




hotAudience =
customers.filter(
c=>
c.score>=50 &&
c.score<80
);



lostAudience =
customers.filter(
c=>
c.score<30
);






updateNumbers();


fillVIP();



}




// ===============================
// NUMBERS
// ===============================


function updateNumbers(){


document.getElementById("customersCount").innerHTML =
customers.length;



document.getElementById("vipCount").innerHTML =
vipAudience.length;



document.getElementById("hotCount").innerHTML =
hotAudience.length;



document.getElementById("lostCount").innerHTML =
lostAudience.length;





document.getElementById("vipAudience").innerHTML =
vipAudience.length;



document.getElementById("hotAudience").innerHTML =
hotAudience.length;



document.getElementById("lostAudience").innerHTML =
lostAudience.length;



}






// ===============================
// CHARTS
// ===============================



function drawCharts(){



// GOVERNORATES


let gov={};


customers.forEach(c=>{


let g =
c.governorate ||
"غير معروف";


gov[g]=
(gov[g]||0)+1;


});



new Chart(
govChart,

{

type:"bar",

data:{


labels:Object.keys(gov),


datasets:[{


label:
"Customers",


data:
Object.values(gov)


}]


}



});








// SOURCES


let sources={};



orders.forEach(o=>{


let s=
o.source||
"unknown";


sources[s]=
(sources[s]||0)+1;


});




new Chart(

sourceChart,

{


type:"doughnut",


data:{


labels:
Object.keys(sources),



datasets:[{

data:
Object.values(sources)

}]


}


}



);








// PRODUCTS



let prod={};



orders.forEach(o=>{


if(o.product_name)

prod[o.product_name]=
(prod[o.product_name]||0)+1;


});



new Chart(

productChart,

{

type:"bar",

data:{


labels:
Object.keys(prod),


datasets:[{


label:
"Sales",


data:
Object.values(prod)


}]


}


}


);







// RETURNS



let reasons={};


returns.forEach(r=>{


let x=
r.reason||
"Unknown";


reasons[x]=
(reasons[x]||0)+1;


});





new Chart(

returnChart,

{

type:"pie",

data:{


labels:
Object.keys(reasons),


datasets:[{


data:
Object.values(reasons)


}]


}


}


);






// APEX BEHAVIOR



new ApexCharts(

behaviorChart,

{

chart:{

type:"line"

},


series:[{


name:
"Orders",


data:

orders.map(

o=>
new Date(o.created_at)
.getDate()

)


}]

}

).render();





}







// ===============================
// META AI
// ===============================


function generateMetaAI(){



let text=`


🤖 AI Analysis


الجمهور الأقوى حاليا:

👑 VIP:
${vipAudience.length}


🔥 Hot:
${hotAudience.length}



اقتراح Meta Ads:


1- استخدم VIP كـ Custom Audience


2- اعمل Lookalike 1%


3- ركز على المحافظات الأعلى طلباً


4- اعمل Retarget للعملاء غير النشطين


5- المنتجات الأكثر مبيعاً تكون Dynamic Ads



`;



aiBox.innerHTML =
text;



}








// ===============================
// VIP TABLE
// ===============================



function fillVIP(){


vipTable.innerHTML="";



vipAudience
.slice(0,20)
.forEach(c=>{


vipTable.innerHTML += `


<tr>


<td>

${c.name||"بدون اسم"}

</td>



<td>

${c.orders}

</td>



<td>

${c.spend} IQD

</td>




<td>

${c.score}

</td>




<td>

${
c.score>90?

"VIP Retarget"

:

"Offer"

}


</td>



</tr>


`;


});


}









// ===============================
// EXPORT CSV
// ===============================



function exportCSV(data){


let csv=

"name,phone,score\n";



data.forEach(c=>{


csv +=

`${c.name},${c.phone},${c.score}\n`;


});




let blob =
new Blob(

[csv],

{
type:
"text/csv"

}

);



let url =
URL.createObjectURL(blob);



let a =
document.createElement("a");



a.href=url;



a.download=
"nivra_audience.csv";



a.click();



}






exportVIP.onclick=
()=>exportCSV(vipAudience);



exportHot.onclick=
()=>exportCSV(hotAudience);



exportLost.onclick=
()=>exportCSV(lostAudience);










// ===============================
// AI LOOKALIKE SIMULATION
// ===============================



generateAudience.onclick = async ()=>{


if(vipAudience.length === 0){

audienceResult.innerHTML = `

<div class="alert alert-warning">

لا يوجد عملاء VIP كفاية لبناء Lookalike

</div>

`;

return;

}



audienceResult.innerHTML=

`

<div class="alert alert-success">

<h4>
🤖 AI Audience Ready
</h4>


<p>
تم تحليل العملاء بواسطة NIVRA AI
</p>


<button 
id="pushMeta"
class="btn btn-primary">

🚀 Push To Meta

</button>


</div>

`;



document
.getElementById("pushMeta")
.onclick =
pushMeta;


// تجهيز بيانات التدريب


let trainingData =
customers.map(c=>[


Number(c.spend || 0),

Number(c.orders || 0),

Number(c.completed || 0)


]);





let labels =
customers.map(c=>


c.score >= 80 ? 1 : 0


);





const xs =
tf.tensor2d(trainingData);



const ys =
tf.tensor2d(
labels.map(x=>[x])
);





// إنشاء موديل


let model =
tf.sequential();



model.add(

tf.layers.dense({

units:32,

activation:"relu",

inputShape:[3]

})

);



model.add(

tf.layers.dense({

units:16,

activation:"relu"

})

);



model.add(

tf.layers.dense({

units:1,

activation:"sigmoid"

})

);





model.compile({

optimizer:
"adam",


loss:
"binaryCrossentropy",


metrics:
["accuracy"]


});





await model.fit(xs,ys,{

epochs:30,
shuffle:true

});



// اختبار العملاء


let predictions =
model.predict(xs);



let scores =
await predictions.data();


xs.dispose();
ys.dispose();




let lookalike =
customers.map((c,i)=>({


...c,


aiSimilarity:

Math.round(scores[i]*100)


}))

.filter(c=>

c.aiSimilarity > 70

)

.sort((a,b)=>

b.aiSimilarity-a.aiSimilarity

);







audienceResult.innerHTML = `


<div class="ai-box">


<h3>

🤖 AI Lookalike Audience Created

</h3>


<hr>



<h5>

عدد الجمهور المقترح:

${lookalike.length}

شخص

</h5>



<p>

تم التحليل اعتماداً على:

</p>



<ul>


<li>
💰 قيمة العميل
</li>


<li>
🛒 تكرار الشراء
</li>


<li>
✅ الطلبات المكتملة
</li>


<li>
🔥 سلوك VIP
</li>


</ul>




<h5>

أفضل العملاء المشابهين:

</h5>



<table class="table">


<tr>

<th>
الاسم
</th>


<th>
AI Similarity
</th>


</tr>



${lookalike
.slice(0,10)
.map(c=>`


<tr>

<td>

${c.name || "بدون اسم"}

</td>


<td>

${c.aiSimilarity}%

</td>


</tr>


`).join("")}



</table>



<span class="badge bg-success">

جاهز للتصدير إلى Meta Ads

</span>



</div>



`;



};
// ===============================
// SCROLL TO TOP
// ===============================


const scrollBtn = document.getElementById("scrollTopBtn");



window.addEventListener("scroll",()=>{


if(window.scrollY > 400){


scrollBtn.classList.add("show");


}else{


scrollBtn.classList.remove("show");


}



});




scrollBtn.addEventListener("click",()=>{


window.scrollTo({

top:0,

behavior:"smooth"

});


});
async function sha256(text){

const encoder = new TextEncoder();

const data =
encoder.encode(text);


const hashBuffer =
await crypto.subtle.digest(
"SHA-256",
data
);


return Array.from(
new Uint8Array(hashBuffer)
)
.map(
b=>b.toString(16).padStart(2,"0")
)
.join("");

}
async function pushMeta(){


if(vipAudience.length === 0){

alert(
"لا يوجد جمهور VIP"
);

return;

}




let users = await Promise.all(

vipAudience.map(async c=>{


return {


email_hash:

c.email
?
await sha256(
c.email.trim().toLowerCase()
)
:
null,



phone_hash:

c.phone
?
await sha256(
c.phone.replace(/\D/g,"")
)
:
null,


city:

c.governorate
?
await sha256(
c.governorate
)
:
null,



purchase_value:

c.spend,



orders:

c.orders



}


})

);





let response = await fetch(

"http://localhost:3000/push-meta",

{


method:"POST",


headers:{


"Content-Type":

"application/json"


},


body:

JSON.stringify({

users

})


}


);




let result =
await response.json();



console.log(result);



alert(

"🚀 تم تجهيز الجمهور للإرسال إلى Meta"

);



}
