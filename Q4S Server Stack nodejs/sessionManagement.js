var sessions = [];
var count = 0;
var BWIDTH_MESSAGE_LENGTH_CLIENT = 4096;


var sessionManagement = {
  indexOf: function(sessionId) {
    for(var i in sessions) {
        if(sessions[i].sessionId == sessionId)
            return i;
    }
    return null;
  },
  add: function(sessionId) {
    sessionId.pingReceived = [];
    sessionId.pingTimestamp = [];
    sessionId.pingSent = [];
    sessionId.pingElapsed = [];
    sessionId.rtt = [];
    sessionId.rttMedian = 0;
    sessionId.jitter = 0;
    sessionId.latency = 0;
    sessionId.packetloss = 0;
    sessionId.seq_received_pings = [];
    sessionId.bwMsgReceived = [];
    sessionId.bwMsgCounter = 0;
    sessionId.intervalContinuity = 0;
    sessionId.nPingsContinuityServer = 0;
    sessions.push(sessionId);
    count++;
  },
  remove: function(sessionId) {
    var index = this.indexOf(sessionId);
    if(index != null) {
        sessions.splice(index, 1);
        count--;
    } else {
        return null;
    }
  },
  removeAll: function() {
    sessions = [];
  },
  numberOfSessions: function() {
    return count;
  },
  getSessionById: function(sessionId) {
    var index = this.indexOf(sessionId);
    if(index != null) {
        return sessions[index];
    } else {
        return null;
    }
  },
  beginNegotiation: function(sessionId, addr, udp_p) {
  	console.log("session "+sessionId+" BEGIN negotiation");
  	var session = this.getSessionById(sessionId);
    if(session != null) {
    	  console.log("session "+sessionId+" hasBegun 1");
        session.hasBegun = 1;
        session.address = addr;
        session.udp_port = udp_p;
    } else {
        console.log("session "+sessionId+" NULL");
    }   
  },
  hasBegunNegotiation: function(sessionId) {
  	var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.hasBegun;
    } else {
        return null;
    }
  },
  getAddress: function(sessionId) {
  	var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.address;
    } else {
        return null;
    }
  },
  getUdpPort: function(sessionId) {
  	var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.udp_port;
    } else {
        return null;
    }
  },
  storeContinuityInterval: function(sessionId, interval) {
  	var session = this.getSessionById(sessionId);
    if(session != null) {
    	  session.intervalContinuity = interval;
    } else {
        console.log("session "+sessionId+" NULL");
    }   
  },
  getContinuityInterval: function(sessionId) {
  	var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.intervalContinuity;
    } else {
        return null;
    }
  },
  setNofPingsContinuity: function(sessionId, numberOfPings) {
  	var session = this.getSessionById(sessionId);
    if(session != null) {
    	  session.nPingsContinuityServer = numberOfPings;
    } else {
        console.log("session "+sessionId+" NULL");
    }   
  },
  getNofPingsContinuity: function(sessionId) {
  	var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.nPingsContinuityServer;
    } else {
        return null;
    }
  },
  pingReceivedTime: function(sessionId, seqNumber, timeReceived, timestamp) {
  	var session = this.getSessionById(sessionId);
    if(session != null) {
        session.pingReceived[seqNumber] = timeReceived;
        session.pingTimestamp[seqNumber] = timestamp;
        if (session.seq_received_pings.length >= this.getNofPingsContinuity(sessionId)){
          session.seq_received_pings.shift(); //Remove the first item
        }
        session.seq_received_pings.push(seqNumber);
        if (seqNumber>0){
        	session.pingElapsed.push(Math.abs(session.pingReceived[seqNumber]-session.pingReceived[seqNumber-1]-(session.pingTimestamp[seqNumber]-session.pingTimestamp[seqNumber-1])));
        	session.jitter = Math.round((this.mean(session.pingElapsed))*100)/100; //mean of the elapsed time between pings reception
        	session.latency = Math.round(session.rttMedian/2);
        }
    } else {
        console.log("session "+sessionId+" NULL");
    }
  },
  pingSentTime: function(sessionId, seqNumber, timeSent) {
    //console.log("******** seqNumber:"+seqNumber+" timeSent:"+timeSent);
  	var session = this.getSessionById(sessionId);
    if(session != null) {
        session.pingSent[seqNumber]=timeSent;
    } else {
        console.log("session "+sessionId+" NULL");
    }
    //for(var k=0;k<session.pingSent.length;k++){
    //  console.log("******** session.pingSent["+k+"] is:"+session.pingSent[k]);
    //}
  },
  rtt: function(sessionId, seqNumber, timeReceived) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        session.rtt[seqNumber]=timeReceived-session.pingSent[seqNumber];
        session.rttMedian = this.median(session.rtt);
    } else {
        console.log("session "+sessionId+" NULL");
    }
  },
  rttMedianServer: function(sessionId) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.rttMedian;
    } else {
        console.log("session "+sessionId+" NULL");
    }
    
  },
  uplinkJitter: function(sessionId) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.jitter;
    } else {
        console.log("session "+sessionId+" NULL");
    }
    
  },
  uplinkLatency: function(sessionId) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.latency;
    } else {
        console.log("session "+sessionId+" NULL");
    }
    
  },
  getLastPingReceived: function(sessionId) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        var last_ping_received = session.seq_received_pings[session.seq_received_pings.length-1]; 
        last_ping_received++;//sequence begins at 0
        return  last_ping_received;
    } else {
        console.log("session "+sessionId+" NULL");
    }
  },
  calculateUplinkPacketLossPing: function(sessionId) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        var last_ping_received = this.getLastPingReceived(sessionId);
        if (last_ping_received >= 0){
        	console.log("session.seq_received_pings.length: "+session.seq_received_pings.length);
        	console.log("last_ping_received: "+last_ping_received);
        	session.packetloss = 100 - (100*session.seq_received_pings.length/last_ping_received);
        }
    } else {
        console.log("session "+sessionId+" NULL");
    }
  },
  uplinkPacketLoss: function(sessionId) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.packetloss;
    } else {
        console.log("session "+sessionId+" NULL");
    }
    
  },
  elapsedTime: function(sessionId) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.pingElapsed;
    } else {
        console.log("session "+sessionId+" NULL");
    }
    
  },
  rttAvServer: function(sessionId) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
    	  var avServer = mean(session.rtt);
        console.log("session.rttAv:"+session.rttAv);
        return avServer;
    } else {
        console.log("session "+sessionId+" NULL");
    }
    
  },
  beginStage1: function(sessionId, seqN) {
  	console.log("session "+sessionId+" BEGIN negotiation Stage1");
  	var session = this.getSessionById(sessionId);
    if(session != null) {
    	  console.log("session "+sessionId+" hasBegun 1");
        session.hasBegunBW = 1;
        session.firstBWSeqNumber = seqN;
    } else {
        console.log("session "+sessionId+" NULL");
    }   
  },
  hasBegunStage1: function(sessionId) {
  	var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.hasBegunBW;
    } else {
        return null;
    }
  },
  getFirstBWSeqNumber: function(sessionId) {
  	var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.firstBWSeqNumber;
    } else {
        return null;
    }
  },
  bwMsgReceived: function(sessionId, seqNumber, timeReceived) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        session.bwMsgReceived[seqNumber]=timeReceived;
        session.bwMsgCounter++;
        var expectedReceivedPackets = parseInt(seqNumber)+1;
        session.packetloss = Math.round(10000*(expectedReceivedPackets-session.bwMsgCounter)/(expectedReceivedPackets))/100;
    } else {
        console.log("session "+sessionId+" NULL");
    }
  },
  getBWMsgReceived: function(sessionId, seqNumber) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.bwMsgReceived[seqNumber];
    } else {
        console.log("session "+sessionId+" NULL");
    }
  },
  getBWMsgCounter: function(sessionId) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        return session.bwMsgCounter;
    } else {
        console.log("session "+sessionId+" NULL");
    }
  },
  uplinkBW: function(sessionId) {
    var session = this.getSessionById(sessionId);
    if(session != null) {
        //console.log("First BW received:"+this.getFirstBWSeqNumber(sessionId));
	  	  //console.log("Time for "+this.getBWMsgCounter(sessionId)+" BW Messages: "+(this.getBWMsgReceived(sessionId,(this.getBWMsgCounter(sessionId)-1))-this.getBWMsgReceived(sessionId,this.getFirstBWSeqNumber(sessionId)))+" ms");
	  	  //
	  	  // uplinkBW = # bits per byte * BW message Length * # received BW messages / time (last received message - first received message)
	  	  var uplinkBW = 8*BWIDTH_MESSAGE_LENGTH_CLIENT*this.getBWMsgCounter(sessionId)/(this.getBWMsgReceived(sessionId,(this.getBWMsgCounter(sessionId)-1))-this.getBWMsgReceived(sessionId,this.getFirstBWSeqNumber(sessionId)));
        return Math.round(uplinkBW*100)/100;
    } else {
        console.log("session "+sessionId+" NULL");
    }
    
  },
  sum: function(list) {
        var sum = 0;
        for(var i = 0, len = list.length; i < len; i++)
        	sum += list[i];
        return sum;
  },
  isEven: function(number) {
    return(number % 2 ? false : true);
  },
  mean: function(list) {
        return list.length ? this.sum(list) / list.length : false;
  },
  median: function(list) {
    if(!list.length) return false;
    
    list.sort();
    
    if(this.isEven(list.length)) {
        return this.mean([list[list.length / 2 - 1], list[list.length / 2]]);
    } else {
        return list[Math.floor(list.length / 2)];
    }
  },
  variance: function(list) {
        if(!list.length) return false;
        
        var mean = this.mean(list);
        //console.log("---- VARIANCE mean:"+mean);
        //console.log("---- VARIANCE list.length:"+list.length);
        
        var dev = [];
        
        for(var i = 0, len = list.length; i < len; i++){
           dev.push(Math.pow(list[i] - mean, 2));
           if (list.length > 254){
             console.log("---- VARIANCE: ["+i+"]:"+list[i]);
             console.log("---- VARIANCE: ["+i+"]:"+Math.pow(list[i] - mean, 2));
           }
        }
        if (list.length > 254)
          console.log("---- VARIANCE: jitter:"+this.mean(dev));
        return this.mean(dev);
    }
};

module.exports = sessionManagement;
