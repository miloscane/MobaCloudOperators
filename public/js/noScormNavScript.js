console.log("NO SCORM NAVIGATION SCRIPT v1.3");
var studentIDUrl = window.location.href.split("studentID=")[1];
var liElems = document.getElementsByTagName("NAV")[0].getElementsByTagName("LI");
for(var i=0;i<liElems.length;i++){
	liElems[i].getElementsByTagName("A")[0].href = liElems[i].getElementsByTagName("A")[0].href + "?studentID="+studentIDUrl;
	console.log("Altered link");
}

console.log("Active student: "+ studentIDUrl)