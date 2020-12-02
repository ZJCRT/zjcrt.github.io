//'use strict';
import cv_service from '../services/cv_service.js';


// In this case, We set width 320, and the height will be computed based on the input stream.
let width = 0;
let height = 0;
// whether streaming video from the camera.
let streaming = false;

// Some HTML elements we need to configure.
let video = null;
let start = null;
let stop = null;
let stream = null;

// setup canvases
let videoImage = document.getElementById('video_canvas');
var videoImageContext = videoImage.getContext("2d");
let videoDom = document.getElementById('video');

let cur_view_id = 0;
// this object will store all extracted aruco corners and so on 
// for camera calibration
let background_scene = {};

// this object will store all extracted aruco corners and so on 
// for initial camera intrinsic estimation
let init_scene = {};

function log(...args) {
    // We pass the arguments to console.log() directly. Not an "arguments array"
    // so that both of log('foo') and log('foo', 'bar') works as we expect.
    console.log(...args);

    // Also we will show the logs in the DOM.
    document.getElementById('webworkerlog').innerHTML = args.join(' ');
}



function initVideo(ev){
    if (!streaming) {
        height = video.videoHeight;
        width = video.videoWidth;
        video.setAttribute("width", width);
        video.setAttribute("height", height);

        videoImageContext.clearRect(0, 0, width, height);

        streaming = true;
        stop.disabled = false;
        playVideo();
    }
}

var constraints = {
    audio: false,
    video: {
        facingMode: "environment",
        width: { min: 320, max: 640 },
        height: { min: 240, max: 480 },
    },
};

function playVideo() {
    if (!streaming) {
        console.warn("Please startup your webcam");
        return;
    }

    start.disabled = true;
}

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
    // load webworker
    cv_service.loadArucoWebWorker();
    video.addEventListener("canplay", initVideo, false);
}

function stopCamera() {
    video.pause();
    video.srcObject = null;
    stream.getVideoTracks()[0].stop();
    start.disabled = false;
    video.removeEventListener("canplay", initVideo);
}

async function takeImage() {
    // get image from video context and send it to the aruco extraction worker
    videoImageContext.drawImage(videoDom, 0, 0);
    const imageData = videoImageContext.getImageData(0, 0, width, height);
    document.getElementById("extract_status").innerHTML = "Start aruco extraction of new frame.";
    let startTime = performance.now();
    // extract aruco markers
    const aruco_points = await cv_service.extractArucoForCalib({"image" : imageData, "view_id" : cur_view_id});

    var time_diff = performance.now() - startTime; //in ms 
    document.getElementById("extract_status").innerHTML = "Finished aruco extraction of new frame in "+time_diff.toFixed(2)+"ms.";
    document.getElementById("laplacian_blur").innerHTML = "Laplacian variance blur level: "+aruco_points.data.payload["laplacian_variance"].toFixed(2);
    
    if (aruco_points.data.payload["has_motion_blur"]) {
        document.getElementById("warning_blur").style.color = 'red';
        document.getElementById("warning_blur").innerHTML = "Motion blur too high. Move slowly!";
    } else {
        cur_view_id += 1;
        document.getElementById("warning_blur").style.color = 'green';
        document.getElementById("warning_blur").innerHTML = "Motion blur ok. Saving image and extracting corners!";
        const view_id = "view_"+aruco_points.data.payload["view_id"]
        // background_scene is global
        background_scene[view_id] = {};
        background_scene[view_id]["obj_pts"] = aruco_points.data.payload["obj_pts_js"];
        background_scene[view_id]["img_pts"] = aruco_points.data.payload["corners_js"];
        background_scene[view_id]["image_size"] = aruco_points.data.payload["image_size"];
    }
}

async function runCameraCalibration() {

    const calibrated_background = await cv_service.calibrateCamera(background_scene);

    const calib_data = calibrated_background.data.payload;

    document.getElementById("camera_matrix").innerHTML = "Camera matrix (fx,fy,cx,cy) "+
        calib_data["camera_matrix"][0][0].toFixed(2) + ", "+
        calib_data["camera_matrix"][1][1].toFixed(2) + ", "+
        calib_data["camera_matrix"][0][2].toFixed(2) + ", "+
        calib_data["camera_matrix"][1][2].toFixed(2);

    document.getElementById("camera_matrix_std").innerHTML = "Camera matrix std dev (s_fx,s_fy,s_cx,s_cy) "+
        calib_data["std_intrinsics_calibration"][0].toFixed(2) + ", "+
        calib_data["std_intrinsics_calibration"][1].toFixed(2) + ", "+
        calib_data["std_intrinsics_calibration"][2].toFixed(2) + ", "+
        calib_data["std_intrinsics_calibration"][3].toFixed(2);   

    document.getElementById("distortion_coeffs").innerHTML = "Distortion coefficients (k1,k2,k3): "+
        calib_data["distortion_coefficients"][0].toFixed(2)+ ", "+
        calib_data["distortion_coefficients"][1].toFixed(2)+ ", "+
        calib_data["distortion_coefficients"][4].toFixed(2);

   var element = document.getElementById("calib_results_div");
    const views = Object.keys(calib_data); // get all views
    views.forEach((view, index) => {
        if (view.includes("view_")) {
            var para = document.createElement("p");               // Create a <p> element
            const std_dev = calib_data[view]["std_extrinsics"];
            para.innerText = view + " reproj error: "+calib_data[view]["per_view_error"]+ " pixel. Extr std dev: [" + 
                std_dev[0].toFixed(4) + "," + std_dev[1].toFixed(4) + "," + 
                std_dev[2].toFixed(4) + "," + std_dev[3].toFixed(4) + "," + 
                std_dev[4].toFixed(4) + "," + std_dev[5].toFixed(4) + "]"; 
            element.appendChild(para);
        }
    });

}

async function takeInitImage() {
    // get image from video context and send it to the aruco extraction worker
    videoImageContext.drawImage(videoDom, 0, 0);
    const imageData = videoImageContext.getImageData(0, 0, width, height);
    document.getElementById("extract_status").innerHTML = "Start aruco extraction of new frame.";
    let startTime = performance.now();
    // extract aruco markers
    const aruco_points = await cv_service.extractArucoForCalib({"image" : imageData, "view_id" : cur_view_id});
    var time_diff = performance.now() - startTime; //in ms 
    document.getElementById("extract_status").innerHTML = "Finished aruco extraction of new frame in "+time_diff.toFixed(2)+"ms.";
    document.getElementById("laplacian_blur").innerHTML = "Laplacian variance blur level: "+aruco_points.data.payload["laplacian_variance"].toFixed(2);

    if (aruco_points.data.payload["has_motion_blur"]) {
        document.getElementById("warning_blur").style.color = 'red';
        document.getElementById("warning_blur").innerHTML = "Motion blur too high. Move slowly!";
    } else {
        cur_view_id += 1;
        document.getElementById("warning_blur").style.color = 'green';
        document.getElementById("warning_blur").innerHTML = "Motion blur ok. Saving image and extracting corners!";

        const view_id = "view_"+aruco_points.data.payload["view_id"]
        // background_scene is global
        init_scene[view_id] = {};
        init_scene[view_id]["obj_pts"] = aruco_points.data.payload["obj_pts_js"];
        init_scene[view_id]["img_pts"] = aruco_points.data.payload["corners_js"];
        init_scene[view_id]["image_size"] = aruco_points.data.payload["image_size"];

        const camera = await cv_service.estimateInitialCamera(init_scene);
        const fx = camera.data.payload["camera_matrix"][0][0];
        const fy = camera.data.payload["camera_matrix"][1][1];
        const cx = camera.data.payload["camera_matrix"][0][2];
        const cy = camera.data.payload["camera_matrix"][1][2];
        document.getElementById('initial_cam_params').innerHTML = 
            "Initial camera parameters: "+fx.toFixed(2)+", "+fy.toFixed(2)+", "+cx.toFixed(2)+", "+cy.toFixed(2);
    }
}

document.querySelector('#startup').addEventListener('click', startup)
document.querySelector('#stop').addEventListener('click', stopCamera)
document.querySelector('#takeimage').addEventListener('click', takeImage)
document.querySelector('#takeinitimage').addEventListener('click', takeInitImage)
document.querySelector('#calibratecamera').addEventListener('click', runCameraCalibration)