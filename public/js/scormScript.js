console.log("Loaded scorm script v1.8");

var lmsAPI = parent;
var iFrameBuilt = false;

setInterval(function(){
	if(!iFrameBuilt){
		if(lmsAPI.hasOwnProperty("API")){
			if(lmsAPI.API.hasOwnProperty("LMSGetValue")){
				if(lmsAPI.API.LMSGetValue("cmi.core.student_id")!=""){
					setTimeout(function(){
						//lmsAPI.API.LMSInitialize();
						iFrameBuilt = true;
						//console.log("Student name:");
						//var name = lmsAPI.API.LMSGetValue("cmi.core.student_name");
						//console.log(name);
						//console.log("--------------");
						//console.log("Student ID:");
						//var studentId = lmsAPI.API.LMSGetValue("cmi.core.student_id");
						//console.log(studentId);
						//console.log("--------------");
						//console.log("Hostname:");
						//console.log(location.hostname);
						generateMobaCloudIframe(lmsAPI.API.LMSGetValue("cmi.core.student_id"),location.hostname);
					},2000)
					
				}else{
					console.log("No student name found...")
				}
			}else{
				console.log("Couldnt find function LMSGetValue, no clue which API this LMS uses.");
			}
		}else{
			console.log("No API found")
		}
		console.log("-----------------");
	}
},1000)


setInterval(function(){
	var elems = document.getElementById("content-frame").contentWindow.document.getElementsByTagName("IMG");
	for(var i=0;i<elems.length;i++){
		if(elems[i].alt.startsWith("MobaCloudOpC") && Number(elems[i].dataset.initizialized)!="1"){
			elems[i].dataset.initizialized = 1;
			var modelStringArray = elems[i].alt.split(":");
			if(modelStringArray.length==3){
				var modelString = "../"+modelStringArray[1]+"/"+modelStringArray[2]+"/model.mlr";
			}else if(modelStringArray.length==4){
				var modelString = "../"+modelStringArray[1]+"/"+modelStringArray[2]+"_"+modelStringArray[3]+"/model.mlr";

			}
			
			elems[i].setAttribute("onclick","loadMobaCloudModel(\""+modelString+"\")");

		}
	}	
},1000)

function generateMobaCloudIframe(studentId,hostname){
	if(!document.getElementById("mobacloud-wrap")){
		var iFrameDiv	=	document.createElement("DIV")
		iFrameDiv.setAttribute("id","mobacloud-wrap");
		iFrameDiv.setAttribute("style","display:none;width:100%;max-width:1230px;margin:0 auto;")
			var iframe = document.createElement("IFRAME");
			//iframe.setAttribute("src","https://operators.modeller.cloud/lmsLogin/"+encodeURIComponent(location.hostname)+"/"+encodeURIComponent(id))
			iframe.setAttribute("scrolling","no");
			iframe.setAttribute("id","mobacloud");
			iframe.setAttribute("data-id",studentId);
			iframe.setAttribute("data-hostname",hostname);
			iframe.setAttribute("style","width:100%;height:800px")
			iFrameDiv.appendChild(iframe);
		//document.getElementsByTagName("body")[0].appendChild(iFrameDiv)
		document.getElementById("content").appendChild(iFrameDiv);
		console.log("iFrame initialized");
		console.log("---------------------------");	
	}
	
	
}

function loadMobaCloudModel(modelPath){
	var mobacloudIframe = document.getElementById("mobacloud");
	mobacloudIframe.setAttribute("src","https://operators.modeller.cloud/lmsLogin/"+encodeURIComponent(mobacloudIframe.dataset.hostname)+"/"+encodeURIComponent(mobacloudIframe.dataset.id)+"?modelpath="+encodeURIComponent(modelPath));
}
