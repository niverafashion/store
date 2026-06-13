import {login} from "./auth.js"



document
.getElementById("login")
.onclick = async ()=>{


let email =
document.getElementById("email").value


let password =
document.getElementById("password").value



let result =
await login(email,password)


if(result){

window.location.href="dashboard.html"

}


}