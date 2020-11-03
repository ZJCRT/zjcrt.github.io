// In this case, We set width 320, and the height will be computed based on the input stream.
let width = 320;
let height = 240;

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
        height = video.videoHeight / (video.videoWidth/width);
        video.setAttribute("width", width);
        video.setAttribute("height", height);
        streaming = true;
    }
    stop.disabled = false;
    playVideo();
}

function startup() {
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
    main();
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





function main() {
    // inputImage are declared and deleted elsewhere
    inputImage = new cv.Mat(height, width, cv.CV_8UC4);
    grayImage = new cv.Mat();
    laplacianImage = new cv.Mat();

    // "video" is the id of the video tag
    loopIndex = setInterval(
        function(){
            // disable video showing on left side

            let cap = new cv.VideoCapture("video");
            cap.read(inputImage);
            startTime = performance.now();
            cv.cvtColor(inputImage, grayImage, cv.COLOR_RGBA2GRAY, 0); 
            cv.Laplacian(grayImage, laplacianImage, cv.CV_8UC1)

            endTime = performance.now();    
            
            var timeDiff = endTime - startTime; //in ms 
            document.getElementById("framerate").innerHTML = (1000.0 / timeDiff).toFixed(2) + " FPS";

            cv.imshow("canvasOutput", laplacianImage);
        }, 33);
}