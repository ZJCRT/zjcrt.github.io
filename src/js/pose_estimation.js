/* Calculate pose for tracking and AR

Use Aruco3 features to speed up tracking and an minimal aruco size

Steffen Urban, November 2020, Carl Zeiss AG
*/

let last_min_seg_img_size = 0.0;

const TRACKING_WIDTH = 360; 
const TRACKING_HEIGHT = 640;


function poseEstimationSub(gray_image, camera_matrix, dist_coeffs, aruco_board) {

    const original_w = gray_image.cols;
    // resize to tracking size
    cv.resize(gray_image, gray_image, {width:TRACKING_WIDTH, height:TRACKING_HEIGHT});
    const downsample_f = TRACKING_WIDTH / original_w;
    camera_matrix[0] *= downsample_f;
    camera_matrix[2] *= downsample_f;
    camera_matrix[4] *= downsample_f;
    camera_matrix[5] *= downsample_f;

    const parameters = aruco_board["aruco_parameters"];
     
    parameters.adaptiveThreshWinSizeMin = 3;
    parameters.adaptiveThreshWinSizeMax = 23;
    parameters.adaptiveThreshWinSizeStep = 10;
    parameters.cornerRefinementMethod = cv.CORNER_REFINE_NONE;
    parameters.cornerRefinementWinSize = 5;
    parameters.cornerRefinementMaxIterations = 5;

    // this is all new Aruco3 stuff
    parameters.cameraMotionSpeed = 0.9;
    parameters.useAruco3Detection = true;
    parameters.useGlobalThreshold = false;
    parameters.minSideLengthCanonicalImg = 16;

    let marker_ids = new cv.Mat();
    let marker_corners  = new cv.MatVector();

    let startTime = performance.now();
    // detect markers
    parameters.minMarkerLengthRatioOriginalImg = last_min_seg_img_size;
    // detect markers
    last_min_seg_img_size = cv.detectMarkers(gray_image, aruco_board["aruco_dictionary"], marker_corners, marker_ids, parameters);

    let corners_js = [];
    let obj_pts_js = [];
    let marker_ids_js = [];

    // console.log("TRACKING: detected: "+marker_ids.rows+" markers.")
    let valid_pose = false;
    if (marker_ids.rows < 1) {
        const m = new THREE.Matrix4();
        m.set( 1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1.);
        return {"hom_mat" : m, "quaternion_xyzw" : [0., 0., 0., 1.], 
                "position" : [0., 0., 0.0], "valid" : false,
                "est_time" : performance.now() - startTime};
    } else {
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
        const nr_detected_pts = marker_corners.size() * 4;
        let obj_points_cv = cv.matFromArray(nr_detected_pts, 3, cv.CV_32F, obj_pts_js)
        let corner_points_cv = cv.matFromArray(nr_detected_pts, 2, cv.CV_32F, corners_js)
        let dist_coeffs_cv = cv.matFromArray(1, 5, cv.CV_32F, dist_coeffs)
        let camera_matrix_cv = cv.matFromArray(3, 3, cv.CV_32F, camera_matrix)

        let rvec = new cv.Mat();
        let tvec = new cv.Mat();
        if (marker_corners.size() == 1) {
            valid_pose = cv.solvePnP(obj_points_cv, corner_points_cv, 
                camera_matrix_cv, dist_coeffs_cv, 
                rvec, tvec, false, cv.SOLVEPNP_IPPE_SQUARE)
        } else {
            valid_pose = cv.solvePnP(obj_points_cv, corner_points_cv, 
                camera_matrix_cv, dist_coeffs_cv, 
                rvec, tvec, false, cv.SOLVEPNP_IPPE)            
        }

    
        let return_pose = {};
        const est_time = performance.now() - startTime;
        if (valid_pose) {
            return_pose = opencvPoseToThreejsPose(rvec, tvec);
            return_pose["valid"] = true;
            return_pose["est_time"] = est_time
        } else {
            return_pose = {"hom_mat" : m, "quaternion_xyzw" : [0., 0., 0., 1.], 
                           "position" : [0., 0., 0.], "valid" : false, 
                           "est_time" : est_time};
        }
        rvec.delete();
        tvec.delete();
        obj_points_cv.delete();
        corner_points_cv.delete();
        return return_pose;
    }
}

