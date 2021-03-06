// In this case, We set width 320, and the height will be computed based on the input stream.
let width = 0;
let height = 0;
let size_initialized = false;
// whether streaming video from the camera.
let streaming = false;

// Some HTML elements we need to configure.
let video = null;
let start = null;
let stop = null;
let stream = null;

let loopIndex = 0;

let dictionary = null;
let parameter = null;
let inputImage = null;
let markerImage = null;
let RgbImage = null;
let cap = null;
let markerCorners = null;
let markerIds = null;
let laplacianImage = null;
let cameraMatrix = null;
let distCoeffs = null;
let grayImage = null;
let rvec = null;
let tvec = null;
let board = null;

let run_interval = 30; // fps
let fielf_of_view_render_cam = 53;

// setup a basic scene
let scene = new THREE.Scene();

let threejsImage = document.getElementById('threejs_canvas');
let videoImage = document.getElementById('video_canvas');
var videoImageContext = videoImage.getContext("2d");

let renderer = new THREE.WebGLRenderer({canvas: threejsImage, alpha: true } ); 
let videoDom = document.getElementById('video');


renderer.shadowMap.enabled = true;
let render_camera = null;
//// This is where we create our off-screen render target ////
const geometry = new THREE.BoxGeometry(0.08,0.08,0.08);
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
cube.position.set(0,0,0);
scene.add(cube);
 


// // Create a different scene to hold our buffer objects
// let bufferScene = new THREE.Scene();
// // Create the texture that will store our result
// let bufferTexture = null;
 
 
function render() {
    requestAnimationFrame( render );
    // Render onto our off-screen texture
    // renderer.render(bufferScene, camera, bufferTexture);
    // Finally, draw to the screen

    renderer.render( scene, camera );
}


// function read(a) {
//     alert(a);
// }

function initVideo(ev){
    if (!streaming) {
        height = video.videoHeight;
        width = video.videoWidth;
        video.setAttribute("width", width);
        video.setAttribute("height", height);

        document.getElementById("imgsize").innerHTML = "Video size (w,h): " + width + " , " + height + " pixel";
        videoImageContext.clearRect(0, 0, width, height);

        streaming = true;
        stop.disabled = false;
        playVideo();
    }
}

var constraints = {
    audio: false,
    video: {
        facingMode: "environment",
        width: { min: 320, max: 640 },
        height: { min: 240, max: 480 },
    },
};

function startup() {
    video = document.getElementById("video");
    start = document.getElementById("startup");
    stop = document.getElementById("stop");
    // start camera
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(s) {
            stream = s;
            video.srcObject = stream;
            video.play();
        })
        .catch(function(err) {
            console.log("An error occured! " + err);
    });

    video.addEventListener("canplay", initVideo, false);
}

function NewMatrix3(
	m11, m12, m13,
	m21, m22, m23,
	m31, m32, m33
) {
	var matrix = new THREE.Matrix3();
	matrix.set(
		m11, m12, m13,
		m21, m22, m23,
		m31, m32, m33);
	return matrix;
}


function CreateOpenCv2WebGlCorrectionMatrix() {
	var openCv2WebGl = new THREE.Matrix3();
	openCv2WebGl.multiplyMatrices(
		NewMatrix3(
			Math.cos(Math.PI), -Math.sin(Math.PI), 0,
			Math.sin(Math.PI), Math.cos(Math.PI), 0,
			0, 0, 1), 
		NewMatrix3(
			Math.cos(Math.PI), 0, -Math.sin(Math.PI),
			0, 1, 0,
			Math.sin(Math.PI), 0, Math.cos(Math.PI)));
	return openCv2WebGl;
}

function TransformToWebGlPose(pose, correctionMatrix) {
	var position = MathUtils.GetPosition(pose.matrix);
	var correctedOrientation = ApplyCorrection(correctionMatrix, MathUtils.GetRotationMatrix(pose.matrix)).elements;
	var converted = new THREE.Matrix4();
	converted.set(
		correctedOrientation[0], correctedOrientation[3], correctedOrientation[6], position.x,
		correctedOrientation[1], correctedOrientation[4], correctedOrientation[7], position.y,
		correctedOrientation[2], correctedOrientation[5], correctedOrientation[8], position.z,
		0, 0, 0, 1);
	pose.matrix = converted;
	return pose;
}

function upate_video_context() {
    videoImageContext.drawImage(videoDom, 0,0);
    requestAnimationFrame(upate_video_context); // wait for the browser to be ready to present another animation fram.       
}

function aruco() {
    // inputImage are declared and deleted elsewhere
    markerImage = new cv.Mat();
    dictionary = new cv.aruco_Dictionary(cv.DICT_ARUCO_ORIGINAL);
    parameter = new cv.aruco_DetectorParameters()
    board = new cv.aruco_GridBoard(2,2, 0.08, 0.02, dictionary);

    // let objPts =  [[0.        , 0.17999999, 0.        ],
    //                [0.08      , 0.17999999, 0.        ],
    //                [0.08      , 0.09999999, 0.        ],
    //                [0.        , 0.09999999, 0.        ],
    //                [0.09999999, 0.17999999, 0.        ],
    //                [0.17999999, 0.17999999, 0.        ],
    //                [0.17999999, 0.09999999, 0.        ],
    //                [0.09999999, 0.09999999, 0.        ],
    //                [0.  , 0.08, 0.  ],
    //                [0.08, 0.08, 0.  ],
    //                [0.08, 0.  , 0.  ],
    //                [0.  , 0.  , 0.  ],
    //                [0.09999999, 0.08      , 0.        ],
    //                [0.17999999, 0.08      , 0.        ],
    //                [0.17999999, 0.        , 0.        ],
    //                [0.09999999, 0.        , 0.        ]]

    let objPts = {
                "100" : 
                  [0.        , 0.17999999, 0.        ,
                   0.08      , 0.17999999, 0.        ,
                   0.08      , 0.09999999, 0.        ,
                   0.        , 0.09999999, 0.        ],
                "101" : 
                  [0.09999999, 0.17999999, 0.        ,
                  0.17999999, 0.17999999, 0.        ,
                  0.17999999, 0.09999999, 0.        ,
                  0.09999999, 0.09999999, 0.        ],
                "102" : 
                  [0.  , 0.08, 0.  ,
                   0.08, 0.08, 0.  ,
                   0.08, 0.  , 0.  ,
                   0.  , 0.  , 0.  ],
                "103" : 
                  [0.09999999, 0.08      , 0.        ,
                   0.17999999, 0.08      , 0.        ,
                   0.17999999, 0.        , 0.        ,
                   0.09999999, 0.        , 0.        ]
            };

    parameter.adaptiveThreshWinSizeMin = 3;
    parameter.adaptiveThreshWinSizeMax = 23;
    // parameter.adaptiveThreshWinSizeMax = 23,
    parameter.adaptiveThreshWinSizeStep = 10,
    parameter.adaptiveThreshConstant = 7;
    parameter.cornerRefinementMethod = cv.CORNER_REFINE_SUBPIX; // CORNER_REFINE_NONE
    parameter.cornerRefinementWinSize = 5;
    parameter.cornerRefinementMaxIterations = 5;
    parameter.cameraMotionSpeed = 0.8;
    parameter.useAruco3Detection = true;
    parameter.useGlobalThreshold = true;
    parameter.minSideLengthCanonicalImg = 16;

    markerIds = new cv.Mat();
    markerCorners  = new cv.MatVector();
    rvecs = new cv.Mat();
    tvecs = new cv.Mat();
    RgbImage = new cv.Mat();
    let fx = 603.85528766 ;
    let fy =  604.03593653;
    let cx = 317.48109738;
    let cy = 231.79440428;
    if ( width = 320) {
        fx /= 2.0;
        fy /= 2.0;
        cy /= 2.0;
        cx /= 2.0;
    }

    fielf_of_view_render_cam = 2.0 * Math.atan(width / (2*fx)) * 180.0 / Math.PI;
    document.getElementById("FoV").innerHTML = fielf_of_view_render_cam + " degree.";
    render_camera = new THREE.PerspectiveCamera(fielf_of_view_render_cam, width/height, 0.01, 2 );
    
// webcam steffen ubuntu laptop
//     camera matrix:
//     [[603.85528766   0.         317.48109738]
//     [  0.         604.03593653 231.79440428]
//     [  0.           0.           1.        ]]
//    distortion coefficients:  [ 1.23291906e-01 -5.63173016e-01 -1.41618636e-03  4.32680318e-04
//     -7.77739837e-02]
    
    cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, 
                                    [fx, 0., cx, 
                                     0., fy, cy, 
                                     0., 0., 1.]);
    distCoeffs = cv.matFromArray(5, 1, cv.CV_64F, [1.23291906e-01, -5.63173016e-01, -1.41618636e-03,  4.32680318e-04,    -7.77739837e-02]);
    // "video" is the id of the video tag
    let last_min_seg_img_size = 0.0;
    loopIndex = setInterval(
        function(){
            // disable video showing on left side
            //document.getElementById("video").style.display="none";

            cap = new cv.VideoCapture("video");
            cap.read(inputImage);

            let startTime = performance.now();

            cv.cvtColor(inputImage, RgbImage, cv.COLOR_RGBA2RGB, 0);
            parameter.minMarkerLengthRatioOriginalImg = last_min_seg_img_size;
            last_min_seg_img_size = cv.detectMarkers(RgbImage, dictionary, markerCorners, markerIds, parameter);
            let nrDetectedPts = 4*markerCorners.size();
            
            document.getElementById("sizefactor").innerHTML = "Min segmentation img size factor: " + last_min_seg_img_size;


            let endTime = performance.now();    
            if (markerIds.rows > 0) {
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
    
                let objPointsCV = cv.matFromArray(nrDetectedPts, 3, cv.CV_32F, objPtsJs)
                let cornerPtsCV = cv.matFromArray(nrDetectedPts, 2, cv.CV_32F, cornersJs)

                let pts3_cont_vec = new cv.MatVector();
                let pts2_cont_vec = new cv.MatVector();
                // for (let p = 0; p < nrDetectedPts; ++p) {
                //     pts3_cont_vec.push_back(objPointsCV.row(p).t().clone());
                //     pts2_cont_vec.push_back(cornerPtsCV.row(p).t().clone());
                // }

                pts3_cont_vec.push_back(objPointsCV.clone());
                pts2_cont_vec.push_back(cornerPtsCV.clone());

                let rvec = new cv.Mat();
                let tvec = new cv.Mat();
                cv.drawDetectedMarkers(RgbImage, markerCorners, markerIds);
                let valid = cv.solvePnP(objPointsCV, cornerPtsCV, cameraMatrix, distCoeffs, rvec, tvec, false, cv.SOLVEPNP_IPPE)
                // valid = cv.estimatePoseBoard(markerCorners, markerIds, board, cameraMatrix, distCoeffs, rvec, tvec);
                let R_cv = new cv.Mat();
                if (valid) {
                    
                    let img_size = new cv.Size(width, height);
                    let cam_mat = new cv.Mat();
                    cam_mat = cv.initCameraMatrix2D(pts3_cont_vec, pts2_cont_vec, img_size);
                    document.getElementById("estK").innerHTML = "Estimated camera parameters (f, cx, cy): " + cam_mat.doubleAt(0,0) + "," + cam_mat.doubleAt(0,2) + "," + cam_mat.doubleAt(1,2);

                    cv.Rodrigues(rvec, R_cv);
                    cv.drawAxis(RgbImage, cameraMatrix, distCoeffs, rvec, tvec, 0.1);

                    R_cv_ = new math.matrix([
                        [R_cv.doubleAt(0,0),R_cv.doubleAt(0,1),R_cv.doubleAt(0,2)],
                        [R_cv.doubleAt(1,0),R_cv.doubleAt(1,1),R_cv.doubleAt(1,2)],
                        [R_cv.doubleAt(2,0),R_cv.doubleAt(2,1),R_cv.doubleAt(2,2)]]);
                    t_cv_ = new math.matrix([tvec.doubleAt(0,0), tvec.doubleAt(0,1), tvec.doubleAt(0,2)])
                    R_cv_t = math.transpose(R_cv_);
                    minus_ = math.matrix([[-1,-1,-1],
                        [-1,-1,-1],
                        [-1,-1,-1]])
                    const X = math.multiply(math.dotMultiply(minus_,R_cv_t), t_cv_)

                    ocv2ogl = new math.matrix([
                        [1,0,0],
                        [0,-1,0],
                        [0,0,-1]
                    ])
                    R_cv_t_corrected = math.multiply(R_cv_t, ocv2ogl)
                    //let ocv2ogl = cv.matFromArray(3,3, cv.CV_64F, [1,0,0,0,-1,0,0,0,-1]);
                    //let threejs_X = new cv.Mat();
                    //threejs_X = R_cv.t() * tvec;

                    
                    var quaternion = new THREE.Quaternion();
                    var matrix = new THREE.Matrix4();
                    var correctedOrientation = new THREE.Matrix3();

                    matrix.set(
                        R_cv_t_corrected._data[0][0], R_cv_t_corrected._data[0][1], R_cv_t_corrected._data[0][2], X._data[0],
                        R_cv_t_corrected._data[1][0], R_cv_t_corrected._data[1][1], R_cv_t_corrected._data[1][2], X._data[1],
                        R_cv_t_corrected._data[2][0], R_cv_t_corrected._data[2][1], R_cv_t_corrected._data[2][2], X._data[2],
                        0, 0, 0, 1);
                        
                    quaternion.setFromRotationMatrix(matrix)
                    render_camera.position.set(X._data[0], X._data[1], X._data[2]);        
                    render_camera.quaternion.copy(quaternion);

                    //upate_video_context();
                    render();

                }
                R_cv.delete();
                rvec.delete();
                tvec.delete();
            }
            
            var timeDiff = endTime - startTime; //in ms 
            document.getElementById("framerate").innerHTML = (1000.0 / timeDiff).toFixed(2) + " FPS";
            document.getElementById("nrdetectedmarkers").innerHTML = markerIds.rows;
            cv.imshow("arucoDetections", RgbImage);

            
        }, run_interval);

}

function laplacian() {
    // inputImage are declared and deleted elsewhere
    inputImage = new cv.Mat(height, width, cv.CV_8UC4);
    grayImage = new cv.Mat();
    laplacianImage = new cv.Mat();
    // "video" is the id of the video tag
    loopIndex = setInterval(
        function(){
            // disable video showing on left side
            // disable video showing on left side
            // document.getElementById("video").style.display="none";

            let cap = new cv.VideoCapture("video");
            cap.read(inputImage);

            let startTime = performance.now();

            cv.cvtColor(inputImage, grayImage, cv.COLOR_RGBA2GRAY, 0); 
            cv.Laplacian(grayImage, laplacianImage, cv.CV_8UC1)

            let endTime = performance.now();    
            
            let timeDiff = endTime - startTime; //in ms 
            document.getElementById("framerate").innerHTML = (1000.0 / timeDiff).toFixed(2) + " FPS";
            
            cv.imshow("canvasOutput", laplacianImage);
        
        }, run_interval);
        

}

function render() {
    renderer.setClearColor(0x000000, 0);
    
    // Render onto our off-screen texture
    //renderer.render(bufferScene, render_camera, bufferTexture);
    // Finally, draw to the screen
    renderer.render(scene, render_camera );
    requestAnimationFrame( render );
}

function  playVideo() {
    if (!streaming) {
        console.warn("Please startup your webcam");
        return;
    }

    inputImage = new cv.Mat(height, width, cv.CV_8UC4);

    bufferTexture = new THREE.WebGLRenderTarget(width, height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
    renderer.setSize(width, height);
    //document.body.appendChild( renderer.domElement );

    start.disabled = true;
    if (document.getElementById("aruco_test_content")) {
        aruco();
    } else if (document.getElementById("laplacian_test_content")) {
        laplacian();
    }
}

function stopCamera() {
    clearInterval(loopIndex);

    document.getElementById("canvasOutput").getContext("2d").clearRect(0, 0, width, height);    
    document.getElementById("arucoDetections").getContext("2d").clearRect(0, 0, width, height);

    video.pause();
    video.srcObject = null;
    stream.getVideoTracks()[0].stop();
    start.disabled = false;
    video.removeEventListener("canplay", initVideo);
}


// function onReady() {
//     console.log("hier")
//     cv["onRuntimeInitialized"] = () => {
//         console.log("hier1")
//         document.getElementById("startup").disabled = false;
//     }
//     if (window.cv instanceof Promise) {
//         document.getElementById("startup").disabled = false;
//     }
// }
// if (typeof cv !== 'undefined') {
//     onReady();
// } else {
//     document.getElementById("opencvjs").onload = onReady;
// }


// // globally export these function to use in onclick
// window.startup = startup
// window.stopCamera = stopCamera

