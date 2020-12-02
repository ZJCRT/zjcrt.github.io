// Steffen Urban, November 2020, Carl Zeiss AG

// used example structure from https://github.com/vinissimus/opencv-js-webworker
if( 'function' === typeof importScripts) {
self.importScripts('../js_libs/math.js', '../js_libs/three.min.js');
self.importScripts('./calibrate_camera.js');
self.importScripts('./cv_utils.js');
self.importScripts('./aruco_init.js');
self.importScripts('../resource/aruco_board_definition.js');
self.importScripts('./extract_aruco_markers_fullsize.js');
self.importScripts('./find_points_in_glass.js');
self.importScripts('./check_motion_blur.js');
self.importScripts('./pose_estimation.js');

const TRACKING_WIDTH = 480;
const TRACKING_HEIGHT = 360;
// initialize aruco stuff 
let view_id_idx = 0;

// extracts Aruco markers for camera calibration
function extractArucoForCalib({ msg, payload }) {
    const input_image = cv.matFromImageData(payload);
    // convert to grayscale image and check motion blur
    let gray_image = new cv.Mat();
    cv.cvtColor(input_image, gray_image, cv.COLOR_RGBA2GRAY);
    const is_blurry = hasMotionBlur(gray_image);
    let aruco_board = init_aruco();
    let marker_dict = {};
  
    if (!is_blurry["has_motion_blur"]) {
        marker_dict = extractArucoFullSize(gray_image, aruco_board, view_id_idx);
        // now check reprojection errors and select glass points
        view_id_idx += 1;
    }
    marker_dict["has_motion_blur"] = is_blurry["has_motion_blur"];
    marker_dict["laplacian_variance"] = is_blurry["laplacian_variance"];
    
    gray_image.delete();
    postMessage({ msg, payload: marker_dict});
}

// camera calibration
// Input: the backgroundScene 
// Output: the backgroundScene with calibration
function calibrateCamera({ msg, payload }) {
    const background_scene = calibrateCameraSub(payload);
    postMessage({ msg, payload: background_scene});
}

// extract aruco for glass images
function extractArucoForGlass({msg, payload}) {
    const input_image = cv.matFromImageData(payload["image"]);
    // convert to grayscale image and check motion blur
    let gray_image = new cv.Mat();
    cv.cvtColor(input_image, gray_image, cv.COLOR_RGBA2GRAY);
    const is_blurry = hasMotionBlur(gray_image);
    let aruco_board = init_aruco();

    let marker_dict = {};
    let segmented_markers = {};
    if (!is_blurry["has_motion_blur"]) {
        marker_dict = extractArucoFullSize(input_image, aruco_board, view_id_idx);
        // now check reprojection errors and select glass points
        segmented_markers = findPointsInGlass(
          marker_dict, payload["intrinsics"], aruco_board, payload["glass_bbox"], payload["hyperparams"]);
        segmented_markers["view_id"] = view_id_idx;
        view_id_idx += 1;
    } 

    segmented_markers["has_motion_blur"] = is_blurry["has_motion_blur"];
    segmented_markers["laplacian_variance"] = is_blurry["laplacian_variance"];

    gray_image.delete();
    postMessage({ msg, payload: segmented_markers});    
}


function returnArucoBoard({msg, payload}) {
    let aruco_board = init_aruco();
    postMessage({ msg, payload: aruco_board});  
}

// quick initial camera intrinsics estimation
// Input: the initScene 
// Output: the initScene with calibration for one frame
function estimateInitialCamera({ msg, payload }) {
  const init_scene = estimateInitialCameraSub(payload);
  postMessage({ msg, payload: init_scene});
}


function poseEstimation({ msg, payload }) {
    const input_image = cv.matFromImageData(payload["image"]);
    let gray_image = new cv.Mat();
    let aruco_board = init_aruco();
    
    // "video" is the id of the video tag
    cv.cvtColor(input_image, gray_image, cv.COLOR_RGBA2GRAY);
    const original_w = gray_image.cols;
    // resize to tracking size
    cv.resize(gray_image, gray_image, {width:TRACKING_WIDTH, height:TRACKING_HEIGHT});
    let camera_matrix = payload["camera_matrix"];
    const downsample_f = TRACKING_WIDTH / original_w;
    camera_matrix[0] *= downsample_f;
    camera_matrix[2] *= downsample_f;
    camera_matrix[4] *= downsample_f;
    camera_matrix[5] *= downsample_f;
    const return_pose = poseEstimationSub(gray_image, camera_matrix, payload["dist_coeffs"], aruco_board);
    gray_image.delete();
    input_image.delete();
    postMessage({ msg, payload: return_pose});
}



/**
 * This function is to convert again from cv.Mat to ImageData
 */
function imageDataFromMat(mat) {
  // convert the mat type to cv.CV_8U
  const img = new cv.Mat()
  const depth = mat.type() % 8
  const scale =
    depth <= cv.CV_8S ? 1.0 : depth <= cv.CV_32S ? 1.0 / 256.0 : 255.0
  const shift = depth === cv.CV_8S || depth === cv.CV_16S ? 128.0 : 0.0
  mat.convertTo(img, cv.CV_8U, scale, shift)

  // convert the img type to cv.CV_8UC4
  switch (img.type()) {
    case cv.CV_8UC1:
      cv.cvtColor(img, img, cv.COLOR_GRAY2RGBA)
      break
    case cv.CV_8UC3:
      cv.cvtColor(img, img, cv.COLOR_RGB2RGBA)
      break
    case cv.CV_8UC4:
      break
    default:
      throw new Error(
        'Bad number of channels (Source image must have 1, 3 or 4 channels)'
      )
  }
  const clampedArray = new ImageData(
    new Uint8ClampedArray(img.data),
    img.cols,
    img.rows
  )
  img.delete()
  return clampedArray
}

/**
 *  Here we will check from time to time if we can access the OpenCV
 *  functions. We will return in a callback if it has been resolved
 *  well (true) or if there has been a timeout (false).
 */
function waitForOpencv(callbackFn, waitTimeMs = 10000, stepTimeMs = 100) {
  if (cv.Mat) callbackFn(true)

  let timeSpentMs = 0
  const interval = setInterval(() => {
    const limitReached = timeSpentMs > waitTimeMs
    if (cv.Mat || limitReached) {
      clearInterval(interval)
      return callbackFn(!limitReached)
    } else {
      timeSpentMs += stepTimeMs
    }
  }, stepTimeMs)
}

/**
 * This exists to capture all the events that are thrown out of the worker
 * into the worker. Without this, there would be no communication possible
 * with our project.
 */
self.onmessage = function (evt) {
  switch (evt.data.msg) {
    case 'load': {
      // Import Webassembly script
      self.importScripts('../js_libs/opencv_wasm.js');
      waitForOpencv(function (success) {
        if (success) {
          // initialize the aruco board here directly
          aruco_board = init_aruco();
          console.log("===================== aruco board initialized");

          postMessage({ msg: evt.data.msg });
          console.log("===================== opencv loaded");
        } 
        else throw new Error('Error on loading OpenCV')
      })
      break
    }
    case 'poseEstimation':
      if (aruco_board != null) {
        return poseEstimation(evt.data);
      }
    case 'extractArucoForCalib':
      if (aruco_board != null) {
        return extractArucoForCalib(evt.data);
      }
    case 'calibrateCamera':
      if (aruco_board != null) {
        return calibrateCamera(evt.data);
      }
    case 'returnArucoBoard':
      if (aruco_board != null) {
        return returnArucoBoard(evt.data);
      }
    case 'extractArucoForGlass':
      if (aruco_board != null) {
        return extractArucoForGlass(evt.data);
      }
    case 'estimateInitialCamera':
      if (aruco_board != null) {
        return estimateInitialCamera(evt.data);
      }
    default:
      break
  }
}

}