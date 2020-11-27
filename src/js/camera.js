

// projects points to the camera
export function camera_to_pixel_coordinates() {

}

// projects points to the camera
export function world_to_camera_coordinates() {

}


// projects points to the camera
export function pixel_to_camera_coordinates() {

}



export function camera_pose_from_aruco_points(markerCorners, markerIds, solve_ransac, 
                                              refine=true, ransac_reproj_error=4.0) {
    // get all points and fill them in lists
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
    // create opencv matrices
    let objPointsCV = cv.matFromArray(nrDetectedPts, 3, cv.CV_32F, objPtsJs)
    let cornerPtsCV = cv.matFromArray(nrDetectedPts, 2, cv.CV_32F, cornersJs)

    let rvec = cv.matFromArray(1, 3, cv.CV_32F, [0.0,0.0,0.0]);
    let tvec = cv.matFromArray(1, 3, cv.CV_32F, [0.0,0.0,0.0]);
    cv.drawDetectedMarkers(RgbImage, markerCorners, markerIds);
     
    let valid = False;
    
    if (solve_ransac) {
        cv.solvePnPRansac(objPointsCV, cornerPtsCV, cameraMatrix, distCoeffs, 
            rvec, tvec, false, 100, ransac_reproj_error, 0.99, cv.SOLVEPNP_IPPE);
    } else {
        cv.solvePnP(objPointsCV, cornerPtsCV, cameraMatrix, distCoeffs, rvec, tvec, false, cv.SOLVEPNP_IPPE)
    }

    if (refine) {
        // refine 
        // get inliers first
        solvePnPRefineLM(objPointsCV, cornerPtsCV, cameraMatrix, distCoeffs, rvec, tvec);
    }

    // convert to javascript types and delete opencv variables

    rvec.delete();
    tvec.delete();
    objPointsCV.delete();
    cornerPtsCV.delete();

    return {"valid" : valid, }
}



