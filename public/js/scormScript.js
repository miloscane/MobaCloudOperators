console.log("Loaded scorm script v2.19");

function loadMobaCloudModel(model){
	var mobacloudIframe = document.getElementById("mobacloud");
	mobacloudIframe.src = model;
	document.getElementById('content-frame').style.display = 'none';
	document.getElementById('moba-loading').style.display = 'block';
}

function displayMobaCloudModel(){
	document.getElementById('moba-loading').style.display = 'none';
	document.getElementById('mobacloud-wrap').style.display = 'block';
}

var lmsAPI = parent;
var iFrameBuilt = false;

setInterval(function(){
	if(!iFrameBuilt){
		if(lmsAPI.hasOwnProperty("API")){
			lmsAPI.API.LMSInitialize();
			if(lmsAPI.API.hasOwnProperty("LMSGetValue")){
				if(lmsAPI.API.LMSGetValue("cmi.core.student_name")!=""){
					//setTimeout(function(){
						//
						iFrameBuilt = true;
						//console.log("Student name:");
						//var name = lmsAPI.API.LMSGetValue("cmi.core.student_name");
						//console.log(name);
						//console.log("--------------");
						//console.log("Student ID:");
						console.log("Student ID:");
						var studentId = lmsAPI.API.LMSGetValue("cmi.core.student_id");
						console.log(studentId);
						//console.log("--------------");
						//console.log("Hostname:");
						//console.log(location.hostname);
						generateMobaCloudIframe(studentId,location.hostname);
					//},2000)
					
				}else{
					console.log("No student name found...")
				}
			}else{
				console.log("Couldnt find function LMSGetValue, no clue which API this LMS uses.");
			}
		}else{
			console.log("No API found")
		}
		//console.log("-----------------");
	}
},1000)


setInterval(function(){
	var elems = document.getElementById("content-frame").contentWindow.document.getElementsByTagName("IMG");
	for(var i=0;i<elems.length;i++){
		if(elems[i].alt.startsWith("MobaCloudOpC") && Number(elems[i].dataset.initizialized)!="1" && document.getElementById("mobacloud")){
			elems[i].dataset.initizialized = 1;
			var modelStringArray = elems[i].alt.split(":");
			if(modelStringArray.length==3){
				var modelString = "../../"+modelStringArray[1]+"/"+modelStringArray[2];
			}else if(modelStringArray.length==4){
				var modelString = "../../"+modelStringArray[1]+"/"+modelStringArray[2]+"_"+modelStringArray[3];

			}
			
			elems[i].setAttribute("onclick","console.log('Sent message to parent');parent.postMessage('LaunchSimulation$https://operators.modeller.cloud/lmsLogin/"+encodeURIComponent(document.getElementById('mobacloud').dataset.hostname)+"/"+encodeURIComponent(document.getElementById('mobacloud').dataset.id)+"?modelpath="+encodeURIComponent(modelString)+"')");
			//console.log("Initialized an image for a click")

		}
	}	
},1000)



function generateMobaCloudIframe(studentIdF,hostnameF){
	if(!document.getElementById("mobacloud-wrap")){
		var iFrameDiv	=	document.createElement("DIV")
		iFrameDiv.setAttribute("id","mobacloud-wrap");
		iFrameDiv.setAttribute("style","display:none;width:100%;max-width:1230px;margin:0 auto;")
			var iframe = document.createElement("IFRAME");
			//iframe.setAttribute("src","https://operators.modeller.cloud/lmsLogin/"+encodeURIComponent(location.hostname)+"/"+encodeURIComponent(id))
			iframe.setAttribute("scrolling","no");
			iframe.setAttribute("id","mobacloud");
			iframe.setAttribute("data-id",studentIdF);
			iframe.setAttribute("data-hostname",hostnameF);
			iframe.setAttribute("style","width:100%;height:800px")
			iFrameDiv.appendChild(iframe);
		//document.getElementsByTagName("body")[0].appendChild(iFrameDiv)
		document.getElementById("content").appendChild(iFrameDiv);

		var loadingDiv = document.createElement("DIV");
		loadingDiv.setAttribute("id","moba-loading");
		loadingDiv.setAttribute("style","display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background-color:rgb(255,255,255)");
			var loadingGif = document.createElement("IMG");
			loadingGif.setAttribute("src","https://operators.modeller.cloud/loading.gif")
			loadingGif.setAttribute("style","position:relative;display:block;text-align:center;margin:0 auto;margin-top:100px;width:256px;margin-bottom:20px");
			loadingDiv.appendChild(loadingGif);

			var loadingNote = document.createElement("DIV");
			loadingNote.setAttribute("style","font-size:22px;font-weight:500;text-align:center;color:rgb(100,100,100)");
			loadingNote.innerHTML = "Loading model...";
			loadingDiv.appendChild(loadingNote);
		document.getElementById("content").appendChild(loadingDiv);
		console.log("iFrame initialized");
	}
	
	
}

var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
var eventer = window[eventMethod];
var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
var grade = "";
var gradeSent	=	false;
var modelLoaded = false;

eventer(messageEvent,function(e) {
	var key = e.message ? "message" : "data";
	var data = e[key];
	if(data.toString().includes("mobaGradeFinal:") && !gradeSent){
		grade = data.toString().split("obaGradeFinal:")[1]
		if(lmsAPI.hasOwnProperty("API")){
			console.log("Found API")
			if(lmsAPI.API.hasOwnProperty("LMSGetValue")){
				console.log("Grade received from Simulation: ")
				console.log(grade)
				console.log("--------------");
				console.log("Setting MIN Score (cmi.core.score.min) to 0")
				lmsAPI.API.LMSSetValue("cmi.core.score.min",0)
				console.log("Setting MAX Score (cmi.core.score.max) to 100")
				console.log("--------------");
				lmsAPI.API.LMSSetValue("cmi.core.score.max",100)
				console.log("Setting RAW Score (cmi.core.score.raw) to "+grade)
				console.log("--------------");
				lmsAPI.API.LMSSetValue("cmi.core.score.raw",grade);
				if(Number(grade)>50){
					console.log("Setting lesson status to completed (cmi.core.lesson_status) to completed")
					console.log("--------------");
					lmsAPI.API.LMSSetValue("cmi.core.lesson_status","completed")
				}else{
					console.log("Setting lesson status to completed (cmi.core.lesson_status) to failed")
					console.log("--------------");
					lmsAPI.API.LMSSetValue("cmi.core.lesson_status","failed")
				}
				
				/*console.log("Printing cmi.core Variables with LMSGetValue function:")
				console.log("Min:" + lmsAPI.API.LMSGetValue("cmi.core.score.min"))
				console.log("Max:" + lmsAPI.API.LMSGetValue("cmi.core.score.max"))
				console.log("Raw:" + lmsAPI.API.LMSGetValue("cmi.core.score.raw"))
				console.log("Status:" + lmsAPI.API.LMSGetValue("cmi.core.lesson_status"))*/
				alert("Grade received: "+grade+", you can now quit the exercise.")
				lmsAPI.API.LMSCommit("");
				lmsAPI.API.LMSFinish("");
				gradeSent = true;
				document.getElementById('content-frame').style.display = 'block';
				document.getElementById('mobacloud-wrap').style.display = 'none';
			}
		}
	}else if(data.toString().startsWith("LaunchSimulation")){
		loadMobaCloudModel(data.toString().split("$")[1]);
		displayMobaCloudModel();
	}else if(data.toString().startsWith("MobaCloud:")){
		if(data.toString().split("obaCloud:")[1]=="ModelLoaded"){
			//displayMobaCloudModel()	
		}	
	}else{
		//console.log(data);
	}
},false);


