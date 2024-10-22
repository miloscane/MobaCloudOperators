console.log("Loaded scorm script v1.01");

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

var iFrameBuilt = false;

setInterval(function(){
	if(!iFrameBuilt){
		iFrameBuilt = true;
		console.log("Student ID:");
		var studentId = window.location.href.split("studentID=")[1];
		console.log(studentId);
		generateMobaCloudIframe(studentId,location.hostname);
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
},1000);

//SCALING THE IFRAME
var scaleFactor = 1;
setInterval(function(){
	if(document.getElementById("mobacloud-wrap")){
		var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
		var iframe = document.getElementById("mobacloud");
		var iframeBox = iframe.getBoundingClientRect();
		var siteFrame = document.getElementById("mobacloud-wrap").getBoundingClientRect();
		/*console.log("Site frame: "+siteFrame.width)
		console.log("Simulator: "+iframeBox.width);
		console.log("Scale factor: "+scaleFactor);
		console.log("-----------------------------------")*/
		var heightFits = false;
		var widthFits = false;
		if(iframeBox.width<siteFrame.width || iframeBox.width<siteFrame.width-siteFrame.width*0.01){
			//width fits
			//console.log("width fits")
			widthFits = true;
		}else if(iframeBox.width>siteFrame.width){
			scaleFactor = scaleFactor - 0.02*scaleFactor;
			iframe.setAttribute("data-scale",scaleFactor);
			iframe.setAttribute("style","transform:scale("+scaleFactor+")");
		}else if(iframeBox.width<siteFrame.width){
			scaleFactor = scaleFactor + 0.02*scaleFactor;
			iframe.setAttribute("data-scale",scaleFactor);
			iframe.setAttribute("style","transform:scale("+scaleFactor+")");
		}

		if(iframeBox.height<siteFrame.height || iframeBox.height<siteFrame.height+siteFrame.height*0.01){
			//height fits
			heightFits = true;
		}else if(iframeBox.height>siteFrame.height){
			scaleFactor = scaleFactor - 0.02*scaleFactor;
			iframe.setAttribute("data-scale",scaleFactor);
			iframe.setAttribute("style","transform:scale("+scaleFactor+")");
		}else if(iframeBox.height<siteFrame.height){
			scaleFactor = scaleFactor + 0.02*scaleFactor;
			iframe.setAttribute("data-scale",scaleFactor);
			iframe.setAttribute("style","transform:scale("+scaleFactor+")");
		}

		if(heightFits && widthFits){
			if(iframeBox.width<siteFrame.width-0.03*siteFrame.width && iframeBox.height<siteFrame.height-0.03*siteFrame.height){
				scaleFactor = scaleFactor + 0.02*scaleFactor;
				iframe.setAttribute("data-scale",scaleFactor);
				iframe.setAttribute("style","transform:scale("+scaleFactor+")");
			}
		}	
	}
},20)



function generateMobaCloudIframe(studentIdF,hostnameF){
	if(!document.getElementById("mobacloud-wrap")){
		var iFrameDiv	=	document.createElement("DIV")
		iFrameDiv.setAttribute("id","mobacloud-wrap");
		//iFrameDiv.setAttribute("style","display:none;width:100%;max-width:1230px;margin:0 auto;")
		iFrameDiv.setAttribute("style","display:none;position:relative;overflow:hidden;width:100vw;height:100vh;background:rgb(37,78,118);background: linear-gradient(0deg, rgb(20, 42, 64), rgb(37, 78, 118));")
			var styleDiv = document.createElement("STYLE");
			styleDiv.innerHTML = "#mobacloud-wrap iframe{width:1235px;height:1090px;position: absolute;top: 0;left: 0;transform-origin: top left;border:1px solid rgb(37,78,118);box-shadow:2px 2px 2px rgba(0,0,0,0.8);}";
			iFrameDiv.appendChild(styleDiv);
			var iframe = document.createElement("IFRAME");
			//iframe.setAttribute("src","https://operators.modeller.cloud/lmsLogin/"+encodeURIComponent(location.hostname)+"/"+encodeURIComponent(id))
			iframe.setAttribute("scrolling","no");
			iframe.setAttribute("id","mobacloud");
			iframe.setAttribute("data-id",studentIdF);
			iframe.setAttribute("data-hostname",hostnameF);
			//iframe.setAttribute("style","");
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
		alert("Grade received "+grade)
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


