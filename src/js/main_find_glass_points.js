//'use strict';
import cv_service from '../services/cv_service.js';

let image_loaded = false;
// In this case, We set width 320, and the height will be computed based on the input stream.
let width = 0;
let height = 0;
// whether streaming video from the camera.
let streaming = false;

// Some HTML elements we need to configure.
let video = null;
let start = null;
let stop = null;
let stream = null;

// setup canvases
// let videoImage = document.getElementById('video_canvas');
// var videoImageContext = videoImage.getContext("2d");
// let videoDom = document.getElementById('video');
let input_image_canvas = document.getElementById('input_image_canvas');
let input_image_canvas_context = input_image_canvas.getContext("2d");
let input_image = document.getElementById('input_image');
let std_mul_3d_slider = document.getElementById("std_mul_3d");
let std_mul_3d_val = document.getElementById("std_mul_3d_val");
let std_mul_2d_slider = document.getElementById("std_mul_2d");
let std_mul_2d_val = document.getElementById("std_mul_2d_val");

const GLASS_PT_ID = "210";
const BBOX_WIDTH = 0.07; //cm
const BBOX_HEIGHT = 0.04; //cm
const BBOX_DEPTH = 0.01; //cm

// FROM CALIBRATION!
//const intrinsics = [593.90, 593.90, 316.76, 234.79,0.15, -0.95, 0.0, 0.0, 1.23];
const intrinsics_test_img = [1075.054, 1082.1237, 726.064, 540.432, 0.0277482, -0.04758056, 0.0, 0.0, -0.02537952];

// this object will store all extracted aruco corners and so on 
// for camera calibration
let glassScene = {};

let cur_view_id = 0;


function log(...args) {
    // We pass the arguments to console.log() directly. Not an "arguments array"
    // so that both of log('foo') and log('foo', 'bar') works as we expect.
    console.log(...args);

    // Also we will show the logs in the DOM.
    document.getElementById('webworkerlog').innerHTML = args.join(' ');
}

// create a bounding box for the glass position in 3D
function create_3d_bbox(center_pt, width=0.07, height=0.04, depth=0.01) {
    const w2 = width / 2.0;
    const d2 = depth / 2.0;
    const mean_center_pt_x = 
        (center_pt[0][0] + center_pt[1][0] + center_pt[2][0] + center_pt[3][0]) / 4.0;
    const mean_center_pt_y = 
        (center_pt[0][1] + center_pt[1][1] + center_pt[2][1] + center_pt[3][1]) / 4.0;

    const p1_x = mean_center_pt_x + w2;
    const p1_y = mean_center_pt_y + d2;
    const p1_z = 0.0;

    const p2_x = mean_center_pt_x + w2;
    const p2_y = mean_center_pt_y - d2;
    const p2_z = 0.0;

    const p3_x = mean_center_pt_x - w2;
    const p3_y = mean_center_pt_y - d2;
    const p3_z = 0.0;

    const p4_x = mean_center_pt_x - w2;
    const p4_y = mean_center_pt_y + d2;
    const p4_z = 0.0;
 
    const bbox = [
        [p1_x, p1_y, p1_z],
        [p2_x, p2_y, p2_z],
        [p3_x, p3_y, p3_z],
        [p4_x, p4_y, p4_z],
        [p1_x, p1_y, p1_z+height],
        [p2_x, p2_y, p2_z+height],
        [p3_x, p3_y, p3_z+height],
        [p4_x, p4_y, p4_z+height],
    ];

    return bbox;
}

function draw_bbox(ctx, bbox_in_image) {
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 10;
    // lower rect
    for (let i = 0; i < 3; ++i) {
        ctx.beginPath();
        ctx.moveTo(bbox_in_image[i][0], bbox_in_image[i][1]);
        ctx.lineTo(bbox_in_image[i+1][0], bbox_in_image[i+1][1]);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(bbox_in_image[3][0], bbox_in_image[3][1]);
    ctx.lineTo(bbox_in_image[0][0], bbox_in_image[0][1]);
    ctx.stroke();
    // upper rect
    for (let i = 4; i < 7; ++i) {
        ctx.beginPath();
        ctx.moveTo(bbox_in_image[i][0], bbox_in_image[i][1]);
        ctx.lineTo(bbox_in_image[i+1][0], bbox_in_image[i+1][1]);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(bbox_in_image[7][0], bbox_in_image[7][1]);
    ctx.lineTo(bbox_in_image[4][0], bbox_in_image[4][1]);
    ctx.stroke();
    // lower to upper lines
    for (let i = 0; i < 4; ++i) {
        ctx.beginPath();
        ctx.moveTo(bbox_in_image[i][0], bbox_in_image[i][1]);
        ctx.lineTo(bbox_in_image[i+4][0], bbox_in_image[i+4][1]);
        ctx.stroke();
    }
}

function initVideo(ev){
    if (!streaming) {
        height = video.videoHeight;
        width = video.videoWidth;
        video.setAttribute("width", width);
        video.setAttribute("height", height);

        videoImageContext.clearRect(0, 0, width, height);

        streaming = true;
        stop.disabled = false;
        playVideo();
    }
}

var constraints = {
    audio: false,
    video: {
        facingMode: "environment",
        width: { min: 320, max: 1920 },
        height: { min: 240, max: 1080 },
    },
};

function playVideo() {
    if (!streaming) {
        console.warn("Please startup your webcam");
        return;
    }

    start.disabled = true;
}

function startup() {
    // video = document.getElementById("video");
    // start = document.getElementById("startup");
    // stop = document.getElementById("stop");
    // // start camera
    // navigator.mediaDevices.getUserMedia(constraints)
    //     .then(function(s) {
    //         stream = s;
    //         video.srcObject = stream;
    //         video.play();
    //     })
    //     .catch(function(err) {
    //         console.log("An error occured! " + err);
    // });
    // load webworker
    cv_service.loadArucoWebWorker();
    //video.addEventListener("canplay", initVideo, false);
}

function stopCamera() {
    video.pause();
    video.srcObject = null;
    stream.getVideoTracks()[0].stop();
    start.disabled = false;
    video.removeEventListener("canplay", initVideo);
}

async function takeImage() {

    // get image from video context and send it to the aruco extraction worker
    videoImageContext.drawImage(videoDom, 0, 0);
    const imageData = videoImageContext.getImageData(0, 0, width, height);
    
    // get aruco board dict from worker
    const aruco_board_res = await cv_service.returnArucoBoard();
    const aruco_board = aruco_board_res.data;
    if (aruco_board != undefined) {
        // create prior bounding box around glass
        const glass_bbox = create_3d_bbox(
            aruco_board.payload["aurco_fullboard_object_points"][GLASS_PT_ID], 
            BBOX_WIDTH, BBOX_HEIGHT, BBOX_DEPTH);
        console.log(glass_bbox)

        // extract aruco markers
        const aruco_points = await cv_service.extractArucoForGlass(
            {'image' : imageData, 'glass_bbox' : glass_bbox, 'intrinsics' : intrinsics, 'view_id' : cur_view_id});

        cur_view_id += 1;
        const view_id = "view_"+aruco_points.data.payload["view_id"]
        // glassScene is global
        glassScene[view_id] = {};
        glassScene[view_id]["obj_pts"] = aruco_points.data.payload["obj_pts_js"];
        glassScene[view_id]["img_pts"] = aruco_points.data.payload["corners_js"];
        glassScene[view_id]["image_size"] = aruco_points.data.payload["image_size"];
    }

}

async function startCalc() {
    while (!image_loaded) {
        sleep(5);
    }

    height = document.getElementById('input_image').height;
    width = document.getElementById('input_image').width;

    input_image_canvas_context.drawImage(input_image, 0, 0, width, height);
    const image_data = input_image_canvas_context.getImageData(0, 0, width, height);
    
    // get aruco board dict from worker
    const aruco_board_res = await cv_service.returnArucoBoard();
    const aruco_board = aruco_board_res.data;
    if (aruco_board != undefined) {
        // create prior bounding box around glass
        const glass_bbox = create_3d_bbox(
            aruco_board.payload["aurco_fullboard_object_points"][GLASS_PT_ID], 
            BBOX_WIDTH, BBOX_HEIGHT, BBOX_DEPTH);
        console.log(glass_bbox)
        
        // set hyperparameters
        const hyperparams = {"std_mul_3d" : std_mul_3d_slider.value,
                             "std_mul_2d" : std_mul_2d_slider.value,}

        // extract aruco markers
        const aruco_points = await cv_service.extractArucoForGlass(
            {'image' : image_data, 'glass_bbox' : glass_bbox, 
            'intrinsics' : intrinsics_test_img, "hyperparams" : hyperparams,
            'view_id' : cur_view_id});

        cur_view_id += 1;

        const view_id = "view_"+aruco_points.data.payload["view_id"]
        // glassScene is global
        glassScene[view_id] = {};
        glassScene[view_id]["cam_position"] = aruco_points.data.payload["cam_position"];
        glassScene[view_id]["cam_translation"] = aruco_points.data.payload["cam_translation"];
        glassScene[view_id]["cam_rotation_world_to_cam"] = aruco_points.data.payload["cam_rotation_world_to_cam"];
        glassScene[view_id]["object_point_indices"] = aruco_points.data.payload["object_point_indices"];
        glassScene[view_id]["directions"] = aruco_points.data.payload["directions"];
        glassScene[view_id]["image_points"] = aruco_points.data.payload["image_points"];
        glassScene[view_id]["glass_bbox_2d"] = aruco_points.data.payload["glass_bbox_2d"];
        glassScene[view_id]["glass_bbox_3d"] = glass_bbox;
        glassScene[view_id]["bbox_region"] = aruco_points.data.payload["bbox_region"];

        // paint output
        var R = 2;
        for (let i = 0; i < glassScene[view_id]["image_points"].length; ++i) {
            input_image_canvas_context.beginPath();
            input_image_canvas_context.arc(
                glassScene[view_id]["image_points"][i][0], glassScene[view_id]["image_points"][i][1], R, 0, 2 * Math.PI, false);
            input_image_canvas_context.lineWidth = 3;
            input_image_canvas_context.strokeStyle = '#FF0000';
            input_image_canvas_context.stroke();
        }
        // draw bounding box
        draw_bbox(input_image_canvas_context, glassScene[view_id]["glass_bbox_2d"]);
    }

}

function onImageLoaded() {
    image_loaded = true;
}

document.querySelector('#input_image').onload = onImageLoaded();

document.querySelector('#startup').addEventListener('click', startup);
document.querySelector('#stop').addEventListener('click', stopCamera);
document.querySelector('#startcalc').addEventListener('click', startCalc);
//document.querySelector('#takeimage').addEventListener('click', takeImage);


// SLIDER
// Update the current slider value (each time you drag the slider handle)
std_mul_3d_slider.oninput = function() {
    std_mul_3d_val.innerHTML = this.value;
    startCalc();
}
std_mul_2d_slider.oninput = function() {
    std_mul_2d_val.innerHTML = this.value;
    startCalc();
}