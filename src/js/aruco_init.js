
/* init_aruco
This function initializes the use Aruco board. All details about the board are stored in
the file: aruco_board_definition.json.


Steffen Urban November 2020
*/


// from https://www.geekstrick.com/load-json-file-locally-using-pure-javascript/
// function loadJSON(callback) {   

//     var xobj = new XMLHttpRequest();
//     xobj.overrideMimeType("application/json");
//     xobj.open('GET', '../resource/aruco_board_definition.json', false); // Replace 'appDataServices' with the path to your file
//     xobj.onreadystatechange = function () {
//           if (xobj.readyState == 4 && xobj.status == "200") {
//             // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
//             callback(xobj.responseText);
//           }
//     };
//     xobj.send(null);  
//  }

function init_aruco() {

    // the board is defined in the html as <script type="text/javascript" src="aruco_board_definition.json"></script>
    // let aruco_board_definition = null;
    // loadJSON(function(response) {
    //     // Parsing JSON string into object
    //     aruco_board_definition = JSON.parse(response);
    //    });

    const aruco_board_definition = ARUCO_BOARD;
    let dictionary = new cv.aruco_Dictionary(aruco_board_definition["arucoDict"]);
    let parameters = new cv.aruco_DetectorParameters();

    // parameters.adaptiveThreshWinSizeMin = 3;
    // parameters.adaptiveThreshWinSizeMax = 23;
    // parameters.adaptiveThreshWinSizeStep = 10,
    // parameters.adaptiveThreshConstant = 7;
    // parameters.minMarkerPerimeterRate = 0.1;
    // parameters.maxMarkerPerimeterRate = 4;
    // parameters.polygonalApproxAccuracyRate = 0.03;
    // parameters.minCornerDistanceRate = 0.05;
    // parameters.minDistanceToBorder = 3;
    // parameters.minMarkerDistanceRate = 0.05;
    parameters.cornerRefinementMethod = aruco_board_definition["detection_parameters"]["cornerRefinementMethod"]; // CORNER_REFINE_NONE
    // parameters.cornerRefinementWinSize = 5;
    // parameters.cornerRefinementMaxIterations = 10;
    // parameters.cornerRefinementMinAccuracy = 0.1;
    // parameters.markerBorderBits = 1;
    // parameters.perspectiveRemovePixelPerCell = 2;
    // parameters.perspectiveRemoveIgnoredMarginPerCell = 0.13;
    // parameters.maxErroneousBitsInBorderRate = 0.35;
    // parameters.minOtsuStdDev = 5.0;
    // parameters.errorCorrectionRate = 0.6;
    parameters.useAruco3Detection = false;

    console.log("Aruco board initialized.");

    return {"aruco_parameters" : parameters,
            "aurco_fullboard_object_points" : aruco_board_definition["points3d"],
            "aurco_tracking_marker_indices" : aruco_board_definition["largeMarkerIds"],
            "aurco_small_marker_indices" : aruco_board_definition["smallMarkerIds"],
            "aurco_all_marker_indices" : aruco_board_definition["allMarkerIds"],
            "aurco_tracking_object_points" : {}, // get all large marker points NOT YET IMPLEMENTED
            "aruco_dictionary" : dictionary};
}