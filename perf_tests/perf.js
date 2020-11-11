
const NUM_ITERS = 100;
let imageLoaded = false;
let objPts = {
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

let fx = 603.85528766 / 2.0;
let fy = 604.03593653 / 2.0;
let cx = 317.48109738 / 2.0;
let cy = 231.79440428 / 2.0;


function aruco(inputImage, width, height) {
    let markerCorners = new cv.MatVector();
    let markerIds = new cv.Mat();
    let cameraMatrix = new cv.Mat();
    cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, 
        [fx, 0., cx, 
         0., fy, cy, 
         0., 0., 1.]);
    let distCoeffs = new cv.Mat();
    distCoeffs = cv.matFromArray(5, 1, cv.CV_64F, [0.0,0.0,0.0,0.0,0.0]);

    let parameter = new cv.aruco_DetectorParameters()
    parameter.adaptiveThreshWinSizeMin = 3;
    parameter.adaptiveThreshWinSizeMax = 23;
    parameter.adaptiveThreshWinSizeStep = 10,
    parameter.adaptiveThreshConstant = 7;
    parameter.cornerRefinementMethod = cv.CORNER_REFINE_SUBPIX; // CORNER_REFINE_NONE
    parameter.cornerRefinementWinSize = 5;
    parameter.cornerRefinementMaxIterations = 5;
    parameter.cameraMotionSpeed = 0.8;
    parameter.useAruco3Detection = true;
    parameter.useGlobalThreshold = true;
    parameter.minSideLengthCanonicalImg = 16;

    let dictionary = new cv.aruco_Dictionary(cv.DICT_ARUCO_ORIGINAL);
    let board = new cv.aruco_GridBoard(2,2, 0.08, 0.02, dictionary); 

    let startTime = performance.now();
    let RgbImage = new cv.Mat();
    let last_run_size = 0.0;
    for (let i = 0; i < NUM_ITERS; ++i) {
        cv.cvtColor(inputImage, RgbImage, cv.COLOR_RGBA2RGB, 0);
        cv.resize(RgbImage, RgbImage, {width:width, height:height})
        parameter.minMarkerLengthRatioOriginalImg = last_run_size;
        last_run_size = cv.detectMarkers(RgbImage, dictionary, markerCorners, markerIds, parameter);
        let nrDetectedPts = 4*markerCorners.size();
            
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

            let pts3_cont_vec = new cv.MatVector();
            let pts2_cont_vec = new cv.MatVector();

            pts3_cont_vec.push_back(objPointsCV.clone());
            pts2_cont_vec.push_back(cornerPtsCV.clone());

            let rvec = new cv.Mat();
            let tvec = new cv.Mat();
            let R_cv = new cv.Mat();

            let valid = cv.solvePnP(objPointsCV, cornerPtsCV, cameraMatrix, distCoeffs, rvec, tvec, false, cv.SOLVEPNP_IPPE)
            // // valid = cv.estimatePoseBoard(markerCorners, markerIds, board, cameraMatrix, distCoeffs, rvec, tvec);
            // if (valid) {
                
            //     let img_size = new cv.Size(width, height);
            //     let cam_mat = new cv.Mat();
            //     cam_mat = cv.initCameraMatrix2D(pts3_cont_vec, pts2_cont_vec, img_size);

            // }
            R_cv.delete();
            rvec.delete();
            tvec.delete();
            pts3_cont_vec.delete();
            pts2_cont_vec.delete();
        }
    }
    let endTime = performance.now();

    var timeDiff = endTime - startTime; //in ms 

    cameraMatrix.delete();
    distCoeffs.delete();
    markerCorners.delete();
    markerIds.delete();
    dictionary.delete();
    board.delete();
    RgbImage.delete();
    parameter.delete();

    return timeDiff;
}

function laplacian(inputImage) {
    let grayImage = new cv.Mat();
    let laplacianImage = new cv.Mat();

    let startTime = performance.now();
    for (let i = 0; i < NUM_ITERS; ++i) {
        cv.cvtColor(inputImage, grayImage, cv.COLOR_RGBA2GRAY, 0); 
        cv.Laplacian(grayImage, laplacianImage, cv.CV_8UC1)
    }
    let endTime = performance.now();

    let timeDiff = endTime - startTime; //in ms 

    grayImage.delete();
    laplacianImage.delete();
    
    return timeDiff;
}


function featureDetection(inputImage, width, height) {
    let detector = new cv.BRISK();
    let grayImage = new cv.Mat();
    let features = new cv.KeyPointVector();
    let descriptors = new cv.Mat();
    let mask = new cv.Mat();

    cv.cvtColor(inputImage, grayImage, cv.COLOR_RGBA2GRAY, 0);
    cv.resize(grayImage, grayImage, {width:width, height:height});

    let startTime = performance.now();

    for (let i=0; i < NUM_ITERS; ++i) {
        detector.detectAndCompute(grayImage,mask, features, descriptors);
    }
    let endTime = performance.now();

    let timeDiff = endTime - startTime; //in ms 

    grayImage.delete();
    features.delete();
    detector.delete();
    descriptors.delete();

    return timeDiff;
}


function onImageLoaded() {
    imageLoaded = true;
}

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

function timeToMsAndFPS(timing) {
    let per_frame = (timing / NUM_ITERS)
    return {'fps' : (1000 / per_frame).toFixed(3), 'ms' :  per_frame.toFixed(4)};
}

function spinnerStatus(spinner_id, set_visible) {
    let el = document.getElementById(spinner_id)
    console.log(el)
    if (el != null) {
        if (set_visible) {
            el.style = "visibility: !important";
        }
        else {
            el.style = "visibility: hidden";
        }
    }
}

function start_benchmarks() {
    input_Image = document.getElementById("input_image")
    while (!imageLoaded) {
        sleep(5);
    }
    let inputImage = new cv.Mat();
    inputImage = cv.imread(input_Image);

    start = document.getElementById("startup");
    start.disabled = true;

    // warmup
    let timings = timeToMsAndFPS(aruco(inputImage, 160, 120));


    spinnerStatus("spin1", true);
    timings = timeToMsAndFPS(aruco(inputImage, 320, 240));
    document.getElementById("ArudoVGA2").innerHTML = "Aruco 320x240: "+ timings['ms'] + "ms, " + timings['fps'] + " fps";
    spinnerStatus("spin1", false);

    spinnerStatus("spin2", true);
    timings = timeToMsAndFPS(aruco(inputImage, 640, 480));
    document.getElementById("ArudoVGA").innerHTML = "Aruco 640x480: "+ timings['ms'] + "ms, " + timings['fps'] + " fps";
    spinnerStatus("spin2", false);

    spinnerStatus("spin3", true);
    timings = timeToMsAndFPS(aruco(inputImage, 1920, 1080));
    document.getElementById("ArudoFullHD").innerHTML = "Aruco 1920x1080: "+ timings['ms'] + "ms, " + timings['fps'] + " fps";
    spinnerStatus("spin3", false);

    spinnerStatus("spin4", true);
    timings = timeToMsAndFPS(laplacian(inputImage));
    document.getElementById("Laplacian").innerHTML = "Laplacian 1920x1080: "+ timings['ms'] + "ms, " + timings['fps'] + " fps";
    spinnerStatus("spin4", false);
    inputImage.delete()

    timings = timeToMsAndFPS(featureDetection(inputImage, 320, 240));
    document.getElementById("Akaze1").innerHTML = "ORB 320x240: "+ timings['ms'] + "ms, " + timings['fps'] + " fps";
    // timings = timeToMsAndFPS(featureDetection(inputImage, 640, 480));
    // document.getElementById("Akaze2").innerHTML = "Laplacian 320x240: "+ timings['ms'] + "ms, " + timings['fps'] + " fps";

}






