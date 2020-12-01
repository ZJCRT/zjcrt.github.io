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

let loopIndex = 0;
let init_scene = {};

let field_of_view_render_cam = 45;
let camera_initialized = false;
let camera_matrix = null;
let dist_coeffs = null;
let run_interval = 25;
let render_cam_initialized = false;
// setup a basic scene
let scene = new THREE.Scene();

let threejsImage = document.getElementById('threejs_canvas');
let videoImage = document.getElementById('video_canvas');
var videoImageContext = videoImage.getContext("2d");

let renderer = new THREE.WebGLRenderer({canvas: threejsImage, alpha: true } ); 
let videoDom = document.getElementById('video');
renderer.shadowMap.enabled = true;

let render_camera = null;
//// This is where we create our off-screen render target ////
const geometry = new THREE.BoxGeometry(0.015,0.015,0.015);
const glass_area = new THREE.BoxGeometry(0.015,0.015,0.015);

const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
cube.position.set(0,0,0);
scene.add(cube);

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

        document.getElementById("imgsize").innerHTML = "Video size (w,h): " + width + " , " + height + " pixel";
        videoImageContext.clearRect(0, 0, width, height);

        streaming = true;
        stop.disabled = false;
        playVideo();
    
    }
}

// send image data to the webworker
async function estimatePoseAruco() {
    videoImageContext.drawImage(videoDom, 0, 0);
    const image_data = videoImageContext.getImageData(0, 0, width, height);
    const pose_payload = await cv_service.poseEstimation(
        {"image" : image_data, "camera_matrix" : camera_matrix, "dist_coeffs" : dist_coeffs});
    const pose = pose_payload.data.payload;
    const quat_xyzw = pose["quaternion_xyzw"];
    const quaternion = new THREE.Quaternion().set(quat_xyzw[0],quat_xyzw[1],quat_xyzw[2],quat_xyzw[3]).normalize();

    console.log(pose["position"])
    console.log(pose["quat_xyzw"])

    render_camera.position.set(pose["position"][0], pose["position"][1], pose["position"][2]);        
    render_camera.quaternion.copy(quaternion);
}

var constraints = {
    audio: false,
    video: {
        facingMode: "environment",
        width: { min: 320, max: 640 },
        height: { min: 240, max: 480 },
    },
};

function renderWorker() {
    // Processing image
    loopIndex = setInterval(
        function(){ 
            if (!render_cam_initialized) {
                render_camera = new THREE.PerspectiveCamera(field_of_view_render_cam, width/height, 0.01, 2);
                renderer.setSize(width, height);
                render_cam_initialized = true;
                start.disabled = true;
            }
            if (camera_initialized) {
                document.getElementById("log").innerHTML = "Tracking!"
                document.getElementById("log").style.color = "green";
                // hide video
                //document.getElementById("video").style.display = "none";
                estimatePoseAruco();
                render(); 
            }
        }, run_interval);
}

function render() {
    renderer.setClearColor(0x00ff00, 0);
    renderer.render(scene, render_camera);
    requestAnimationFrame(render);
}

function playVideo() {
    if (!streaming) {
        console.warn("Please startup your webcam");
        return;
    }

    renderWorker();
}

function startup() {
    document.getElementById("log").innerHTML = "You need to initialize the camera first!"
    document.getElementById("log").style.color = "red";

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
    clearInterval(loopIndex);
    video.pause();
    video.srcObject = null;
    stream.getVideoTracks()[0].stop();
    start.disabled = false;
    video.removeEventListener("canplay", initVideo);
}

async function estimateCameraIntrinsics() {

    // get image from video context and send it to the aruco extraction worker
    videoImageContext.drawImage(videoDom, 0, 0);
    const imageData = videoImageContext.getImageData(0, 0, width, height);
    // extract aruco markers
    const aruco_points = await cv_service.extractArucoForCalib(imageData);

    if (aruco_points.data.payload["has_motion_blur"]) {
        document.getElementById("log").style.color = 'red';
        document.getElementById("log").innerHTML = "Motion blur too high. Move slowly!";
        camera_initialized = false;
    } else {
        document.getElementById("log").style.color = 'green';
        document.getElementById("log").innerHTML = "Motion blur ok. Saving image and estimating camera intrinsics!";
        
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
        camera_matrix = [fx, 0.0, cx, 0.0, fy, cy, 0.0, 0.0, 1.0];
        dist_coeffs = [ 0.0, 0.0, 0.0, 0.0, 0.0];
        document.getElementById('initial_cam_params').innerHTML = 
            "Initial camera parameters: "+fx.toFixed(2)+", "+fy.toFixed(2)+", "+cx.toFixed(2)+", "+cy.toFixed(2);

        field_of_view_render_cam = 2.0 * Math.atan(height / (2.0*fy)) * 180.0 / Math.PI;
        document.getElementById('FoV').innerHTML = "Vertical field of view initialized with: "+field_of_view_render_cam.toFixed(2);

        document.getElementById("log").innerHTML = "Camera initialized. You can start tracking now!";
        document.getElementById("log").style.color = "green";

        camera_initialized = true;
    }
    
}

document.querySelector('#startup').addEventListener('click', startup)
document.querySelector('#estimate_camera_intrinsics').addEventListener('click', estimateCameraIntrinsics)
document.querySelector('#stop').addEventListener('click', stopCamera)
