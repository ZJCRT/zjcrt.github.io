import * as THREE from '../js_libs/three.module.js';


let videoTexture, videoSettings, rawVideoStream, videoStream;
let container;

var mediaConstraints = {
    audio: false,
    video: {
        facingMode: "environment"
    }
};

navigator.mediaDevices.getUserMedia(mediaConstraints).then(function(stream) {
	console.log("go");
	rawVideoStream = stream; //global reference
	videoSettings = stream.getVideoTracks()[0].getSettings();
	console.log("videoSettings: width=%d, height=%d, frameRate=%d",videoSettings.width,videoSettings.height, videoSettings.frameRate);
	
	//Making a separate pure video stream is a workaround
	//let videoStream = new MediaStream(stream.getVideoTracks());
	let video = document.createElement("video");
	Object.assign(video, {
		srcObject: stream,//videoStream,
		width: videoSettings.width,
		height: videoSettings.height,
		autoplay: true,
	});


	//document.body.appendChild(video);
	videoTexture = new THREE.VideoTexture(video);
	videoTexture.minFilter = THREE.LinearFilter;
	init();
	}
).catch(function(error){console.error(error);});

let renderer, scene, camera, smoother;

function init() {
	let w = videoSettings.width;
	let h = videoSettings.height;

	//Renderer setup
	document.body.style = "overflow: hidden;";
	container = document.getElementById("container");;
	document.body.appendChild(container);
	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(w, h);
	container.appendChild(renderer.domElement);

	//Scene setup:
	scene = new THREE.Scene();
	
	let display = new THREE.Mesh(
		new THREE.PlaneBufferGeometry(2, 2),
		new THREE.MeshBasicMaterial({map: videoTexture})
	);
    scene.add(display);
    
    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    var cube = new THREE.Mesh( geometry, material );
    scene.add( cube );
	
	//Camera setup:
	camera = new THREE.OrthographicCamera(-1,1,1,-1);
	camera.position.z = 1;
	//scene.add(camera);
	
	videoStream = renderer.domElement.captureStream(videoSettings.frameRate);
		
	setInterval(function() {
			//smoother.update()
			renderer.render(scene, camera);
		}, 1000./videoSettings.frameRate);
}