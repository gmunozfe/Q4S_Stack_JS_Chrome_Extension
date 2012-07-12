  // Nofication display time in ms.
	var NOTIFICATION_DISPLAY_TIME = 15000;
	var SERVER_ADDRESS = 'localhost';
	var SERVER_TCP_PORT = '8000';
	var SERVER_UDP_PORT = 62516;
	
	var socketId; //For the UDP connection
  var sid;
  var data_received;
  var result;
      
      
	
	var PING_HEADER0 = 'PING /stage0 Q4S/1.0';
	var BWIDTH_HEADER = 'BWIDTH /stage1 Q4S/1.0';
	var OK_HEADER = 'Q4S/1.0 200 OK';
  var SESSION_ID_HEADER = 'Session-Id';
  var SEQUENCE_NUMBER_HEADER = 'Sequence-Number';
  var MEASUREMENTS_HEADER = 'Measurements';
  var TIMESTAMP_HEADER = 'Timestamp';
  var CONTENT_LENGTH_HEADER = 'Content-Length';
  
  var N_OF_PINGS_NEGOTIATION_CLIENT = 255;  //number of pings
  var PING_INTERVAL_NEGOTIATION_CLIENT = 49;//50; //ms including proccesing time: 50-1
  
  var BWIDTH_CONSTRAINT = 5000; //kbps
  
  var seq_number_bw_sent = -1;
  var counterSentPackets =  0;
  var bwf = BWIDTH_CONSTRAINT/8;  //KBps i.e., packets per seconds
	var packetsPerMs = bwf/1000;
	var BWIDTH_INTERVAL_TIMER;
	if (BWIDTH_CONSTRAINT <= 1000)
	  BWIDTH_INTERVAL_TIMER = Math.ceil(1/packetsPerMs); //ms
	else if (BWIDTH_CONSTRAINT <= 3000)
		BWIDTH_INTERVAL_TIMER = Math.ceil(48*packetsPerMs); //ms
  else
  	BWIDTH_INTERVAL_TIMER = Math.ceil(24*packetsPerMs); //ms
  
	var wakeUpTime;
	var numOfPackets;
	var BWIDTH_WINDOW = 5000;
	
  
  
  
	var ev;
	var notif = [];
	var sentTimePing = [];
	var rtt = [];
	var pingElapsed = [];
	var receivedPingTime = [];
	var pingIntervalServer = [];
	var downlink_jitter;
	var uplink_jitter;
	var latency;
	var seq_received_pings = [];
	var download_packet_loss;
	var uplink_packet_loss;
	
	var packets2SendPerInterval;
	var bwOriginTime;
	var bwBeginningTime;
	var bwidthInterval;
	var bwMsgReceived = [];
	var bwMsgCounter;
	
	var socket = io.connect('http://'+SERVER_ADDRESS+':'+SERVER_TCP_PORT);
	//var notification = webkitNotifications.createHTMLNotification(/*'icon_logo.png',*/"notification.html");
	 
		

  socket.emit('begin', 'BEGIN q4s://'+SERVER_ADDRESS+' Q4S/1.0\n');
  
  socket.on('200 OK BEGIN', function (sessionId) {
  	//showEvent("Handshake", "OK");
    if (sessionId !== null)
    {
    	socket.emit('ready', 0 /*stage*/, sessionId);
    }
   }); 
   
  socket.on('200 OK READY', function (stage, sessionId) {
    showEvent("Negotiation Stage 0", "Begin");
    if (sessionId !== null)
    {
      sid = sessionId;
      //remove listeners of this socket
      socket.removeAllListeners('200 OK READY');
      chrome.experimental.socket.create('udp', {}, onCreate);
    }
  });

  function negotiation_Stage1(sessionId){
  	socket.emit('ready', 1 /*stage*/, sessionId);
  	socket.on('200 OK READY', function (stage, sessionId) {
  		//showEvent("Negotiation Stage 1", "Begin");
  		bwMsgCounter = 0;
  		bwOriginTime = new Date().getTime();
  		bwBeginningTime = bwOriginTime;
      
      packets2SendPerInterval = Math.ceil(BWIDTH_INTERVAL_TIMER*packetsPerMs*1.06);
	    numOfPackets = Math.ceil(BWIDTH_WINDOW * packets2SendPerInterval / BWIDTH_INTERVAL_TIMER);
	
  		setTimeout(function(){
             //periodic launch of bwidth
             ready2SendBWidthMessages();
             }, BWIDTH_INTERVAL_TIMER);
  		
  	});
  }

  function showEvent(title, ev){
		
    //notification.show();
    var icon  = 'http://'+SERVER_ADDRESS+':80/images/icon_logo.png';
    var notification = webkitNotifications.createNotification(icon, title, ev);
    notification.show();
		
		// Hide the notification after the configured duration.
		setTimeout(function(){ notification.cancel(); }, NOTIFICATION_DISPLAY_TIME);	
  }
  
  

function str2ab(str) {
  var buf = new ArrayBuffer(str.length/**2*/); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function str2ab_1024length(str) {
  var buf = new ArrayBuffer(1024); 
  var bufView = new Uint8Array(buf);
  var strLen=str.length;
  for (var i=0; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  for (var i=strLen; i<1024; i++) {
   	bufView[i] = '0xCF';
  }
  return buf;
}

function ab2str(buf) {
  var str = "",
  view   = new Uint8Array( buf ),
    len    = view.length,
    fromCharCode = String.fromCharCode

for ( i = 0; i < len; ++i ) {
  str += fromCharCode( view[i] );
}


  return str;
}


function onCreate(socketInfo) {
  socketId = socketInfo.socketId;
  chrome.experimental.socket.connect(
                        socketInfo.socketId, SERVER_ADDRESS, SERVER_UDP_PORT,
                        onConnect)
}



function onConnect(result) {
                          //console.log ("socketId:"+socketId);
                          var seq_number_pings_sent = -1;
                          var lastInterval;
                          var ping_interval = 
                            setInterval(function() { //periodic launch of pings
                            	var intervalTime = new Date().getTime();
                                                              		
                             seq_number_pings_sent++;
                             if (seq_number_pings_sent > N_OF_PINGS_NEGOTIATION_CLIENT){
                                clearInterval(ping_interval);
                                showEvent("Negotiation Stage 0 finished", 'Latency: '+latency+' ms; Jitter: '+uplink_jitter+'/'+downlink_jitter+' PacketLoss: '+uplink_packet_loss+'/'+download_packet_loss+' (%)');
                                setTimeout(function(){
                                	//begin negotiation stage 1
                                	negotiation_Stage1(sid);
                                	}, 1000);
                             }
                             else{
                               var measurements = MEASUREMENTS_HEADER+": l="+latency+", j="+downlink_jitter
                               
                               if (seq_number_pings_sent === N_OF_PINGS_NEGOTIATION_CLIENT){
                                 var last_ping_received = seq_received_pings[seq_received_pings.length-1];
                                 //last_ping_received++; //sequence begins at 0, but not added because it has not push into the stack yet
                                 download_packet_loss = 100 - (100*seq_received_pings.length/last_ping_received);
                                 measurements +=", pl="+download_packet_loss;
                               }
                               
                                
                                var ab = str2ab(PING_HEADER0+"\n"+SESSION_ID_HEADER+": "+sid+"\n"+SEQUENCE_NUMBER_HEADER+": "+seq_number_pings_sent+"\n"+measurements+"\n"+CONTENT_LENGTH_HEADER+": 0");
                                var str2abTime = new Date().getTime();
                                chrome.experimental.socket.write(socketId, ab, 
                                                              function(writeInfo){ 
                                                              		var currentTime = new Date().getTime();
                                                              		sentTimePing[seq_number_pings_sent]=currentTime;
                                                              		//console.log("****** PING timer:"+(lastInterval-intervalTime)+" sent time:"+(currentTime-intervalTime)+" parsing time:"+(str2abTime-intervalTime));
                                                              		lastInterval= intervalTime;
                                                              		});
                                
                                
                              } //end of else 
                            }, PING_INTERVAL_NEGOTIATION_CLIENT);
                            
                            //
                            //chrome.experimental.socket.recvFrom(socketId, onDataRead);
                            receivingData(socketId);
                            
                            
}

                            


function receivingData(socketId){
chrome.experimental.socket.recvFrom(socketId, function(readInfo){
      var currTime = new Date().getTime();
      var newString = ab2str(readInfo.data);
	    
	    //var timeAB2str = new Date().getTime();
      
      //var newString = new String(s);
      
      var myArray = newString.split("\n");
      var msgParsed = new Object();
      for ( i = 0; i < myArray.length; i++) {
       	var eachLine = myArray[i].split(":");
       	var str = eachLine[0];
       	msgParsed[ str ] = eachLine[1];
      }
      
      var sid2 = (msgParsed[SESSION_ID_HEADER]).trim();
      var sn2 = (msgParsed[SEQUENCE_NUMBER_HEADER]).trim();
      var meas = (msgParsed[MEASUREMENTS_HEADER]);
      if (meas){
        meas.trim();
        var myMeas = meas.split(",");
        var measParsed = new Object();
        for ( i = 0; i < myMeas.length; i++) {
          var eachMeas = myMeas[i].split("=");
       	  var strMeas = eachMeas[0];
       	  measParsed[ strMeas ] = eachMeas[1];
        }
       uplink_jitter = (measParsed[' j'])
       if (uplink_jitter)
        	uplink_jitter.trim();
       uplink_packet_loss = (measParsed[' pl'])
       if (uplink_packet_loss)
        	uplink_packet_loss.trim();
      }
      var timest = (msgParsed[TIMESTAMP_HEADER]);
      if (timest){
      	timest.trim();}
      
      var time1 = new Date().getTime()
      
         
      if (newString.indexOf(PING_HEADER0) != -1) { //PING stage 0 has been received
        //console.log("<-- PING received ["+currTime+"]:");//+newString);
        //console.log("<-- PING parsing time ["+time1+"]");
    
            
             var ab2 = str2ab(OK_HEADER+"\n"+SESSION_ID_HEADER+": "+sid2+"\n"+SEQUENCE_NUMBER_HEADER+": "+sn2+"\n"+CONTENT_LENGTH_HEADER+": 0");
             var time2 = new Date().getTime()
                
                chrome.experimental.socket.write(socketId, ab2, 
                                             function(writeInfo){ 
                                              var sentTime = new Date().getTime();
                                              //console.log("200 OK sent time:"+sentTime);
                                              receivedPingTime[sn2]=currTime;
                                              pingIntervalServer[sn2] = timest;
                                              if (sn2>0){
                                               if (receivedPingTime[sn2-1]>0){
                                                  pingElapsed.push(Math.abs(receivedPingTime[sn2]-receivedPingTime[sn2-1]-(pingIntervalServer[sn2]-pingIntervalServer[sn2-1])));
                                                  downlink_jitter = Math.round(utilsClientQ4S.mean(pingElapsed)*100)/100; //mean of the elapsed time between pings reception
                                                  latency = Math.round(utilsClientQ4S.median(rtt)/2);
                                                  seq_received_pings.push(sn2); //store sequence number for calculating packet loss
                                                  
                                                  //console.log("--> 200 OK ["+sn2+"]: receivedPingTime:"+receivedPingTime[sn2]+" - "+receivedPingTime[sn2-1]+"; pingIntervalServer:"+pingIntervalServer[sn2]+" - "+pingIntervalServer[sn2-1]);
             
                                                  //console.log("--> 200 OK ["+sn2+"]: pingElapsed:"+Math.abs(receivedPingTime[sn2]-receivedPingTime[sn2-1]-(pingIntervalServer[sn2]-pingIntervalServer[sn2-1]))+" pingIntervalServer:"+(pingIntervalServer[sn2]-pingIntervalServer[sn2-1]));
             
                                                }
                                              }
                                              //console.log("--> 200 OK ["+sn2+"]: time ab2str:"+(timeAB2str-currTime)+" str2ab time ["+(time2-currTime)+"]  responseTime:"+(sentTime-currTime));
                                              });
	    }
      else if (newString.indexOf(OK_HEADER) != -1) { //200 OK has been received
      	rtt[sn2]=currTime-sentTimePing[sn2];
      	//console.log("<-- 200 OK received ["+currTime+"]:"+newString);
        //console.log("<-- 200 OK parsing time ["+time1+"]");
    
        //console.log();
      }
      else if (newString.indexOf(BWIDTH_HEADER) != -1) { //BWIDTH has been received
        //console.log("<-- BW Message received:"+newString);
        bwMsgReceived[sn2]=currTime;
        bwMsgCounter++;
        var downlinkBW = 8*1024*bwMsgCounter/(bwMsgReceived[sn2]-bwMsgReceived[0]);
        console.log("downlink BW:"+ Math.round(downlinkBW*100)/100+"  counter:"+bwMsgCounter+"  seqNumber:"+sn2);
      }  
  
  

  receivingData(socketId); //recursively to receive more data on the same socket
	});
}                            


function ready2SendBWidthMessages(){
	wakeUpTime = new Date().getTime();
	
	
	//console.log("Loop:"+(wakeUpTime-bwOriginTime));
	counterSentPackets=0;
	//packets2SendPerInterval = Math.ceil((wakeUpTime-bwOriginTime)*packetsPerMs);
	
	//console.log("packets2SendPerInterval ["+seq_number_bw_sent+"]:"+packets2SendPerInterval);
  sendBWidthMessages(packets2SendPerInterval);
}

function sendBWidthMessages(packets2Send){
	
	counterSentPackets++;
  seq_number_bw_sent++;
  var measurements = MEASUREMENTS_HEADER+": bw=";//+latency+", j="+downlink_jitter
  
  var bwMessage = BWIDTH_HEADER+"\n"+SESSION_ID_HEADER+": "+sid+"\n"+SEQUENCE_NUMBER_HEADER+": "+seq_number_bw_sent+"\n"+measurements+"\n"+CONTENT_LENGTH_HEADER+": ";
  var contentLength = 1024-bwMessage.length-4; //4 bytes for content-length
  bwMessage += contentLength+"\n";
  
                                       
  var ab_bw = str2ab_1024length(bwMessage);
                                       
  chrome.experimental.socket.write(socketId, ab_bw, 
                                 function(writeInfo){ 
                                 	if (counterSentPackets === packets2Send){ 
                                    	 //sleep;
                                    	 var currentTime = new Date().getTime();
                                       var timeo = BWIDTH_INTERVAL_TIMER-(currentTime-wakeUpTime);
                                       if (timeo < 0){
                                       	  timeo = 0;}
                                       //console.log("Time after sending "+counterSentPackets+" packets:"+(currentTime-wakeUpTime)+" timeo:"+timeo);
                                       
                                       bwOriginTime = currentTime//new Date().getTime();
                                       if (seq_number_bw_sent < numOfPackets){
                                         setTimeout(function(){
                                       	   ready2SendBWidthMessages();
                                       	   }, timeo);
                                       } else
                                       	 console.log("Total time per "+(seq_number_bw_sent+1)+" BW messages:"+(currentTime-bwBeginningTime));
                                       //setTimeout(function(){
                                       //  showEvent("Negotiation Stage 0 finished", 'BandWith:'+seq_number_bw_sent+' PacketLoss: '+uplink_packet_loss+'/'+download_packet_loss+' (%)');
                                       //}, 1000);
                                    }
                                    else{
                                       sendBWidthMessages(packets2Send); //recursively
                                 	  }
                                 });
   
   
            
         

}
