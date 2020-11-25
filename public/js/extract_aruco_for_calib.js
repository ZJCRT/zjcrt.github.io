
/* extract aruco markers for calibration

Steffen Urban, November 2020, Carl Zeiss AG
*/

function extractArucoForCalibSub(image_payload, aruco_board, view_id_idx) {

    const input_image = cv.matFromImageData(image_payload);
    const parameters = aruco_board["aruco_parameters"]
     
    parameters.adaptiveThreshWinSizeMin = 3;
    parameters.adaptiveThreshWinSizeMax = 23;
    parameters.adaptiveThreshWinSizeStep = 10,
    parameters.cornerRefinementMethod = cv.CORNER_REFINE_SUBPIX;
    parameters.cornerRefinementWinSize = 5;
    parameters.cornerRefinementMaxIterations = 30;

    // this is all new Aruco3 stuff
    parameters.useAruco3Detection = false;
    //parameters.cameraMotionSpeed = 0.8;
    //parameters.useGlobalThreshold = true;
    //parameters.minSideLengthCanonicalImg = 16;

    let marker_ids = new cv.Mat();
    let marker_corners  = new cv.MatVector();
    let gray_image = new cv.Mat();

    // "video" is the id of the video tag
    cv.cvtColor(input_image, gray_image, cv.COLOR_RGBA2GRAY);
    // detect markers
    cv.detectMarkers(gray_image, aruco_board["aruco_dictionary"], marker_corners, marker_ids, parameters);

    const nr_detected_pts = 4 * marker_corners.size();
    let corners_js = [];
    let obj_pts_js = [];
    console.log("detected: "+marker_ids.rows+" markers.")
    if (marker_ids.rows > 0) {
        for (let i = 0; i < marker_corners.size(); ++i) {
            const corners = marker_corners.get(i);
            const id = marker_ids.intAt(0,i);
            for (let c = 0; c < 8; ++c) {
              corners_js.push(corners.floatAt(0,c));
            }
            for (let p = 0; p < 4; ++p) {
              for (let c = 0; c < 3; ++c) {
                obj_pts_js.push(aruco_board["aurco_tracking_object_points"][id][p][c]) 
              }
            }
        }
    }

    result = {"view_id" : view_id_idx, 
              "obj_pts_js" : obj_pts_js, 
              "corners_js" : corners_js,
              "image_size" : {width : gray_image.cols, height : gray_image.rows}};
    gray_image.delete();
    marker_corners.delete();
    marker_ids.delete();
    return result;
}
