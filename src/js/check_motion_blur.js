/* check for motion blur using the laplacian

Steffen Urban, November 2020, Carl Zeiss AG
*/


function hasMotionBlur(image) {

    let grayImage = new cv.Mat();
    let laplacianImage = new cv.Mat();

    // cv.cvtColor(image, grayImage, cv.COLOR_RGBA2GRAY, 0); 
    // cv.Laplacian(grayImage, laplacianImage, cv.CV_8UC1);

    // check variance
    let motion_blur = false;
    return motion_blur;
}