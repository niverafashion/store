import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import {
createAudience
}
from "./meta.js";


dotenv.config();


const app =
express();


app.use(cors());

app.use(express.json());





app.post(
"/push-meta",

async(req,res)=>{


try{


let result =
await createAudience(
req.body.users
);



res.json(result);



}

catch(error){

console.log("========== META ERROR ==========");

console.log(error);

console.log(
error.response?.data
);

console.log("================================");


res.status(500).json({

error:
error.response?.data ||
error.message

});

}



});





app.listen(
3000,

()=>{

console.log(
"NIVRA META API RUNNING"
);

}

);