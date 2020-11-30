/* check for motion blur using the laplacian

Steffen Urban, November 2020, Carl Zeiss AG
*/


function hasMotionBlur(gray_image, motion_blur_thresh = 250) {

    let laplacianImage = new cv.Mat();
    let mean = new cv.Mat();
    let std = new cv.Mat();

    cv.Laplacian(gray_image, laplacianImage, cv.CV_64FC1);
    cv.meanStdDev(laplacianImage, mean, std);
    const variance = std.doubleAt(0) * std.doubleAt(0);
    // check variance
    return {"has_motion_blur" : variance < motion_blur_thresh, "laplacian_variance" : variance};
}