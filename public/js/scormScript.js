console.log("Loaded scorm script v1.5");

setInterval(function(){
	var allImages = document.getElementsByTagName("IMG");
	console.log("All image");
	console.log(allImages)
	for(var i=0;i<allImages.length;i++){
		console.log(allImages[i].alt)
		if(allImages[i].alt.startsWith("MobaCloudOpC")){
			console.log("found an image")
			allImages[i].setAttribute("onclick","console.log('you found the simulation button')");

		}
	}	
},1000)
