//Server
const server			=	require('express')();
const http				=	require('http').Server(server);
const express			=	require('express');
const fs 				=	require('fs');
const bodyParser		=	require('body-parser');
const dotenv 			=	require('dotenv');
const crypto			=	require('node:crypto');
const {MongoClient}		=	require('mongodb');
dotenv.config();

server.set('view engine','ejs');
var viewArray	=	[__dirname+'/views'];
var viewFolder	=	fs.readdirSync('views');
for(var i=0;i<viewFolder.length;i++){
	if(viewFolder[i].split(".").length==1){
		viewArray.push(__dirname+'/'+viewFolder[i]);
	}
}
server.set('views', viewArray);
server.use(express.static(__dirname + '/public'));
server.use(bodyParser.json({limit:'50mb'}));  
server.use(bodyParser.urlencoded({ limit:'50mb' , extended: true }));

var bucket = process.env.bucket ? process.env.bucket : "";

const mongourl	=	process.env.mongourl;
const client 	= 	new MongoClient(mongourl,{});

http.listen(process.env.PORT, function(){
	console.log("MobaCloud Operators");
	console.log("Server Started");
	var dbConnectionStart	=	new Date().getTime();
	client.connect()
	.then(() => {
		console.log("Connected to database in " + eval(new Date().getTime()/1000-dbConnectionStart/1000).toFixed(2)+"s")
		usersDB		=	client.db("Mobahub").collection('Modeller Cloud');
	})
	.catch((error)=>{
		console.log(error);
	})
});

server.get('/modeller/:url1/:url2',async (req,res)=>{
	res.render("home",{
		url1:decodeURIComponent(req.params.url1),
		url2:decodeURIComponent(req.params.url2),
		bucket: bucket
	});
});