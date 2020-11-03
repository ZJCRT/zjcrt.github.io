export function laplacian(height, width) {
    if (streaming) {
        // inputImage are declared and deleted elsewhere
        inputImage = new cv.Mat(height, width, cv.CV_8UC4);
        grayImage = new cv.Mat();
        laplacianImage = new cv.Mat();
        // "video" is the id of the video tag
        loopIndex = setInterval(
            function(){
                // disable video showing on left side
                // disable video showing on left side
                document.getElementById("video").style.display="none";
                let cap = new cv.VideoCapture("video");
                cap.read(inputImage);
                startTime = performance.now();
                cv.cvtColor(inputImage, grayImage, cv.COLOR_RGBA2GRAY, 0); 
                cv.Laplacian(grayImage, laplacianImage, cv.CV_8UC1)

                endTime = performance.now();    
                
                var timeDiff = endTime - startTime; //in ms 
                document.getElementById("framerate").innerHTML = (1000.0 / timeDiff).toFixed(2) + " FPS";

                cv.imshow("canvasOutput", laplacianImage);
            
            }, 33);
    }
}