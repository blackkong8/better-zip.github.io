
        var target = ""
        let my_token
        function start_connect() {
            target = document.getElementById('target').value
            console.log("target :", target)
            send_msg({ "type": "start" })
        }

        const MAXIMUM_MESSAGE_SIZE = 65535
        const END_OF_FILE_MESSAGE = 'EOF'

        const pcConfig = {
            'iceServers': [{ urls: 'stun:stun01.sipphone.com' },
            { urls: 'stun:stun.ekiga.net' },
            { urls: 'stun:stun.fwdnet.net' },
            { urls: 'stun:stun.ideasip.com' },
            { urls: 'stun:stun.iptel.org' },
            { urls: 'stun:stun.rixtelecom.se' },
            { urls: 'stun:stun.schlund.de' },
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stunserver.org' },
            { urls: 'stun:stun.softjoys.com' },
            { urls: 'stun:stun.voiparound.com' },
            { urls: 'stun:stun.voipbuster.com' },
            { urls: 'stun:stun.voipstunt.com' },
            { urls: 'stun:stun.voxgratia.org' },
            { urls: 'stun:stun.xten.com' }]
        }
        
        const peerConnection = new RTCPeerConnection(pcConfig)
        const socket = new WebSocket('wss://just-chat.kro.kr:55316')
        const sendChannel = peerConnection.createDataChannel("file")
        sendChannel.binaryType = 'arraybuffer'

        function send_msg(msg) {
            msg = {
                "receiver": target,
                "data": msg
            }
            console.log("clien send ->", msg)
            socket.send(JSON.stringify(msg))
        }

        function fnUppercase() {
            var event = window.event;
            if (event.keyCode >= 97 && event.keyCode <= 122) {
                event.keyCode = event.keyCode - 32;
            }
        }

        let file
        document.getElementById('file-input').addEventListener('change', (event) => {
            file = event.target.files[0];
            shareFile()
        })

        function channel_send(msg) {
            console.log("channel send ->", msg)
            sendChannel.send(msg)
        }

        const shareFile = async () => {
            channel_send(file.name)
            arrayBuffer = await file.arrayBuffer();
            for (let i = 0; i < arrayBuffer.byteLength; i += MAXIMUM_MESSAGE_SIZE) {
                channel_send(arrayBuffer.slice(i, i + MAXIMUM_MESSAGE_SIZE));
            }
            channel_send(END_OF_FILE_MESSAGE);
        }

        peerConnection.onicecandidate = function (event) {
            if (event.candidate) {
                send_msg({
                    type: "icecandidate",
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex
                });
            } else {
                console.log('---end---')
                socket.close()
                alert('connected with ' + target)
            }
        }

        socket.onmessage = function (event) {
            console.log("client receive <-", event);
            data = JSON.parse(event.data);
            if (data.token) {
                my_token = data.token
                document.getElementById("token").innerHTML = "token : " + my_token
            } else {
                target = data.sender
                data = data.data
                switch (data.type) {
                    case "start":
                        peerConnection.createOffer().then(
                            function (offer) {
                                peerConnection.setLocalDescription(offer);
                                send_msg(offer);
                            }
                        );
                        break;
                    case "offer":
                        peerConnection.setRemoteDescription(new RTCSessionDescription(data));
                        peerConnection.createAnswer().then(
                            function (answer) {
                                peerConnection.setLocalDescription(answer);
                                send_msg(answer);
                            }
                        );
                        break;
                    case "answer":
                        peerConnection.setRemoteDescription(new RTCSessionDescription(data));
                        break;
                    case "icecandidate":
                        peerConnection.addIceCandidate(new RTCIceCandidate({
                            candidate: data.candidate,
                            sdpMid: data.sdpMid,
                            sdpMLineIndex: data.sdpMLineIndex
                        }));
                        break;
                    default:
                        console.log('switch error')
                }
            }
        }

        peerConnection.ondatachannel = (event) => {
            const { channel } = event;
            channel.binaryType = 'arraybuffer';
            const receivedBuffers = [];
            var file_name = ""
            channel.onmessage = async (event) => {
                const { data } = event;
                console.log("channel receive <-", data)
                if (file_name == "") {
                    file_name = data
                } else {
                    try {
                        if (data !== END_OF_FILE_MESSAGE) {
                            receivedBuffers.push(data);
                        } else {
                            const arrayBuffer = receivedBuffers.reduce((acc, arrayBuffer) => {
                                const tmp = new Uint8Array(acc.byteLength + arrayBuffer.byteLength);
                                tmp.set(new Uint8Array(acc), 0);
                                tmp.set(new Uint8Array(arrayBuffer), acc.byteLength);
                                return tmp;
                            }, new Uint8Array());
                            const blob = new Blob([arrayBuffer]);
                            downloadFile(blob, file_name);
                        }
                    } catch (err) {
                        console.log('File transfer failed', err);
                    }
                }
            };
        };

        const downloadFile = (blob, fileName) => {
            const a = document.createElement('a');
            const url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove()
        };
