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

const oceanKey = process.env.oceankey;
const domainKey = process.env.domainkey;
const workingSnapshot = process.env.snapshot;
var baseLink = "https://api.digitalocean.com/v2";
const headers = {
	"Content-Type":"application/json",
	"Authorization": `Bearer ${oceanKey}`
};
const domainHeaders = {
	"Content-Type":"application/json",
	"Authorization": `Bearer ${domainKey}`
};

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


async function getDroplets(){
	try{
		const config = {
			url: baseLink+"/droplets",
			method: "GET",
			headers: headers
		}
		var response = await axios(config);
		return response.data.droplets
	}catch(err){
		console.log(err);
		return -1;
	}
	
}

async function getSnapshots(){
	try{
		const config = {
			url: baseLink+"/snapshots?page=1&per_page=10",
			method: "GET",
			headers: headers
		}

		var response = await axios(config);
		//console.log(response.data.snapshots)
		return response.data.snapshots;
	}catch(err){
		console.log(err)
		return -1;
	}
}

//getSnapshots()

async function destroyDroplet(id){
	try{
		const config = {
			url: baseLink+"/droplets/"+id,
			method: "DELETE",
			headers: headers
		}

		var response = await axios(config);
		return response.data;// returns empty ''
	}catch(err){
		console.log(err)
		return -1;
	}
}

async function createDroplet(size,snapshot,name){
	try{
		const config = {
			url: baseLink+"/droplets",
			method: "POST",
			headers: headers,
			data:{
				"name":name,
				"region":"ams3",
				"size":size,
				"image":snapshot
			}
		}

		var response = await axios(config);
		return response.data; // Ne dobijas kao povratnu informaciju IP adresu, tako da smisli nesto
	}catch(err){
		console.log(err)
		return -1;
	}
}

async function getDNSList(){
	try{
		const config = {
			url: baseLink+"/domains/modeller.cloud/records?page=1&per_page=200",//PAZI SE OVDE IMAS LIMIT OD 200, ako imas preko toga moras da trazis na drugoj strani
			method: "GET",
			headers: domainHeaders
		}
		var response = await axios(config);
		return response.data.domain_records;
		/*
			{
				id:id//po ovome brises
				type:type//OVDE JURIS A
				name:name //ovde ide name.modeller.cloud
				data:ip//ovde ide IP adresa
			}
		*/
	}catch(err){
		console.log(err);
		return -1;
	}
}

async function createDNSRecord(name,ip){
	try{
		const config = {
			url: baseLink+"/domains/modeller.cloud/records",
			method: "POST",
			headers: domainHeaders,
			data:{
				"name":name,
				"type":"A",
				"data":ip,
				"ttl":60
			}
		}

		var response = await axios(config);
		return response.data.domain_record;
	}catch(err){
		console.log(err)
		return -1;
	}
}

async function getDNSRecordId(name){
	try{
		var records = await getDNSList();
		var id = 0;
		for(var i=0;i<records.length;i++){
			if(records[i].name==name && records[i].type=="A"){
				id = records[i].id;
			}
		}
		return id;
	}catch(err){
		console.log(err);
		return -1;
	}
}

async function deleteDNSRecord(id){
	try{
		const config = {
			url: baseLink+"/domains/modeller.cloud/records/"+id,
			method: "DELETE",
			headers: domainHeaders
		}

		var response = await axios(config);
		return response.data;
	}catch(err){
		console.log(err)
		return -1;
	}
}

var usersDB;
var lmsActivationCodesDB;
var lmsUsersDB;
var activeSimulatorsDB;
var simulatorsHistoryDB;

http.listen(process.env.PORT, async function(){
	console.log("MobaCloud Operators");
	console.log("Server Started");
	var dbConnectionStart	=	new Date().getTime();
	try{
		await client.connect();
		console.log("Connected to database in " + eval(new Date().getTime()/1000-dbConnectionStart/1000).toFixed(2)+"s")
		usersDB		=	client.db("MobaHub").collection('Modeller Cloud');
		lmsActivationCodesDB		=	client.db("MobaCloud").collection('LMSActivationCodes');
		lmsUsersDB				=	client.db("MobaCloud").collection('LMSUsers');
		activeSimulatorsDB = client.db("MobaCloud").collection('OperatorCActiveSimulators');
		simulatorsHistoryDB = client.db("MobaCloud").collection('OperatorCHistory');

		/*var lmsUsers = await lmsUsersDB.find({}).toArray();
		console.log(lmsUsers.length)
		var cutOff = new Date("2025-08-25").getTime();
		var newUsers = [];
		for(var i=0;i<lmsUsers.length;i++){
			if(lmsUsers[i].datetime>cutOff){
				newUsers.push(lmsUsers[i]);
			}
		}
		console.log("Cut off date 2025-08-25" )
		console.log("Codes activated: "+newUsers.length)
		for(var i=0;i<newUsers.length;i++){
			newUsers[i].found = false;
			for(var j=0;j<lmsUsers.length;j++){
				if(lmsUsers[j].lmsid==newUsers[i].lmsid && lmsUsers[j].datetime<cutOff){
					newUsers[i].found = true;
					break;
				}
			}
		}
		var previouslyActivated = 0;
		var newlyActivated = 0;
		for(var i=0;i<newUsers.length;i++){
			if(newUsers[i].found==true){
				previouslyActivated++;
			}else{
				newlyActivated++;
			}
		}
		console.log("New users:"+newlyActivated)
		console.log("Previous users:"+previouslyActivated)*/
	}catch(err){
		console.log(err)
	}
		
});

server.get('/login',async (req,res)=>{
	if(req.session.user){
		req.session.destroy(function(){});
		res.redirect("/login");
	}else{
		if(req.query.url){
			res.render("login",{
				//url: decodeURIComponent(req.query.url),
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

/*server.post('/login',async (req,res)=>{
	if(req.session.user){
		req.session.destroy(function(){});
	}
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
});*/

server.post('/login',async (req,res)=>{
	if(req.session.user){
		req.session.destroy(function(){});
	}
	try{
		var users = await lmsUsersDB.find({email:req.body.username.toLowerCase()}).toArray();
		if(users.length==0){
			return res.render("message",{
				bucket: bucket,
				message: "No such user, try to login again <a href='/login'>here</a>."
			})
		}

		if(users[0].password!=hashString(req.body.password)){
			return res.render("message",{
				bucket: bucket,
				message: "Wrong password, try to login again <a href='/login'>here</a>."
			})
		}
		var sessionObject	=	JSON.parse(JSON.stringify(users[0]));
		delete sessionObject.password;
		req.session.user	=	sessionObject;
		res.redirect("/teacherAccess");

	}catch(err){
		console.log(err);
		res.send("Database error 151");
	}
});

server.post('/loginCode',async (req,res)=>{
	if(!req.body.code){
		return res.send("no code")
	}
	try{
		var users = await lmsUsersDB.find({code:req.body.code.split("-").join("")}).toArray();
		if(users.length==0){
			return res.render("message",{
				bucket: bucket,
				message: "The provided code was never activated on an LMS system. Please activate the code on a LMS first and try to login again <a href='/login'>here</a>."
			})
		}
		if(!users[0].email){
			return res.render("accountCreation",{
				bucket: bucket,
				code: users[0].code
			});
		}

		return res.render("message",{
			bucket: bucket,
			message: "An account was already created with this code, please use your username and passowrd to login <a href='/login'>here</a>."
		})

	}catch(err){
		console.log(err);
		res.send("Database error 141")
	}
});

function isEmail(str) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(str);
}
function isStrongPassword(password) {
    // Minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
}

server.post('/accountCreation',async (req,res)=>{
	if(!req.body.json){
		return 
	}
	try{

		var json = JSON.parse(req.body.json);

		console.log(json)
		var users = await lmsUsersDB.find({code:json.code}).toArray();
		if(users.length==0){
			return res.render("message",{
				bucket: bucket,
				message: "The provided code was never activated on an LMS system. Please activate the code on a LMS first and try to login again."
			})
		}
		if(users[0].email){
			return res.render("message",{
				bucket: bucket,
				message: "An account was already created with this code, please use your username and passowrd to login <a href='/login'>here</a>."
			})
		}
		if(!isEmail(json.username)){
			return res.render("message",{
				bucket: bucket,
				message: "Username doesnt appear to be a valid email address, please try creating an account <a href='/login'>again</a>."
			})
		}
		if(!isStrongPassword(json.password)){
			return res.render("message",{
				bucket: bucket,
				message: "Password is not strong enough. please try creating an account <a href='/login'>again</a>."
			})
		}
		if(json.password!=json.password2){
			return res.render("message",{
				bucket: bucket,
				message: "Passwords dont match. please try creating an account <a href='/login'>again</a>."
			})
		}

		var setObj = {
			$set:{
				email: json.username.toLowerCase(),
				password: hashString(json.password)
			}
		}

		await lmsUsersDB.updateOne({code:json.code},setObj)
		res.render("message",{
			bucket: bucket,
			message: "You have successfully created an account, please login <a href='/login'>here</a>."
		})

	}catch(err){
		console.log(err);
		res.send("Database error 198")
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

server.get('/teacherAccess',async (req,res)=>{
	if(!req.session.user){
		return res.redirect("/login")
	}
	res.render("teacherAccess",{
		user: req.session.user,
		lmsId: req.session.user.lmsid,
		lmsHost: req.session.user.hostname,
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

var connectingDroplets;

setInterval(async () => {
	//Check containers wether they are mapped to simulators
	if(connectingDroplets == true){
		return;
	}
	connectingDroplets = true;
	try{
		var simulators = await activeSimulatorsDB.find({}).toArray();
		var droplets = await getDroplets();
		if(droplets!=-1){
			for(var i=0;i<simulators.length;i++){
				var simulator = simulators[i];
				if(simulator.status==1 || simulator.status==2){
					for(var j=0;j<droplets.length;j++){
						var droplet = droplets[j];
						if(droplet.name==simulator.name){
							//Found the droplet with the same name, assing IP if there is ipV4
							if(simulator.status==1){
								var setObj = {
									$set: {
										status:2
									}
								}
								await activeSimulatorsDB.updateOne({name:simulator.name},setObj);
							}
							
							var ipFound = false;
							var ipAddress = "-1";
							for(var k=0;k<droplet.networks.v4.length;k++){
								if(droplet.networks.v4[k].type=="public"){
									if(droplet.networks.v4[k].ip_address.length>4){
										//it has an IP
										ipFound = true;
										ipAddress = droplet.networks.v4[k].ip_address;
										break;
									}
								}
							}

							if(ipFound==true){
								var dropletInfo = {};
								dropletInfo.id = droplet.id;
								dropletInfo.name = droplet.name;
								dropletInfo.created_at = droplet.created_at;
								dropletInfo.size = droplet.size.slug;
								dropletInfo.price = droplet.size.price_hourly;
								dropletInfo.ip = droplet.networks.v4;
								dropletInfo.vpc_uuid = droplet.vpc_uuid;
								var setObj = {
									$set: {
										status:3,
										ip: ipAddress,
										droplet:dropletInfo//id,name,created_at,size:{slug,price_hourly},networks:{v4},vpc_uuid
									}
								}
								await activeSimulatorsDB.updateOne({name:simulator.name},setObj);
							}
							break;
						}
					}
				}else if(simulator.status==3){
					var dnsId = await getDNSRecordId(simulator.name);
					if(dnsId==0 || dnsId=="0"){
						var response = await createDNSRecord(simulator.name,simulator.ip);
						if(response!=-1){
							var setObj = {
								$set: {
									status:4
								}
							}
							await activeSimulatorsDB.updateOne({id:simulator.id},setObj);
						}
					}
					
				}
				
			}	
		}

		//Kill simulators after inactivity
		for(var i=0;i<simulators.length;i++){
			var simulator = simulators[i];
			var simulatorCreatedAt = new Date(simulator.createdAt);
			if(new Date().getTime() - simulatorCreatedAt.getTime() > 6 * 60 * 60 * 1000){ // 6 hours
				var response = await destroyDroplet(simulator.droplet.id);
				if(response==-1){
					console.log("Error while destroying droplet")
					continue;
				}
				var dnsId = await getDNSRecordId(simulator.name);
				if(dnsId!=0 && dnsId!="0"){
					var response = await deleteDNSRecord(dnsId);
					if(response!=-1){
						console.log("Error while deleteing DNS record")
					}
				}
				simulator.destroyedAt = new Date();
				await activeSimulatorsDB.deleteOne({name:simulator.name});
				await simulatorsHistoryDB.insertOne(simulator);
			}
		}
		

		
		
	}catch(err){
		console.log(err)
	}finally{
		connectingDroplets =false;
	}
	
}, 5000);


server.get('/lmsLogin/:hostname/:lmsid',async (req,res)=>{
	var hostname = decodeURIComponent(req.params.hostname);
	var lmsid = decodeURIComponent(req.params.lmsid.split("&")[0]);
	//console.log(req.query.modelpath)

	try{
		var users = await lmsUsersDB.find({hostname:hostname,lmsid:lmsid}).toArray()
		if(users.length>0){
			var licenseStart = 1730110407287;
			var oneYear = 365 * 24 * 60 * 60 * 1000;
			if(users[users.length-1].datetime){
				licenseStart = users[users.length-1].datetime;
			}
			if(new Date().getTime() - licenseStart>=oneYear){
				return res.render("lmsLogin",{
					message: "Your license has expired. Please input your new activation code",
					hostname: decodeURIComponent(req.params.hostname),
					lmsid: decodeURIComponent(req.params.lmsid),
					modelpath: req.query.modelpath,
					bucket: bucket
				})
			}
			//res.redirect(users[0].url+"&modelpath="+req.query.modelpath)
			var activeSimulators = await activeSimulatorsDB.find({hostname:hostname,lmsid:lmsid}).toArray();
			if(activeSimulators.length==0){
				var name = "operatorc"+generateId(4).toLowerCase();
				var response = await createDroplet("s-1vcpu-1gb",workingSnapshot,name);
				if(response==-1){
					console.log("Error while creating droplet")
				}
				var simulatorJson = {
					name: name,
					created_by: users[0].code,
					hostname:hostname,
					lmsid:lmsid,
					status: 1,
					createdAt: new Date()
				}
				await activeSimulatorsDB.insertOne(simulatorJson)

				return res.render("reload-container",{
					bucket: bucket
				})
			}

			if(activeSimulators[0].status!=4){
				return res.render("reload-container",{
					bucket: bucket
				})
			}

			res.redirect("https://"+activeSimulators[0].name+".modeller.cloud/"+req.query.exercisename+"/screen/DCS");
			
			/*axios.post('https://student.instances.modeller.cloud/start', new URLSearchParams({uuid: users[0].code}))
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
				
			})*/
			
		}else{
			res.render("lmsLogin",{
				message: "Input your activation code",
				hostname: decodeURIComponent(req.params.hostname),
				lmsid: decodeURIComponent(req.params.lmsid),
				modelpath: req.query.modelpath,
				bucket: bucket
			})
		}
	}catch(err){
		console.log(err)
		res.render("message",{
			message: "There was a database error. Please try refrehing the page. If the problem persists e-mail us on <a href=\"mailto:info@mobatec.nl\">info@mobatec.nl</a>",
			bucket: bucket
		})
	}
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







function hashString(string) {
    if (typeof string !== 'string') {
        throw new Error('Input must be a string');
    }
    return crypto.createHash('sha256').update(string).digest('hex');
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