import * as THREE from '../js_libs/three.module.js';
import cv_service from '../services/cv_service.js';

export{cv_service, options, scene, render_camera, estimateCameraIntrinsics, renderer, setDistToMeasure};

let video, videoTexture, videoMesh;
let renderer, scene, render_camera, rendercanvas;

// canvas to pass image into openCV
let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');

// camera calibration
let camera_matrix, dist_coeffs;
let camera_initialized = false;
let init_scene = {};

let dist_to_measure = 0.14; //width of markerboard (measured by user), in meters;

let poseEstimationRunning = false; // is the webworker currently bussy
const poseTimes = []; // stores timestamps to calculate FPS of pose estimation

var mediaConstraints = {
    audio: false,
    video: {
		width: 1920,
    	height: 1080,
		facingMode: "environment"
    }
};

let options = {
	openCV_ready: false,
	dimensions: {
		planebuffer: {
			width: 1.8,
			height: 3.2,
			dist: 0
		},
	},
	cameraCalibration: {
		use_new_board_checker: true,
		cur_view_id: 0,
		min_init_images: 2,
		fx: 0,
		fy: 0,
		cx: 0,
		cy: 0,
		fov: 0
	},
	tracking: {
		time: 0,
		run_interval: 60
	}
};

// To get the scale from the markerboard right, the user has to measure the width of the markerboard (red line)
function setDistToMeasure(dist){
	dist_to_measure = dist;
}

function init() {
	//Camera will be updated as soon as it is calibrated -> updateCameraChange()
	render_camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight,0.01,100);
	render_camera.position.z = 0.5;
	
	scene = new THREE.Scene();

	video =  document.getElementById("video");
	videoTexture = new THREE.VideoTexture(video);
	video.addEventListener( "loadedmetadata", function (e) {
		console.log( "VideoTextureResolution: "+videoTexture.image.videoWidth+"x"+videoTexture.image.videoHeight );  
	}, false );

	const geometry = new THREE.PlaneBufferGeometry(options.dimensions.planebuffer.width,options.dimensions.planebuffer.height);
	const material = new THREE.MeshBasicMaterial({map: videoTexture});
	videoMesh = new THREE.Mesh(geometry,material);
	render_camera.add(videoMesh);
	scene.add(render_camera);
	
	rendercanvas = document.getElementById("rendercanvas");
	renderer = new THREE.WebGLRenderer({canvas: rendercanvas, antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);

	console.log("init...");
	console.log(`init camera settings to fov: ${render_camera.fov}, aspect:  ${render_camera.aspect}`);
	console.log(render_camera);
	console.log(renderer);
	console.log(videoMesh);

	updateCameraChange();

	//Get Camerastream
	if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
		navigator.mediaDevices.getUserMedia(mediaConstraints).then(function(stream){
			video.srcObject = stream;
			video.play();
		}).catch(function(error){
			console.error('Unable to access the cam.', error);
		});
	} else {
		console.error('MediaDevices interface not available.');
	}

	// load webworker
	cv_service.loadArucoWebWorker();

	//wait until openCV is loaded ... 
	addOpenCVLoadListener(openCVLoaded);
}

export {addOpenCVLoadListener};
function addOpenCVLoadListener(callback){
	cv_service.worker.addEventListener('message', function(e){
        if(e.data.msg=="load"){
			callback();
		}
    },false);
}

function openCVLoaded(){
	options.openCV_ready = true;
}

function stopCamera() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);    

	video.pause();
	video.srcObject.getVideoTracks()[0].stop();
    video.srcObject = null;
}



function updateCameraChange(){
	render_camera.updateProjectionMatrix();
	let vFOV = THREE.MathUtils.degToRad(render_camera.fov);
	// let hFOV = vFOV * render_camera.aspect;

	videoMesh.position.z = -1 * options.dimensions.planebuffer.height / (2 * Math.tan (vFOV/2));

	// TODO fill the screen on all devices that have a different aspect ratio than 9:16 
	// render_camera.zoom = 1.4; // works on iPad Pro
	// console.log(`update camera change fov: ${render_camera.fov}, aspect:  ${render_camera.aspect}, videoMesh.position.z: ${videoMesh.position.z}, zoom: ${render_camera.zoom},  focalLength: ${render_camera.getFocalLength()}`);
}

function render(){
	requestAnimationFrame(render);

	if(camera_initialized && ! poseEstimationRunning){
		estimatePoseAruco();
	}

	renderer.render(scene,render_camera);
}

//###### Calibration
async function estimateCameraIntrinsics(callback) {
	canvas.width = videoTexture.image.videoWidth;
	canvas.height = videoTexture.image.videoHeight;

    // get image from video context and send it to the aruco extraction worker
	ctx.drawImage(videoTexture.image, 0, 0);
	const imageData = ctx.getImageData(0,0,videoTexture.image.videoWidth,videoTexture.image.videoHeight);

	console.log("Use new checkerboard: "+options.cameraCalibration.use_new_board_checker);
    // extract aruco markers
    const aruco_points = await cv_service.extractArucoForCalib(
        {"image" : imageData, "view_id" : options.cameraCalibration.cur_view_id, "use_new_board" : options.cameraCalibration.use_new_board_checker, "dist_to_measure": dist_to_measure});

	let remainingImages = options.cameraCalibration.min_init_images-aruco_points.data.payload["view_id"]-1;
	
    if (aruco_points.data.payload["has_motion_blur"]) { // Motion blur too high. Move slowly!
		camera_initialized = false;
		
		remainingImages = options.cameraCalibration.min_init_images-options.cameraCalibration.cur_view_id;
		callback(remainingImages, true);
    } else {
        options.cameraCalibration.cur_view_id += 1;
		const view_id = "view_"+aruco_points.data.payload["view_id"]
		
        // background_scene is global
        init_scene[view_id] = {};
        init_scene[view_id]["obj_pts"] = aruco_points.data.payload["obj_pts_js"];
        init_scene[view_id]["img_pts"] = aruco_points.data.payload["corners_js"];
        init_scene[view_id]["image_size"] = aruco_points.data.payload["image_size"];

        const camera = await cv_service.estimateInitialCamera(init_scene);
        options.cameraCalibration.fx = camera.data.payload["camera_matrix"][0][0];
        options.cameraCalibration.fy = camera.data.payload["camera_matrix"][1][1];
        options.cameraCalibration.cx = camera.data.payload["camera_matrix"][0][2];
        options.cameraCalibration.cy = camera.data.payload["camera_matrix"][1][2];
        camera_matrix = [options.cameraCalibration.fx, 0.0, options.cameraCalibration.cx, 0.0, options.cameraCalibration.fy, options.cameraCalibration.cy, 0.0, 0.0, 1.0];
        dist_coeffs = [ 0.0, 0.0, 0.0, 0.0, 0.0];

        options.cameraCalibration.fov = 2.0 * Math.atan(videoTexture.image.videoHeight / (2.0*options.cameraCalibration.fy)) * 180.0 / Math.PI;

        if (aruco_points.data.payload["view_id"] == options.cameraCalibration.min_init_images-1) { // Camera initialized
			camera_initialized = true;
			
			render_camera.fov = options.cameraCalibration.fov;
			updateCameraChange();
		}
		
		callback(remainingImages);
    }
}


// send image data to the webworker and get camera pose
async function estimatePoseAruco() {
	
	//just fps calculations
	const now = performance.now();
	while (poseTimes.length > 0 && poseTimes[0] <= now - 1000) {
		poseTimes.shift();
	}
	poseTimes.push(now);
	document.getElementById("fps").innerText = poseTimes.length;

	poseEstimationRunning = true;

    // get image from video context and send it to the aruco extraction worker
	ctx.drawImage(videoTexture.image, 0, 0);
	const imageData = ctx.getImageData(0,0,videoTexture.image.videoWidth,videoTexture.image.videoHeight);

    const pose_payload = await cv_service.poseEstimation(
        {"image" : imageData, "camera_matrix" : camera_matrix, "dist_coeffs" : dist_coeffs, "use_new_board": options.cameraCalibration.use_new_board_checker, "dist_to_measure": dist_to_measure});
    const pose = pose_payload.data.payload;
    const quat_xyzw = pose["quaternion_xyzw"];
    const quaternion = new THREE.Quaternion().set(quat_xyzw[0],quat_xyzw[1],quat_xyzw[2],quat_xyzw[3]).normalize();

	// Is camera pose valid?
    if (pose["valid"]) {
		render_camera.position.set(pose["position"][0], pose["position"][1], pose["position"][2]);        
		render_camera.quaternion.copy(quaternion);

		document.getElementById("debug").innerText = "";
    } else {
		document.getElementById("debug").innerText = "Cam pose INVALID";
	}
	// options.tracking.time = pose["est_time"].toFixed(2);
	poseEstimationRunning = false;
}



// RUN 
init();
render();

window.addEventListener("beforeunload",stopCamera); // not sure if this is necessary





// Debug-Stuff beyond this line
const check_l = 0.015;

// draw coordinate system
const red_line = new THREE.LineBasicMaterial({color: 0xff0000, linewidth: 2});
const x_line = [];
x_line.push(new THREE.Vector3(0.0,0.0,0.0))
x_line.push(new THREE.Vector3(check_l,0.0,0.0))
const y_line = [];
y_line.push(new THREE.Vector3(0.0,0.0,0.0))
y_line.push(new THREE.Vector3(0.0,check_l,0.0))
const z_line = [];
z_line.push(new THREE.Vector3(0.0,0.0,0.0))
z_line.push(new THREE.Vector3(0.0,0.0,check_l))
const geometry_x = new THREE.BufferGeometry().setFromPoints(x_line);
const geometry_y = new THREE.BufferGeometry().setFromPoints(y_line);
const geometry_z = new THREE.BufferGeometry().setFromPoints(z_line);
const linex = new THREE.Line( geometry_x,  new THREE.LineBasicMaterial({ color: 0xff0000 }));
const liney = new THREE.Line( geometry_y,  new THREE.LineBasicMaterial({ color: 0x00ff00 }));
const linez = new THREE.Line( geometry_z,  new THREE.LineBasicMaterial({ color: 0x0000ff }));
scene.add(linex);
scene.add(liney);
scene.add(linez);