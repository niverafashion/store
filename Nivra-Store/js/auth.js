import { supabase } from "./supabase.js";


// تسجيل الدخول
export async function login(email,password){


const {data,error} =
await supabase.auth.signInWithPassword({

email: email,
password: password

})


if(error){

console.log(error.message)
return false

}


return data

}



// تسجيل الخروج
export async function logout(){

await supabase.auth.signOut()

window.location.href="login.html"

}



// فحص المستخدم
export async function checkAuth(){


const {data} =
await supabase.auth.getUser()


if(!data.user){

window.location.href="login.html"

}


}