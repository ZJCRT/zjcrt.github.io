const OCV2OGL = new math.matrix([[1.0,0.0,0.0],[0.0,-1.0,0.0],[0.0,0.0,-1.0]])
const MINUSMAT3 = new math.matrix([[-1.,-1.,-1.],[-1.,-1.,-1.],[-1.,-1.,-1.]]);
const MINUSVEC3 = new math.matrix([-1.,-1.,-1.]);

function opencv_mat3x3_to_math_mat(X) {
    return new math.matrix([
        [X.doubleAt(0,0),X.doubleAt(0,1),X.doubleAt(0,2)],
        [X.doubleAt(1,0),X.doubleAt(1,1),X.doubleAt(1,2)],
        [X.doubleAt(2,0),X.doubleAt(2,1),X.doubleAt(2,2)]]);
}

function opencv_mat1x3_to_math_mat(X) {
    return new math.matrix([X.doubleAt(0,0), X.doubleAt(0,1), X.doubleAt(0,2)]);
}

function minus_mat3(X) {
    return math.dotMultiply(MINUSMAT3,X);
}

function minus_vec3(X) {
    return math.dotMultiply(MINUSVEC3,X);
}

function math_mat_Rt_to_threejs4x4(R,t) {
    var matrix = new THREE.Matrix4();
    matrix.set(
        R._data[0][0], R._data[0][1], R._data[0][2], t._data[0],
        R._data[1][0], R._data[1][1], R._data[1][2], t._data[1],
        R._data[2][0], R._data[2][1], R._data[2][2], t._data[2],
        0, 0, 0, 1);
    return matrix;
}

function opencvPoseToThreejsPose(rcv, tcv) {
    let R_cv = new cv.Mat();
    // from rodrigues to rotation matrix
    cv.Rodrigues(rcv, R_cv);
    const R_cv_m = opencv_mat3x3_to_math_mat(R_cv)
    const t_cv_m = opencv_mat1x3_to_math_mat(tcv)

    const R_cv_m_t = math.transpose(R_cv_m);

    // camera pose in OpenGL format
    const X_ogl = math.multiply(minus_mat3(R_cv_m_t), t_cv_m)
    const R_ogl = math.multiply(R_cv_m_t, OCV2OGL)

    const hom_matrix = math_mat_Rt_to_threejs4x4(R_ogl, X_ogl)
    let quat = new THREE.Quaternion();
    quat.setFromRotationMatrix(hom_matrix);

    R_cv.delete();

    return {"hom_mat" : hom_matrix, 
            "quaternion_xyzw" : [quat._x, quat._y, quat._z,quat._w], 
            "position" : [X_ogl._data[0],X_ogl._data[1],X_ogl._data[2]]};
}


function isPointInRect(pt_xy, region) { 
    return pt_xy[0] > region[0] && 
           pt_xy[1] > region[1] && 
           pt_xy[0] < region[2] && 
           pt_xy[1] < region[3]
}


function isPointInRectCV(pt_xy, region) { 
    return pt_xy.floatAt(0) > region[0] && 
           pt_xy.floatAt(1) > region[1] && 
           pt_xy.floatAt(0) < region[2] && 
           pt_xy.floatAt(1) < region[3]
}


function reprojErrorCV(obj_pts_cv, corner_pts_cv, rvec, tvec, camera_matrix, dist_coeffs) {
    let img_projection = new cv.Mat();

    cv.projectPoints(obj_pts_cv, rvec, tvec, camera_matrix, dist_coeffs, img_projection);
    const dist_img_x = img_projection.floatAt(0) - corner_pts_cv.floatAt(0);
    const dist_img_y = img_projection.floatAt(1) - corner_pts_cv.floatAt(1);

    img_projection.delete();
    return math.sqrt(dist_img_x*dist_img_x + dist_img_y*dist_img_y)
}