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

let last_min_seg_img_size = 0.0;
const TRACKING_WIDTH = 320;
const TRACKING_HEIGHT = 240;

// initialize aruco stuff 
let aruco_board = null;
let view_id_idx = 0;

// extracts Aruco markers for camera calibration
function extractArucoForCalib({ msg, payload }) {
    const input_image = cv.matFromImageData(payload);
    const is_blurry = hasMotionBlur(input_image);
    let marker_dict = {};
  
    if (!is_blurry) {
        marker_dict = extractArucoFullSize(input_image, aruco_board, view_id_idx);
        // now check reprojection errors and select glass points
        view_id_idx += 1;
    }
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
    const is_blurry = hasMotionBlur(input_image);
    let marker_dict = {};
    let segmented_markers = {};
    if (!is_blurry) {
        marker_dict = extractArucoFullSize(input_image, aruco_board, view_id_idx);
        // now check reprojection errors and select glass points
        segmented_markers = findPointsInGlass(
          marker_dict, payload["intrinsics"], aruco_board, payload["glass_bbox"], payload["hyperparams"]);
        segmented_markers["view_id"] = view_id_idx;
        view_id_idx += 1;
    }
    postMessage({ msg, payload: segmented_markers});    
}


function returnArucoBoard({msg, payload}) {
    postMessage({ msg, payload: aruco_board});  
}


/**
 * With OpenCV we have to work the images as cv.Mat (matrices),
 * so the first thing we have to do is to transform the
 * ImageData to a type that openCV can recognize.
 */
function poseEstimation({ msg, payload }) {
    const input_image = cv.matFromImageData(payload);
    // inputImage are declared and deleted elsewhere
    const dictionary = new cv.aruco_Dictionary(cv.DICT_ARUCO_ORIGINAL);
    const parameter = new cv.aruco_DetectorParameters()
    const board = new cv.aruco_GridBoard(2, 2, 0.08, 0.02, dictionary);
    const objPts = {
                "100" : 
                  [0.        , 0.17999999, 0.        ,
                   0.08      , 0.17999999, 0.        ,
                   0.08      , 0.09999999, 0.        ,
                   0.        , 0.09999999, 0.        ],
                "101" : 
                  [0.09999999, 0.17999999, 0.        ,
                  0.17999999, 0.17999999, 0.        ,
                  0.17999999, 0.09999999, 0.        ,
                  0.09999999, 0.09999999, 0.        ],
                "102" : 
                  [0.  , 0.08, 0.  ,
                   0.08, 0.08, 0.  ,
                   0.08, 0.  , 0.  ,
                   0.  , 0.  , 0.  ],
                "103" : 
                  [0.09999999, 0.08      , 0.        ,
                   0.17999999, 0.08      , 0.        ,
                   0.17999999, 0.        , 0.        ,
                   0.09999999, 0.        , 0.        ]
            };

    parameter.adaptiveThreshWinSizeMin = 3;
    parameter.adaptiveThreshWinSizeMax = 23;
    parameter.adaptiveThreshWinSizeStep = 10,
    parameter.adaptiveThreshConstant = 7;
    parameter.cornerRefinementMethod = cv.CORNER_REFINE_SUBPIX;
    parameter.cornerRefinementWinSize = 5;
    parameter.cornerRefinementMaxIterations = 5;
    // this is all new stuff
    parameter.cameraMotionSpeed = 0.8;
    parameter.useAruco3Detection = true;
    parameter.useGlobalThreshold = true;
    parameter.minSideLengthCanonicalImg = 16;

    let markerIds = new cv.Mat();
    let markerCorners  = new cv.MatVector();
    let grayImage = new cv.Mat();
    let fx = 603.85528766 ;
    let fy = 604.03593653;
    let cx = 317.48109738;
    let cy = 231.79440428;
    if ( TRACKING_WIDTH == 320) {
        fx /= 2.0;
        fy /= 2.0;
        cx /= 2.0;
        cy /= 2.0;
    }
    
    cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, 
                                    [fx, 0., cx, 
                                     0., fy, cy, 
                                     0., 0., 1.]);
    distCoeffs = cv.matFromArray(5, 1, cv.CV_64F, 
        [1.23291906e-01, -5.63173016e-01, -1.41618636e-03, 4.32680318e-04, -7.77739837e-02]);

    // "video" is the id of the video tag
    cv.cvtColor(inputImage, grayImage, cv.COLOR_RGBA2GRAY);
    // resize to tracking size
    cv.resize(grayImage, grayImage, {width:TRACKING_WIDTH, height:TRACKING_HEIGHT});
    // init new marker length ratio from last frame
    parameter.minMarkerLengthRatioOriginalImg = last_min_seg_img_size;
    // detect markers
    last_min_seg_img_size = cv.detectMarkers(grayImage, dictionary, markerCorners, markerIds, parameter);

    let nrDetectedPts = 4 * markerCorners.size();
    let return_pose = [1,0,0,0,0,0,0]; // [qw, qx, qy, qz, px, py, pz]
    if (markerIds.rows > 0) {
        let cornersJs = [];
        let objPtsJs = [];
        for (let i = 0; i < markerCorners.size(); ++i) {
            let corners = markerCorners.get(i);
            let id = markerIds.intAt(0,i);
            for (let c = 0; c < 8; ++c) {
                cornersJs.push(corners.floatAt(0,c));
            }
            for (let c = 0; c < 3*4; ++c) {
                objPtsJs.push(objPts[id][c]) 
             }
        }

        let objPointsCV = cv.matFromArray(nrDetectedPts, 3, cv.CV_32F, objPtsJs)
        let cornerPtsCV = cv.matFromArray(nrDetectedPts, 2, cv.CV_32F, cornersJs)

        // let pts3_cont_vec = new cv.MatVector();
        // let pts2_cont_vec = new cv.MatVector();

        // pts3_cont_vec.push_back(objPointsCV.clone());
        // pts2_cont_vec.push_back(cornerPtsCV.clone());

        let rvec = new cv.Mat();
        let tvec = new cv.Mat();

        let valid = cv.solvePnP(objPointsCV, cornerPtsCV, cameraMatrix, distCoeffs, rvec, tvec, false, cv.SOLVEPNP_IPPE)

        let R_cv = new cv.Mat();
        if (valid) {
            // let img_size = new cv.Size(width, height);
            // let cam_mat = new cv.Mat();
            // cam_mat = cv.initCameraMatrix2D(pts3_cont_vec, pts2_cont_vec, img_size);
            return_pose = opencvPoseToOpenGL(rvec, tvec);
        }
        R_cv.delete();
        rvec.delete();
        tvec.delete();
    }

    board.delete();
    parameter.delete();
    inputImage.delete();
    cameraMatrix.delete();
    distCoeffs.delete();
    grayImage.delete();
    markerIds.delete();
    markerCorners.delete();
    dictionary.delete();

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
      default:
        break
    }
  }

}