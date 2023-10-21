console.log("Ciao sono Node");
const express=require("express");
const http=require("https");
const fs=require("fs");
const app=express();
app.use(express.static("public"));
http.createServer({
    key:fs.readFileSync("certificati/domain.key"),
    cert:fs.readFileSync("certificati/domain.crt"),
    passphrase:"Andreia"
}, app).listen(443);
