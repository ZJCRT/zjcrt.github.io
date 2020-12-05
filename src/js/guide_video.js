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

let debugOptions = {
	openCV_ready: false,
	cameraCalibration: {
		use_new_board_checker: false,
		takeCalibImage: function() {
			estimatePoseAruco();
		}
	},
	reset: function() {
		console.log("reset");
	  	this.use_new_board_checker = false;
	//   camera.position.z = 75;
	//   camera.position.x = 0;
	//   camera.position.y = 0;
	//   cube.scale.x = 1;
	//   cube.scale.y = 1;
	//   cube.scale.z = 1;
	//   cube.material.wireframe = true;
	}
};

function initDebugGUI(){
	//https://codepen.io/programking/pen/MyOQpO

	debugGUI.add(debugOptions, 'openCV_ready').listen();
	
	var calib = debugGUI.addFolder('Camera Calibration');
	calib.add(debugOptions.cameraCalibration, 'use_new_board_checker').listen();
	calib.add(debugOptions.cameraCalibration, 'takeCalibImage').listen();
	calib.open();

	debugGUI.add(debugOptions, 'reset');
}

function init() {
	camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight,0.1,100);
	camera.position.z = 0.5;

	scene = new THREE.Scene();

	video =  document.getElementById("video");
	videoTexture = new THREE.VideoTexture(video);
	video.addEventListener( "loadedmetadata", function (e) {
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
			debugOptions.openCV_ready = true;
            displayDialog("Calibrate Camera", "Take some images of the markerboard", "Start calibration");
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

init();
render();
initDebugGUI();




//###### Calibration

let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');

let camera_matrix, dist_coeffs;

// send image data to the webworker
async function estimatePoseAruco() {
	
    ctx.drawImage(videoTexture.image, 0, 0);
	const image_data = ctx.getImageData(0,0,1080,1920);
	
	const pose_payload = await cv_service.poseEstimation(
        {"image" : image_data, "camera_matrix" : camera_matrix, "dist_coeffs" : dist_coeffs, "use_new_board": debugOptions.cameraCalibration.use_new_board_checker});
    const pose = pose_payload.data.payload;
    const quat_xyzw = pose["quaternion_xyzw"];
    const quaternion = new THREE.Quaternion().set(quat_xyzw[0],quat_xyzw[1],quat_xyzw[2],quat_xyzw[3]).normalize();

    if (pose["valid"]) {
        document.getElementById("cam_pose_status").innerHTML = "Cam pose VALID. Pose (xyz, qxqyqzqw): "+
            pose["position"][0].toFixed(3) + ", " + pose["position"][1].toFixed(3)+ ", " + pose["position"][2].toFixed(3) + ", " + 
            quat_xyzw[0].toFixed(3) + ", " + quat_xyzw[1].toFixed(3)+ ", " + quat_xyzw[2].toFixed(3) +", " + quat_xyzw[3].toFixed(3);
        document.getElementById("cam_pose_status").style.color = "green";
    } else {
        document.getElementById("cam_pose_status").innerHTML = "Cam pose INVALID. Pose (xyz, qxqyqzqw): "+
            pose["position"][0].toFixed(3) + ", " + pose["position"][1].toFixed(3)+ ", " + pose["position"][2].toFixed(3) + ", " +
            quat_xyzw[0].toFixed(3) + ", " + quat_xyzw[1].toFixed(3)+ ", " + quat_xyzw[2].toFixed(3) +", " + quat_xyzw[3].toFixed(3);
        document.getElementById("cam_pose_status").style.color = "red";
    }
    document.getElementById("trackingtime").innerHTML = "Tracking time: "+pose["est_time"].toFixed(2);
    if (pose["est_time"] > 30) {
        document.getElementById("trackingtime").style.color = "red";
    } else {
        document.getElementById("trackingtime").style.color = "green";
    }
    render_camera.position.set(pose["position"][0], pose["position"][1], pose["position"][2]);        
    render_camera.quaternion.copy(quaternion);

}