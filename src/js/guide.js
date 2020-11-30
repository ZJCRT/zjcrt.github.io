//'use strict';
import cv_service from '../services/cv_service.js';

//video dimensions
let width = 0;
let height = 0;

// whether streaming video from the camera.
let streaming = false;

// Some HTML elements we need to configure.
let video =  document.getElementById("video");;
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

function startup() {
    updateDimensions();

    //increase video resolution on mobile device
    if( /Android|iPhone|iPad/i.test(navigator.userAgent) ) {
        constraints.video.width=width;
        constraints.video.height=height;
    }
    

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

        let aspect = width/height;

        video.setAttribute("width", width);
        video.setAttribute("height", height);
        console.dir(`Dimensions Video: ${video.videoWidth}x${video.videoHeight}`);

        streaming = true;
        playVideo();
    }
}

function playVideo() {
    if (!streaming) {
        console.warn("Please startup your webcam");
        return;
    }
}

function updateDimensions(){
    let orientation = window.screen.orientation.type;
    console.log(`orientation: `+orientation);

    if (orientation === "landscape-primary" || orientation === "landscape-secondary") {
        width = window.innerWidth;
        height = window.innerHeight;
    } else if (orientation === "portrait-secondary" || orientation === "portrait-primary") {
        width = window.innerHeight;
        height = window.innerWidth;
    } else if (orientation === undefined) {
        console.log("ORIENTATION API NOT SUPPORTED"); 
        width = window.innerWidth;
        height = window.innerHeight;
    }

    console.dir(`Dimensions Window: ${window.innerWidth}x${window.innerHeight}` );
    console.dir(`Resulting Dimensions: ${width}x${height}`)
}


function stopCamera() {
    document.getElementById("threejs_canvas").getContext("2d").clearRect(0, 0, canvas.clientWidth, canvac.clientHeight);    

    
    video.pause();
    video.srcObject = null;
    stream.getVideoTracks()[0].stop();
    start.disabled = false;
    video.removeEventListener("canplay", initVideo);
}





document.body.addEventListener("load",startup(), false); //autostart video
window.addEventListener("beforeunload",stopCamera);