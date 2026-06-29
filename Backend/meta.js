import axios from "axios";


export async function createAudience(users){


const data = users.map(user=>{


return [

user.phoneHash,

user.emailHash,

user.country,

user.city

]


});



const response =
await axios.post(


`https://graph.facebook.com/v20.0/act_${process.env.META_AD_ACCOUNT}/customaudiences`,

{


name:
"NIVRA AI VIP Audience",



subtype:
"CUSTOM",



customer_file_source:
"USER_PROVIDED_ONLY",



schema:[

"PHONE",

"EMAIL",

"COUNTRY",

"CITY"

],



data

},



{

params:{


access_token:
process.env.META_TOKEN


}

}


);



return response.data;


}