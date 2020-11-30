
/*
Steffen Urban, November 2020, Carl Zeiss AG
*/

function extractArucoFullSize(gray_image, aruco_board, view_id_idx) {

    let parameters = aruco_board["aruco_parameters"];
     
    parameters.adaptiveThreshWinSizeMin = 3;
    parameters.adaptiveThreshWinSizeMax = 23;
    parameters.adaptiveThreshWinSizeStep = 10,
    parameters.cornerRefinementMethod = cv.CORNER_REFINE_SUBPIX;
    parameters.cornerRefinementWinSize = 5;
    parameters.cornerRefinementMaxIterations = 30;

    // this is all new Aruco3 stuff
    parameters.useAruco3Detection = false;

    let marker_ids = new cv.Mat();
    let marker_corners  = new cv.MatVector();

    // detect markers
    cv.detectMarkers(gray_image, aruco_board["aruco_dictionary"], marker_corners, marker_ids, parameters);

    let corners_js = [];
    let obj_pts_js = [];
    let marker_ids_js = [];
    console.log("detected: "+marker_ids.rows+" markers.")
    if (marker_ids.rows > 0) {
        for (let i = 0; i < marker_corners.size(); ++i) {
            const corners = marker_corners.get(i);
            const id = marker_ids.intAt(0,i);
            marker_ids_js.push(id);
            for (let c = 0; c < 8; ++c) {
                corners_js.push(corners.floatAt(0,c));
            }
            for (let p = 0; p < 4; ++p) {
                for (let c = 0; c < 3; ++c) {
                  obj_pts_js.push(aruco_board["aurco_fullboard_object_points"][id][p][c]) 
                }
            }
        }
    }

    result = {"view_id" : view_id_idx, 
              "obj_pts_js" : obj_pts_js, 
              "corners_js" : corners_js,
              "aruco_ids" : marker_ids_js,
              "image_size" : {width : gray_image.cols, height : gray_image.rows}};
    marker_corners.delete();
    marker_ids.delete();
    return result;
}
