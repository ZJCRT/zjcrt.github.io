'use strict';
import cv_service from '../services/cv_service.js';


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

let field_of_view_render_cam = 53;

let run_interval = 25;

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
const geometry = new THREE.BoxGeometry(0.08,0.08,0.08);
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
cube.position.set(0,0,0);
scene.add(cube);
 


// // Create a different scene to hold our buffer objects
// let bufferScene = new THREE.Scene();
// // Create the texture that will store our result
// let bufferTexture = null;
 

function updateRenderCamera(pose) {
    const new_quaternion = new THREE.Quaternion().set(pose[1],pose[2],pose[3],pose[0]).normalize();

    render_camera.position.set(pose[4], pose[5], pose[6]);        
    render_camera.quaternion.copy(new_quaternion);
}

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
    //const ctx = canvas.getContext('2d');
    //ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    //const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    //upate_video_context();

    videoImageContext.drawImage(videoDom, 0, 0);
    const imageData = videoImageContext.getImageData(0, 0, width, height);
    const pose = await cv_service.poseEstimation(imageData);
    updateRenderCamera(pose.data.payload)
    console.log(pose.data.payload)
}

var constraints = {
    audio: false,
    video: {
        facingMode: "environment",
        width: { min: 320, max: 640 },
        height: { min: 240, max: 480 },
    },
};

// function upate_video_context() {
//     videoImageContext.drawImage(videoDom, 0,0);
//     //requestAnimationFrame(upate_video_context); // wait for the browser to be ready to present another animation fram.       
// }

function renderWorker() {
    // Processing image
    loopIndex = setInterval(
        function(){ 
            estimatePoseAruco();
            render(); 
        }, run_interval);
}


function render() {
    renderer.setClearColor(0x000000, 0);
    // Render onto our off-screen texture
    //renderer.render(bufferScene, render_camera, bufferTexture);
    // Finally, draw to the screen
    renderer.render(scene, render_camera );
    requestAnimationFrame( render );
}

function playVideo() {
    if (!streaming) {
        console.warn("Please startup your webcam");
        return;
    }

    render_camera = new THREE.PerspectiveCamera(field_of_view_render_cam, width/height, 0.01, 2 );
    renderer.setSize(width, height);

    start.disabled = true;

    renderWorker();
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
    clearInterval(loopIndex);
    video.pause();
    video.srcObject = null;
    stream.getVideoTracks()[0].stop();
    start.disabled = false;
    video.removeEventListener("canplay", initVideo);
}

document.querySelector('#startup').addEventListener('click', startup)
document.querySelector('#stop').addEventListener('click', stopCamera)
