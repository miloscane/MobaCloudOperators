console.log("Loaded scorm script v1.6");

setInterval(function(){
	var simulationButtons = document.getElementsByClassName("noOutline");
	console.log("All noOutline divs");
	console.log(allImages)
	for(var i=0;i<allImages.length;i++){
		console.log(allImages[i].alt)
		if(allImages[i].alt.startsWith("MobaCloudOpC")){
			console.log("found an image")
			allImages[i].setAttribute("onclick","console.log('you found the simulation button')");

		}
	}	
},1000)
