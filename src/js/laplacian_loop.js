export function laplacian(height, width) {
    // inputImage are declared and deleted elsewhere
    let inputImage = new cv.Mat(height, width, cv.CV_8UC4);
    let grayImage = new cv.Mat();
    let laplacianImage = new cv.Mat();
    // "video" is the id of the video tag
    loopIndex = setInterval(
        function(){
            // disable video showing on left side
            // disable video showing on left side
            document.getElementById("video").style.display="none";
            let cap = new cv.VideoCapture("video");
            cap.read(inputImage);
            let startTime = performance.now();
            cv.cvtColor(inputImage, grayImage, cv.COLOR_RGBA2GRAY, 0); 
            cv.Laplacian(grayImage, laplacianImage, cv.CV_8UC1)

            let endTime = performance.now();    
            
            let timeDiff = endTime - startTime; //in ms 
            document.getElementById("framerate").innerHTML = (1000.0 / timeDiff).toFixed(2) + " FPS";

            cv.imshow("canvasOutput", laplacianImage);
        
        }, 30);
        
    if (laplacianImage != null && !laplacianImage.isDeleted()) {
        laplacianImage.delete();
        laplacianImage = null;
    }
}