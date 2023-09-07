"use strict"

// import { console.log } from "../utils/log.js";

// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
// modify polite to isInitiator
export class PortalRTC { // RTC 관련 기능 - 시그널링 관련 (프론트)
  // constructor(parentElement, commClient){
  constructor(commClient, namespace = "/", useTCP = false) {

    this.comm = commClient.sockets[namespace]; //portalCommClient
    this.serialNumber = commClient.profile.serialNumber;
    // this.nsp = namespace;
    this.isInitiator = null;
    // if (useTCP) {
    //   TCPset = "turn:3.35.133.246?transport=tcp";
    //   icePolicy = 'relay';
    // } else {
    //   TCPset = "turn:3.35.133.246";
    //   icePolicy = 'all';
    // }
    this.webrtcParams = {
      constraints: {
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      pcConfig: {
        'iceServers': [
          {
            "urls": "turn:54.180.145.64",
            // "urls": TCPset,
            "username": "user",
            "credential": "pass"
          },
          {
            'urls': 'stun:stun.l.google.com:19302'
          }
        ],
        'iceTransportPolicy': 'all',
      },
    }

    this.iamHost = false;
    this.localVideo = null;
    this.remoteVideos = [];
    this.pcs = {};

    this.polite = true;
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isInitiators = {};

    this.setOnSocketIOCallbacks();

    this.first = true;
  }

  resetSocketIdentify(commClient, namespace = "/") {
    this.comm = commClient.sockets[namespace]; //portalCommClient
  }

  async setOnSocketIOCallbacks() {
    this.comm.on("webrtc:connection request", async (clientID) => {
      let logMsg = 'webrtc:connection request, clientID : ' + clientID
      console.log(logMsg);

      // let serialNumber = senderId;
      let pc = this.createPeerConnection(clientID);
      this.pcs[clientID] = pc;
    });

    this.comm.on("webrtc:signaling", async (clientID, description, candidate) => {

      if (!clientID) {
        console.log('Received my Message myself. Ignore This Signal');
        return;
      }

      console.log('description >>', description?.type);
      console.log('candidate >>', candidate);
      console.log('clientID >>', clientID);

      try {
        if (description) {
          const offerCollision =
            description.type === "offer" &&
            (this.makingOffer || this.pcs[clientID].signalingState !== "stable");

          //Polite한 client(host)가 받은 오퍼를 무시한다. 
          this.ignoreOffer = this.polite && offerCollision;
          console.log('ignoreOffer : ', this.ignoreOffer);

          if (this.ignoreOffer) {
            console.log('Offer Collision, Ignore offer \nmaybe you are Module.');
            return;
          }

          await this.pcs[clientID].setRemoteDescription(description);
          console.log('received peer`s offer or answer');
          if (description.type === "offer") {
            // electron Client는 offer를 받을 일은 없음.
            // 따라서 이 코드는 실행되지 않음(않아야 함).
            console.log('making my answer');
            await this.pcs[clientID].setLocalDescription();
            this.sendSignal(this.serialNumber, undefined, this.pcs[clientID].localDescription, undefined);
          }

        } else if (candidate) {
          try {
            await this.pcs[clientID].addIceCandidate(candidate);
          } catch (err) {
            if (!this.ignoreOffer) {
              throw err;
            }
          }
        }
      } catch (err) {
        console.log('[Error] ' + err);
        console.error(err);
      }
    });
  }

  async operateCamera() {

    try {
      let mediaDevices = navigator.mediaDevices;
      console.log(await mediaDevices.enumerateDevices());
      let stream = await mediaDevices.getUserMedia(this.webrtcParams.constraints);
      stream.getVideoTracks()[0].onended = () => {
        console.log('Camera Disconnected (Unplugged the webcam');
      }

      this.localVideo.srcObject = stream;
    } catch (e) {
      console.error(e.name);
      let errorCode = e.name;
      switch (errorCode) {
        case "AbortError":
          console.log("AbortError");
        case "NotAllowedError":
          alert('해당 페이지에서 카메라에 접근할 수 있는 권한이 없습니다.')
          console.log("NotAllowedError");
          break;
        case "NotFoundError":
          alert('카메라 디바이스를 찾을 수 없습니다.')
          console.log("NotFoundError");
          break;
        case "NotReadableError":
          console.log("NotReadableError")
          break;
        case "OverconstrainedError":
          console.log("OverconstrainedError")
          break;
      }
    }
  }

  async startStreaming(some_config) {
    // some_config는 현재 아무 것도 없음. 뭔가 쓸일이 있다면 쓰시길..
    this.operateCamera();

    return true;
  }

  async disconnectRTC() { // not yet used.
    for (let idx in this.pcs) {
      this.pcs[idx].close();
    }
  }

  sendSignal(serialNumber, senderId, description = undefined, icecandidate = undefined) {
    console.log('[sendSignal] target : ', this.serialNumber);
    this.comm.emit("webrtc:signaling", serialNumber, senderId, description, icecandidate)
  }

  createPeerConnection(clientID) {

    let pc = new RTCPeerConnection(this.webrtcParams.pcConfig);

    if (this.localVideo !== null) {
      let stream = this.localVideo.srcObject;
      for (const track of stream.getTracks()) {
        console.log('Video Track added');
        pc.addTrack(track, stream);
      }
    }

    pc.ontrack = (event) => {
      console.log('Video Track comming ... ' + event);

    }

    pc.onconnectionstatechange = (event) => {
      console.log('[webRTC] state changed !', pc.connectionState);
      switch (pc.connectionState) {
        case "new":
          console.log("New");
        case "checking":
          console.log("Connecting…");
          break;
        case "connected":
          // this.comm.emit('webrtc:connectionStateChanged', this.serialNumber, "online");
          console.log("Online");
          break;
        case "disconnected":
          pc.close();
          pc = null; // null로 설정해야 GC가 수집함.
          break;
        case "closed":
          // this.comm.emit('webrtc:connectionStateChanged', this.serialNumber, "offline");
          console.log("Offline");
          break;
        case "failed":
          // this.comm.emit('webrtc:connectionStateChanged', this.serialNumber, "error");
          console.log("Error");
          break;
        default:
          console.log("Unknown");
          break;
      }
    }

    pc.onclose = () => {
      console.log("PeerConnection is Closed");
    }

    pc.onicecandidate = ({ candidate }) => {
      console.log('signaling state : ' + pc.signalingState);
      this.sendSignal(this.serialNumber, undefined, undefined, candidate);
      console.log('making candidate : ' + candidate);
    }

    pc.onnegotiationneeded = async () => {
      console.log('Onnegotiationneeded');
      try {
        this.makingOffer = true;
        // if(this.first) {
        //   console.log('onnegotiationneeded start if context');
        //   await pc.setLocalDescription();
        //   this.first = false;
        // }
        await pc.setLocalDescription();
        //console.log('localsdp >>', this.pcs[clientID].localDescription, clientID);
        this.sendSignal(this.serialNumber, undefined, this.pcs[clientID].localDescription, undefined);
      } catch (err) {
        console.log('[Error] onnegotiationneeded' + err);
      } finally {
        this.makingOffer = false;
      }
    }


    pc.oniceconnectionstatechange = () => {
      console.log('oniceconnectionstatechange :' + pc.iceConnectionState);
      if (pc.iceConnectionState === "disconnected") {
        //console.log('ICECANDIDATE Re-Start');      
        //pc.restartIce();
      }
    };

    return pc;
  }

  onCreateSessionDescriptionError(error) {
    console.log('Failed to create session description: ' + error.toString());
    trace('Failed to create session description: ' + error.toString());
  }

}
