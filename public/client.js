(async () => {
    // GET HTML ELEMENTS
    const loginPage = document.querySelector('#login-page');
    const usernameInput = document.querySelector('#username');
    const loginButton = document.querySelector('#login');
    const callPage = document.querySelector('#call-page');
    const theirUsernameInput = document.querySelector('#their-username');
    const callButton = document.querySelector('#call');
    const hangUpButton = document.querySelector('#hang-up');
    const yourVideo = document.querySelector('#yours');
    const theirVideo = document.querySelector('#theirs');
    const sendButton = document.querySelector('#send');
    const messageInput = document.querySelector('#message');
    const fileName = document.querySelector('#fileName');
    const sendButtonFile = document.querySelector('#sendFile');
    const readyText = document.querySelector('#ready');
    const sharePage = document.querySelector('#share-page');
    const shareButton = document.querySelector('#share-button');
    const closeButton = document.querySelector('#close-share');
    const received = document.querySelector('#received');

    var currentFile = [], currentFileSize = 0, currentFileMeta, percentage;
    const CHUNK_MAX = 16000;

    const configuration = {
        iceServers: [{
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:a.relay.metered.ca:80",
            username: "4a4ce13533e312eede710b26",
            credential: "WFLIOlBlYV5ZUlEZ",
        },
        {
            urls: "turn:a.relay.metered.ca:80?transport=tcp",
            username: "4a4ce13533e312eede710b26",
            credential: "WFLIOlBlYV5ZUlEZ",
        },
        {
            urls: "turn:a.relay.metered.ca:443",
            username: "4a4ce13533e312eede710b26",
            credential: "WFLIOlBlYV5ZUlEZ",
        },
        {
            urls: "turn:a.relay.metered.ca:443?transport=tcp",
            username: "4a4ce13533e312eede710b26",
            credential: "WFLIOlBlYV5ZUlEZ",
        },
        ]
    };

    const connection = new WebSocket('wss://' + window.location.href.slice(8, window.location.href.length));

    // GET MEDIA DEVICES
    if (!("mediaDevices" in navigator) || !("RTCPeerConnection" in window)) {
        alert("Sorry, your browser does not support WebRTC. 😞");
        return;
    }

    // INIT YOURS
    const yours = new RTCPeerConnection(configuration);
    const dc = yours.createDataChannel("chat", {
        ordered: true,
        reliable: true,
        negotiated: true,
        id: 789
    });

    dc.onopen = () => {
        console.log(dc, "Il canale dati è pronto per la trasmissione dei dati 🚀")
    }

    dc.onmessage = e => {
        try {
            var message = JSON.parse(e.data);

            console.log("dato " + message.data);

            switch (message.type) {
                case "start":
                    console.log("Receiving file: ", message.data);
                    fileName.innerHTML += (" " + message.data);
                    break;
                case "end":
                    saveFile(currentFileMeta, currentFile);
                    break;

                case "messaggio":
                    console.log("Messaggio ricevuto:", message.data);
                    received.innerHTML += "recv: " + message.data + " 😃<br />";
                    received.scrollTop = received.scrollHeight;
                    break;

                case "file":
                    currentFile.push(atob(message.data));
                    currentFileMeta = base64ToBlob(message.data, '');
                    console.log(currentFileMeta.size);
                    currentFileSize += currentFile[currentFile.length - 1].length;
                    console.log("curfilesize:" + currentFileSize);
                    percentage = Math.floor((currentFileSize / message.size) * 100);
                    console.log("percentage " + percentage);
                    statusText.innerHTML = " Receiving... " + percentage + "%";
                    break;
            }
        } catch (error) {
            // Assume this is file content
            console.log(error);
        }
    };

    dc.onerror = error => {
        console.log("Messaggio di errore ricevuto: ", error.data);
    };

    dc.close = () => {
        console.log("Il canale dati si è chiuso 🛑");
    };

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    for (const track of stream.getTracks()) {
        yours.addTrack(track, stream);
    }

    yourVideo.srcObject = stream;
    yours.addEventListener('track', (e) => {
        if (e.streams?.length) {
            theirVideo.srcObject = e.streams[0];
        }
    });

    yours.onicecandidate = e => {
        if (e.candidate) {
            const theirUsername = theirUsernameInput.value;
            console.log('SEND CANDIDATE', e.candidate);
            send({
                type: 'candidate',
                candidate: e.candidate,
                name: theirUsername
            });
        }
    }

    // ADD LISTENERS
    loginButton.addEventListener('click', () => {
        const username = usernameInput.value;
        if (username) {
            console.log('SEND LOGIN', username);
            send({
                type: "login",
                name: username
            });
        }
    });

    callButton.addEventListener('click', async () => {
        const theirUsername = theirUsernameInput.value;
        if (theirUsername) {
            const offer = await yours.createOffer();
            await yours.setLocalDescription(offer);
            console.log('SEND OFFER', offer, theirUsername);
            send({
                type: "offer",
                offer: offer,
                name: theirUsername
            });
        }
    });

    sendButton.addEventListener("click", function (event) {
        var val = messageInput.value;
        received.innerHTML += usernameInput.value + ": " + val + " 😄<br />";
        received.scrollTop = received.scrollHeight;
        val = {
            type: "messaggio",
            data: messageInput.value
        }
        dc.send(JSON.stringify(val));
        messageInput.value = "";
        messageInput.innerHTML = "";
    });

    // button che indica l'inizio dello start e il nome del file
    sendButtonFile.addEventListener("click", function (event) {
        var files = document.querySelector('#files').files;
        if (files.length > 0) {
            dc.send(JSON.stringify({
                type: "start",
                data: files[0].name
            }));
            sendFile(files[0]);
        }
    });

    hangUpButton.addEventListener('click', async () => {
        const theirUsername = theirUsernameInput.value;
        const username = usernameInput.value;
        console.log('SEND Hang UP');
        send({
            type: "leave",
            name: theirUsername,
            theirusername: username
        });
    });
    // Ottieni riferimenti agli elementi HTML


    // Aggiungi un gestore di eventi al pulsante "Condivi"
    shareButton.addEventListener('click', () => {
        // Controlla lo stato attuale della Share Page
        if (sharePage.style.display === 'none' || sharePage.style.display === '') {
            // Se la Share Page è nascosta, mostrala
            sharePage.style.display = 'block';
        } else {
            // Altrimenti, nascondila
            sharePage.style.display = 'none';
        }
    });


    const onLogin = (success) => {
        console.log('ON LOGIN', success);
        loginPage.style.display = "none";
        callPage.style.display = "block";
        sharePage.style.display = "none";
    };

    const onOffer = async (offer, name) => {
        console.log('ON OFFER', offer, name);
        if (offer && name) {
            await yours.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await yours.createAnswer();
            await yours.setLocalDescription(answer);
            console.log('SEND ANSWER', answer, name);
            send({
                type: 'answer',
                answer: answer,
                name: name
            });
        } else {
            console.warn('OFFER UNDEFINED');
        }
    };

    const onAnswer = async (answer) => {
        console.log('ON ANSWER', answer);
        if (answer) {
            await yours.setRemoteDescription(new RTCSessionDescription(answer));
        } else {
            console.warn('ANSWER UNDEFINED');
        }
    };

    const onCandidate = (candidate) => {
        console.log('ON CANDIDATE', candidate);
        if (candidate) {
            yours.addIceCandidate(candidate);
        } else {
            console.warn('CANDIDATE UNDEFINED');
        }
    };

    const onLeave = () => {
        yours.close();
        theirVideo.srcObject = null;
        yourVideo.srcObject = null;
    };

    connection.onopen = () => {
        console.log('CONNECTED');
    };

    connection.onerror = (e) => {
        console.error(e);
    };

    connection.onmessage = (message) => {
        const data = JSON.parse(message.data);
        switch (data.type) {
            case "login":
                onLogin(data.success);
                break;
            case "offer":
                onOffer(data.offer, data.name);
                break;
            case "answer":
                onAnswer(data.answer);
                break;
            case "candidate":
                onCandidate(data.candidate);
                break;
            case "leave":
                onLeave();
                break;
            default:
                break;
        }
    };

    function send(message) {
        connection.send(JSON.stringify(message));
    }

    // in qualche modo dobbiamo trasformare il binario in stringa
    // btoa = binary to ascii
    // Uint8Array = represents un array di 8-bit
    function arrayBufferToBase64(buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // Blob = Binary Large Object
    function base64ToBlob(b64Data, contentType) {
        contentType = contentType || '';
        var byteArrays = [], byteNumbers, slice;
        for (var i = 0; i < b64Data.length; i++) {
            slice = b64Data[i];
            byteNumbers = aArray(slice.length);
            for (var n = 0; n < slice.length; n++) {
                byteNumbers[n] = slice.charCodeAt(n);
            }
            var byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        var blob = new Blob(byteArrays, { type: contentType });
        return blob;
    }

    function sendFile(file) {
        var reader = new FileReader();
        reader.onloadend = function (evt) {
            if (evt.target.readyState == FileReader.DONE) {
                var buffer = reader.result,
                    start = 0,
                    end = 0,
                    last = false;

                function sendChunk() {
                    end = start + CHUNK_MAX;
                    if (end > file.size) {
                        end = file.size;
                        last = true;
                    }

                    var percentage = Math.floor((end / file.size) * 100);
                    statusText.innerHTML = "Sending... " + percentage + "%";
                    dc.send(JSON.stringify({ type: "file", data: arrayBufferToBase64(buffer.slice(start, end)), size: file.size }));

                    // Se questo è l'ultimo pezzo invia il nostro messaggio finale, altrimenti continua a inviare
                    if (last === true) {
                        dc.send(JSON.stringify({
                            type: "end",
                            data: fileName.value
                        }));
                    } else {
                        start = end;

                        // Throttle the sending to avoid flooding
                        setTimeout(function () {
                            sendChunk();
                        }, 100);
                    }
                }
                sendChunk();
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // funzione che crea elementi html con link per scaricare
    function saveFile(meta, data) {
        var blob = base64ToBlob(data, meta.type);
        var link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName.innerHTML.replace("Nome File: ", "");
        link.innerText = "Clicca per scaricare";
        sharePage.appendChild(document.createElement('br'));
        sharePage.appendChild(link);
        link.click();
    }
})();
