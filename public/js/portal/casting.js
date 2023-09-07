'use strict';
// reference: https://millo-l.github.io/WebRTC-%EA%B5%AC%ED%98%84%ED%95%98%EA%B8%B0-1-N-P2P/
import { PortalCommClient } from "../comm/portalComm.js";
import * as create from "../utils/createTag.js";
import { getDeviceInfo } from "../webrtc/getDevices.js";
import { PortalRTC } from "../webrtc/portalrtc.js"
import { testNetwork } from "../webrtc/testNetwork.js";

let commClient = new PortalCommClient;
const socketNsp = "/";
const webRTCconfig = {}

let isElementsReady = false;
let appLoadedFirst = true;
let portalRTC;
let serverName = undefined;
let socketEventControlOnce = false;


window.portal_electron_API.initSetting(async (_event, value) => {

  console.log('[Init] Setting config, Server Name : ' + value.serverName);

  serverName = value.serverName;

  if (!appLoadedFirst) return;
  await commClient.createSocketIO(serverName, socketNsp, {transports: ["websocket"] });
  setOnSocketEvent(commClient);

  let headlineDeviceName = document.querySelector("#h3_deviceName");
  //headlineDeviceName.innerText = `Serial Number : ${commClient.profile.serialNumber}`;
});

function setOnSocketEvent (commClient) {
  commClient.sockets[socketNsp].on("connect", () => {
    console.log('Connected Socket')
  
    if(!appLoadedFirst) {
      commClient.createService(socketNsp);
      portalRTC.resetSocketIdentify(commClient, );
    }
  
    //최초 1회 연결시 이벤트 등록은 한번만 이루어줘야 함
    //연결마다 이벤트 등록하면 동일 이벤트가 여러번 실행됨
    if(socketEventControlOnce) return;
    commClient.setOnServicesUpdate(connectionTest, socketNsp);
    commClient.sockets[socketNsp].on("your id", (id) => {
      commClient.socketId = id;
  
      console.log('Comm Socket ID : ' + commClient.socketId);
      if (!isElementsReady) {
        portalRTC = new PortalRTC(commClient,);
        prepareElements();
        // updateServicesSelect(commClient.fetchServices());
        isElementsReady = true;
        startWithAppLoaded();
      }  
    })
    socketEventControlOnce = true;  
  });
  
}


function prepareElements() {

  let panel = document.querySelector("#controlPanel");
  panel.style.width = "60%"
  panel.style.display = "flex"
  panel.style.flexWrap = "wrap"
  panel.style.justifyContent = "flex-start";
  panel.style.alignItems = "self-end";
  panel.style.gap = "0.5em"

  let headlineServerName = document.querySelector("#h3_serverName");
  headlineServerName.innerText = `singaling socket server : ${serverName}`;


  let testNet = create.buttonTag(panel, "Test your Network", "50%");
  testNet.onclick = () => {
    testNetwork();
  }
}

let imgTag = create.imageTag(
  document.querySelector("#videoPanel .local"),
  'remoteImage',
)


function startWebrtcStreaming() {

  let localPanel = document.querySelector("#videoPanel .local");

  if (!portalRTC) {
    console.log('portalRTC not created. Check the server connection status.');
  }
  if (!portalRTC.localVideo) {
    portalRTC.localVideo = create.videoTag(localPanel, "local-webrtc", { width: 320, height: 240 });
  }

  portalRTC.localVideo.addEventListener('play', () => {
    imgTag.style.display = "none";
  });
  portalRTC.localVideo.addEventListener('pause', () => {
    imgTag.style.display = "block";
  });

  portalRTC.startStreaming(webRTCconfig).then(value => {
    // nothing;
  });

}

function connectionTest() {
  console.log('%c Server Connection Test, My Socket ID : \n', `color: ${"white"}; background: ${"black"}`, commClient.socket.id);
}

async function startWithAppLoaded () {


  let deviceInfo = await getDeviceInfo();
  if (!deviceInfo) {
    alert('유효한 카메라 디바이스가 없습니다.');
    console.log('[AppLoaded] No Available Camera Device');
    return;
  }

  if(appLoadedFirst) {
    commClient.createService(socketNsp);
    appLoadedFirst = false;
  }
  startWebrtcStreaming();

}
