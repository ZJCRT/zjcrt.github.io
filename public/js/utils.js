const OCV2OGL = new math.matrix([[1.0,0.0,0.0],[0.0,-1.0,0.0],[0.0,0.0,-1.0]])
const MINUS = new math.matrix([[-1.,-1.,-1.],[-1.,-1.,-1.],[-1.,-1.,-1.]]);

function opencv_mat3x3_to_math_mat(X) {
    return new math.matrix([
        [X.doubleAt(0,0),X.doubleAt(0,1),X.doubleAt(0,2)],
        [X.doubleAt(1,0),X.doubleAt(1,1),X.doubleAt(1,2)],
        [X.doubleAt(2,0),X.doubleAt(2,1),X.doubleAt(2,2)]]);
}

function opencv_mat1x3_to_math_mat(X) {
    return new math.matrix([X.doubleAt(0,0), X.doubleAt(0,1), X.doubleAt(0,2)]);
}

function minus_mat(X) {
    return math.dotMultiply(MINUS,X);
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

function opencv_pose_to_threejs_pose(rcv, tcv) {
    // from rodrigues to rotation matrix
    cv.Rodrigues(rcv, R_cv);
    const R_cv_m = opencv_mat3x3_to_math_mat(R_cv)
    const t_cv_m = opencv_mat1x3_to_math_mat(tcv)

    const R_cv_m_t = math.transpose(R_cv_m);

    // camera pose in OpenGL format
    const X_ogl = math.multiply(minus_mat(R_cv_m_t), t_cv_m)
    const R_ogl = math.multiply(R_cv_t, OCV2OGL)

    const hom_matrix = math_mat_Rt_to_threejs4x4(R_ogl, X_ogl)
    var quaternion = new THREE.Quaternion();
    quaternion.setFromRotationMatrix(matrix);

    R_cv.delete();

    return {"hom_mat" : hom_matrix, "rotation_q" : quaternion, "position" : X_ogl};
}