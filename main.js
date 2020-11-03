// import function
import laplacian from './laplacian_loop.js'
import aruco from './aruco_detector_loop.js'



// In this case, We set width 320, and the height will be computed based on the input stream.
let width = 0;
let height = 0;
let size_initialized = false;
// whether streaming video from the camera.
let streaming = false;

// Some HTML elements we need to configure.
let video = null;
let start = null;
let stop = null;
let stream = null;

let loopIndex = 0;

function read(a) {
    alert(a);
}

function load() {
    let canvas = document.getElementById('canvasOutput');
    let dataURL = canvas.toDataURL();
    qrcode.callback = read;
    qrcode.decode(dataURL);
}

function initVideo(ev){
    if (!streaming) {
        height = video.videoHeight;
        width = video.videoWidth;
        video.setAttribute("width", width);
        video.setAttribute("height", height);

        document.getElementById("imgsize").innerHTML = "Video size (w,h): " + width + " , " + height + " pixel";

        streaming = true;
    }
    stop.disabled = false;
    playVideo();
}

function startup(mode) {
    video = document.getElementById("video");
    start = document.getElementById("startup");
    stop = document.getElementById("stop");
    // start camera
    navigator.mediaDevices.getUserMedia({ video: {facingMode: "environment"}, audio: false })
        .then(function(s) {
            stream = s;
            video.srcObject = stream;
            video.play();
        })
        .catch(function(err) {
            console.log("An error occured! " + err);
    });

    video.addEventListener("canplay", initVideo, false);
}

function playVideo() {
    if (!streaming) {
        console.warn("Please startup your webcam");
        return;
    }
    // let text = document.getElementById("TestCode").value;
    // try {
    //     eval(text);
    //     document.getElementById("vdErr").innerHTML = " ";
    // } catch(err) {
    //     document.getElementById("vdErr").innerHTML = err;
    // }
    start.disabled = true;
    if (document.getElementById("aruco_test_content")) {
        laplacian(height, width);
    } else if (document.getElementById("laplacian_test_content")) {
        aruco(heigh, width)
    }
}

function stopCamera() {
    clearInterval(loopIndex);
    if (inputImage != null && !inputImage.isDeleted()) {
        inputImage.delete();
        inputImage = null;
    }
    if (markerImage != null && !markerImage.isDeleted()) {
        markerImage.delete();
        markerImage = null;
    }
    if (dictionary != null && !dictionary.isDeleted()) {
        dictionary.delete();
        dictionary = null;
    }
    if (parameter != null && !parameter.isDeleted()) {
        parameter.delete();
        parameter = null;
    }
    if (markerIds != null && !markerIds.isDeleted()) {
        markerIds.delete();
        markerIds = null;
    }
    if (markerCorners != null && !markerCorners.isDeleted()) {
        markerCorners.delete();
        markerCorners = null;
    }
    if (rvecs != null && !rvecs.isDeleted()) {
        rvecs.delete();
        rvecs = null;
    }
    if (tvecs != null && !tvecs.isDeleted()) {
        tvecs.delete();
        tvecs = null;
    }
    if (RgbImage != null && !RgbImage.isDeleted()) {
        RgbImage.delete();
        RgbImage = null;
    }
    if (cameraMatrix != null && !cameraMatrix.isDeleted()) {
        cameraMatrix.delete();
        cameraMatrix = null;
    }
    if (distCoeffs != null && !distCoeffs.isDeleted()) {
        distCoeffs.delete();
        distCoeffs = null;
    }
    if (grayImage != null && !grayImage.isDeleted()) {
        grayImage.delete();
        grayImage = null;
    }
    if (laplacianImage != null && !laplacianImage.isDeleted()) {
        laplacianImage.delete();
        laplacianImage = null;
    }
    document.getElementById("canvasOutput").getContext("2d").clearRect(0, 0, width, height);
    video.pause();
    video.srcObject = null;
    stream.getVideoTracks()[0].stop();
    start.disabled = false;
    video.removeEventListener("canplay", initVideo);
}

function onReady() {
    document.getElementById("startup").disabled = false;
}

if (typeof cv !== 'undefined') {
    onReady();
} else {
    document.getElementById("opencvjs").onload = onReady;
}

