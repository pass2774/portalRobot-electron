'use strict';

let isChannelReady = false;
let isInitiator = false;
let isStarted = false;
let localStream;
let pc;
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
  offerToReceiveAudio: true,//set to false by Joonhwa 
  offerToReceiveVideo: true //set to false by Joonhwa 
};


/////////////////////////////////////////////
let localVideo = document.querySelector('#localVideo');
let remoteVideo = document.querySelector('#remoteVideo');

let room = 'foo';
const socket = io("https://api.portal301.com/",{
    transports: ["websocket"] // HTTP long-polling is disabled
  }
);

let jbBtn = document.createElement('button');
let jbBtnText = document.createTextNode('Clean up service list');
jbBtn.id='btn_0'
jbBtnText.id='btnText_0'

jbBtn.appendChild(jbBtnText);
document.body.appendChild(jbBtn);

jbBtn.addEventListener("click",onButtonClick)

function onButtonClick() {
  alert("service list clean up requested!");
  let query = [];
  query.push({header:'pingServices',filter:{}});
  console.log(query);
  socket.emit("q_service", query); 
}


let controlPanel = document.querySelector('#controlPanel');
let SltServiceList_webcam = document.createElement('select');
let option_default_webcam = document.createElement('option');
option_default_webcam.innerText = "Available Device List";
option_default_webcam.value = "field";
SltServiceList_webcam.append(option_default_webcam);
SltServiceList_webcam.addEventListener("onchange",function(){
  
})
let SltServiceList_robot = document.createElement('select');
let option_default_robot = document.createElement('option');
option_default_robot.innerText = "Available Device List";
option_default_robot.value = "field";
SltServiceList_robot.append(option_default_robot);
SltServiceList_robot.addEventListener("onchange",function(){
  
})


let target_profile;
let BtnJoinService = document.createElement('button');
BtnJoinService.id='btn_join_service'
BtnJoinService.innerText='Join WebCam Service'
document.body.appendChild(BtnJoinService);
BtnJoinService.addEventListener("click", function() {
  console.log(ServiceList);
  //FilteredList of Services
  target_profile = ServiceList.filter(e => e.sid === SltServiceList_webcam.options[SltServiceList_webcam.selectedIndex].value)[0];
  console.log(target_profile);

  socket.emit('Join_Service', target_profile.sid);
})


// let target_profile;
let BtnJoinService_robot = document.createElement('button');
BtnJoinService_robot.id='btn_join_robot_service'
BtnJoinService_robot.innerText='Join Robot Service'
document.body.appendChild(BtnJoinService_robot);
BtnJoinService_robot.addEventListener("click", function() {
  console.log(ServiceList);
  //FilteredList of Services
  target_profile = ServiceList.filter(e => e.sid === SltServiceList_robot.options[SltServiceList_robot.selectedIndex].value)[0];
  console.log(target_profile);
  socket.emit('Join_Service', target_profile.sid);
})


controlPanel.appendChild(BtnJoinService);
controlPanel.appendChild(SltServiceList_webcam);
controlPanel.appendChild(BtnJoinService_robot);
controlPanel.appendChild(SltServiceList_robot);


let query = [];
query.push({header:'ServiceList',filter:{}});
console.log(query);
socket.emit("q_service", query); 

socket.on('q_result', function(q_result_json) {
  const qres = JSON.parse(q_result_json);
  console.log(qres);
  if(qres.header==='ServiceList'){
    ServiceList=qres.data;
    SltServiceList_webcam.options.length=1;
    SltServiceList_robot.options.length=1;
    for (const [key, value] of Object.entries(Object(ServiceList))) {
    // console.log(`${key}: ${value.state}`);
      let option = document.createElement('option');
      option.innerText = value.nickname+':'+value.sid;
      option.value = value.sid;
      SltServiceList_webcam.append(option);

      option = document.createElement('option');
      option.innerText = value.nickname+':'+value.sid;
      option.value = value.sid;
      SltServiceList_robot.append(option);
    }
  }
});


socket.on('PING', (msg)=>{
  console.log("ping from server with msg:"+ msg);
  socket.emit('PONG',"hello");
})

socket.on('created', function(room) {
  console.log('Created room ' + room);
  isInitiator = true;
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
  if(target_profile.description === 'tsSensor'){    
    location.href='SensorMonitor.html';
  }else if(target_profile.description === 'Streamer'){
    gotStream();
  }
  isChannelReady = true;
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message,destination=null,msg_ver='msg-v1') {
  let packet = {'from': socket.id, 'to':destination, 'message': message};
  console.log('Client sending message: ', packet);
  socket.emit(msg_ver, packet);
}


// This client receives a message
socket.on('msg-v1', function(packet) {
  let message =  packet.message;

  console.log('Client received message:', message);
  try{
    if (message.type === 'offer') {
      if (!isInitiator && !isStarted) {
        maybeStart();
      }
      pc.setRemoteDescription(new RTCSessionDescription(message));
      doAnswer();
    } else if (message.type === 'answer' && isStarted) {
      pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
      let candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      pc.addIceCandidate(candidate);
    } else if (message === 'bye' && isStarted) {
      handleRemoteHangup();
    }
  }catch(e){

  }
});

function gotStream() {
  console.log('Adding local stream.');
  sendMessage('connection request');
}

let constraints = {
  video: true
};

console.log('Getting user media with constraints', constraints);

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && isChannelReady) {
      console.log('>>>>>> creating peer connection');
    createPeerConnection();
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(pcConfig);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
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


function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}
