//'use strict';
import cv_service from '../services/cv_service.js';

//video dimensions
let width = 0;
let height = 0;

// whether streaming video from the camera.
let streaming = false;

// Some HTML elements we need to configure.
let videocanvas = document.getElementById("videocanvas");
let video =  document.getElementById("video");
let stream = null;
let canvas = document.getElementById('threejs_canvas');

var constraints = {
    audio: false,
    video: {
        facingMode: "environment",
        width: { ideal: 640 },
        height: { ideal: 480 } 
    },
};

let debugText = "";
function startup() {


    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)

    //debugText+= `User Agent: ${navigator.userAgent}<br/>`;
    debugText+= `Initial Screen orientation: ${window.screen.orientation.type}<br/>`;
    
    //increase video resolution on mobile device
    if( /Android|iPhone|iPad/i.test(navigator.userAgent) ) {
        let orientation = window.screen.orientation.type;
        //Browser-Contentpane size: window.innerWidth; window.innerHeight;

        if (orientation === "landscape-primary" || orientation === "landscape-secondary") {
            width = 1920;
            height = 1080;
        } else if (orientation === "portrait-secondary" || orientation === "portrait-primary") {
            //width = window.innerHeight;
            //height = window.innerWidth;
            width = 1920;
            height = 1080;
        } else if (orientation === undefined) {
            console.log("ORIENTATION API NOT SUPPORTED"); 
            width = 1920;
            height = 1080;
        }        
    } else {
        //Fallback for Webcams
        width = 640;
        height = 480;
    }

            
    constraints.video.width=width;
    constraints.video.height=height;
    
    // start camera
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(s) {
            stream = s;
            video.srcObject = stream;
            video.play();
        })
        .catch(function(err) {
            console.log("An error occured! " + err);
    });

    // load webworker
    cv_service.loadArucoWebWorker();
    video.addEventListener("canplay", initVideo, false);

    // request fullscreen works only triggered by the user
    // const div = document.getElementById("guide_content");
    // if (div.requestFullscreen) 
    //     div.requestFullscreen();
    // else if (div.webkitRequestFullscreen) 
    //     div.webkitRequestFullscreen();
    // else if (div.msRequestFullScreen) 
    //   div.msRequestFullScreen();
}

function initVideo(ev){
    if (!streaming) {

        video.setAttribute("width", width);
        video.setAttribute("height", height);

        debugText+= `Initial Video: ${video.videoWidth}x${video.videoHeight}<br/>`;
        streaming = true;
        playVideo();
        displayDialog("Fullscreen Test", debugText, "Take Image");
    }
}

function playVideo() {
    if (!streaming) {
        console.warn("Please startup your webcam");
        return;
    }
}


function stopCamera() {
    document.getElementById("threejs_canvas").getContext("2d").clearRect(0, 0, canvas.clientWidth, canvac.clientHeight);    

    
    video.pause();
    video.srcObject = null;
    stream.getVideoTracks()[0].stop();
    start.disabled = false;
    video.removeEventListener("canplay", initVideo);
}

function displayOverlay(text){
    document.getElementById("overlayWButton").style.visibility="hidden";
    document.getElementById("overlay").style.visibility="visible";
    document.getElementById("overlayText").innerHTML = text;
}

function displayDialog(title, text, button){
    document.getElementById("overlayWButton").style.visibility="visible";
    document.getElementById("overlay").style.visibility="hidden";
    document.getElementById("overlayWBTitle").innerHTML = title;
    document.getElementById("overlayWBText").innerHTML = text;
    document.getElementById("overlayWBButton").innerHTML = button;
}

function hideOverlay(){
    document.getElementById("overlay").style.visibility="hidden";
    document.getElementById("overlayWButton").style.visibility="hidden";
}

function handleClick(){
    hideOverlay();
    //guide.startGuide();

}

document.body.addEventListener("load",startup(), false); //autostart video
window.addEventListener("beforeunload",stopCamera);
//document.getElementById ("overlayWBButton").addEventListener ("click", handleClick);
let button = document.getElementById ("overlayWBButton");
button.addEventListener ("click", takeImageAndDownload);

//############

function takeImageAndDownload(){
    // Create a canvas element
    let canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Get the drawing context
    let ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight); 
    //const imageData = ctx.getImageData(0, 0, 1080, 1920);

    //create img
    var img = document.createElement('img');
    img.setAttribute('src', canvas.toDataURL());

    var myWindow = window.open("", "MsgWindow");
    myWindow.document.write(
        `<h1>took image with ${canvas.width}x${canvas.height}<br/>
        <a href="${img.src}" download>Download</a><br/></h1>
    `)
    myWindow.document.body.appendChild(canvas);    
}

