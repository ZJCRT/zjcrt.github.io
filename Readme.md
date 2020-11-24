# How to run this


# What was changed
In opencv_wasm.js I changed line 50 (at the bottom) from 
```javascript
return cv.ready 
// to
return cv
```
Otherwise the function in aruco.worker.js
```javascript
self.importScripts('../js_libs/opencv_wasm.js');
```
did not load the script (or in other words I don't know how to check for cv.ready ^^)

In addition, the header was changed from:
```javascript
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(function () {
      return (root.cv = factory());
    });
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else if (typeof window === 'object') {
    // Browser globals
    root.cv = factory();
  } else if (typeof importScripts === 'function') {
    // Web worker
    root.cv = factory;
  } else {
    // Other shells, e.g. d8
    root.cv = factory();
  }
}(this, function () {
```
to
```javascript
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(function () {
      return (root.cv = factory());
    });
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals
    root.cv = factory();
  }
}(this, function () {
```
