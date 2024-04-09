//Server
const server			=	require('express')();
const http				=	require('http').Server(server);
const express			=	require('express');
const fs 				=	require('fs');
const bodyParser		=	require('body-parser');
const dotenv 			=	require('dotenv');
const crypto			=	require('node:crypto');
const {MongoClient}		=	require('mongodb');
const session			=	require('express-session');
const cookieParser		=	require('cookie-parser');

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
server.use(session({
	secret: process.env.sessionsecret,
    resave: true,
    saveUninitialized: true
}));

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
		usersDB		=	client.db("MobaHub").collection('Modeller Cloud');
	})
	.catch((error)=>{
		console.log(error);
	})
});

server.get('/login',async (req,res)=>{
	if(req.session.user){
		res.redirect("/")
	}else{
		if(req.query.url){
			res.render("login",{
				url: decodeURIComponent(req.query.url),
				bucket: bucket
			});
		}else{
			res.render("login",{});
		}
	}
});

server.post('/login',async (req,res)=>{
	if(req.session.user){
		res.redirect("/")
	}else{
		const username = req.body.username;
		const password = hashString(req.body.password);
		usersDB.find({username:username}).toArray()
		.then((users) => {
			if(users.length>0){
				if(users[0].password==password){
					var sessionObject	=	JSON.parse(JSON.stringify(users[0]));
					delete sessionObject.password;
					req.session.user	=	sessionObject;
					res.redirect(users[0].url);
					
				}else{
					res.send("Wrong password");
				}
			}else{
				res.send("No such user");
			}
		})
		.catch(error => {
			console.log(error)
			res.send("login error");
		})
	}
});


server.get('/modeller/:url',async (req,res)=>{
	res.render("home",{
		url:decodeURIComponent(req.params.url),
		bucket: bucket
	});
});




server.get('/tata1',async (req,res)=>{
	if(req.session.user){
		res.render("tata1",{
			bucket: bucket
		});
	}else{
		res.redirect("/login?url="+encodeURIComponent(req.url));
	}

	
});

function hashString(string){
	if (typeof string === 'string'){
		var hash	=	crypto.createHash('md5').update(string).digest('hex')
	}else{
		var hash    = "?"
	}
	
	return hash
}