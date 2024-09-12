console.log("Loaded scorm script v1.6");

setInterval(function(){
	var elems = document.getElementById("content-frame").contentWindow.document.getElementsByTagName("IMG");
	for(var i=0;i<elems.length;i++){
		if(elems[i].alt.startsWith("MobaCloudOpC")){
			console.log("found an image")
			elems[i].setAttribute("onclick","console.log('you found the simulation button')");

		}
	}	
},1000)
