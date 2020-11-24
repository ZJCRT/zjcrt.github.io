
/* calibrate_camera
This function initializes the use Aruco board. All details about the board are stored in
the file: aruco_board_definition.json.


Steffen Urban November 2020
*/

function estimate_initial_camera() {



    cam_mat = cv.initCameraMatrix2D(pts3_cont_vec, pts2_cont_vec, img_size);
}

function calibrateCameraSub(backgroundScene) {

    let all_object_pts = new cv.MatVector();
    let all_corner_pts = new cv.MatVector();

    // convert 
    const views = Object.keys(backgroundScene); // get all views
    views.forEach((view, index) => {
        const nr_pts = backgroundScene[view]["obj_pts"].length / 4;
        console.log(backgroundScene[view]["img_pts"])
        const pts2d = cv.matFromArray(nr_pts, 2, cv.CV_32F, backgroundScene[view]["img_pts"]);
        const pts3d = cv.matFromArray(nr_pts, 3, cv.CV_32F, backgroundScene[view]["obj_pts"]);
        all_object_pts.push_back(pts3d);
        all_corner_pts.push_back(pts2d);
    });


    console.log("calibration finished. cleared all cv.Mat()");
    const first_key = Object.keys(backgroundScene)[0]
    const img_size =  backgroundScene[first_key]["image_size"];

    
    let rvecs = new cv.MatVector();
    let tvecs = new cv.MatVector();
    let cameraMatrix = new cv.Mat();
    let distCoeffs = new cv.Mat();
    let stdDeviationsIntrinsics = new cv.MatVector();
    let stdDeviationsExtrinsics = new cv.MatVector();

    cv.calibrateCameraExtended(all_object_pts, all_corner_pts, img_size, 
        cameraMatrix, distCoeffs, rvecs, tvecs, 
        stdDeviationsIntrinsics, stdDeviationsExtrinsics, cv.CALIB_FIX_ASPECT_RATIO + cv.CALIB_ZERO_TANGENT_DIST);

    console.log(cameraMatrix)

    
    console.log("calibration finished. cleared all cv.Mat()");
}