
let peerConnection = null;
let dataChannel = null;
export async function testNetwork(
    callBack,
    callBackIfPassed,
    callBackIfDidNotGetSrflxAndDidNotGetHost,
    callBackIfDidNotGetSrflxAndHostAddressIsObfuscated,
    callBackIfDidNotGetSrflxAndHostAddressIsPrivateIPAddress,
    callBackIfBehindSymmetricNat
  ) {
    peerConnection = new RTCPeerConnection({
        'iceServers': [
          {
            "urls": "turn:3.35.133.246",
            "username": "user",
            "credential": "pass"
          },
          {
            'urls': 'stun:stun.l.google.com:19302'
          }
        ]
      });
  
    let isHostAddressObfuscated = false;
    let isHostAddressPublicIP = false;
    let gotHost = false;
    let gotSrflx = false;
    let isBehindSymmetricNat = false;
    const candidates = [];
  
    peerConnection.addEventListener('icecandidate', (event) => {
      if (!event.candidate) {
        console.log('Got final candidate!');

        if (dataChannel) {
          dataChannel.close();
        }
        if (peerConnection) {
          peerConnection.close();
        }
        if (Object.keys(candidates).length >= 1) {
          isBehindSymmetricNat = true;
          for (const ip in candidates) {
            var ports = candidates[ip];
            if (ports.length === 1) {
              isBehindSymmetricNat = false;
              break;
            }
          }
          console.log(isBehindSymmetricNat ? 'symmetric nat' : 'normal nat');

        }
        if (!gotSrflx && !isHostAddressPublicIP) {
          console.log('did not get srflx candidate');
          if (!gotHost) {
            console.log('did not get host candidate');
            //callBackIfDidNotGetSrflxAndDidNotGetHost();
          } else if (isHostAddressObfuscated) {
            console.log('host address is obfuscated');
            //callBackIfDidNotGetSrflxAndHostAddressIsObfuscated();
          } else {
            console.log(
              'host address is not obfuscated and is a private ip address'
            );
            //callBackIfDidNotGetSrflxAndHostAddressIsPrivateIPAddress();
          }
        } else if (isBehindSymmetricNat) {
          console.log('behind symmetric nat');
          //callBackIfBehindSymmetricNat();
        } else if (isHostAddressPublicIP || (gotSrflx && !isBehindSymmetricNat)) {
          console.log(
            '"host address is public IP" or "got srflx, not behind symmetric nat"'
          );
          //callBackIfPassed();
        }
        //callBack();
        return;
      }
      if (event.candidate.candidate === '') {
        // This if statement is for Firefox browser.
        return;
      }
      const cand = parseCandidate(event.candidate.candidate);
      if (cand.type === 'srflx') {
        gotSrflx = true;
        // The original version in https://webrtchacks.com/symmetric-nat/
        // use cand.relatedPort instead of cand.ip here to differentiate
        // the associated host port.)
        // References:
        // https://stackoverflow.com/a/53880029/8581025
        // https://www.rfc-editor.org/rfc/rfc5245#appendix-B.3
        //
        // But as we can see here:
        // https://datatracker.ietf.org/doc/html/draft-ietf-mmusic-mdns-ice-candidates#section-3.1.2.2-3
        // rport is set to a constant value when mDNS is used to obfuscate host
        // address thus rport is not appropriate to be used here.
        // So I decided to use cand.ip here instead.
        // (For some network environment, a user device is assigned both IPv4
        // address and IPv6 address. And when cand.relatedPort was used,
        // the user device was falsely detected to be behind symmetric.
        // (I get to know about this bug while troubleshooting with
        // a user "sochew" who reported that their device suddenly reported to
        // be behind symmetric nat.) So I fix it by using cand.ip instead.)
        if (!candidates[cand.ip]) {
          candidates[cand.ip] = [cand.port];
          // this is for the Firefox browser
          // Firefox browser trigger an event even if a candidate with
          // the same port after translation is received from another STUN server.
        } else if (candidates[cand.ip][0] !== cand.port) {
          candidates[cand.ip].push(cand.port);
        }
      } else if (cand.type === 'host') {
        gotHost = true;
        if (cand.ip.endsWith('.local')) {
          isHostAddressObfuscated = true;
        } else {
          const privateIPReg = RegExp(
            '(^127.)|(^10.)|(^172.1[6-9].)|(^172.2[0-9].)|(^172.3[0-1].)|(^192.168.)'
          );
          if (!privateIPReg.test(cand.ip)) {
            isHostAddressPublicIP = true;
          }
        }
      }
      let logMsg = 'Got candidate: ' + event.candidate;
      console.log(logMsg);
    });
  
    dataChannel = peerConnection.createDataChannel('test', {
      ordered: true,
      maxRetransmits: 0,
    });
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
  }

  function parseCandidate(line) {
    let parts;
    // Parse both variants.
    if (line.indexOf('a=candidate:') === 0) {
      parts = line.substring(12).split(' ');
    } else {
      parts = line.substring(10).split(' ');
    }
  
    const candidate = {
      foundation: parts[0],
      component: { 1: 'rtp', 2: 'rtcp' }[parts[1]],
      protocol: parts[2].toLowerCase(),
      priority: parseInt(parts[3], 10),
      ip: parts[4],
      address: parts[4], // address is an alias for ip.
      port: parseInt(parts[5], 10),
      // skip parts[6] == 'typ'
      type: parts[7],
    };
  
    for (let i = 8; i < parts.length; i += 2) {
      switch (parts[i]) {
        case 'raddr':
          candidate.relatedAddress = parts[i + 1];
          break;
        case 'rport':
          candidate.relatedPort = parseInt(parts[i + 1], 10);
          break;
        case 'tcptype':
          candidate.tcpType = parts[i + 1];
          break;
        case 'ufrag':
          candidate.ufrag = parts[i + 1]; // for backward compatibility.
          candidate.usernameFragment = parts[i + 1];
          break;
        default:
          // extension handling, in particular ufrag
          candidate[parts[i]] = parts[i + 1];
          break;
      }
    }
    return candidate;
  }
  
  /**
   * Return public IP address extracted from the candidate.
   * If the candidate does not contain public IP address, return null.
   * @param {Object} candidate
   */
  export function parsePublicIPFromCandidate(candidate) {
    // Parse the candidate
    const cand = parseCandidate(candidate);
    // Try to get and return the peer's public IP
    if (cand.type === 'srflx') {
      return cand.ip;
    } else if (cand.type === 'host') {
      if (!cand.ip.endsWith('.local')) {
        const privateIPReg = RegExp(
          '(^127.)|(^10.)|(^172.1[6-9].)|(^172.2[0-9].)|(^172.3[0-1].)|(^192.168.)'
        );
        if (!privateIPReg.test(cand.ip)) {
          return cand.ip;
        }
      }
    }
    return null;
  }
  
  /**
   * Get partial public IP, for example, 123.222.*.*
   * @param {string} ip ip address, for example, 123.222.111.123
   */
  export function getPartialIP(ip) {
    const index = ip.indexOf('.', ip.indexOf('.') + 1);
    if (index === -1) {
      // if ip is IPv6 address
      return ip.slice(0, 7);
    } else {
      // if ip is IPv4 address
      return `${ip.slice(0, index)}.*.*`;
    }
  }