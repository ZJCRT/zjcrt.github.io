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

let dictionary = null;
let parameter = null;
let inputImage = null;
let markerImage = null;
let RgbImage = null;
let cap = null;
let markerCorners = null;
let markerIds = null;
let laplacianImage = null;
let cameraMatrix = null;
let distCoeffs = null;
let grayImage = null;
let rvecs = null;
let tvecs = null;

let run_interval = 30; // fps

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
        stop.disabled = false;
        playVideo();
    }
}

var constraints = {
    audio: false,
    video: {
        facingMode: "environment",
        width: { min: 640, max: 1920 },
        height: { min: 480, max: 1080 },
    },
};

function startup() {
    video = document.getElementById("video");
    start = document.getElementById("startup");
    stop = document.getElementById("stop");
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

    video.addEventListener("canplay", initVideo, false);
}

function aruco() {
    // inputImage are declared and deleted elsewhere
    markerImage = new cv.Mat();
    dictionary = new cv.aruco_Dictionary(cv.DICT_ARUCO_ORIGINAL);
    parameter = new cv.DetectorParameters();

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
    let fx = 1.2*width;
    let fy = 1.2*width;
    let cx = width / 2.0;
    let cy = height / 2.0;

    cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, 
                                    [fx, 0., cx, 
                                     0., fy, cy, 
                                     0., 0., 1.]);
    distCoeffs = cv.matFromArray(5, 1, cv.CV_64F, [0.0,0.0,0.0,0.0,0.0]);
    // "video" is the id of the video tag
    loopIndex = setInterval(
        function(){
            // disable video showing on left side
            //document.getElementById("video").style.display="none";

            cap = new cv.VideoCapture("video");
            cap.read(inputImage);

            let startTime = performance.now();

            cv.cvtColor(inputImage, RgbImage, cv.COLOR_RGBA2RGB, 0);
            cv.detectMarkers(RgbImage, dictionary, markerCorners, markerIds, parameter);

            let endTime = performance.now();    

            if (markerIds.rows > 0) {
                cv.drawDetectedMarkers(RgbImage, markerCorners, markerIds);
                cv.estimatePoseSingleMarkers(markerCorners, 0.1, cameraMatrix, distCoeffs, rvecs, tvecs);
                for(let i=0; i < markerIds.rows; ++i) {
                    let rvec = cv.matFromArray(3, 1, cv.CV_64F, [rvecs.doublePtr(0, i)[0], rvecs.doublePtr(0, i)[1], rvecs.doublePtr(0, i)[2]]);
                    let tvec = cv.matFromArray(3, 1, cv.CV_64F, [tvecs.doublePtr(0, i)[0], tvecs.doublePtr(0, i)[1], tvecs.doublePtr(0, i)[2]]);
                    cv.drawAxis(RgbImage, cameraMatrix, distCoeffs, rvec, tvec, 0.1);
                    let rotationMat = new cv.Mat();
                    cv.Rodrigues(rvec, rotationMat);
                    rotationMat.delete();
                    rvec.delete();
                    tvec.delete();
                }
            }
            
            var timeDiff = endTime - startTime; //in ms 
            document.getElementById("framerate").innerHTML = (1000.0 / timeDiff).toFixed(2) + " FPS";
            document.getElementById("nrdetectedmarkers").innerHTML = markerIds.rows;

            cv.imshow("canvasOutput", RgbImage);
        }, run_interval);

}

function laplacian() {
    // inputImage are declared and deleted elsewhere
    inputImage = new cv.Mat(height, width, cv.CV_8UC4);
    grayImage = new cv.Mat();
    laplacianImage = new cv.Mat();
    // "video" is the id of the video tag
    loopIndex = setInterval(
        function(){
            // disable video showing on left side
            // disable video showing on left side
            document.getElementById("video").style.display="none";
            let cap = new cv.VideoCapture("video");
            cap.read(inputImage);

            let startTime = performance.now();

            cv.cvtColor(inputImage, grayImage, cv.COLOR_RGBA2GRAY, 0); 
            cv.Laplacian(grayImage, laplacianImage, cv.CV_8UC1)

            let endTime = performance.now();    
            
            let timeDiff = endTime - startTime; //in ms 
            document.getElementById("framerate").innerHTML = (1000.0 / timeDiff).toFixed(2) + " FPS";

            cv.imshow("canvasOutput", laplacianImage);
        
        }, run_interval);
        

}

// function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
//  }

 function  playVideo() {
    if (!streaming) {
        console.warn("Please startup your webcam");
        return;
    }

    inputImage = new cv.Mat(height, width, cv.CV_8UC4);


    start.disabled = true;
    // if (document.getElementById("aruco_test_content")) {
    //     aruco();
    // } else if (document.getElementById("laplacian_test_content")) {
    //     laplacian();
    // }
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
    if (cap != null && !cap.isDeleted()) {
        cap.delete();
        cap = null;
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


// function onReady() {
//     console.log("hier")
//     cv["onRuntimeInitialized"] = () => {
//         console.log("hier1")
//         document.getElementById("startup").disabled = false;
//     }
//     if (window.cv instanceof Promise) {
//         document.getElementById("startup").disabled = false;
//     }
// }
// if (typeof cv !== 'undefined') {
//     onReady();
// } else {
//     document.getElementById("opencvjs").onload = onReady;
// }


// // globally export these function to use in onclick
// window.startup = startup
// window.stopCamera = stopCamera

