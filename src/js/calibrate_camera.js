
/* calibrate_camera
This function initializes the use Aruco board. All details about the board are stored in
the file: aruco_board_definition.json.


Steffen Urban, November 2020, Carl Zeiss AG
*/



function estimateInitialCameraSub() {

    cam_mat = cv.initCameraMatrix2D(pts3_cont_vec, pts2_cont_vec, img_size);
}

function calibrateCameraSub(backgroundScene) {

    let CALIB_FLAGS = cv.CALIB_FIX_ASPECT_RATIO + cv.CALIB_ZERO_TANGENT_DIST;

    let all_object_pts = new cv.MatVector();
    let all_corner_pts = new cv.MatVector();

    // convert 
    const views = Object.keys(backgroundScene); // get all views
    views.forEach((view, index) => {
        const nr_pts = backgroundScene[view]["obj_pts"].length / 3;
        console.log(nr_pts)
        const pts2d = cv.matFromArray(nr_pts, 2, cv.CV_32FC1, backgroundScene[view]["img_pts"]);
        const pts3d = cv.matFromArray(nr_pts, 3, cv.CV_32FC1, backgroundScene[view]["obj_pts"]);
        all_object_pts.push_back(pts3d);
        all_corner_pts.push_back(pts2d);
    });


    console.log("calibration finished. cleared all cv.Mat()");
    const first_key = Object.keys(backgroundScene)[0]
    const img_size =  backgroundScene[first_key]["image_size"];

    
    let rvecs = new cv.MatVector();
    let tvecs = new cv.MatVector();
    let camera_matrix = new cv.Mat();
    let dist_coeffs = new cv.Mat();
    let std_deviations_intrinsics = new cv.Mat();
    let std_deviations_extrinsics = new cv.Mat();
    let per_view_errors = new cv.Mat();

    cv.calibrateCameraExtended(all_object_pts, all_corner_pts, img_size, 
        camera_matrix, dist_coeffs, rvecs, tvecs, 
        std_deviations_intrinsics, std_deviations_extrinsics, per_view_errors, CALIB_FLAGS);

    cam_calib_js = [[camera_matrix.doubleAt(0,0), 0.0,  camera_matrix.doubleAt(0,2)],
                    [0.0, camera_matrix.doubleAt(1,1),  camera_matrix.doubleAt(1,2)],
                    [0.0,                         0.0,                         1.0]];
    dist_coeffs_js = [dist_coeffs.doubleAt(0,0),dist_coeffs.doubleAt(0,1),dist_coeffs.doubleAt(0,2),
                      dist_coeffs.doubleAt(0,3),dist_coeffs.doubleAt(0,4)];

    std_devs_intrinsics = [];
    for (let s = 0; s < std_deviations_intrinsics.rows; ++s) {
        std_devs_intrinsics.push(std_deviations_intrinsics.doubleAt(s,0));
    }
    // save standard deviation for intrinsics
    // 18 values, order is fx, fy, cx, cy, k1, k2, p1, p2, k3, k4, k5, k6, s1, s2, s3, s4, taux, tauy
    backgroundScene["std_intrinsics_calibration"] = std_devs_intrinsics;
    backgroundScene["camera_matrix"] = cam_calib_js;
    backgroundScene["distortion_coefficients"] = dist_coeffs_js;
    for (let i = 0 ; i < views.length; ++i) {
        const view_name = views[i];
        backgroundScene[view_name]["per_view_error"] = per_view_errors.doubleAt(i,0);
        backgroundScene[view_name]["std_extrinsics"] = [
            std_deviations_extrinsics.doubleAt(6*i+0),
            std_deviations_extrinsics.doubleAt(6*i+1),
            std_deviations_extrinsics.doubleAt(6*i+2),
            std_deviations_extrinsics.doubleAt(6*i+3),
            std_deviations_extrinsics.doubleAt(6*i+4),
            std_deviations_extrinsics.doubleAt(6*i+5)];
    }
    
    backgroundScene["num_views"] = views.length;

    rvecs.delete();
    tvecs.delete();
    dist_coeffs.delete();
    camera_matrix.delete();
    std_deviations_extrinsics.delete();
    std_deviations_intrinsics.delete();
    per_view_errors.delete();
    all_object_pts.delete();
    all_corner_pts.delete();
    console.log("calibration finished. cleared all cv.Mat()");

    return backgroundScene;
}