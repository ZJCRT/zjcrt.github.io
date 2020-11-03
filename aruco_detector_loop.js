export function aruco() {
    // inputImage are declared and deleted elsewhere
    inputImage = new cv.Mat(height, width, cv.CV_8UC4);
    markerImage = new cv.Mat();
    //dictionary = new cv.Dictionary(0);
    //dictionary.markerSize = 3;
    //dictionary.maxCorrectionBits = 1;
    //dictionary.bytesList.delete();
    //// dictionary.bytesList = cv.matFromArray(1, 2, cv.CV_8UC4, [197, 71,  81, 248, 226, 163, 31, 138]);
    //dictionary.bytesList = cv.matFromArray(1, 2, cv.CV_8UC4, [177, 0, 135, 0, 70, 1, 112, 1]);
    dictionary = new cv.Dictionary(cv.DICT_ARUCO_ORIGINAL);
    parameter = new cv.DetectorParameters();

    // parameter.adaptiveThreshWinSizeMin = 3,
    parameter.adaptiveThreshWinSizeMin = 23;
    // parameter.adaptiveThreshWinSizeMax = 23,
    parameter.adaptiveThreshWinSizeMax = 23;
    parameter.adaptiveThreshWinSizeStep = 10,
    parameter.adaptiveThreshConstant = 7;
    // parameter.minMarkerPerimeterRate = 0.03;
    parameter.minMarkerPerimeterRate = 0.1;
    parameter.maxMarkerPerimeterRate = 4;
    parameter.polygonalApproxAccuracyRate = 0.03;
    parameter.minCornerDistanceRate = 0.05;
    parameter.minDistanceToBorder = 3;
    parameter.minMarkerDistanceRate = 0.05;
    parameter.cornerRefinementMethod = cv.CORNER_REFINE_SUBPIX; // CORNER_REFINE_NONE
    parameter.cornerRefinementWinSize = 5;
    parameter.cornerRefinementMaxIterations = 10;
    parameter.cornerRefinementMinAccuracy = 0.1;
    parameter.markerBorderBits = 1;
    // parameter.perspectiveRemovePixelPerCell = 4;
    parameter.perspectiveRemovePixelPerCell = 2;
    parameter.perspectiveRemoveIgnoredMarginPerCell = 0.13;
    parameter.maxErroneousBitsInBorderRate = 0.35;
    parameter.minOtsuStdDev = 5.0;
    parameter.errorCorrectionRate = 0.6;

    markerIds = new cv.Mat();
    markerCorners  = new cv.MatVector();
    rvecs = new cv.Mat();
    tvecs = new cv.Mat();
    RgbImage = new cv.Mat();
    let fx = 1.2*width;
    let fy = 1.2*width;
    let cx = width / 2.0;
    let cy = height / 2.0;

    cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, 
                                    [fx, 0., cx, 
                                     0., fy, cy, 
                                     0., 0., 1.]);
    distCoeffs = cv.matFromArray(5, 1, cv.CV_64F, [0.0,0.0,0.0,0.0,0.0]);
    // "video" is the id of the video tag
    loopIndex = setInterval(
        function(){
            // disable video showing on left side
            //document.getElementById("video").style.display="none";

            let cap = new cv.VideoCapture("video");
            cap.read(inputImage);
            cv.cvtColor(inputImage, RgbImage, cv.COLOR_RGBA2RGB, 0);
            startTime = performance.now();
            cv.detectMarkers(RgbImage, dictionary, markerCorners, markerIds, parameter);
            endTime = performance.now();    
            if (markerIds.rows > 0) {
                cv.drawDetectedMarkers(RgbImage, markerCorners, markerIds);
                cv.estimatePoseSingleMarkers(markerCorners, 0.1, cameraMatrix, distCoeffs, rvecs, tvecs);
                for(let i=0; i < markerIds.rows; ++i) {
                    let rvec = cv.matFromArray(3, 1, cv.CV_64F, [rvecs.doublePtr(0, i)[0], rvecs.doublePtr(0, i)[1], rvecs.doublePtr(0, i)[2]]);
                    let tvec = cv.matFromArray(3, 1, cv.CV_64F, [tvecs.doublePtr(0, i)[0], tvecs.doublePtr(0, i)[1], tvecs.doublePtr(0, i)[2]]);
                    cv.drawAxis(RgbImage, cameraMatrix, distCoeffs, rvec, tvec, 0.1);
                    
                    rvec.delete();
                    tvec.delete();
                }
            }
            
            var timeDiff = endTime - startTime; //in ms 
            document.getElementById("framerate").innerHTML = (1000.0 / timeDiff).toFixed(2) + " FPS";
            document.getElementById("nrdetectedmarkers").innerHTML = markerIds.rows;

            cv.imshow("canvasOutput", RgbImage);
        }, 33);
}