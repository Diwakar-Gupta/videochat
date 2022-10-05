//our username 
var name; 
var connectedUser;
  
//connecting to our signaling server 
var conn = new WebSocket('ws://localhost:9090');
  
conn.onopen = function () { 
   console.log("Connected to the signaling server"); 
};
  
//when we got a message from a signaling server 
conn.onmessage = function (msg) { 
   console.log("Got message", msg.data);
	
   var data = JSON.parse(msg.data);
	
   switch(data.type) { 
      case "login": 
         handleLogin(data.success);
         break; 
      //when somebody wants to call us 
      case "offer": 
         handleOffer(data.offer, data.name); 
         break; 
      case "answer": 
         handleAnswer(data.answer); 
         break; 
      //when a remote peer sends an ice candidate to us 
      case "candidate": 
         handleCandidate(data.candidate); 
         break; 
      case "leave": 
         handleLeave(); 
         break; 
      default: 
         break; 
   } 
};
  
conn.onerror = function (err) { 
   console.log("Got error", err); 
};
  
//alias for sending JSON encoded messages 
function send(message) { 
   //attach the other peer username to our messages 
   if (connectedUser) { 
      message.name = connectedUser; 
   } 
	
   conn.send(JSON.stringify(message)); 
};

//****** 
//UI selectors block 
//****** 

var connectionstats = document.querySelector('#connectionstats');

var loginPage = document.querySelector('#loginPage'); 
var usernameInput = document.querySelector('#usernameInput'); 
var loginBtn = document.querySelector('#loginBtn'); 

var callPage = document.querySelector('#callPage'); 
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn'); 

var hangUpBtn = document.querySelector('#hangUpBtn');

var micBtn = document.querySelector('#micBtn');
var videoBtn = document.querySelector('#videoBtn');
  
//hide call page 
callPage.style.display = "none"; 
 
// Login when the user clicks the button 
loginBtn.addEventListener("click", function (event) { 
   name = usernameInput.value; 
	
   if (name.length > 0) { 
      send({ 
         type: "login", 
         name: name 
      }); 
   } 
	
});

function addTracksFromStream(currStream){
    // setup stream listening 
    if(stream == null){
        stream = new MediaStream();

        //displaying local video stream on the page 
       localVideo.srcObject = stream;
    }

    for (const track of currStream.getTracks()) {
        let sender = yourConn.addTrack(track);
        remoteSenders[track.kind] = sender;

        for (const track of stream.getTracks()) {
            if(track.kind === ev.track.kind){
                stream.removeTrack(track);
                break;
            }
        }
        stream.addTrack(track);
    }
}

micBtn.addEventListener("click", function () {
    if(micBtn.checked){
        navigator.getUserMedia({ audio: true }, function (s) {
            addTracksFromStream(s);
        }, function (err) {}); 
    }else{
        stream.getAudioTracks()[0].stop();
        yourConn.removeTrack(remoteSenders.audio);
        stream.removeTrack(stream.getAudioTracks()[0]);
    }
});

videoBtn.addEventListener("click", function () {
    if(videoBtn.checked){
        navigator.getUserMedia({ video: true }, function (s) {
            addTracksFromStream(s);
        }, function (err) {}); 
    }else{
        stream.getVideoTracks()[0].stop();
        yourConn.removeTrack(remoteSenders.video);
        stream.removeTrack(stream.getVideoTracks()[0]);
    }
});
 
function handleLogin(success) { 

    if (success === false) { 
       alert("Ooops...try a different username"); 
    } else { 
       loginPage.style.display = "none"; 
       callPage.style.display = "block";
           
       //********************** 
       //Starting a peer connection 
       //********************** 
         
       //setting local stream object
       navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
       || navigator.mozGetUserMedia || navigator.msGetUserMedia;
          
       //using Google public stun server 
       var configuration = { 
          "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }] 
       }; 
          
       yourConn = new webkitRTCPeerConnection(configuration);
          
       //when a remote user adds stream to the peer connection, we display it 

       yourConn.ontrack = (ev) => {
         if (ev.streams && ev.streams[0]) {
             remoteVideo.srcObject = ev.streams[0];
         } else {
             if (!remoteStream) {
                 remoteStream = new MediaStream();
                 remoteVideo.srcObject = remoteStream;
             }
             for (const track of remoteStream.getTracks()) {
                 if(track.kind == ev.track.kind){
                     remoteStream.removeTrack(track);
                     break;
                 }
             }
             remoteStream.addTrack(ev.track);
           }
       };
       yourConn.onnegotiationneeded = e => yourConn.createOffer()
             .then(offer => yourConn.setLocalDescription(offer))
             .then(() => send({type:'offer', offer:yourConn.localDescription}))
             .catch(console.log);
          
       // Setup ice handling 
       yourConn.onicecandidate = function (event) {
          
          if (event.candidate) { 
             send({ 
                type: "candidate", 
                candidate: event.candidate 
             }); 
          } 
              
       };
    } 
 };

var localVideo = document.querySelector('#localVideo'); 
var remoteVideo = document.querySelector('#remoteVideo');
 
var yourConn; 
var stream;
var remoteSenders = {};
let remoteStream = null;

//initiating a call 
callBtn.addEventListener("click", function () { 
    var callToUsername = callToUsernameInput.value; 
     
    if (callToUsername.length > 0) {
     
       connectedUser = callToUsername;
         
       // create an offer
       yourConn.createOffer(function (offer) { 
          send({ 
             type: "offer", 
             offer: offer 
          }); 
             
          yourConn.setLocalDescription(offer); 
             
       }, function (error) { 
          alert("Error when creating an offer"); 
       });  
    } 
 });

 //when somebody sends us an offer 
function handleOffer(offer, name) { 
    connectedUser = name; 
    yourConn.setRemoteDescription(new RTCSessionDescription(offer));
     
    //create an answer to an offer 
    yourConn.createAnswer(function (answer) { 
       yourConn.setLocalDescription(answer); 
         
       send({ 
          type: "answer", 
          answer: answer 
       }); 
       connectionstats.textContent = `Connected to: ${connectedUser}`;
    }, function (error) { 
       alert("Error when creating an answer"); 
    }); 
 };

 //when we got an answer from a remote user 
function handleAnswer(answer) { 
    yourConn.setRemoteDescription(new RTCSessionDescription(answer));
    connectionstats.textContent = `Connected to: ${connectedUser}`;
 }; 
  
 //when we got an ice candidate from a remote user 
 function handleCandidate(candidate) { 
    yourConn.addIceCandidate(new RTCIceCandidate(candidate)); 
 };

 //hang up 
hangUpBtn.addEventListener("click", function () { 

    send({ 
       type: "leave" 
    });
     
    handleLeave(); 
 });
   
 function handleLeave() { 
    connectedUser = null; 
    remoteVideo.src = null; 
     
    yourConn.close(); 
    yourConn.onicecandidate = null; 
    yourConn.onaddstream = null; 
 };