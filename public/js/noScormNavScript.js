console.log("NO SCORM NAVIGATION SCRIPT v1.2");
var studentIDUrl = window.location.href.split("studentID=")[0];
var liElems = document.getElementsByTagName("NAV")[0].getElementsByTagName("LI");
for(var i=0;i<liElems.length;i++){
	liElems.getElementsByTagName("A")[0].src = liElems.getElementsByTagName("A")[0].src + "?studentID="+studentIDUrl
}
