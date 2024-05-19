
console.log("Tata Steel Script Version 1.1");
var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
var eventer = window[eventMethod];
var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

eventer(messageEvent,function(e) {
	var key = e.message ? "message" : "data";
	var data = e[key];
	console.log("Received a message:");
	console.log(data)
},false);
