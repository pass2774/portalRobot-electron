import { io } from "socket.io-client";

export class PortalCommClient {

  constructor() {
    this.TAG = `[portalComm_v0.1]`
    this.VERSION = "portalComm_v0.1"

    //socket.io
    this.socket = null;
    this.sockets = {};
    this.socketId = null;

    this.profile = {};

    this.profile2 = {
      serialNumber: 'SN000-FAKE-3566',
      alias: "J-test0", // serviceName (electron-cam)
      type: "camera", // serviceType (webrtc, robot, ...)
      authLevel: "no authLevel", // user, admin, master
      status: "no-master", // ?
      location: "no location", // ?
      createdAt: "no createdAt", // ?
      descriptions: "no descriptions", // ?
      vender: "no vender", // ?
      apps: [], // ?
    }

    this.ping();
  }

  /*
  create socketIO client according to the given namespace and options.
  default path is "portalCommV0".
  only main namespace("/") is set to this.socket.
  other namespaces are set to this.sockets.namespace
  */
  createSocketIO(server, namespace = "/", options) {
    

window.portal_electron_API.moduleProfile(async (_event, profile) => {
  console.log('getModuleProfile ---- ');
  console.log(profile);
  this.profile = profile;
  console.log("this.profile:");
  console.log(this.profile.serialNumber);
  let headlineDeviceName = document.querySelector("#h3_deviceName");
  headlineDeviceName.innerText = `Serial Number : ${this.profile.serialNumber}`;
})

  

    let socket = undefined;
    socket = io(server, { ...options, path: `/${this.VERSION}` });

    // let socket = io('https://api.portal301.com/', { ...options, path: `/${this.VERSION}` });

    socket.on("connect", () => {
      // this.profile.socketId = socket.id;
      this.socketId = socket.id;
      let logMsg = '[portalComm] Socket ID : ' + this.socketId;
      console.log(logMsg);
    });

    socket.on('connect_error', () => {
      console.log('Connect to server failed');
    });

    if (namespace === "/") {
      this.sockets[namespace] = socket;
      this.socket = this.sockets[namespace];

      return this.sockets[namespace];
    } else {

      return this.sockets[namespace] = socket;
    }

  }

  setMainSocket(namespace) {
    return this.socket = this.sockets[namespace];
  }

  ping() {
    let pingMsg = 'PING';

    setInterval(() => {
      this.socket.emit('PONG', pingMsg);
    }, 40000);
  }

  fetchServices(filter = {}, nsp = "/") {
    let req = { filter: filter };
    let logMsg = 'send GET request.';
    console.log(logMsg);

    this.sockets[nsp].emit("services", "GET", req, (res) => {
      let logMsg = this.TAG + nsp + " get query response : " + res;
      console.log(logMsg);
      return res;
    });
  }

  setOnServicesUpdate(callback1, nsp = "/") {
    let socket = this.sockets[nsp];
    socket.on("connection test", (packet) => callback1(packet));
  }

  createService(nsp = "/") {
    
    let socket = this.sockets[nsp]; 
    
//    fetch("https://localhost:3333/fetch/v0.1/module/register", {
    fetch("https://api.portal301.com/fetch/v0.1/module/register", {
      credentials: 'include',
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile : this.profile
      }),
    }).then((response) => { 
      console.log('fetch/v0.1/module/register RESPONSE : ', response);
      socket.emit('connect-module', this.profile, (res) => { 
        console.log('connect-module RESPONSE : ', res);  
      });
    });
  };
  

}
