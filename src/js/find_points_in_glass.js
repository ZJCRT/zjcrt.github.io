/* Find points that lie in the glass image


Steffen Urban, November 2020, Carl Zeiss AG
*/


function project_ray_to_world(R, t, obj_pt_cv, img_pt_cv, camera_matrix, dist_coeffs) {

    let undist_pt = new cv.Mat();
    const dummy_ = new cv.Mat();
    const term_crit = new cv.TermCriteria(1,5,1e-3);

    const obj_pt = math.matrix([
        obj_pt_cv.floatAt(0),
        obj_pt_cv.floatAt(1),
        obj_pt_cv.floatAt(2)]);
    
    // rotate the object point to the camera and calculate it's length
    // then get the ray of the image observation
    // then scale this ray. It should coincide with the object point 
    const pt3_in_cam = math.add(math.multiply(R, obj_pt), t); 
    const pt3_norm = math.norm(pt3_in_cam);
    cv.undistortPointsIter(img_pt_cv, undist_pt,
                           camera_matrix, dist_coeffs, 
                           dummy_, dummy_, term_crit); 

    const ray_norm = math.sqrt(
        undist_pt.floatAt(0)*undist_pt.floatAt(0) + undist_pt.floatAt(1)*undist_pt.floatAt(1) + 1.0);

    // check is length is > some eps
    if (ray_norm < 0.00001) {
        undist_pt.delete();
        dummy_.delete();
        return undefined;
    }
    const ray = [undist_pt.floatAt(0) / ray_norm, undist_pt.floatAt(1) / ray_norm, 1./ray_norm];
    const ray_scaled = math.matrix([pt3_norm * ray[0], pt3_norm * ray[1], pt3_norm * ray[2]]);

    // now rotate the vector back to the world to compare it with the board
    ray_in_world = math.multiply(math.transpose(R),math.subtract(ray_scaled, t));

    undist_pt.delete();
    dummy_.delete();
    return {"ray_in_world" : ray_in_world, "obj_pt" : obj_pt, "bearing_vector" : ray};
}

// scene - a scene structure
function findPointsInGlass(markers, intrinsics, aruco_dict, glass_bbox, hyperparams) {

    const camera_matrix = cv.matFromArray(3, 3, cv.CV_64F, 
        [intrinsics[0], 0., intrinsics[2], 
         0., intrinsics[1], intrinsics[3], 
         0., 0., 1.]);
    const dist_coeffs = cv.matFromArray(1, 5, cv.CV_64F,
        [intrinsics[4],intrinsics[5],intrinsics[6],intrinsics[7],intrinsics[8]]);

    // get all detected corners and collect in cv array
    const nr_initial_pts = markers["obj_pts_js"].length / 3;
    if (nr_initial_pts < 10) {
        return {};
    }
    let obj_pts_cv = cv.matFromArray(nr_initial_pts, 3, cv.CV_32F, markers["obj_pts_js"]);
    let corner_pts_cv = cv.matFromArray(nr_initial_pts, 2, cv.CV_32F, markers["corners_js"]);
    
    // initialize rotation, tanslation and inliers vectors for PnPRansac
    let rvec = cv.matFromArray(1, 3, cv.CV_32F, [0.,0.,0.]);
    let tvec = cv.matFromArray(1, 3, cv.CV_32F, [0.,0.,0.]);
    let inliers = new cv.Mat();
    // solvePnPRansac --> ransac because some points are obviously in the glass, 
    // however we do not yet know which
    let valid = cv.solvePnPRansac(
        obj_pts_cv, corner_pts_cv,     
        camera_matrix, dist_coeffs, 
        rvec, tvec, 
        false, 100, 4.0, 0.99, 
        inliers, cv.SOLVEPNP_AP3P);

    if (!valid) {
        return {};
    }
    // get all inliers and again estimate the pose;
    let obj_pts_cv_inl = new cv.Mat.zeros(inliers.rows, 3, cv.CV_32FC1);
    let corner_pts_cv_inl = new cv.Mat.zeros(inliers.rows, 2, cv.CV_32FC1);
    for (let i = 0; i < inliers.rows; ++i) {
        const in_idx = inliers.intAt(i);
        for (let j = 0; j < 3; ++j) {
            obj_pts_cv_inl.floatPtr(i,j)[0] = obj_pts_cv.floatPtr(in_idx,j)[0];
        }
        for (let j = 0; j < 2; ++j) {
            corner_pts_cv_inl.floatPtr(i,j)[0] = corner_pts_cv.floatPtr(in_idx,j)[0];
        }   
    }
    // solvePnPRefineLM --> refines the pose using only the inliers
    cv.solvePnPRefineLM(obj_pts_cv_inl, corner_pts_cv_inl, camera_matrix, dist_coeffs,rvec, tvec);


    // project bbox to image
    // first create opencv variable
    const glass_bbox_cont = math.matrix(glass_bbox).reshape([8*3]);
    const bbox_ocv = cv.matFromArray(8, 3, cv.CV_32FC1, glass_bbox_cont._data);
    let bbox_in_img = new cv.Mat();
    cv.projectPoints(bbox_ocv, rvec, tvec, camera_matrix, dist_coeffs, bbox_in_img);
    let x_coords_bbox = [];
    let y_coords_bbox = [];
    let bbox_2d = [];
    for (let i = 0; i < 8; ++i) {
        x_coords_bbox.push(bbox_in_img.floatPtr(i)[0]);
        y_coords_bbox.push(bbox_in_img.floatPtr(i)[1]);
        bbox_2d.push([bbox_in_img.floatPtr(i)[0],bbox_in_img.floatPtr(i)[1]]);
    }
    // compose to a region in which we allow detected marker points
    // this is probably also possible on the bbox_2d matrix
    const bbox_region = [math.min(x_coords_bbox), math.min(y_coords_bbox),
                         math.max(x_coords_bbox), math.max(y_coords_bbox)];

    let R_cv = new cv.Mat();
    cv.Rodrigues(rvec, R_cv);
    const R = opencv_mat3x3_to_math_mat(R_cv);
    const t = opencv_mat1x3_to_math_mat(tvec);

    const img_projection = new cv.Mat();
    let pt3_errors = [];
    let reproj_error = [];

    // now iterate indices and calculate some statistics for reprojection errors and so on
    for (let i = 0; i < inliers.rows; ++i) {
        //const in_idx = inliers.intAt(i);
        //const aruco_id = markers["aruco_ids"][in_idx];
        const projected_pt_res = project_ray_to_world(
            R, t, obj_pts_cv_inl.row(i),corner_pts_cv_inl.row(i), camera_matrix, dist_coeffs);
        
        if (projected_pt_res["ray_in_world"] === undefined) {
            continue;
        }
        pt3_errors.push(math.subtract(projected_pt_res["ray_in_world"],projected_pt_res["obj_pt"])._data);
        // in addition calculate the reprojection error
        reproj_error.push(reprojErrorCV(
            obj_pts_cv_inl.row(i), corner_pts_cv_inl.row(i), rvec, tvec, camera_matrix, dist_coeffs));
        
    }
    //const pt3_error_mat = math.matrix(pt3_errors);
    const pt3_errors_mean = math.mean(pt3_errors,0);
    const pt3_errors_std = math.std(pt3_errors,0);
    const repro_errors_mean = math.mean(reproj_error,0);
    const repro_errors_std = math.std(reproj_error,0);

    const scaled_std_threshs = [hyperparams["std_mul_3d"]*pt3_errors_std[0],
                                hyperparams["std_mul_3d"]*pt3_errors_std[1],
                                hyperparams["std_mul_3d"]*pt3_errors_std[2]];

    const scaled_std_reproj = repro_errors_std*hyperparams["std_mul_2d"];
    let object_point_indices = [];
    let directions = [];
    let image_points = [];
    // now iterate all small markers and check their reprojection error
    for (let i = 0; i < markers["aruco_ids"].length; ++i) {
        const cont_id = 4*i;
        // check if it is even in the glass bbox 
        if (!isPointInRectCV(corner_pts_cv.row(cont_id), bbox_region)) {
            continue;
        }
        // if it is in the glass box check statistics of point
        // project to image
        for (let s = 0; s < 4; ++s) {
            const cont_id_s = cont_id + s;
            const projected_pt_res = project_ray_to_world(
                R, t, obj_pts_cv.row(cont_id_s),corner_pts_cv.row(cont_id_s), camera_matrix, dist_coeffs);
            
            if (projected_pt_res["ray_in_world"] === undefined) {
                continue;
            }
            const pt3_diff = math.subtract(projected_pt_res["ray_in_world"],projected_pt_res["obj_pt"])._data;
            const pt2_diff = reprojErrorCV(
                obj_pts_cv.row(cont_id_s), corner_pts_cv.row(cont_id_s), rvec, tvec, camera_matrix, dist_coeffs);

            // now do some test magic
            const is_above_or_below_z = pt3_diff[0] > pt3_errors_mean[0] + scaled_std_threshs[0] ||
                                        pt3_diff[0] < pt3_errors_mean[0] - scaled_std_threshs[0] ||
                                        pt3_diff[1] > pt3_errors_mean[1] + scaled_std_threshs[1] ||
                                        pt3_diff[1] < pt3_errors_mean[1] - scaled_std_threshs[1] ||
                                        pt3_diff[2] > pt3_errors_mean[2] + scaled_std_threshs[2] ||
                                        pt3_diff[2] < pt3_errors_mean[2] - scaled_std_threshs[2];
            const is_above_reproj_error = pt2_diff > (repro_errors_mean+scaled_std_reproj);

            if (is_above_or_below_z || is_above_reproj_error) {
                directions.push(projected_pt_res["bearing_vector"]);
                object_point_indices.push([markers["aruco_ids"][i] * 4 + s]);
                image_points.push([corner_pts_cv.row(cont_id_s).floatAt(0), corner_pts_cv.row(cont_id_s).floatAt(1)]);
            }
        }
    }

    bbox_ocv.delete();
    camera_matrix.delete();
    dist_coeffs.delete();
    rvec.delete();
    tvec.delete();
    inliers.delete();
    obj_pts_cv_inl.delete();
    corner_pts_cv_inl.delete();
    obj_pts_cv.delete();
    corner_pts_cv.delete();    

    return {"glass_bbox_2d" : bbox_2d,
            "bbox_region" : bbox_region,
            "cam_position" : minus_vec3(math.multiply(math.transpose(R),t))._data,
            "cam_translation" : t,
            "cam_rotation_world_to_cam" : R,
            "object_point_indices" : object_point_indices,
            "directions" : directions,
            "image_points" : image_points
            };
}

