let imageLoaded = false;
let imageMaskLoaded = false;

function mask_segmentation(inputImage, width, height) {
    let grayImage = new cv.Mat();
    let threshImage = new cv.Mat();
    let kernel = cv.Mat.ones(3, 3, cv.CV_8U);

    cv.resize(inputImage, grayImage, {width:width, height:height});

    let startTime = performance.now();

    cv.cvtColor(grayImage, grayImage, cv.COLOR_RGBA2GRAY, 0);
    const ostu_val = cv.threshold(grayImage, threshImage, 0, 255, cv.THRESH_OTSU);

    console.log("otsu val"+ostu_val);

    cv.morphologyEx(threshImage, threshImage, cv.MORPH_CLOSE, kernel);

    // clear_border
    const top = parseInt(.1*height);
    const left = parseInt(.1*width);
    const bottom = top;
    const right = left;

    cv.copyMakeBorder(threshImage, threshImage, top, bottom, left, right, cv.BORDER_CONSTANT, true);

    let resultImg = new cv.Mat();
    cv.resize(threshImage, resultImg, {width:width/4, height:height/4});
    cv.imshow("mask_result", resultImg);

    let endTime = performance.now();

    let timeDiff = endTime - startTime; //in ms 

    grayImage.delete();
    threshImage.delete();
    return timeDiff;
}

function onRgbImageLoaded() {
    imageLoaded = true;
}

function onMaskImageLoaded() {
    imageMaskLoaded = true;
}

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

function timeToMsAndFPS(timing) {
    let per_frame = timing
    return {'fps' : (1000 / per_frame).toFixed(3), 'ms' :  per_frame.toFixed(4)};
}

function start_mask_segmentation() {
    input_Image = document.getElementById("rgb_glass_image");
    while (!imageLoaded) {
        sleep(5);
    }
    let inputImage = new cv.Mat();
    inputImage = cv.imread(input_Image);

    start = document.getElementById("startup");
    start.disabled = true;

    // warmup
    let timings = timeToMsAndFPS(mask_segmentation(inputImage, 1920, 1080));

    inputImage.delete();
}



