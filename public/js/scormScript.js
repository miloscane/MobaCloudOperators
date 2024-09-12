console.log("Loaded scorm script v1.4");

var allImages = document.getElementsByTagName("IMG");
for(var i=0;i<allImages.length;i++){
	if(allImages[i].alt.startsWith("MobaCloudOpC")){
		console.log("found an image")
		allImages[i].setAttribute("onclick","console.log('you found the simulation button')");

	}
}