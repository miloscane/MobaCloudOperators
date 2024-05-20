
console.log("Tata Steel Script Version 1.1");
var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
var eventer = window[eventMethod];
var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

var currentGradeString = "";

eventer(messageEvent,function(e) {
	var key = e.message ? "message" : "data";
	var data = e[key];
	if (typeof data === 'string' || data instanceof String){
		if(currentGradeString!=data){
			//tata:grade:scenario
			if(data.split("ata:").length>0){
				var grade = data.split("ata:")[1].split(":")[1];
				var scenario = data.split("ata:")[1].split(":")[0];
				socket.emit("grade",user,scenario,grade,data);
			}
		}
	}
	
},false);

socket.on("gradeReceived",function(usernameFromServer,dataString){
	if(usernameFromServer==user){
		currentGradeString = dataString;	
	}
});
 