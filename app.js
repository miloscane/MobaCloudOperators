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
const io				=	require('socket.io')(http);
const nodemailer		=	require('nodemailer');
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

var transporter = nodemailer.createTransport({
	host: process.env.transporterhost,
	port: 465,
	secure: true,
	auth: {
		user: process.env.transporteruser,
		pass: process.env.transporterpass
	}
});

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
			bucket: bucket,
			user: req.session.user.username
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

var scenarios = [
		{
			"number":1,
			"string":"Scenario 1 - naar Velsen"
		},
		{
			"number":2,
			"string":"Scenario 1 - naar Velsen fake"
		},
		{
			"number":3,
			"string":"Scenario 2 - THV ketel 41"
		},
		{
			"number":4,
			"string":"Scenario 2 - THV ketel 41 fake"
		},
		{
			"number":5,
			"string":"Scenario 3 - IJmond"
		},
		{
			"number":6,
			"string":"Scenario 3 - IJmond fake"
		},
		{
			"number":7,
			"string":"Scenario 4 - KF1"
		},
		{
			"number":8,
			"string":"Scenario 4 - KF1 fake"
		},
		{
			"number":9,
			"string":"Scenario 5 - Velsen 25"
		},
		{
			"number":10,
			"string":"Scenario 5 - Velsen 25 fake"
		},
		{
			"number":11,
			"string":"Scenario 6 - CN2 -> fakkels"
		},
		{
			"number":12,
			"string":"Scenario 6 - CN2 -> fakkels fake"
		},
	]


io.on('connection', function(socket){
	socket.on('grade', function(user,scenario,grade,sentString){
		//console.log("Received a grade")
		var success = Number(grade)==1 ? "successfully" : "unsuccessfully";
		var scenarioString = "Undefined";
		for(var i=0;i<scenarios.length;i++){
			//console.log(Number(scenario) + " vs "+ scenarios[i].number);
			if(Number(scenario)==scenarios[i].number){
				scenarioString = scenarios[i].string;
			}
		}
		var mailOptions = {
			from: '"MobaCloud" <admin@mobatec.cloud>',
			to: 'ron.vanderaar@tatasteeleurope.com,frank.fe.berkholst@tatasteeleurope.com,milos@mobatec.nl',
			subject: 'Operator Training Result',
			html: 'Hello,<br>The operator '+user+' '+success+' finished the scenario ' + scenarioString+".<br>Timestamp: "+new Date()+"<br>&nbsp;<br>Kind regards,<br>MobaCloud<br><img src=\"https://www.mobatec.nl/web/wp-content/uploads/2017/10/Logo.jpg\">"
		};
			
		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				console.log(error)
			}
			socket.emit("gradeReceived",user,sentString);
		});
		
		
	})
})