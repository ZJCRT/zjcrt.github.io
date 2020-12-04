import * as THREE from '../js_libs/three.module.js';


let video, videoTexture;
let renderer, scene, camera;

var mediaConstraints = {
    audio: false,
    video: {
		width: 1920,
    	height: 1080,
		facingMode: "environment"
    }
};

function init() {
	camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight,0.1,100);
	camera.position.z = 2 ;

	scene = new THREE.Scene();

	video =  document.getElementById("video");
	videoTexture = new THREE.VideoTexture(video);
	video.addEventListener( "loadedmetadata", function (e) {
		console.log( "VideoTextureResolution: "+videoTexture.image.videoWidth+"x"+videoTexture.image.videoHeight );  
	}, false );

	const geometry = new THREE.PlaneBufferGeometry(9,16);
	geometry.scale(0.1,0.1,0.1);
	const material = new THREE.MeshBasicMaterial({map: videoTexture});
	const videoMesh = new THREE.Mesh(geometry,material);
	scene.add(videoMesh);
	
	renderer = new THREE.WebGLRenderer({antialias: true});
	//renderer.setPixelRatio(window.devicePixelRatio);
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
}

function render(){
	requestAnimationFrame(render);
	renderer.render(scene,camera);
}

init();
render();