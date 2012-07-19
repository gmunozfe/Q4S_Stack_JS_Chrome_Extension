function load() {
	var serverAddressTextbox = document.getElementById("server-address");
  var serverTCPPortTextbox = document.getElementById("server-tcp-port");
  var serverUDPPortTextbox = document.getElementById("server-udp-port");
  var appAlertPauseTextbox = document.getElementById("app-alert-pause");
  var appLatencyConstraintTextbox = document.getElementById("app-latency");
  var appJitterConstraintClientTextbox = document.getElementById("app-jitter-uplink");
  var appJitterConstraintServerTextbox = document.getElementById("app-jitter-downlink");
  var appBwConstraintClientTextbox = document.getElementById("app-bw-uplink");
  var appBwConstraintServerTextbox = document.getElementById("app-bw-downlink");
  var appPacketLossConstraintClientTextbox = document.getElementById("app-pl-uplink");
  var appPacketLossConstraintServerTextbox = document.getElementById("app-pl-downlink");
  var negPingIntervalClientTextbox = document.getElementById("neg-ping-interval-uplink");
  var negPingIntervalServerTextbox = document.getElementById("neg-ping-interval-downlink");
  var contPingIntervalClientTextbox = document.getElementById("cont-ping-interval-uplink");
  var contPingIntervalServerTextbox = document.getElementById("cont-ping-interval-downlink");
  var bwTimeTextbox = document.getElementById("bw-time");
  var pingWindowClientTextbox = document.getElementById("latency-window-size-uplink");
  var pingWindowServerTextbox = document.getElementById("latency-window-size-downlink");
  var packetlossWindowClientTextbox = document.getElementById("packetloss-window-size-uplink");
  var packetlossWindowServerTextbox = document.getElementById("packetloss-window-size-downlink");
    
  localStorage.serverAddress = serverAddressTextbox.value;
  localStorage.serverTCPPort = serverTCPPortTextbox.value;
  localStorage.serverUDPPort = serverUDPPortTextbox.value;
  localStorage.appAlertPause = appAlertPauseTextbox.value;
  localStorage.appLatencyConstraint = appLatencyConstraintTextbox.value;
  localStorage.appJitterConstraintClient = appJitterConstraintClientTextbox.value;
  localStorage.appJitterConstraintServer = appJitterConstraintServerTextbox.value;
  localStorage.appBwConstraintClient = appBwConstraintClientTextbox.value; 
  localStorage.appBwConstraintServer = appBwConstraintServerTextbox.value; 
  localStorage.appPacketLossConstraintClient = appPacketLossConstraintClientTextbox.value;
  localStorage.appPacketLossConstraintServer = appPacketLossConstraintServerTextbox.value;
  localStorage.negPingIntervalClient = negPingIntervalClientTextbox.value;
  localStorage.negPingIntervalServer = negPingIntervalServerTextbox.value;
  localStorage.contPingIntervalClient = contPingIntervalClientTextbox.value;
  localStorage.contPingIntervalServer = contPingIntervalServerTextbox.value;
  localStorage.bwTime = bwTimeTextbox.value; 
  localStorage.pingWindowClient = pingWindowClientTextbox.value;
  localStorage.pingWindowServer = pingWindowServerTextbox.value;
  localStorage.packetlossWindowClient = packetlossWindowClientTextbox.value;
  localStorage.packetlossWindowServer = packetlossWindowServerTextbox.value;
    
   
  serverAddressTextbox.addEventListener("click", function (){
  	saveButton.disabled = false;
  	}, false);
  
	var saveButton = document.getElementById("save-button");
	
  saveButton.addEventListener("click", function(){
  localStorage.serverAddress = serverAddressTextbox.value;
  localStorage.serverTCPPort = serverTCPPortTextbox.value;
  localStorage.serverUDPPort = serverUDPPortTextbox.value;
  localStorage.appAlertPause = appAlertPauseTextbox.value;
  localStorage.appLatencyConstraint = appLatencyConstraintTextbox.value;
  localStorage.appJitterConstraintClient = appJitterConstraintClientTextbox.value;
  localStorage.appJitterConstraintServer = appJitterConstraintServerTextbox.value;
  localStorage.appBwConstraintClient = appBwConstraintClientTextbox.value; 
  localStorage.appBwConstraintServer = appBwConstraintServerTextbox.value; 
  localStorage.appPacketLossConstraintClient = appPacketLossConstraintClientTextbox.value;
  localStorage.appPacketLossConstraintServer = appPacketLossConstraintServerTextbox.value;
  localStorage.negPingIntervalClient = negPingIntervalClientTextbox.value;
  localStorage.negPingIntervalServer = negPingIntervalServerTextbox.value;
  localStorage.contPingIntervalClient = contPingIntervalClientTextbox.value;
  localStorage.contPingIntervalServer = contPingIntervalServerTextbox.value;
  localStorage.bwTime = bwTimeTextbox.value; 
  localStorage.pingWindowClient = pingWindowClientTextbox.value;
  localStorage.pingWindowServer = pingWindowServerTextbox.value;
  localStorage.packetlossWindowClient = packetlossWindowClientTextbox.value;
  localStorage.packetlossWindowServer = packetlossWindowServerTextbox.value;
  
  console.log("saved localStorage.serverAddress:"+localStorage.serverAddress);
  saveButton.disabled = true;
  }, false);
    
  
}
 
document.addEventListener('DOMContentLoaded', load);