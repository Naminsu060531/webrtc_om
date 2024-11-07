export default {
    name: 'App',
    data() {
        return {
            displayNameInputText: '',
            otherName: '',

            streamVideo: null,
            streamVoice: null,
            streamMedia: null,

            isCameraOpen: false,

            displayName: '',
            chatInputText: '',
            send_message: '',
            chatsBody: '',
            chatElement: '',

            isChatRoomOpen: false,

            webSocket: null,
            peerConnection: null,
        };
    },
    methods: {
        connectWebSocket() {
            console.log('WebSocket 연결 시도');
            if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
                this.webSocket = new WebSocket('wss://10.10.30.229:1234');

                this.webSocket.onopen = () => {
                    console.log('WebSocket에 연결됨');
                    this.sendMessage({ otherName: this.displayName });
                };

                this.webSocket.onmessage = (event) => {
                    console.log('서버로부터 메시지 수신:', event.data);
                    this.handleIncomingMessage(event);
                };

                this.webSocket.onclose = () => {
                    console.log('WebSocket 연결 종료');
                };

                this.webSocket.onerror = (error) => {
                    console.error('WebSocket 오류 발생:', error);
                };
            } else {
                console.log('WebSocket은 이미 연결되어 있습니다');
            }
        },

        handleIncomingMessage(event) {
            console.log('메시지 처리 시작');
            if (event.data instanceof Blob) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const textData = e.target.result;
                    console.log('Blob 데이터를 텍스트로 읽음:', textData);
                    this.processMessage(textData);
                };
                reader.readAsText(event.data);
            } else {
                this.processMessage(event.data);
            }
        },

        processMessage(data) {
            console.log('메시지 파싱 시작:', data);
            try {
                const parsedData = JSON.parse(data);
                console.log('파싱된 메시지:', parsedData);
                this.handleMessage(parsedData);
            } catch (e) {
                console.error('메시지 파싱 오류:', e);
            }
        },

        checkInputs() {
            console.log('입력 확인 시작');
            if (!this.displayNameInputText) {
                alert('화면에 표시될 이름을 입력해 주세요');
                console.log('이름 입력 없음');
                return;
            }
            this.displayName = this.displayNameInputText;
            console.log('사용자 이름 설정:', this.displayName);
            this.joinRoom();
        },

        showChatRoom(){
            if(!this.isChatRoomOpen)
            {
                this.$refs.chatsRoom.style.display = 'flex';
                this.isChatRoomOpen = true;
                this.$refs.chatButton.style.backgroundColor = 'black';
            }
            else
            {
                this.$refs.chatsRoom.style.display = 'none';
                this.isChatRoomOpen = false;
                this.$refs.chatButton.style.backgroundColor = 'white';
            }
        },

        checkChatInputs() {
            this.chatInputText = this.$refs.chatInput.value;

            if (this.chatInputText != '') {
                this.send_message = this.displayName + " : " + this.chatInputText;
                console.log(this.send_message);
                this.sendMessage({ sendChat: this.send_message });

                console.log(this.send_message.sendChat);
                this.chatsBody = this.$refs.chatsBody;
                const chatElement = document.createElement("p");
                chatElement.id = "chats";
                chatElement.classList.add('myChat');
                chatElement.textContent = this.send_message;
                this.chatsBody.appendChild(chatElement);
                this.chatsBody.scrollTop = this.chatsBody.scrollHeight;

                this.$refs.chatInput.value = '';
            }
        },

        joinRoom() {
            console.log('룸에 참여 중...');
            this.startGetStream();
            this.connectWebSocket();
            this.$refs.meetingRoom.style.display = 'flex';
        },

        showAlert() {
            this.$refs.alertContainer.style.display = 'flex';
        }
        ,

        unShowAlert() {
            this.$refs.alertContainer.style.display = 'none';
        }
        ,

        leaveRoom() {
            this.removeAllChat();
            this.showChatRoom();
            this.sendMessage({ cameraOff: true, voiceOff: true });
            this.$refs.otherCam.style.display = 'none';

            if (this.streamVideo) { this.startCamera(); }
            if (this.streamVoice) { this.startCamera(); }

            this.$refs.meetingRoom.style.display = 'none';
            this.$refs.userCam.classList.remove('setMove');
            this.$refs.chatButton.style.display = 'none';
            this.unShowAlert();
            this.webSocket.close();
            console.log('WebSocket에 연결 해제됨');
        },

        playVideo() {
            console.log('비디오 재생 시작');
            this.$refs.userVideo.play();
            this.$refs.otherVideo.play();
        },

        startGetStream() {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(stream => {
                    this.streamMedia = stream; // 전체 스트림을 저장
            })
        },        

        startCamera() {
            console.log('카메라 시작 또는 종료 시도');
            if (this.streamVideo) {
                // 카메라 종료 처리
                console.log('카메라 종료 처리');

                this.$refs.camButton.style.backgroundColor = 'white';
                this.$refs.userStatus.style.color = 'white';
                this.$refs.userStatus.style.border = '1px solid white';

                const track = this.streamVideo.getTracks();
                track.forEach(track => track.stop());
                this.streamVideo = null;
                this.sendMessage({ cameraOff: true });

                this.$refs.userVideo.style.visibility = 'hidden';
                return;
            }

            // 카메라 시작 처리
            console.log('카메라 시작 처리');

            this.$refs.camButton.style.backgroundColor = 'black';
            this.$refs.userStatus.style.color = 'white';
            this.$refs.userStatus.style.border = '1px solid white';

            navigator.mediaDevices.getUserMedia({ video: { width: { min: 400, max: 1100 }, height: { min: 300, max: 700 } } })
                .then(stream => {
                    console.log('사용자 카메라 스트림 획득');
                    this.streamVideo = stream;
                    this.$refs.userVideo.srcObject = stream;
                    this.sendMessage({ cameraOn: true });
                    this.$refs.userVideo.style.visibility = 'visible';
                    this.playVideo();
                    this.initializePeerConnection(stream);
                })
                .catch(err => {
                    console.error("카메라 오류:", err);
                });
        },

        // 마이크 시작 및 종료
        startVoice() {
            console.log('보이스 시작 또는 종료 시도');

            if (this.streamVoice) {
                // 마이크 종료
                console.log('보이스 종료');
                this.$refs.voiceButton.style.backgroundColor = 'white';
                this.$refs.userStatus_voice.style.display = 'none';

                const tracks = this.streamVoice.getTracks();
                tracks.forEach(track => {
                    track.stop();
                    this.peerConnection.getSenders().forEach(sender => {
                        if (sender.track === track) {
                            this.peerConnection.removeTrack(sender); // PeerConnection에서 트랙 제거
                        }
                    });
                });
                this.streamVoice = null;
                this.sendMessage({ voiceOff: true }); // 보이스 종료 메시지 전송
            } else {
                // 마이크 시작
                console.log('보이스 시작');
                this.$refs.voiceButton.style.backgroundColor = 'black';
                this.$refs.userStatus_voice.style.display = 'flex';

                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        console.log('사용자 보이스 스트림 획득');
                        this.streamVoice = stream;
                        this.initializePeerConnection(stream); // PeerConnection 초기화
                        this.sendMessage({ voiceOn: true }); // 보이스 시작 메시지 전송
                    })
                    .catch(err => {
                        console.error("마이크 오류:", err);
                    });
            }
        },

        initializePeerConnection(stream) {
            console.log('PeerConnection 초기화 중...');
            this.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            stream.getTracks().forEach(track => {
                console.log('비디오 트랙 추가:', track);
                this.peerConnection.addTrack(track, stream);
            });

            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('ICE 후보 추가:', event.candidate);
                    this.sendMessage({ candidate: event.candidate });
                }
            };

            this.peerConnection.ontrack = (event) => {
                const remoteStream = event.streams[0];
                console.log('원격 스트림 수신:', remoteStream);
                this.$refs.otherVideo.srcObject = remoteStream; // 상대방 비디오 연결
                this.$refs.otherVideo.style.display = 'block'; // 상대방 비디오 표시
                this.playVideo();
            };

            this.peerConnection.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', this.peerConnection.iceConnectionState);
            };

            return this.peerConnection.createOffer()
                .then(offer => {
                    console.log('오퍼 생성:', offer);
                    return this.peerConnection.setLocalDescription(offer);
                })
                .then(() => {
                    console.log('로컬 설명 설정 완료');
                    this.sendMessage({ offer: this.peerConnection.localDescription });
                });
        },

        handleMessage(data) {
            try {
                console.log('서버로부터 받은 메시지 처리:', data);

                let message;
                if (typeof data === 'string') {
                    message = JSON.parse(data);
                } else if (data instanceof Object) {
                    message = data;
                }

                if (!message) {
                    console.error('메시지가 정의되지 않았습니다.');
                    return; // 메시지가 정의되지 않은 경우 함수 종료
                }

                if (message.type === 'otherJoin' && message.data === true) {
                    console.log('다른 클라이언트가 연결되었습니다.');
                    this.sendMessage({ otherName: this.displayName });
                    this.$refs.otherCam.style.display = 'block';
                    this.$refs.chatButton.style.display = 'flex';
                    this.$refs.userCam.classList.add('setMove');
                }
                else if (message.type === 'otherJoin' && message.data === false) {
                    this.$refs.otherCam.style.display = 'none';
                    this.$refs.userCam.classList.remove('setMove');
                    alert('다른 클라이언트의 연결이 해제되었습니다.');
                    this.leaveRoom();
                }

                // 메시지 처리
                if (message.otherName)
                {
                    this.otherName = message.otherName;
                }
                else if (message.sendChat) {
                    console.log(message.sendChat);

                    if(!this.isChatRoomOpen)
                    {
                        this.showChatRoom();
                    }

                    this.chatsBody = this.$refs.chatsBody;
                    const chatElement = document.createElement("p");
                    chatElement.id = "chats";
                    chatElement.classList.add('otherChat');
                    chatElement.textContent = message.sendChat;
                    this.chatsBody.appendChild(chatElement);
                    this.chatsBody.scrollTop = this.chatsBody.scrollHeight;
                }
                else if (message.voiceOn) {
                    console.log("상대방이 마이크를 킵니다.");
                    this.$refs.otherStatus_voice.style.display = 'flex';
                }
                else if (message.voiceOff) {
                    console.log("상대방이 마이크를 끕니다..");
                    this.$refs.otherStatus_voice.style.display = 'none';
                }
                else if (message.cameraOn) {
                    console.log("상대방이 카메라를 킵니다.");
                    this.$refs.otherStatus.style.color = 'white';
                    this.$refs.otherStatus.style.border = '1px solid white';
                } else if (message.cameraOff) {
                    this.$refs.otherVideo.srcObject = null; // 상대방 카메라 끄기
                    console.log("상대방이 카메라를 끕니다.");
                    this.$refs.otherStatus.style.color = 'black';
                    this.$refs.otherStatus.style.border = '1px solid black';
                } else if (message.offer) {
                    console.log("오퍼 수신:", message.offer);
                    this.initializeAnsweringPeerConnection(message.offer);
                } else if (message.answer) {
                    console.log("답변 수신:", message.answer);
                    this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
                } else if (message.candidate) {
                    console.log("ICE 후보 수신:", message.candidate);
                    this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate))
                        .then(() => {
                            console.log("ICE 후보 추가 성공");
                        })
                        .catch(err => {
                            console.error("ICE 후보 추가 실패:", err);
                        });
                }
            } catch (error) {
                console.error('메시지 파싱 오류:', error);
            }
        },

        removeAllChat()
        {
            const allChat = document.querySelectorAll(`#chats`);
            allChat.forEach(allChat => allChat.remove());
        },

        initializeAnsweringPeerConnection(offer) {
            console.log('응답용 PeerConnection 초기화 중...');
            this.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('ICE 후보 추가:', event.candidate);
                    this.sendMessage({ candidate: event.candidate });
                }
            };

            this.peerConnection.ontrack = (event) => {
                const remoteStream = event.streams[0];
                console.log('응답 원격 스트림 수신:', remoteStream);
                this.$refs.otherVideo.srcObject = remoteStream; // 상대방 비디오에 스트림 연결
            };

            console.log("오퍼 설정 중...");
            this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
                .then(() => {
                    console.log('오퍼를 로컬 설명으로 설정 중...');
                    return this.peerConnection.createAnswer();
                })
                .then(answer => {
                    console.log('응답 생성:', answer);
                    return this.peerConnection.setLocalDescription(answer);
                })
                .then(() => {
                    console.log('로컬 설명 설정 완료, 응답 전송 중...');
                    this.sendMessage({ answer: this.peerConnection.localDescription });
                })
                .catch(err => {
                    console.error("오퍼 처리 중 오류:", err);
                });
        },

        sendMessage(message) {
            if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
                console.log('메시지 전송:', message);
                this.webSocket.send(JSON.stringify(message));
            } else {
                console.error("WebSocket이 열려 있지 않습니다.");
            }
        },

        unLoadEvent() {
            this.leaveRoom();
        }
    },
    mounted() {
        this.displayName = this.displayNameInputText;

        window.addEventListener('beforeunload', this.unLoadEvent);
    },
    beforeUnmount() {
        window.removeEventListener('beforeunload', this.unLoadEvent);
    }
};
