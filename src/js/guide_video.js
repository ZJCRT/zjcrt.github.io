import * as THREE from '../js_libs/three.module.js';
import cv_service from '../services/cv_service.js';

export{cv_service, options, scene, render_camera, estimateCameraIntrinsics, renderer};

let video, videoTexture, videoMesh;
let renderer, scene, render_camera, rendercanvas;

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
		use_new_board_checker: false,
		cur_view_id: 0,
		min_init_images: 2,
		fx: 0,
		fy: 0,
		cx: 0,
		cy: 0,
		fov: 0,
		takeCalibImage: function() {
			estimateCameraIntrinsics();
			
		},
		takeImageAndDownload: function(){
			takeImageAndDownload();
		}
	},
	tracking: {
		time: 0,
		run_interval: 60
	},

	debugText: ""
};


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

	updateCameraChange();

	//Get Camerastream
	if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
		navigator.mediaDevices.getUserMedia(mediaConstraints).then(function(stream){
			//console.log("VideoTrackSettings: ");
			//console.log(stream.getVideoTracks()[0].getSettings());
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

	//wait until openCV is loaded ... then display dialog
    // cv_service.worker.addEventListener('message', function(e){
    //     if(e.data.msg=="load"){
			
	// 	}
	// },false);
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

	let aspect = options.dimensions.planebuffer.width / options.dimensions.planebuffer.height;
	if(render_camera.aspect <= aspect ){
		videoMesh.position.z = -1 * options.dimensions.planebuffer.height / (2 * Math.tan (vFOV/2));
	} else {
		let hFOV = vFOV * render_camera.aspect;
		videoMesh.position.z = -1 * options.dimensions.planebuffer.width / (2 * Math.tan (hFOV/2));
	}
}

function render(){

	requestAnimationFrame(render);

	if(camera_initialized && ! poseEstimationRunning){
		console.log("go");
		estimatePoseAruco();
	}

	renderer.render(scene,render_camera);
}

// let loopIndex = 0;

// function renderWorker() {
//     // Processing image
//     loopIndex = setInterval(
//         function(){ 
//             if (camera_initialized) {
//                 estimatePoseAruco();
//             }
//         }, options.tracking.run_interval);
// }


//###### Calibration

let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');

let camera_matrix, dist_coeffs;
let camera_initialized = false;
let init_scene = {};

async function estimateCameraIntrinsics(callback) {
	canvas.width = videoTexture.image.videoWidth;
	canvas.height = videoTexture.image.videoHeight;

    // get image from video context and send it to the aruco extraction worker
	ctx.drawImage(videoTexture.image, 0, 0);
	const imageData = ctx.getImageData(0,0,videoTexture.image.videoWidth,videoTexture.image.videoHeight);

    // extract aruco markers
    const aruco_points = await cv_service.extractArucoForCalib(
        {"image" : imageData, "view_id" : options.cameraCalibration.cur_view_id, "use_new_board" : options.cameraCalibration.use_new_board_checker});

	let remainingImages = options.cameraCalibration.min_init_images-aruco_points.data.payload["view_id"]-1;
	
    if (aruco_points.data.payload["has_motion_blur"]) {
        // document.getElementById("log").style.color = 'red';
		// document.getElementById("log").innerHTML = "Motion blur too high. Move slowly!";
		options.debugText = "Motion blur too high. Move slowly!";
		camera_initialized = false;
		
		remainingImages = options.cameraCalibration.min_init_images-options.cameraCalibration.cur_view_id;
		callback(remainingImages, true);
    } else {
        options.cameraCalibration.cur_view_id += 1;
        // document.getElementById("log").style.color = 'green';
		// document.getElementById("log").innerHTML = "Motion blur ok. Saving image and estimating camera intrinsics!";
		// options.debugText = "Motion blur ok. Saving image and estimating camera intrinsics!";
        
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
        // document.getElementById('initial_cam_params').innerHTML = 
        //     "Initial camera parameters: "+fx.toFixed(2)+", "+fy.toFixed(2)+", "+cx.toFixed(2)+", "+cy.toFixed(2);

        options.cameraCalibration.fov = 2.0 * Math.atan(videoTexture.image.videoHeight / (2.0*options.cameraCalibration.fy)) * 180.0 / Math.PI;
		// document.getElementById('FoV').innerHTML = "Vertical field of view initialized with: "+field_of_view_render_cam.toFixed(2);

		options.debugText= "Take another "+
		(options.cameraCalibration.min_init_images-aruco_points.data.payload["view_id"])+" images!";
        // document.getElementById("log").innerHTML = "Camera initializing. Move it around and take another "+
        //     (min_init_images-aruco_points.data.payload["view_id"])+" images!";
        // document.getElementById("log").style.color = "green";

        if (aruco_points.data.payload["view_id"] == options.cameraCalibration.min_init_images-1) {
			camera_initialized = true;
			options.debugText = "Camera initialized. You can start tracking now!";
            // document.getElementById("log").innerHTML = "Camera initialized. You can start tracking now!";
			// document.getElementById("log").style.color = "green";
			render_camera.fov = options.cameraCalibration.fov;
			render_camera.aspect = videoTexture.image.videoWidth/videoTexture.image.videoHeight;
			

			updateCameraChange();
		}
		
		callback(remainingImages);
    }
}

let poseEstimationRunning = false;
//just to count fps of pose estimation
const poseTimes = [];
	

// send image data to the webworker
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
        {"image" : imageData, "camera_matrix" : camera_matrix, "dist_coeffs" : dist_coeffs, "use_new_board": options.cameraCalibration.use_new_board_checker});
    const pose = pose_payload.data.payload;
    const quat_xyzw = pose["quaternion_xyzw"];
    const quaternion = new THREE.Quaternion().set(quat_xyzw[0],quat_xyzw[1],quat_xyzw[2],quat_xyzw[3]).normalize();

    if (pose["valid"]) {
        // document.getElementById("cam_pose_status").innerHTML = "Cam pose VALID. Pose (xyz, qxqyqzqw): "+
        //     pose["position"][0].toFixed(3) + ", " + pose["position"][1].toFixed(3)+ ", " + pose["position"][2].toFixed(3) + ", " + 
        //     quat_xyzw[0].toFixed(3) + ", " + quat_xyzw[1].toFixed(3)+ ", " + quat_xyzw[2].toFixed(3) +", " + quat_xyzw[3].toFixed(3);
		// document.getElementById("cam_pose_status").style.color = "green";
		// options.debugText = "";

		render_camera.position.set(pose["position"][0], pose["position"][1], pose["position"][2]);        
		render_camera.quaternion.copy(quaternion);
		document.getElementById("debug").innerText = "";
    } else {
        // document.getElementById("cam_pose_status").innerHTML = "Cam pose INVALID. Pose (xyz, qxqyqzqw): "+
        //     pose["position"][0].toFixed(3) + ", " + pose["position"][1].toFixed(3)+ ", " + pose["position"][2].toFixed(3) + ", " +
        //     quat_xyzw[0].toFixed(3) + ", " + quat_xyzw[1].toFixed(3)+ ", " + quat_xyzw[2].toFixed(3) +", " + quat_xyzw[3].toFixed(3);
		// document.getElementById("cam_pose_status").style.color = "red";
		// options.debugText = "Cam pose INVALID";
		document.getElementById("debug").innerText = "Cam pose INVALID";
		
	}
	// options.tracking.time = pose["est_time"].toFixed(2);
    // document.getElementById("trackingtime").innerHTML = "Tracking time: "+pose["est_time"].toFixed(2);
    // if (pose["est_time"] > 30) {
    //     document.getElementById("trackingtime").style.color = "red";
    // } else {
    //     document.getElementById("trackingtime").style.color = "green";
    // }

	
	poseEstimationRunning = false;
}


init();
render();

window.addEventListener("beforeunload",stopCamera);


// Debug-Stuff beyond this line

//test images
function takeImageAndDownload(){

	var tmp = document.createElement('canvas');
	tmp.getContext('2d').drawImage(videoTexture.image, canvas.width, canvas.height);
	
    //create img
    var img = document.createElement('img');
    img.setAttribute('src', tmp.toDataURL());

    var myWindow = window.open("", "MsgWindow");
    myWindow.document.write(
        `<h1>took image with ${tmp.width}x${tmp.height}<br/>
        <a href="${img.src}" download>Download</a><br/></h1>
    `)
    myWindow.document.body.appendChild(tmp);    
}



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