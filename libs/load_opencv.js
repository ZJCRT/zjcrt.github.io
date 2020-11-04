// Helper for opencv.js (see below)
var Module = {
  preRun: [function() {
    //Module.FS_createPreloadedFile('/', 'haarcascade_frontalface_default.xml', 'haarcascade_frontalface_default.xml', true, false);
  }],
  postRun: [] ,
  onRuntimeInitialized: function() {
    console.log("Emscripten runtime is ready...");
    if (window.cv instanceof Promise) {
      window.cv.then((target) => {
         window.cv = target;
         //console.log(cv.getBuildInformation());
         document.getElementById("startup").disabled = false;
      })
    } else {
      // for backward compatible
      // console.log(cv.getBuildInformation());
      document.getElementById("startup").disabled = false;
    }
  },
  print: (function() {
    var element = document.getElementById('output');
    if (element) element.value = ''; // clear browser cache
    return function(text) {
      console.log(text);
      if (element) {
        element.value += text + "\n";
        element.scrollTop = element.scrollHeight; // focus on bottom
      }
    };
  })(),
  printErr: function(text) {
    console.error(text);
  },
  setStatus: function(text) {
    console.log(text);
  },
  totalDependencies: 0
};

Module.setStatus('Downloading...');
window.onerror = function(event) {
  Module.setStatus('Exception thrown, see JavaScript console');
  Module.setStatus = function(text) {
    if (text) Module.printErr('[post-exception status] ' + text);
  };
};

function opencvjs_LoadError() {
  Module.printErr('Failed to load/initialize opencv.js');
}
