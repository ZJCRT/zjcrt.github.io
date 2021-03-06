import * as THREE from '../js_libs/three.module.js';
import * as VideoScene from './guide_video.js';

VideoScene.renderer.setAnimationLoop(onRender);


let mindist = 0.05;

// Guide THREE Objects
let arObjects = [];
let curve, arrowHelper;

let arucoarea_height = 0.2148
let arucoarea_width = 0.1397
let radius_x = 0.15;
let radius_y = 0.15
let z_layer_top = 0.2;
let z_layer_bottom = 0.15;

// markerboard (whole (DIN A4) piece of paper)
let markerboard = null;
let finder = null;
let markerboardwidth = 0.21;
let markerboardheight = 0.297;
let boardcolor_tracked = 0x003ecd;
let boardcolor_nottracked = 0xa6c9ff;

// Guide Coordinates
let top_center = new THREE.Vector3(arucoarea_width / 2, arucoarea_height / 2, z_layer_top);
let top_left = new THREE.Vector3(top_center.x - radius_x, top_center.y, z_layer_bottom);
let top_right = new THREE.Vector3(top_center.x + radius_x, top_center.y, z_layer_bottom);
let front_center = new THREE.Vector3(top_center.x, top_center.y - radius_y, z_layer_bottom);
let front_left = new THREE.Vector3(front_center.x - radius_x, front_center.y, front_center.z);
let front_right = new THREE.Vector3(front_center.x + radius_x, front_center.y, front_center.z);

const initialPoints = [
  top_center, top_left, top_center, top_right, top_center, front_center, front_left, front_center, front_right, front_center
];


// Arrow Directions
let targetPosBGLeftDir = new THREE.Vector3(-1, 0, 0);
let targetPosBGRightDir = new THREE.Vector3(1, 0, 0);
let targetPosFrontDir = new THREE.Vector3(0, -1, 0);


// Messages
let t_scanningBG = "Scan the marker board from above";
let t_scanLeftBG = "Scan markerboard from the left, keep the board centered";
let t_scanRightBG = "Now scan the markerboard from the right, remember to keep the board centered";
let t_backToCenterTop = "Move now the phone back to the starting position";
let t_scanningFront = "Scan now the glasses from the front";
let t_scanningLeftFront = "Scan now the glasses now from the left, keep them centered in the image";
let t_scanningRightFront = "Finish now the scan with scanning the glasses from the right";


// State Machine that represents the State of the User Guide
var guide = new StateMachine({
  init: 'start',
  transitions: [
    { name: 'showScaleDialog', from: 'start', to: 'scaleModal' },
    { name: 'startCalibration', from: 'scaleModal', to: 'calibratingCamera' },
    { name: 'startGuide', from: 'calibratingCamera', to: 'scanningBG' },
    { name: 'scanLeftBG', from: 'scanningBG', to: 'scanningLeftBG' },
    { name: 'scanRightBG', from: 'scanningLeftBG', to: 'scanningRightBG' },
    { name: 'backToTopCenter', from: 'scanningRightBG', to: 'centerTop' },
    { name: 'scanCenterFront', from: 'centerTop', to: 'scanningCenterFront' },
    { name: 'scanLeftFront', from: 'scanningCenterFront', to: 'scanningLeftFront' },
    { name: 'scanRightFront', from: 'scanningLeftFront', to: 'scanningRightFront' },
    { name: 'finish', from: 'scanningRightFront', to: 'done' }
  ],
  methods: {
    onShowScaleDialog: function () {
      document.getElementById("scaleDialog").style.display = "block"; //display modal dialog to get scale from user
    },
    onStartCalibration: function () {
      displayDialog("Calibrate your camera", "Please take " + VideoScene.options.cameraCalibration.min_init_images + " pictures from the markerboard.", "Take picture 1/" + VideoScene.options.cameraCalibration.min_init_images);
    },
    onStartGuide: function () {
      console.log(t_scanningBG);
      removeAllARObjects();
      displayOverlay(t_scanningBG, "", "");
      displayMarkerboardAugmentation();
    },
    onScanLeftBG: function () { 
      showLine(); 
      displayOverlay(t_scanLeftBG, "", ""); 
      showArrow(targetPosBGLeftDir, -0.05); 
    },
    onScanRightBG: function () { 
      console.log(t_scanRightBG); 
      displayOverlay(t_scanRightBG, "", ""); 
      removeARObject(VideoScene.render_camera, arrowHelper); 
      showArrow(targetPosBGRightDir, -0.05); 
    },
    onBackToTopCenter: function () { 
      console.log(t_backToCenterTop); 
      displayOverlay(t_backToCenterTop); 
      removeARObject(VideoScene.render_camera, arrowHelper); 
      showArrow(targetPosBGLeftDir, -0.05); 
    },
    onScanCenterFront: function () { 
      console.log(t_scanningFront); 
      displayOverlay(t_scanningFront, "", ""); 
      removeARObject(VideoScene.render_camera, arrowHelper); 
      showArrow(targetPosFrontDir, 0.05); 
    },
    onScanLeftFront: function () { 
      console.log(t_scanningLeftFront); 
      displayOverlay(t_scanningLeftFront, "", ""); 
      removeARObject(VideoScene.render_camera, arrowHelper); 
      showArrow(targetPosBGLeftDir, -0.05); 
    },
    onScanRightFront: function () { 
      console.log(t_scanningRightFront); 
      displayOverlay(t_scanningRightFront, "", ""); 
      removeARObject(VideoScene.render_camera, arrowHelper); 
      showArrow(targetPosBGRightDir, -0.05); 
    },
    onFinish: function () { 
      console.log('Done'); 
      displayMarkerboardAugmentation(false); 
      removeAllARObjects(); displayOverlay("Done", "", ""); 
      removeARObject(VideoScene.render_camera, arrowHelper); 
    }
  }
});

function onRender() {
  switch (guide.state) {
    case "start":
      //guide.startGuide();
      break;
    case "scanningBG":
      let pos_finder = new THREE.Vector3();
      let pos_board = new THREE.Vector3();
      finder.getWorldPosition(pos_finder);
      markerboard.getWorldPosition(pos_board);

      if (pos_finder.distanceTo(pos_board) < mindist) {
        finder.visible = false;
        hideOverlay();
        markerboard.material.color.setHex(boardcolor_tracked);
        guide.scanLeftBG();
      } else {
        finder.visible = true;
        markerboard.material.color.setHex(boardcolor_nottracked);
      }
      break;
    case "scanningLeftBG":
      if (VideoScene.render_camera.position.distanceTo(top_left) < mindist) {
        guide.scanRightBG();
      }
      break;
    case "scanningRightBG":
      if (VideoScene.render_camera.position.distanceTo(top_right) < mindist) {
        guide.backToTopCenter();
      }
      break;
    case "centerTop":
      if (VideoScene.render_camera.position.distanceTo(top_center) < mindist) {
        guide.scanCenterFront();
      }
    case "scanningCenterFront":
      if (VideoScene.render_camera.position.distanceTo(front_center) < mindist) {
        guide.scanLeftFront();
      }

      break;
    case "scanningLeftFront":
      if (VideoScene.render_camera.position.distanceTo(front_left) < mindist) {
        guide.scanRightFront();
      }
      break;
    case "scanningRightFront":
      if (VideoScene.render_camera.position.distanceTo(front_right) < mindist) {
        guide.finish();
      }
      break;
    case "done":

      break;
  }
};


function calibrationCallback(imagesLeft, motionBlur = false) {
  console.log("imagesleft: " + imagesLeft + " " + motionBlur);
  if (imagesLeft > 0) {
    let index = VideoScene.options.cameraCalibration.min_init_images - imagesLeft + 1;
    if (motionBlur) {
      displayDialog("Calibrate your camera", "Motion blur too high. Please move slowly!", "Take picture " + index + "/" + VideoScene.options.cameraCalibration.min_init_images + " again");
    } else {
      displayDialog("Calibrate your camera", "Please change the perspective, and take another image", "Take picture " + index + "/" + VideoScene.options.cameraCalibration.min_init_images);
    }
  } else {
    guide.startGuide();
  }
}

function displayOverlay(text) {
  document.getElementById("overlayWButton").style.visibility = "hidden";
  document.getElementById("overlay").style.visibility = "visible";
  document.getElementById("overlayText").innerHTML = text;
}

function displayDialog(title, text, button) {
  document.getElementById("overlayWButton").style.visibility = "visible";
  document.getElementById("overlay").style.visibility = "hidden";
  document.getElementById("overlayWBTitle").innerHTML = title;
  document.getElementById("overlayWBText").innerHTML = text;
  document.getElementById("overlayWBButton").innerHTML = button;
}

function hideOverlay() {
  document.getElementById("overlay").style.visibility = "hidden";
  document.getElementById("overlayWButton").style.visibility = "hidden";
}


function handleClick() {
  hideOverlay();

  switch (guide.state) {
    case "calibratingCamera":
      VideoScene.estimateCameraIntrinsics(calibrationCallback);
      break;
  }

}

function addARObject(obj) {
  arObjects.push(obj.name);
  VideoScene.scene.add(obj)
}

function removeARObject(parent, object) {
  let selectedObject = parent.getObjectByName(object.name);
  parent.remove(selectedObject);
}

function removeAllARObjects() {
  for (var i = 0; i < arObjects.length; i++) { //TODO start with 0 to remove line
    var selectedObject = VideoScene.scene.getObjectByName(arObjects[i]);
    VideoScene.scene.remove(selectedObject);
  }
  arObjects = [];
  //animationRunning = false;
}

// displays the Scanpath
function showLine() {
  const curveHandles = [];

  const boxGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
  const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x99ff99 });

  let id = 0;
  for (const handlePos of initialPoints) {

    const handle = new THREE.Mesh(boxGeometry, boxMaterial);
    handle.position.copy(handlePos);
    curveHandles.push(handle);


    handle.name = "handle" + id;
    id += 1;
    addARObject(handle);
  }

  curve = new THREE.CatmullRomCurve3(
    curveHandles.map((handle) => handle.position)
  );
  curve.curveType = "centripetal"; //Possible values are centripetal, chordal and catmullrom
  curve.closed = true;

  const points = curve.getPoints(50);
  const line = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x0000ff })
  );

  line.name = "scanpathline";
  addARObject(line);
}



function displayMarkerboardAugmentation(visible) {
  if (markerboard == null) {

    let geometry = new THREE.PlaneGeometry(markerboardwidth, markerboardheight);
    let material = new THREE.MeshBasicMaterial({ color: boardcolor_nottracked, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    markerboard = new THREE.Mesh(geometry, material);
    markerboard.position.set(markerboardwidth / 2, markerboardheight / 2, 0);

    // Translation from marker corner to page corner
    markerboard.translateX(-0.062);
    markerboard.translateY(-0.044);

    VideoScene.scene.add(markerboard);

    let finderwidth = markerboardwidth + 0.02;
    let finderheight = markerboardheight + 0.02;
    geometry = new THREE.PlaneGeometry(finderwidth, finderheight);

    const edges = new THREE.EdgesGeometry(geometry);
    finder = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: boardcolor_tracked }));

    finder.translateZ(-0.4);
    VideoScene.render_camera.add(finder);
  }
}

function showArrow(dir, translateZ) {
  dir.normalize();

  const origin = new THREE.Vector3(0, 0, 0);
  const length = 0.02;
  const hex = 0xff0000;

  arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
  arrowHelper.translateZ(translateZ);
  arrowHelper.name = "arrowHelper" + dir;
  VideoScene.render_camera.add(arrowHelper);
}

VideoScene.addOpenCVLoadListener(onOpenCVLoaded);
document.getElementById("overlayWBButton").addEventListener("click", handleClick);

document.getElementById("submitbtn").addEventListener("click", submitScale);
guide.showScaleDialog();


let dist_to_measure_set = false;
let openCV_loaded = false;

function onOpenCVLoaded() {
  openCV_loaded = true;
  if (openCV_loaded && dist_to_measure_set) {
    guide.startCalibration();
  }
}

// to set the scale of the markerboard (width of red line measured by user)
function submitScale() {
  dist_to_measure_set = true;
  VideoScene.setDistToMeasure(document.getElementById('dist_to_measure').value);
  document.getElementById("scaleDialog").style.visibility = "hidden";
  if (openCV_loaded && dist_to_measure_set) {
    guide.startCalibration();
  } else {
    displayOverlay("loading");
  }
}
