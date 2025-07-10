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
const axios				=	require('axios');
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

function generateId(length) {
	var result           = [];
	var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++ ) {
		result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
	}
	return result.join('');
}

function getDateAsStringForInputObject(date){
	var yearString	=	date.getFullYear();
	var month		=	eval(date.getMonth()+1);
	var monthString	=	(month<10) ? "0" + month : month;
	var day			=	date.getDate();
	var dayString	=	(day<10) ? "0" + day : day;
	return	yearString+"-"+monthString+"-"+dayString;
}

http.listen(process.env.PORT, function(){
	console.log("MobaCloud Operators");
	console.log("Server Started");
	var dbConnectionStart	=	new Date().getTime();
	client.connect()
	.then(async () => {
		console.log("Connected to database in " + eval(new Date().getTime()/1000-dbConnectionStart/1000).toFixed(2)+"s")
		usersDB		=	client.db("MobaHub").collection('Modeller Cloud');
		lmsActivationCodesDB		=	client.db("MobaCloud").collection('LMSActivationCodes');
		lmsUsersDB				=	client.db("MobaCloud").collection('LMSUsers');

		lmsUsersDB.find({}).toArray()
		.then((users)=>{
			/*console.log(users)
			var counter = 0;
			var counter2 = 0;
			for(var i=0;i<users.length;i++){
				if(users[i].type==1){counter++;}
				if(users[i].type==2){counter2++;}
			}
			console.log("1: " + counter)
			console.log("2: " + counter2)*/
		})

		/*lmsUsersDB.find({}).toArray()
		.then((users)=>{
			users.sort((a, b) => {
				if (a.url < b.url) return -1;
				if (a.url > b.url) return 1;
				return 0;
			});
			for(var i=0;i<users.length;i++){
				console.log(users[i].url.split(".modeller")[0])
				console.log("-------")
			}
		})
		.catch((error)=>{
			console.log(error)
		})*/

		/*lmsUsersDB.find({}).toArray()
		.then((users)=>{
			var csvString = "LMS,Username,Customer,Activation Date,Code\r\n";
			for(var i=0;i<users.length;i++){
				csvString += users[i].hostname + ","+users[i].lmsid + ",Technicom,2024-09-11," +  users[i].code + "\r\n"
			}
			fs.writeFileSync("./Users.csv",csvString,"utf8");	
		})
		.catch((error)=>{
			console.log(error)
		})*/

		/*var codes = [];
		for(var i=0;i<80;i++){
			var json = {};
			json.code = generateId(16);
			json.type = 3;
			json.customer = "Litop"
			json.date = getDateAsStringForInputObject(new Date());
			codes.push(json);
		}

		lmsActivationCodesDB.insertMany(codes)
		.then((dbR)=>{
			console.log(dbR)
			console.log("------------")
			for(var i=0;i<codes.length;i++){
				console.log(codes[i].code.substr(0, 4)+"-"+codes[i].code.substr(4, 4)+"-"+codes[i].code.substr(8, 4)+"-"+codes[i].code.substr(12, 4))
			}
		})
		.catch((error)=>{
			console.log(error)
		})*/

		/*lmsActivationCodesDB.deleteMany({date:"2024-09-12"})
		.then((dbResponse)=>{
			console.log(dbResponse)
		})
		.catch((error)=>{
			console.log(error)
		})*/

			/*(var lmsUsers = await lmsUsersDB.find({}).toArray();
			for(var i=0;i<lmsUsers.length;i++){
				try{
					var response = await axios.post('https://student.instances.modeller.cloud/stop', new URLSearchParams({uuid: lmsUsers[i].code}));
					console.log(response.data);
					console.log("#########################################################################################################")
				}catch(err){
					console.log(err.status)
				}
				
			}*/
	
		

	})
	.catch((error)=>{
		console.log(error);
	})
});

server.get('/login',async (req,res)=>{
	if(req.session.user){
		req.session.destroy(function(){});
		res.redirect("/login");
	}else{
		if(req.query.url){
			res.render("login",{
				url: decodeURIComponent(req.query.url),
				bucket: bucket
			});
		}else{
			res.render("login",{
				url: "",
				bucket: bucket
			});
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

server.get('/teacher',async (req,res)=>{
	res.render("teacher",{
		bucket: bucket
	});
});

/*axios.post('https://worley.instances.modeller.cloud/start', new URLSearchParams({uuid: "cKhSJsPucTslTQalWxjY"}))
.then((dockerResponse)=>{
	//console.log(response);
	//res.redirect(users[0].url+"&modelpath="+req.query.modelpath)
	//console.log("Redirected to: "+users[0].url+"&modelpath="+req.query.modelpath);
	console.log(dockerResponse)
})
.catch((error)=>{
	console.log(error);	
})*/

//NURMZGMJELCREZAF, WZQEKWOMLFUFGDVC

/*axios.post('https://student.instances.modeller.cloud/start', new URLSearchParams({uuid: "ABCDABCDABCDABC1"}))
.then((dockerResponse)=>{
	//console.log(response);
	//res.redirect(users[0].url+"&modelpath="+req.query.modelpath)
	//console.log("Redirected to: "+users[0].url+"&modelpath="+req.query.modelpath);
	console.log(dockerResponse)
})
.catch((error)=>{
	console.log(error);	
})
*/
/*axios.post('https://student.instances.modeller.cloud/start', new URLSearchParams({uuid: "NURMZGMJELCREZAF"}))
.then((dockerResponse)=>{
	//console.log(response);
	//res.redirect(users[0].url+"&modelpath="+req.query.modelpath)
	//console.log("Redirected to: "+users[0].url+"&modelpath="+req.query.modelpath);
	console.log(dockerResponse)
})
.catch((error)=>{
	console.log(error);	
})*/

//https://student.instances.modeller.cloud/connect/ABCDABCDABCDABC1/vnc.html?path=connect/ABCDABCDABCDABC1/websocketify&password=7b0ce21a0d8d3c7adec51d48abe2a3e9&autoconnect=true&reconnect=true

/*axios.post('https://student.instances.modeller.cloud/stop', new URLSearchParams({uuid: "KJPPXYUTBVGMKQDO"}))
.then((dockerResponse)=>{
	//console.log(response);
	//res.redirect(users[0].url+"&modelpath="+req.query.modelpath)
	//console.log("Redirected to: "+users[0].url+"&modelpath="+req.query.modelpath);
	console.log(dockerResponse)
})
.catch((error)=>{
	console.log(error);	
})*/

/*axios.post('https://student.instances.modeller.cloud/stop', new URLSearchParams({uuid: "ABCDABCDABCDABC1"}))
.then((dockerResponse)=>{
	//console.log(response);
	//res.redirect(users[0].url+"&modelpath="+req.query.modelpath)
	//console.log("Redirected to: "+users[0].url+"&modelpath="+req.query.modelpath);
	console.log(dockerResponse)
})
.catch((error)=>{
	console.log(error);	
})*/

server.get('/lmsLogin/:hostname/:lmsid',async (req,res)=>{
	var hostname = decodeURIComponent(req.params.hostname);
	var lmsid = decodeURIComponent(req.params.lmsid.split("&")[0]);
	//console.log(req.query.modelpath)
	lmsUsersDB.find({hostname:hostname,lmsid:lmsid}).toArray()
	.then((users)=>{
		if(users.length>0){
			//res.redirect(users[0].url+"&modelpath="+req.query.modelpath)
			axios.post('https://student.instances.modeller.cloud/start', new URLSearchParams({uuid: users[0].code}))
			.then((dockerResponse)=>{
				//console.log(response);
				//res.redirect(users[0].url+"&modelpath="+req.query.modelpath)
				axios.get("https://student.instances.modeller.cloud/connect/"+users[0].code+"/vnc.html?path=connect/"+users[0].code+"/websocketify&password=7b0ce21a0d8d3c7adec51d48abe2a3e9&autoconnect=true&reconnect=true&modelpath="+req.query.modelpath)
				.then((response)=>{
					if(response.status==200){
						res.redirect("https://student.instances.modeller.cloud/connect/"+users[0].code+"/vnc.html?path=connect/"+users[0].code+"/websocketify&password=7b0ce21a0d8d3c7adec51d48abe2a3e9&autoconnect=true&reconnect=true&modelpath="+req.query.modelpath)
					}else{
						res.render("reload-container",{
							bucket: bucket
						})
					}

				})
				.catch((error)=>{
					res.render("reload-container",{
						bucket: bucket
					})
				})
				//console.log("Redirected to: "+users[0].url+"&modelpath="+req.query.modelpath);
			})
			.catch((error)=>{
				if(error.status==409){
					axios.get("https://student.instances.modeller.cloud/connect/"+users[0].code+"/vnc.html?path=connect/"+users[0].code+"/websocketify&password=7b0ce21a0d8d3c7adec51d48abe2a3e9&autoconnect=true&reconnect=true&modelpath="+req.query.modelpath)
					.then((response)=>{
						if(response.status==200){
							res.redirect("https://student.instances.modeller.cloud/connect/"+users[0].code+"/vnc.html?path=connect/"+users[0].code+"/websocketify&password=7b0ce21a0d8d3c7adec51d48abe2a3e9&autoconnect=true&reconnect=true&modelpath="+req.query.modelpath)
						}else{
							res.render("reload-container",{
								bucket: bucket
							})
						}
					})
					.catch((error)=>{
						res.render("reload-container",{
							bucket: bucket
						})
					})
				}else{
					console.log(error)
					res.render("message",{
						message: "Container start error "+error.status+". If the problem persists e-mail us on <a href=\"mailto:info@mobatec.nl\">info@mobatec.nl</a>",
						bucket: bucket
					})
				}
				
			})
			
		}else{
			res.render("lmsLogin",{
				message: "Input your activation code",
				hostname: decodeURIComponent(req.params.hostname),
				lmsid: decodeURIComponent(req.params.lmsid),
				modelpath: req.query.modelpath,
				bucket: bucket
			})
		}
	})
	.catch((error)=>{
		res.render("message",{
			message: "There was a database error. Please try refrehing the page. If the problem persists e-mail us on <a href=\"mailto:info@mobatec.nl\">info@mobatec.nl</a>",
			bucket: bucket
		})
	})
});

server.get('/lmsView/:hostname/:lmsid/:exercisestring',async (req,res)=>{
	var hostname = decodeURIComponent(req.params.hostname);
	var lmsid = decodeURIComponent(req.params.lmsid);
	var exercise = decodeURIComponent(req.params.exercisestring);
	res.render("lmsView",{
		hostname: hostname,
		lmsid: lmsid,
		exercise: exercise,
		bucket: bucket
	})
});

server.post('/lmsLogin',async (req,res)=>{
	lmsActivationCodesDB.find({code:req.body.code}).toArray()
	.then((codes)=>{
		if(codes.length>0){
			var json = {};
			json.code = codes[0].code;
			json.type = codes[0].type;
			json.url = codes[0].url;
			json.hostname = req.body.hostname;
			json.lmsid = req.body.lmsid;
			json.datetime = new Date().getTime();
			lmsActivationCodesDB.deleteOne({code:req.body.code})
			.then((dbResponse)=>{
				lmsUsersDB.insertOne(json)
				.then((dbResponse2)=>{
					res.redirect(json.url+"&modelpath="+req.body.modelpath);
				})
				.catch((error)=>{
					console.log(error)
					res.render("message",{
						message: "There was a database error. Please try refrehing the page. If the problem persists e-mail us on <a href=\"mailto:info@mobatec.nl\">info@mobatec.nl</a>",
						bucket: bucket
					})
				})
				
			})
			.catch((error)=>{
				console.log(error)
				res.render("message",{
					message: "There was a database error. Please try refrehing the page. If the problem persists e-mail us on <a href=\"mailto:info@mobatec.nl\">info@mobatec.nl</a>",
					bucket: bucket
				})
			})
			
		}else{
			res.render("lmsLogin",{
				message: "<span style=\"color:rgb(220,0,0)\">Activation code not recognized</span>",
				hostname: req.body.hostname,
				lmsid: req.body.lmsid,
				modelpath: req.body.modelpath,
				bucket: bucket
			})
		}
	})
	.catch((error)=>{
		console.log(error)
		res.render("message",{
			message: "There was a database error. Please try refrehing the page. If the problem persists e-mail us on <a href=\"mailto:info@mobatec.nl\">info@mobatec.nl</a>",
			bucket: bucket
		})
	})
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
	];




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
			to: 'milos@mobatec.nl',
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