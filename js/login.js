import { login } from "./auth.js";



document
.getElementById("login")
.onclick = async ()=>{


const email =
document.getElementById("email").value.trim();


const password =
document.getElementById("password").value.trim();



if(!email){

alert("يرجى إدخال الإيميل");
return;

}


if(!password){

alert("يرجى إدخال كلمة السر");
return;

}



try{


const result =
await login(email,password);



if(result.success){


window.location.replace("./dashboard.html");


}else{


alert(result.message);


}


}
catch(error){


console.error(error);


alert("حدث خطأ أثناء تسجيل الدخول");


}


};




document
.getElementById("backStore")
.onclick = ()=>{


window.location.replace("./index.html");


};