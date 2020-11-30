//'use strict';
import cv_service from '../services/cv_service.js';

// Video dimensions
let width = 0;
let height = 0;

// whether streaming video from the camera.
let streaming = false;

// Some HTML elements we need to configure.
let video = null;
let stream = null;

var constraints = {
    audio: false,
    video: {
        facingMode: "environment",
        width: { min: 320, max: 640 },
        height: { min: 240, max: 480 },
    },
};

function startup() {
    video = document.getElementById("video");
    
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
}

function initVideo(ev){
    if (!streaming) {
        height = video.videoHeight;
        width = video.videoWidth;
        video.setAttribute("width", width);
        video.setAttribute("height", height);

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

document.body.addEventListener("load",startup(), false); //autostart video