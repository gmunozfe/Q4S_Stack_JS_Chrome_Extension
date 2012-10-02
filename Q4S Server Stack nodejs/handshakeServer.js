var SERVER_TCP_PORT = 8001;
var SERVER_UDP_PORT = 62516;
var PING_HEADER0 = 'PING /stage0 Q4S/1.0';
var PING_HEADER2 = 'PING /stage2 Q4S/1.0';
var BWIDTH_HEADER = 'BWIDTH /stage1 Q4S/1.0';
var OK_HEADER = 'Q4S/1.0 200 OK';
var SESSION_ID_HEADER = 'Session-Id';
var SEQUENCE_NUMBER_HEADER = 'Sequence-Number';
var MEASUREMENTS_HEADER = 'Measurements';
var TIMESTAMP_HEADER = 'Timestamp';
var CONTENT_LENGTH_HEADER = 'Content-Length';
var APP_BW_SDP = 'a=applicacion:bandwidth:';
var PROCEDURE_DEFAULT_SDP = 'a=measurement:procedure default(';

var N_OF_PINGS_NEGOTIATION_SERVER ; //= 255;  //255 //number of pings
var PING_INTERVAL_NEGOTIATION_SERVER ; // = 50; //50; //ms
var N_OF_PINGS_CONTINUITY_SERVER ; //= 255;  //255 //number of pings
var PING_INTERVAL_CONTINUITY_SERVER ;

//var N_OF_PINGS_NEGOTIATION_CLIENT = 60;  //255 //number of pings

//bandwith measurement negotiation stage 1
var BWIDTH_MESSAGE_LENGTH = 4096;
var packetsPerMs = [];
var packets2Send = [];
var packets2SendPerInterval = [];
var numOfPackets = [];
var wakeUpTime = [];
var counterSentPackets = [];
var seq_number_bw_sent = [];
var bwBeginningTime = [];
var bwidthIntervalTimer = [];
var sentBWMessagesTime = [];
var bwTimeOut = [];
var uplinkBW = [];

var BWIDTH_CONSTRAINT; //kbps
	      
var io = require('./socket.io').listen(SERVER_TCP_PORT);
//var io = require('/home/smart/local/node_modules/socket.io').listen(SERVER_TCP_PORT);

io.set('log level', 1); //Level traces

var sessionMgm = require("./sessionManagement");
sessionMgm.removeAll();

io.sockets.on('connection', function (socket) {
	
	
  var address = socket.handshake.address;
  console.log("New connection from " + address.address + ":" + address.port + " with socketId:"+socket.id);
  
  //
  //Handshake Phase
  //BEGIN Q4SMethod 
  //
  socket.on('begin', function (data) {
    console.log("RECEIVED BEGIN:"+data);
    if (data.indexOf("BEGIN q4s://") != -1) //contains BEGIN q4s://
    {
      //create new session
      var sess = new Object();
      //Use the sockeId as sessionId
      sess.sessionId = socket.id;
      //Store the session
      sessionMgm.add(sess);
    	console.log("number of sessions:"+sessionMgm.numberOfSessions());
    	
    	BWIDTH_CONSTRAINT = parseSDPServer(data, APP_BW_SDP);
	  	console.log("BWIDTH_CONSTRAINT: "+BWIDTH_CONSTRAINT);
	  	
	  	PING_INTERVAL_NEGOTIATION_SERVER = parseSDPProcedureDefault(data, 0);
	  	console.log("PING_INTERVAL_NEGOTIATION_SERVER: "+PING_INTERVAL_NEGOTIATION_SERVER);
	  	
	  	PING_INTERVAL_CONTINUITY_SERVER = parseSDPProcedureDefault(data, 1);
	  	console.log("PING_INTERVAL_CONTINUITY_SERVER: "+PING_INTERVAL_CONTINUITY_SERVER);
	  	
    	N_OF_PINGS_NEGOTIATION_SERVER = parseSDPProcedureDefault(data, 3) - 1; //begins at 0
	  	console.log("PING_INTERVAL_NEGOTIATION_SERVER: "+N_OF_PINGS_NEGOTIATION_SERVER);
	  	
	  	N_OF_PINGS_CONTINUITY_SERVER = parseSDPProcedureDefault(data, 4) - 1; //begins at 0
	  	sessionMgm.setNofPingsContinuity(sess.sessionId, N_OF_PINGS_CONTINUITY_SERVER);
	  	console.log("N_OF_PINGS_CONTINUITY_SERVER: "+N_OF_PINGS_CONTINUITY_SERVER);
	  	    	
    	//Response with 200 OK
    	socket.emit('200 OK BEGIN', sess.sessionId);
      
    }
    else
    {
    	socket.emit('ERROR', 'incorrect begin data');
    }
  });
  
  //
  //Negotiation Phase
  //READY Q4SMethod 
  //
  socket.on('ready', function (stage, sessionId) {
    console.log("RECEIVED READY stage "+stage+" sessionId:"+sessionId);  
    //Check if sessionId is stored
    if (sessionMgm.indexOf(sessionId) !== null){
    	console.log("Session exists, sending 200 OK ready");
    	//Response with 200 OK
    	socket.emit('200 OK READY', stage, sessionId);
    	
    	if (stage === 2){
    		console.log("Continuity Phase, start pinging...");
    		var udp_addr = sessionMgm.getAddress(sessionId);
    		var udp_port = sessionMgm.getUdpPort(sessionId);
    		continuity_Pinging(sessionId, udp_addr, udp_port);
    	}
    }
    else{
    	console.log("Session DOES NOT exist");}
  });
  
  //CANCEL Q4SMethod 
  //
  socket.on('cancel', function (data, session) {
    console.log("RECEIVED CANCEL:"+data);
    var intervalCont = sessionMgm.getContinuityInterval(session);
    clearInterval(intervalCont); //stop continuity pinging
  }); 
  
  socket.on('disconnect', function() {
        sessionMgm.remove(socket.id);
        console.log("number of sessions:"+sessionMgm.numberOfSessions());
    });
  
});


// UDP Server

var dgram = require("dgram"); 

//var lastInterval;
var intervalTime;

var seq_number_pings_sent;

var server = dgram.createSocket("udp4"); 

function parseSDPServer(str2parse, key) {
  if (str2parse.indexOf(key) != -1)
    	{
    		var initParse = parseInt(str2parse.indexOf(key))+key.length;
    		var tempStr = str2parse.substring(initParse);
    		var lineStr = tempStr.substring(0, tempStr.indexOf('\n'));
    		var eachPart = lineStr.split("/");
	  		return eachPart[1];
	  	}
}

function parseSDPProcedureDefault (str2parse, param) {
  if (str2parse.indexOf(PROCEDURE_DEFAULT_SDP) != -1)
    	{
    		var initParse = parseInt(str2parse.indexOf(PROCEDURE_DEFAULT_SDP))+PROCEDURE_DEFAULT_SDP.length;
    		var tempStr = str2parse.substring(initParse);
    		var lineStr = tempStr.substring(0, tempStr.indexOf(')'));
    		var eachParam = lineStr.split(",");
    		var eachPart = eachParam[param].split("/");
	  	  return eachPart[1];
    	}
}

server.on("message", function (msg, rinfo) { 
	var currTime = new Date().getTime();
	//console.log("<-- message received from " + rinfo.address + ":" + rinfo.port+" ["+currTime+"]\n"+msg+"\n");
	var newString = new String(msg);
	
	
	
		var myArray = newString.split("\n");
		var msgParsed = new Array();
	  for ( i = 0; i < myArray.length; i++) {
	  	var eachLine = myArray[i].split(":");
	  	var str = eachLine[0];
	  	msgParsed[ str ] = eachLine[1];
    }
    
    try{
	  var sid2 = (msgParsed[SESSION_ID_HEADER]).trim();
	  } catch (err)
      {
      	console.log("ERROR:"+err+"; "+msg);
      }
    
    try{  
	  var sn2 = (msgParsed[SEQUENCE_NUMBER_HEADER]).trim();
	  } catch (err)
      {
      	console.log("ERROR2:"+err+"; "+msg);
      }
      
	  var timest = (msgParsed[TIMESTAMP_HEADER]);
      if (timest){
      	timest.trim();}
	  
	
	if (newString.indexOf(PING_HEADER0) != -1){ //PING stage 0 has been received
		//console.log("<-- PING received ["+currTime+"]\n"+msg+"\n"); 
	  if (sessionMgm.hasBegunNegotiation(sid2) == null){ //only first time
	  	  sessionMgm.beginNegotiation(sid2, rinfo.address, rinfo.port);
	  	  //begin to send pings to client
	  	  seq_number_pings_sent = -1;
	  	  
	  	  var interval = setInterval(function() { //periodic launch of pings
           intervalTime = new Date().getTime();
           seq_number_pings_sent++;
           if (seq_number_pings_sent > N_OF_PINGS_NEGOTIATION_SERVER){ //reached the number of ping requests
              clearInterval(interval); //no more ping request

           }
           else{
             var measurements = MEASUREMENTS_HEADER+": l="+sessionMgm.uplinkLatency(sid2)+", j="+sessionMgm.uplinkJitter(sid2);
             
             if (seq_number_pings_sent === N_OF_PINGS_NEGOTIATION_SERVER){ //last ping, calculate packetloss for sending it
             	  sessionMgm.calculateUplinkPacketLossPing(sid2);
                measurements += ", pl="+sessionMgm.uplinkPacketLoss(sid2);
             }
             
             var ping_from_server = PING_HEADER0+"\n"+SESSION_ID_HEADER+": "+sid2+"\n"+SEQUENCE_NUMBER_HEADER+": "+seq_number_pings_sent+"\n"+
                                    measurements+"\n"+TIMESTAMP_HEADER+": "+intervalTime+"\n"+CONTENT_LENGTH_HEADER+": 0";
             send_msg_to_client (ping_from_server, rinfo.address, rinfo.port, sid2, seq_number_pings_sent);
           }
        }, PING_INTERVAL_NEGOTIATION_SERVER);
        
        
	  	
	  }
	  sessionMgm.pingReceivedTime(sid2, sn2, currTime, timest);
	  
	  
	  var response_200_OK = OK_HEADER+"\n"+SESSION_ID_HEADER+": "+sid2+"\n"+SEQUENCE_NUMBER_HEADER+": "+sn2+"\n"+CONTENT_LENGTH_HEADER+": 0";
	  send_msg_to_client (response_200_OK, rinfo.address, rinfo.port, null, null);
	}
	else if (newString.indexOf(OK_HEADER) != -1) { //200 OK has been received
		sessionMgm.rtt(sid2, sn2, currTime);
	}
	else if (newString.indexOf(BWIDTH_HEADER) != -1) { //BWIDTH has been received
		//console.log("<-- BW Message received: ["+currTime+"]: "+sn2);
        
		if (sessionMgm.hasBegunStage1(sid2) == null){ //only first time
	  	  sessionMgm.beginStage1(sid2, sn2);
	  	  
	  	  var bwf = BWIDTH_CONSTRAINT*1024/(8*BWIDTH_MESSAGE_LENGTH);  //KBps i.e., packets per seconds
	      packetsPerMs[sid2] = bwf/1000*1.01;
	      
	      //bwidthIntervalTimer[sid2] = Math.ceil(24*packetsPerMs[sid2]); //ms
	      bwidthIntervalTimer[sid2] = Math.ceil(1/packetsPerMs[sid2]); //ms
	      var bwidthWindow = 5000;
	  	  packets2Send[sid2] = 1; //Math.ceil(bwidthIntervalTimer[sid2]*packetsPerMs[sid2]/**1.02*/); //Average
	  	  packets2SendPerInterval[sid2] = packets2Send[sid2]; //for tunning in each interval
	      numOfPackets[sid2] = Math.ceil(bwidthWindow * packets2SendPerInterval[sid2] / bwidthIntervalTimer[sid2]);
	      console.log("****  numOfPackets: "+numOfPackets[sid2]+" packets2SendPerInterval:"+packets2SendPerInterval[sid2]+" bwidthIntervalTimer:"+bwidthIntervalTimer[sid2]);
	
	      seq_number_bw_sent[sid2] = -1;
	            
	      setTimeout(function(){
             //periodic launch of bwidth
             bwBeginningTime[sid2] = new Date().getTime();
             ready2send_bw_message (sid2, rinfo.address, rinfo.port);
             }, bwidthIntervalTimer[sid2]);
	  }
	  
		sessionMgm.bwMsgReceived(sid2, sn2, currTime);
		var updatedTime = new Date().getTime();
	
		//console.log("<-- BW updatedTime["+updatedTime+"]: "+sn2);//+"; bw="+sessionMgm.uplinkBW(sid2)+" kbps   pl="+sessionMgm.uplinkPacketLoss(sid2));
	}
	else if (newString.indexOf(PING_HEADER2) != -1){ //PING continuity has been received
		//console.log("<-- PING received ["+currTime+"]\n"+msg+"\n");
		sessionMgm.pingReceivedTime(sid2, sn2, currTime, timest);
	  	  
	  var response_200_OK = OK_HEADER+"\n"+SESSION_ID_HEADER+": "+sid2+"\n"+SEQUENCE_NUMBER_HEADER+": "+sn2+"\n"+CONTENT_LENGTH_HEADER+": 0";
	  send_msg_to_client (response_200_OK, rinfo.address, rinfo.port, null, null); 
	}  
	
	

});


function ready2send_bw_message(sess, ip, port){
	wakeUpTime[sess] = new Date().getTime();
	var gap = wakeUpTime[sess]-sentBWMessagesTime[sess]-bwTimeOut[sess];
	if (gap > 0){
		packets2SendPerInterval[sess] = packets2Send[sess]+Math.floor(gap*packetsPerMs[sess]);
		//console.log("interval gap:"+gap+"  packets2SendPerInterval:"+packets2SendPerInterval[sess]);
	  
	}
	counterSentPackets[sess] = 0;
	uplinkBW[sess] = sessionMgm.uplinkBW(sess); //only updated per interval
	send_bw_message(sess, ip, port);
	

}

function send_bw_message(sess, ip, port){
	counterSentPackets[sess]++;
  seq_number_bw_sent[sess]++;
  
  var bw_measurements = MEASUREMENTS_HEADER+": bw="+uplinkBW[sess]+", pl="+sessionMgm.uplinkPacketLoss(sess);
  
	var bw_message = BWIDTH_HEADER+"\n"+SESSION_ID_HEADER+": "+sess+"\n"+SEQUENCE_NUMBER_HEADER+": "+seq_number_bw_sent[sess]+"\n"+bw_measurements+"\n"+CONTENT_LENGTH_HEADER+": ";
	var strLen = bw_message.length+4; //4 bytes for content-length field
  var auxStr = '';
	for (var i=strLen; i<4000; i++) {
     auxStr += String.fromCharCode( '0x41' );
  }
  bw_message += auxStr.length+"\n"+auxStr;
  send_bw_to_client (sess, bw_message, ip, port);
	  	  
}

function send_bw_to_client(sess, bw_message, ip, port){
  var message = new Buffer(bw_message);
	server.send(message, 0, message.length, port, ip, function() {
    // message has been flushed to the kernel
    //console.log("--> bw message sent to "+ip+":"+port+":"+message);
    if (counterSentPackets[sess] === packets2SendPerInterval[sess]){ 
      	 //sleep;
      	 sentBWMessagesTime[sess] = new Date().getTime();  
         bwTimeOut[sess] = bwidthIntervalTimer[sess]-(sentBWMessagesTime[sess]-wakeUpTime[sess]);
         if (bwTimeOut[sess] < 0){
         	  bwTimeOut[sess] = 0;}
         //console.log("Time after sending "+counterSentPackets[sess]+" packets ["+seq_number_bw_sent[sess]+"]: "+(sentBWMessagesTime[sess]-wakeUpTime[sess])+" bwTimeOut:"+bwTimeOut[sess]);
         
         if (seq_number_bw_sent[sess] < numOfPackets[sess]){
           setTimeout(function(){
         	   ready2send_bw_message(sess, ip, port);
         	   }, bwTimeOut[sess]);
         } else{
           console.log("Total time per sending "+(seq_number_bw_sent[sess]+1)+" BW messages:"+(sentBWMessagesTime[sess]-bwBeginningTime[sess]));}
      }
      else{
        send_bw_message(sess, ip, port); //recursively
   	  }
    });
} 

function send_msg_to_client(msg, ip, port, session4ping, seq_number_pings_sent) {
	var message = new Buffer(msg);
	var currentTime;
	server.send(message, 0, message.length, port, ip, function() {
    // message has been flushed to the kernel
    currentTime = new Date().getTime();
    //store current time only in the ping request, not in the 200 OK response
	  if (session4ping != null){
	  	sessionMgm.pingSentTime(session4ping, seq_number_pings_sent, currentTime);
	  	
	  	//console.log("****** PING; timer interval:"+(intervalTime-lastInterval));
	  	//console.log("****** PING; current-interval:"+(currentTime-intervalTime));
	  	
      
      //lastInterval= intervalTime;
	  }
	  
	  
                                                              		
	  //console.log("--> message sent to "+ip+":"+port+" ["+currentTime+"]"); 
	  //console.log(""+message);
	  //console.log();
	  //console.log();
  });
	 
	
}

function continuity_Pinging(sid2, ip, port){
				//begin to send pings to client
	  	  seq_number_pings_sent = -1;
	  	  
	  	  var interval = setInterval(function() { //periodic launch of pings
           sessionMgm.storeContinuityInterval(sid2, interval);
           intervalTime = new Date().getTime();
           seq_number_pings_sent++;
           
           var measurements = MEASUREMENTS_HEADER+": l="+sessionMgm.uplinkLatency(sid2)+", j="+sessionMgm.uplinkJitter(sid2);
           
           if (sessionMgm.getLastPingReceived(sid2) === N_OF_PINGS_CONTINUITY_SERVER){ //last ping, calculate packetloss for sending it
           	  sessionMgm.calculateUplinkPacketLossPing(sid2);
              measurements += ", pl="+sessionMgm.uplinkPacketLoss(sid2);
              //reset sequence number
              seq_number_pings_sent = 0;
           }
           
           var ping_from_server = PING_HEADER2+"\n"+SESSION_ID_HEADER+": "+sid2+"\n"+SEQUENCE_NUMBER_HEADER+": "+seq_number_pings_sent+"\n"+
                                  measurements+"\n"+TIMESTAMP_HEADER+": "+intervalTime+"\n"+CONTENT_LENGTH_HEADER+": 0";
           send_msg_to_client (ping_from_server, ip, port, sid2, seq_number_pings_sent);
           
        }, PING_INTERVAL_CONTINUITY_SERVER);
        
        
}

server.on("listening", function () { 
	var udp_address = server.address(); 
	console.log("UDP server listening " + udp_address.address + ":" + udp_address.port);
}); 

server.bind(SERVER_UDP_PORT);




