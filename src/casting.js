'use strict';
// reference: https://millo-l.github.io/WebRTC-%EA%B5%AC%ED%98%84%ED%95%98%EA%B8%B0-1-N-P2P/


let isChannelReady = false;
let isStarted = false;
let localStream;
let pcs={};
let remoteStream;
let turnReady;

let ServiceList;

let pcConfig = {
  'iceServers': [
    {
      "urls": "turn:3.35.133.246",
      "username":"user",
      "credential":"pass"
    },
    {
      'urls': 'stun:stun.l.google.com:19302'
    }
  ]
};
// Set up audio and video regardless of what devices are present.
let sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};


/////////////////////////////////////////////
let localVideo = document.querySelector('#localVideo');
let remoteVideo = document.querySelector('#remoteVideo');
let room = 'foo';

const socket = io("https://api.portal301.com/",{
  transports: ["websocket"] // HTTP long-polling is disabled
  }
);


let controlPanel = document.querySelector('#controlPanel');

let SltServiceList = document.createElement('select');
let option_default = document.createElement('option');
option_default.innerText = "Available Device List";
option_default.value = "field";
SltServiceList.append(option_default);
SltServiceList.addEventListener("onchange",function(){
  
})


let BtnStartStream = document.createElement('button');

BtnStartStream.id='btn_start_stream'
BtnStartStream.innerText='Start Streaming'
document.body.appendChild(BtnStartStream);
BtnStartStream.addEventListener("click", function() {
  let serviceProfile = new Object();
  serviceProfile.sid = socket.id;
  serviceProfile.type = 'device1';
  serviceProfile.description = 'RobotCam';
  serviceProfile.owner = 'owner1';
  serviceProfile.nickname = 'RobotCam_0000';
  // obj.contents = {stream:'{video,audio}'};
  serviceProfile.contents = {sensor:'{sensor1,sensor2}',stream:'{video,audio}'};
  serviceProfile.state = {socketId:socket.id,roomId:'room:'+socket.id }
  socket.emit('Start_Service', JSON.stringify(serviceProfile));
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
})

var BtnAudioToggle = document.createElement('button');
BtnAudioToggle.id='btn_audio_toggle'
BtnAudioToggle.innerText='My Audio On/Off'
document.body.appendChild(BtnAudioToggle);
BtnAudioToggle.addEventListener("click", function() {
  localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;

})

controlPanel.appendChild(BtnStartStream);
controlPanel.appendChild(BtnAudioToggle);
controlPanel.appendChild(SltServiceList);


let mic_switch = true;
let video_switch = true;

function toggleMic() {
  if(localStream != null && localStream.getAudioTracks().length > 0){
    mic_switch = !mic_switch;

  }
}  

let query = [];
query.push({header:'ServiceList',filter:{}});
console.log(query);
socket.emit("q_service", query); 

socket.on('PING', function(msg){
  console.log("ping from server with msg:"+msg);
  socket.emit('PONG',"hello2");
  console.log("pong transmitted")
})

socket.on('q_result', function(q_result_json) {
  const qres = JSON.parse(q_result_json);
  console.log(qres);
  if(qres.header==='ServiceList'){
    ServiceList=qres.data;
    SltServiceList.options.length=1;
    for (const [key, value] of Object.entries(Object(ServiceList))) {
    // console.log(`${key}: ${value.state}`);
      const option = document.createElement('option');
      option.innerText = value.sid+':'+value.description;
      option.value = value.sid;
      SltServiceList.append(option);
  }
  }
});


socket.on('created', function(room) {
  console.log('Created room ' + room);
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function(room) {
  console.log('joined: ' + room);
  isChannelReady = true;
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

function sendMessage(message, destination=null) {
  let packet = {'from': socket.id, 'to':destination, 'message': message};
  console.log('Client sending message: ', packet);
  socket.emit('msg-v1', packet);
}

let RTCClientList =[];
// This client receives a message
socket.on('msg-v1', function(packet) {
  let message = packet.message;
  console.log('Client received message:', message);
  // let socketId = "arbitary socketID";
  try{
    if (message === 'connection request') {
      RTCClientList.push({'socketId':packet.from});
      console.log('RTCClientList:'+RTCClientList);
      console.log(RTCClientList);

      maybeStart(packet.from);
    } else if (message.type === 'offer') {
      pcs[packet.from].setRemoteDescription(new RTCSessionDescription(message));
      doAnswer(packet.from);
    } else if (message.type === 'answer') {
      pcs[packet.from].setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate') {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      pcs[packet.from].addIceCandidate(candidate);
    } else if (message === 'bye') {
      RTCClientList.splice(RTCClientList.findIndex(e => e.socketId === packet.from),1);
      console.log('RTCClientList:'+RTCClientList);
      console.log(RTCClientList);
      if(isStarted){
        handleRemoteHangup(packet.from);
      }
    }
  }catch(e){

  }
});

function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media', null); // delete it
  maybeStart(null); //delete?
}

var constraints = {
  video: true
};

console.log('Getting user media with constraints', constraints);

if (location.hostname !== 'localhost') {
  requestTurn(
    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}

window.onbeforeunload = function() {
  sendMessage('bye', null);
};


function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

function maybeStart(socketId) {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection(socketId);
    // pc.addStream(localStream);
    isStarted = true;
    doCall(socketId);
  }
}
function createPeerConnection(socketId) {
  try {
    // pc = new RTCPeerConnection(null);
    let pc = new RTCPeerConnection(pcConfig); // changed by Joonhwa
    // pc.onicecandidate = handleIceCandidate;

    pc.onicecandidate = event => {
      console.log('icecandidate event: ', event);
      if (event.candidate) {
        sendMessage({
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        }, socketId);
      } else {
        console.log('End of candidates.');
      }
  
    }

    // pc.socketId = socketId;
    if(localStream){
      pc.addStream(localStream);
    }

    pcs = {...pcs, [socketId]: pc};
    console.log('Created RTCPeerConnnection');
    console.log('socket ID:'+pc.socketId);
    console.log('pcs:');
    console.log(pcs);
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall(socketId) {
  console.log('Sending offer to peer');
  pcs[socketId].createOffer(sessionDescription=>{
    pcs[socketId].setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMessage(sessionDescription, socketId);
      // setLocalAndSendMessage(setLocalAndSendMessage);
  }, handleCreateOfferError);
}


function doAnswer(socketId) {
  console.log('Sending answer to peer.');
  pcs[socketId].createAnswer().then(sessionDescription =>{
    pcs[socketId].setLocalDescription(sessionDescription);
      console.log('setLocalAndSendMessage sending message', sessionDescription);
      sendMessage(sessionDescription, socketId);
    }, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function handleRemoteHangup(socketId) {
  console.log('Session terminated.');
  stop(socketId);
}

function stop(socketId) {
  isStarted = false;
  pcs[socketId].close();
  pcs[socketId] = null;
}
