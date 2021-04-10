firebase.initializeApp({
    apiKey: "AIzaSyCi35bN3_sQOdYmv9YmVt-l7hMvKArrN8U",
    authDomain: "random-chat-webrtc.firebaseapp.com",
    databaseURL: "https://random-chat-webrtc-default-rtdb.firebaseio.com",
    projectId: "random-chat-webrtc",
    storageBucket: "random-chat-webrtc.appspot.com",
    messagingSenderId: "609114211494",
    appId: "1:609114211494:web:9c0603bfbbe416580de067",
    measurementId: "G-B52MN3BKN5"
});
firebase.analytics();

let database = firebase.database();
const peerConnection = new RTCPeerConnection({
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
                'stun:stun3.l.google.com:19302',
                'stun:stun4.l.google.com:19302',
                'stun:stun01.sipphone.com',
                'stun:stun.ekiga.net',
                'stun:stun.fwdnet.net',
                'stun:stun.ideasip.com',
                'stun:stun.iptel.org',
                'stun:stun.rixtelecom.se',
                'stun:stun.schlund.de',
                'stun:stunserver.org',
                'stun:stun.softjoys.com',
                'stun:stun.voiparound.com',
                'stun:stun.voipbuster.com',
                'stun:stun.voipstunt.com',
                'stun:stun.voxgratia.org',
                'stun:stun.xten.com'
            ],
        },
        {
            urls: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
        {
            urls: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }
    ],
    iceCandidatePoolSize: 10,
});
let channel
let user
let peer

user = database.ref('users').push({type: 'init'});
user.onDisconnect().remove();


peerConnection.onicecandidate = event => {
    if (event.candidate) {
        peer.set({
            type: 'candidate',
            candidate: event.candidate.toJSON(),
            TIMESTAMP: firebase.database.ServerValue.TIMESTAMP
        })
    }
}
peerConnection.ondatachannel = event => {
    channel = event.channel
}


//database.ref('users/'+ peerID).set({type:'Request_response', key:user.key, TIMESTAMP: firebase.database.ServerValue.TIMESTAMP})
user.on('value', snapshot => {
    var data = snapshot.val();
    console.log(data)
    switch (data.type) {
        case 'init':
            console.log('user key :', user.key);
            break;
        case 'Request_response':
            if (!peer) {
                peer = database.ref('users/' + data.key);
                peer.set({
                    type: 'Request_response',
                    key: user.key,
                    TIMESTAMP: firebase.database.ServerValue.TIMESTAMP
                });
            } else {
                channel = peerConnection.createDataChannel('channel')
                peerConnection.createOffer().then(offer => {
                    peerConnection.setLocalDescription(offer);
                    peer.set({
                        type: 'offer',
                        offer: {
                            sdp: offer.sdp,
                            type: offer.type
                        },
                        TIMESTAMP: firebase.database.ServerValue.TIMESTAMP
                    });
                });
            }
            break;
        case 'offer':
            peerConnection.setRemoteDescription(data.offer);
            peerConnection.createAnswer().then(answer => {
                peerConnection.setLocalDescription(answer);
                peer.set({
                    type: 'answer',
                    answer: {
                        sdp: answer.sdp,
                        type: answer.type
                    },
                    TIMESTAMP: firebase.database.ServerValue.TIMESTAMP
                });
            });
            break;
        case 'answer':
            peerConnection.setRemoteDescription(data.answer);
            break;
        case 'candidate':
            peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            break;
        default:
            console.error(data)
            break;
    }
});
