console.log("NO NAVIGATION Scorm builder script v1.1")
var tag = document.createElement("script");
tag.src = "https://operators.modeller.cloud/js/noScormNavScript.js?v="+new Date().getTime();
document.getElementsByTagName("head")[0].appendChild(tag);