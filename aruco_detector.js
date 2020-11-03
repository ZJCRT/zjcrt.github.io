// In this case, We set width 320, and the height will be computed based on the input stream.
let width = 320;
let height = 0;

// whether streaming video from the camera.
let streaming = false;

// Some HTML elements we need to configure.
let video = null;
let checkbox = null;
let start = null;
let stop = null;
let stream = null;

let loopIndex = 0;

let inputImage = null;
let markerImage = null;
let dictionary = null;
let parameter = null;
let markerIds = null;
let markerCorners = null;
let rvecs  = null;
let tvecs = null;
let RgbImage = null;
let cameraMatrix  = null;
let distCoeffs = null;

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
    checkbox.disabled = false;
    stop.disabled = false;
    playVideo();
}

function startup() {
    video = document.getElementById("video");
    checkbox = document.getElementById("checkbox");
    start = document.getElementById("startup");
    stop = document.getElementById("stop");

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
    let text = document.getElementById("TestCode").value;
    try {
        eval(text);
        document.getElementById("vdErr").innerHTML = " ";
    } catch(err) {
        document.getElementById("vdErr").innerHTML = err;
    }
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

// inputImage are declared and deleted elsewhere
inputImage = new cv.Mat(height, width, cv.CV_8UC4);
markerImage = new cv.Mat();
//dictionary = new cv.Dictionary(0);
//dictionary.markerSize = 3;
//dictionary.maxCorrectionBits = 1;
//dictionary.bytesList.delete();
//// dictionary.bytesList = cv.matFromArray(1, 2, cv.CV_8UC4, [197, 71,  81, 248, 226, 163, 31, 138]);
//dictionary.bytesList = cv.matFromArray(1, 2, cv.CV_8UC4, [177, 0, 135, 0, 70, 1, 112, 1]);
let dictionary = new cv.Dictionary(cv.DICT_6X6_250);
let parameter = new cv.DetectorParameters();

// parameter.adaptiveThreshWinSizeMin = 3,
parameter.adaptiveThreshWinSizeMin = 23;
// parameter.adaptiveThreshWinSizeMax = 23,
parameter.adaptiveThreshWinSizeMax = 23;
parameter.adaptiveThreshWinSizeStep = 10,
parameter.adaptiveThreshConstant = 7;
// parameter.minMarkerPerimeterRate = 0.03;
parameter.minMarkerPerimeterRate = 0.1;
parameter.maxMarkerPerimeterRate = 4;
parameter.polygonalApproxAccuracyRate = 0.03;
parameter.minCornerDistanceRate = 0.05;
parameter.minDistanceToBorder = 3;
parameter.minMarkerDistanceRate = 0.05;
parameter.cornerRefinementMethod = cv.CORNER_REFINE_SUBPIX; // CORNER_REFINE_NONE
parameter.cornerRefinementWinSize = 5;
parameter.cornerRefinementMaxIterations = 10;
parameter.cornerRefinementMinAccuracy = 0.1;
parameter.markerBorderBits = 1;
// parameter.perspectiveRemovePixelPerCell = 4;
parameter.perspectiveRemovePixelPerCell = 2;
parameter.perspectiveRemoveIgnoredMarginPerCell = 0.13;
parameter.maxErroneousBitsInBorderRate = 0.35;
parameter.minOtsuStdDev = 5.0;
parameter.errorCorrectionRate = 0.6;

markerIds = new cv.Mat();
markerCorners  = new cv.MatVector();
rvecs = new cv.Mat();
tvecs = new cv.Mat();
RgbImage = new cv.Mat();
let fx = 1000;
let fy = 1000;
let cx = 1920.0 / 2.0;
let cy = 1080.0 / 2.0;

cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, 
                                [9.6635571716090658e+02, 0., 2.0679307818305685e+02, 0.,
                                 9.6635571716090658e+02, 2.9370020600555273e+02, 0., 0., 1.]);
let distCoeffs = cv.matFromArray(5, 1, cv.CV_64F, [0.0,0.0,0.0,0.0,0.0]);
// "video" is the id of the video tag
let cap = new cv.VideoCapture("video");
loopIndex = setInterval(
    function(){
        cap.read(inputImage);
        if (checkbox.checked) {

            cv.cvtColor(inputImage, RgbImage, cv.COLOR_RGBA2RGB, 0);
            cv.detectMarkers(RgbImage, dictionary, markerCorners, markerIds, parameter);

            if (markerIds.rows > 0) {
                cv.drawDetectedMarkers(RgbImage, markerCorners, markerIds);
                cv.estimatePoseSingleMarkers(markerCorners, 0.1, cameraMatrix, distCoeffs, rvecs, tvecs);
                for(let i=0; i < markerIds.rows; ++i) {
                    let rvec = cv.matFromArray(3, 1, cv.CV_64F, [rvecs.doublePtr(0, i)[0], rvecs.doublePtr(0, i)[1], rvecs.doublePtr(0, i)[2]]);
                    let tvec = cv.matFromArray(3, 1, cv.CV_64F, [tvecs.doublePtr(0, i)[0], tvecs.doublePtr(0, i)[1], tvecs.doublePtr(0, i)[2]]);
                    cv.drawAxis(RgbImage, cameraMatrix, distCoeffs, rvec, tvec, 0.1);
                    rvec.delete();
                    tvec.delete();
                }
            }
            cv.imshow("canvasOutput", RgbImage);
        }
        else
            cv.imshow("canvasOutput", inputImage);
    }, 33);