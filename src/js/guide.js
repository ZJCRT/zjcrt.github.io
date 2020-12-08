import * as THREE from '../js_libs/three.module.js';
import * as VideoScene from './guide_video.js';

VideoScene.renderer.setAnimationLoop(onRender);
displayOverlay("loading");

let mindist = 0.05;

// Guide THREE Objects
let arObjects = [];
let curve, arrowHelper;

// "Corners" of the Scan Path
let top_left = new THREE.Vector3(-0.2,0,0.15);
let top_center = new THREE.Vector3(0,0, 0.2);
let top_right = new THREE.Vector3(0.2,0,0.15);
let front_center = new THREE.Vector3(0,-0.2,0.15);
let front_left = new THREE.Vector3(-0.2,-0.2,0.15);
let front_right = new THREE.Vector3(0.2,-0.2,0.15);

const initialPoints = [
    top_center, top_left, top_center, top_right, top_center, front_center, front_left, front_center, front_right, front_center
];

let targetPosBGLeftDir = new THREE.Vector3(-1,0,0);
let targetPosBGRightDir = new THREE.Vector3(1,0,0);
let targetPosFrontDir = new THREE.Vector3(0,-1,0);

let t_scanningBG = "Scan the marker board from above";
let t_scanLeftBG = "Scan markerboard from the left, keep the board centered";
let t_scanRightBG = "Now scan the markerboard from the right, remember to keep the board centered";
let t_backToCenterTop = "Move now the phone back to the starting position";
let t_scanningFront = "Scan now the glasses from the front";
let t_scanningLeftFront = "Scan now the glasses now from the left, keep them centered in the image";
let t_scanningRightFront = "Finish now the scan with scanning the glasses from the right";



let debug = true;

var guide = new StateMachine({
    init: 'start',
    transitions: [
      { name: 'startCalibration', from: 'start', to: 'calibratingCamera'},
      //{ name: 'playAnimation',     from: 'start',  to: 'playingAnimation' },
      { name: 'startGuide',     from: 'calibratingCamera',  to: 'scanningBG' },
      { name: 'scanLeftBG',   from: 'scanningBG', to: 'scanningLeftBG'  },
      { name: 'scanRightBG', from: 'scanningLeftBG', to: 'scanningRightBG'},
      { name: 'backToTopCenter', from: 'scanningRightBG', to: 'centerTop'},
      { name: 'scanCenterFront', from: 'centerTop', to: 'scanningCenterFront'},
      { name: 'scanLeftFront', from: 'scanningCenterFront', to: 'scanningLeftFront'},
      { name: 'scanRightFront', from: 'scanningLeftFront', to: 'scanningRightFront'},
      { name: 'finish', from: 'scanningRightFront',    to: 'done' }
    ],
    methods: {
      onStartCalibration: function (){
        displayDialog("Calibrate your camera", "Please take "+VideoScene.options.cameraCalibration.min_init_images+" pictures from the markerboard.","Take picture 1/"+VideoScene.options.cameraCalibration.min_init_images);
      },
      //onPlayAnimation: function() {console.log("play animation"), displayDialog("Scan your glasses", "You will have to scan your glasses from above and from the front","Start Scanning"); showAnimation();},
      onStartGuide:     function() { console.log(t_scanningBG); removeAllARObjects(); displayOverlay(t_scanningBG, "", ""); displayMarkerboardAugmentation();    },
      onScanLeftBG:   function() { showLine(); displayOverlay(t_scanLeftBG, "", ""); showArrow(targetPosBGLeftDir,-0.05); },
      onScanRightBG: function() { console.log(t_scanRightBG); displayOverlay(t_scanRightBG, "", ""); removeARObject(VideoScene.render_camera, arrowHelper); showArrow(targetPosBGRightDir,-0.05); },
      onBackToTopCenter: function() { console.log(t_backToCenterTop); displayOverlay(t_backToCenterTop); removeARObject(VideoScene.render_camera, arrowHelper); showArrow(targetPosBGLeftDir,-0.05);},
      onScanCenterFront: function() { console.log(t_scanningFront); displayOverlay(t_scanningFront, "", ""); removeARObject(VideoScene.render_camera, arrowHelper); showArrow(targetPosFrontDir,0.05); },
      onScanLeftFront: function() { console.log(t_scanningLeftFront); displayOverlay(t_scanningLeftFront, "", ""); removeARObject(VideoScene.render_camera, arrowHelper); showArrow(targetPosBGLeftDir,-0.05); },
      onScanRightFront: function() { console.log(t_scanningRightFront); displayOverlay(t_scanningRightFront, "", ""); removeARObject(VideoScene.render_camera, arrowHelper); showArrow(targetPosBGRightDir,-0.05);},
      onFinish: function() { console.log('Done'); displayMarkerboardAugmentation(false); removeAllARObjects(); displayOverlay("Done", "", ""); removeARObject(VideoScene.render_camera, arrowHelper); }
    }
  });

 function onRender(){
    switch(guide.state){
      case "start":
          //guide.startGuide();
          break;
      case "scanningBG":
          let pos_finder = new THREE.Vector3();
          let pos_board = new THREE.Vector3();
          finder.getWorldPosition(pos_finder);
          markerboard.getWorldPosition(pos_board);

          if(pos_finder.distanceTo(pos_board)<mindist){
              finder.visible =false;
              hideOverlay();
              markerboard.material.color.setHex(boardcolor_tracked);
              guide.scanLeftBG();
          } else{
              finder.visible = true;
              markerboard.material.color.setHex(boardcolor_nottracked);
          }
          break;
      case "scanningLeftBG":
          if(VideoScene.render_camera.position.distanceTo(top_left)<mindist){
              guide.scanRightBG();
          }
          break;
      case "scanningRightBG":
          if(VideoScene.render_camera.position.distanceTo(top_right)<mindist){
              guide.backToTopCenter();
          }
          break;
      case "centerTop":
          if(VideoScene.render_camera.position.distanceTo(top_center)<mindist){
              guide.scanCenterFront();
          }
      case "scanningCenterFront":
          if(VideoScene.render_camera.position.distanceTo(front_center)<mindist){
              guide.scanLeftFront();
          }

          break;
      case "scanningLeftFront":
          if(VideoScene.render_camera.position.distanceTo(front_left)<mindist){
              guide.scanRightFront();
          }
          break;
      case "scanningRightFront":
          if(VideoScene.render_camera.position.distanceTo(front_right)<mindist){
              guide.finish();
          }
          break;
      case "done":
          
          break;
  }
  };

  
function onOpenCVLoaded(){
  //console.log("openCV loaded");
  guide.startCalibration();
}

function calibrationCallback(imagesLeft, motionBlur=false){
  console.log("imagesleft: "+imagesLeft+" "+motionBlur);
  if(imagesLeft>0){
    let index = VideoScene.options.cameraCalibration.min_init_images-imagesLeft+1;
    if(motionBlur){
      displayDialog("Calibrate your camera", "Motion blur too high. Please move slowly!", "Take picture "+ index +"/"+VideoScene.options.cameraCalibration.min_init_images + " again"  );
    } else {
      displayDialog("Calibrate your camera", "Please change the perspective, and take another image", "Take picture "+ index +"/"+VideoScene.options.cameraCalibration.min_init_images  );
    }
  } else {
    guide.startGuide();
  }
}
 
function displayOverlay(text){
    document.getElementById("overlayWButton").style.visibility="hidden";
    document.getElementById("overlay").style.visibility="visible";
    document.getElementById("overlayText").innerHTML = text;
}

function displayDialog(title, text, button){
    document.getElementById("overlayWButton").style.visibility="visible";
    document.getElementById("overlay").style.visibility="hidden";
    document.getElementById("overlayWBTitle").innerHTML = title;
    document.getElementById("overlayWBText").innerHTML = text;
    document.getElementById("overlayWBButton").innerHTML = button;
}

function hideOverlay(){
    document.getElementById("overlay").style.visibility="hidden";
    document.getElementById("overlayWButton").style.visibility="hidden";
}


function handleClick(){
    hideOverlay();
    
    switch(guide.state){
      case "calibratingCamera":
        VideoScene.estimateCameraIntrinsics(calibrationCallback);
      break;
    }

}

function addARObject(obj){
  arObjects.push(obj.name);
  VideoScene.scene.add(obj)
}

function removeARObject(parent, object) {
  let selectedObject = parent.getObjectByName(object.name);
  parent.remove( selectedObject );
}

function removeAllARObjects(){
  for (var i = 0; i < arObjects.length; i++) { //TODO start with 0 to remove line
      var selectedObject = VideoScene.scene.getObjectByName(arObjects[i]);
      VideoScene.scene.remove(selectedObject);
  }
  arObjects = [];
  //animationRunning = false;
}

function showLine(){
  const curveHandles = [];

      const boxGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
      const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x99ff99 });

      let id = 0;
      for (const handlePos of initialPoints) {

          const handle = new THREE.Mesh(boxGeometry, boxMaterial);
          handle.position.copy(handlePos);
          curveHandles.push(handle);

          if (debug) {
              handle.name = "handle" + id;
              id += 1;
              addARObject(handle);
          }
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

let markerboard = null;
let finder = null;
let markerboardwidth = 0.21;
let markerboardheight = 0.297;
let boardcolor_tracked = 0x003ecd;
let boardcolor_nottracked = 0xa6c9ff;

function displayMarkerboardAugmentation(visible){
  if(markerboard==null){

      let geometry = new THREE.PlaneGeometry(markerboardwidth, markerboardheight );
      let material = new THREE.MeshBasicMaterial( {color: boardcolor_nottracked, transparent: true, opacity: 0.5, side: THREE.DoubleSide} );
      markerboard = new THREE.Mesh( geometry, material );
      markerboard.position.set(markerboardwidth/2,markerboardheight/2,0);
      markerboard.translateX(-0.042);
      markerboard.translateY(-0.047);

      VideoScene.scene.add( markerboard );

      let finderwidth = markerboardwidth+0.02;
      let finderheight = markerboardheight+0.02;
      geometry = new THREE.PlaneGeometry(finderwidth, finderheight);
      
      const edges = new THREE.EdgesGeometry( geometry );
      finder = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: boardcolor_tracked} ) );
    
      finder.translateZ(-0.4);
      VideoScene.render_camera.add(finder);
  }
}

function showArrow(dir, translateZ){
  dir.normalize();

  const origin = new THREE.Vector3( 0, 0, 0);
  const length = 0.02;
  const hex = 0xff0000;

  arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
  arrowHelper.translateZ(translateZ);
  //arrowHelper.translateY(-markerboardwidth/2);
  //arrowHelper.translateX(markerboardheight/2+0.05);
  arrowHelper.name="arrowHelper"+dir;
  VideoScene.render_camera.add( arrowHelper );
}

VideoScene.addOpenCVLoadListener(onOpenCVLoaded);
document.getElementById ("overlayWBButton").addEventListener ("click", handleClick);
