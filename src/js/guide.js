import * as VideoScene from './guide_video.js';

VideoScene.debugGUI.close();

//wait until openCV is loaded ... then display dialog

var guide = new StateMachine({
    init: 'start',
    transitions: [
      { name: 'playAnimation',     from: 'start',  to: 'playingAnimation' },
      { name: 'startGuide',     from: 'playingAnimation',  to: 'scanningBG' },
      { name: 'scanLeftBG',   from: 'scanningBG', to: 'scanningLeftBG'  },
      { name: 'scanRightBG', from: 'scanningLeftBG', to: 'scanningRightBG'},
      { name: 'backToTopCenter', from: 'scanningRightBG', to: 'centerTop'},
      { name: 'scanCenterFront', from: 'centerTop', to: 'scanningCenterFront'},
      { name: 'scanLeftFront', from: 'scanningCenterFront', to: 'scanningLeftFront'},
      { name: 'scanRightFront', from: 'scanningLeftFront', to: 'scanningRightFront'},
      { name: 'finish', from: 'scanningRightFront',    to: 'done' }
    ],
    methods: {
      onPlayAnimation: function() {console.log("play animation"), displayDialog("Scan your glasses", "You will have to scan your glasses from above and from the front","Start Scanning"); showAnimation();},
      onStartGuide:     function() { console.log(t_scanningBG); removeDisplayedObjects(); displayOverlay(t_scanningBG, "", ""); displayMarkerboardAugmentation();    },
      onScanLeftBG:   function() { mindist = 0.23; console.log(t_scanLeftBG); showLine(); displayOverlay(t_scanLeftBG, "", ""); showArrow(targetPosBGLeftDir,-0.05); },
      onScanRightBG: function() { console.log(t_scanRightBG); displayOverlay(t_scanRightBG, "", ""); removeEntity(render_camera, arrowHelper); showArrow(targetPosBGRightDir,-0.05); },
      onBackToTopCenter: function() { console.log(t_backToCenterTop); displayOverlay(t_backToCenterTop); removeEntity(render_camera, arrowHelper); showArrow(targetPosBGLeftDir,-0.05);},
      onScanCenterFront: function() { console.log(t_scanningFront); displayOverlay(t_scanningFront, "", ""); removeEntity(render_camera, arrowHelper); showArrow(targetPosFrontDir,0.05); },
      onScanLeftFront: function() { console.log(t_scanningLeftFront); displayOverlay(t_scanningLeftFront, "", ""); removeEntity(render_camera, arrowHelper); showArrow(targetPosBGLeftDir,-0.05); },
      onScanRightFront: function() { console.log(t_scanningRightFront); displayOverlay(t_scanningRightFront, "", ""); removeEntity(render_camera, arrowHelper); showArrow(targetPosBGRightDir,-0.05);},
      onFinish: function() { console.log('Done'); displayMarkerboardAugmentation(false); removeDisplayedObjects(); displayOverlay("Done", "", ""); removeEntity(render_camera, arrowHelper); }
    }
  });

  VideoScene.addOpenCVLoadListener(onOpenCVLoaded);
  
  function onOpenCVLoaded(){
    console.log("openCV loaded");
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
    //guide.startGuide();

}