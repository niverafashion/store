import { supabase } from "./supabase.js";


export async function login(email,password){


const {data,error} = await supabase.auth.signInWithPassword({

email: email,

password: password

});



if(error){


if(error.message.includes("Invalid login credentials")){


return {

success:false,

message:"الإيميل أو كلمة السر غير صحيحة"

};


}


return {

success:false,

message:error.message

};



}



return {


success:true,

user:data.user


};



}
