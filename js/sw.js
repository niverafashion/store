self.addEventListener("install",()=>{

console.log("NIVRA App Installed");

});


self.addEventListener("fetch",(event)=>{

event.respondWith(
fetch(event.request)
);

});