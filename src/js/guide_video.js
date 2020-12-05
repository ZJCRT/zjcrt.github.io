import * as THREE from '../js_libs/three.module.js';
import { GUI } from '../js_libs/dat.gui.module.js';
import cv_service from '../services/cv_service.js';


let video, videoTexture, videoMesh;
let renderer, scene, camera;
const vidDistToCam = 2; //Distance from VideoTexture To Cam

var mediaConstraints = {
    audio: false,
    video: {
		width: 1920,
    	height: 1080,
		facingMode: "environment"
    }
};

const debugGUI = new GUI();
let calibGUI;

let options = {
	openCV_ready: false,
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
	// reset: function() {
	// 	console.log("reset");
	//   	this.use_new_board_checker = false;
	//   camera.position.z = 75;
	//   camera.position.x = 0;
	//   camera.position.y = 0;
	//   cube.scale.x = 1;
	//   cube.scale.y = 1;
	//   cube.scale.z = 1;
	//   cube.material.wireframe = true;
	// }
};

function initDebugGUI(){
	//https://codepen.io/programking/pen/MyOQpO

	debugGUI.add(options, 'openCV_ready').listen();
	
	calibGUI = debugGUI.addFolder('Camera Calibration');
	calibGUI.add(options.cameraCalibration, 'use_new_board_checker').listen();
	calibGUI.add(options.cameraCalibration, 'min_init_images').listen();
	calibGUI.add(options.cameraCalibration, 'cur_view_id').listen();
	calibGUI.add(options.cameraCalibration, 'fx').listen();
	calibGUI.add(options.cameraCalibration, 'fy').listen();
	calibGUI.add(options.cameraCalibration, 'cx').listen();
	calibGUI.add(options.cameraCalibration, 'cy').listen();
	calibGUI.add(options.cameraCalibration, 'fov').listen();
	calibGUI.add(options.cameraCalibration, 'takeImageAndDownload').listen();
	
	debugGUI.add(options, 'debugText').listen();
	//debugGUI.add(options, 'reset');
}

function init() {
	camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight,0.1,100);
	camera.position.z = 0.5;

	scene = new THREE.Scene();

	video =  document.getElementById("video");
	videoTexture = new THREE.VideoTexture(video);
	video.addEventListener( "loadedmetadata", function (e) {
		// let textureGUI = debugGUI.addFolder('Video Texture');
		// textureGUI.add(videoTexture.image, 'videoWidth');
		// textureGUI.add(videoTexture.image, 'videoHeight');
		console.log( "VideoTextureResolution: "+videoTexture.image.videoWidth+"x"+videoTexture.image.videoHeight );  
	}, false );

	const geometry = new THREE.PlaneBufferGeometry(9,16);
	geometry.scale(0.1,0.1,0.1);
	const material = new THREE.MeshBasicMaterial({map: videoTexture});
	videoMesh = new THREE.Mesh(geometry,material);
	videoMesh.position.z= vidDistToCam * -1;
	camera.add(videoMesh);
	scene.add(camera);

	updateCameraChange();
	
	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	//Get Camerastream
	if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
		navigator.mediaDevices.getUserMedia(mediaConstraints).then(function(stream){
			console.log("VideoTrackSettings: ");
			console.log(stream.getVideoTracks()[0].getSettings());
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
    cv_service.worker.addEventListener('message', function(e){
        if(e.data.msg=="load"){
			options.openCV_ready = true;
			
            calibGUI.add(options.cameraCalibration, 'takeCalibImage').listen();
			calibGUI.open();
		}
    },false);
}



function updateCameraChange(){
	camera.updateProjectionMatrix();

	//TODO check for other aspect ratio?
	videoMesh.scale.y = Math.tan(camera.fov * Math.PI / 180 * 0.5) * vidDistToCam * 2 ;
	videoMesh.scale.x = videoMesh.scale.y;
}




function render(){
	requestAnimationFrame(render);
	renderer.render(scene,camera);
}

let loopIndex = 0;

function renderWorker() {
    // Processing image
    loopIndex = setInterval(
        function(){ 
            if (camera_initialized) {
                estimatePoseAruco();
            }
        }, options.tracking.run_interval);
}


//###### Calibration

let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');

let camera_matrix, dist_coeffs;
let camera_initialized = false;
let init_scene = {};


async function estimateCameraIntrinsics() {
	canvas.width = videoTexture.image.videoWidth;
	canvas.height = videoTexture.image.videoHeight;

    // get image from video context and send it to the aruco extraction worker
	ctx.drawImage(videoTexture.image, 0, 0);
	const imageData = ctx.getImageData(0,0,videoTexture.image.videoWidth,videoTexture.image.videoHeight);

    // extract aruco markers
    const aruco_points = await cv_service.extractArucoForCalib(
        {"image" : imageData, "view_id" : options.cameraCalibration.cur_view_id, "use_new_board" : options.cameraCalibration.use_new_board_checker});

    if (aruco_points.data.payload["has_motion_blur"]) {
        // document.getElementById("log").style.color = 'red';
		// document.getElementById("log").innerHTML = "Motion blur too high. Move slowly!";
		options.debugText = "Motion blur too high. Move slowly!";
        camera_initialized = false;
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

        if (aruco_points.data.payload["view_id"] >= options.cameraCalibration.min_init_images) {
			camera_initialized = true;
			options.debugText = "Camera initialized. You can start tracking now!";
            // document.getElementById("log").innerHTML = "Camera initialized. You can start tracking now!";
			// document.getElementById("log").style.color = "green";
			camera.fov = options.cameraCalibration.fov;
			camera.aspect = videoTexture.image.videoWidth/videoTexture.image.videoHeight;
			calibGUI.close();

			updateCameraChange();

			let camGUI = debugGUI.addFolder('camera');
			camGUI.add(camera, 'fov').listen();
			camGUI.add(camera, 'aspect').listen();

			let trackingGUI = debugGUI.addFolder('tracking');
			trackingGUI.add(options.tracking, 'time').listen();
			trackingGUI.add(options.tracking, 'run_interval').listen();
			trackingGUI.open();

			renderWorker();
        }
    }
}

// send image data to the webworker
async function estimatePoseAruco(width=480, height=640) {
	canvas.width = width;
    canvas.height = height;

    // get image from video context and send it to the aruco extraction worker
	ctx.drawImage(videoTexture.image, 0, 0, width, height);
	const imageData = ctx.getImageData(0,0,width, height);

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
		options.debugText = "";
    } else {
        // document.getElementById("cam_pose_status").innerHTML = "Cam pose INVALID. Pose (xyz, qxqyqzqw): "+
        //     pose["position"][0].toFixed(3) + ", " + pose["position"][1].toFixed(3)+ ", " + pose["position"][2].toFixed(3) + ", " +
        //     quat_xyzw[0].toFixed(3) + ", " + quat_xyzw[1].toFixed(3)+ ", " + quat_xyzw[2].toFixed(3) +", " + quat_xyzw[3].toFixed(3);
		// document.getElementById("cam_pose_status").style.color = "red";
		options.debugText = "Cam pose INVALID";
		
	}
	options.tracking.time = pose["est_time"].toFixed(2);
    // document.getElementById("trackingtime").innerHTML = "Tracking time: "+pose["est_time"].toFixed(2);
    // if (pose["est_time"] > 30) {
    //     document.getElementById("trackingtime").style.color = "red";
    // } else {
    //     document.getElementById("trackingtime").style.color = "green";
    // }
    camera.position.set(pose["position"][0], pose["position"][1], pose["position"][2]);        
    camera.quaternion.copy(quaternion);
}




//test images
function takeImageAndDownload(){
    // Create a canvas element
    // let canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 640;

    // Get the drawing context
	ctx.drawImage(videoTexture.image, 0, 0, 480,640);
	//const imageData = ctx.getImageData(0,0,1080,1920);

    //create img
    var img = document.createElement('img');
    img.setAttribute('src', canvas.toDataURL());

    var myWindow = window.open("", "MsgWindow");
    myWindow.document.write(
        `<h1>took image with ${canvas.width}x${canvas.height}<br/>
        <a href="${img.src}" download>Download</a><br/></h1>
    `)
    myWindow.document.body.appendChild(canvas);    
}






init();
render();
initDebugGUI();