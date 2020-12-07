import * as VIDEO from './guide_video.js';

VIDEO.debugGUI.close();

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