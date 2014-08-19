This example show how to add support for Labeled Modules by adding the plugin to the configuration.

# example.js

``` javascript
require: "./increment";
var a = 1;
increment(a); // 2
```

# webpack.config.js

``` javascript
var webpack = require("../../");
module.exports = {
	plugins: [
		new webpack.dependencies.LabeledModulesPlugin()
	]
}
```

# increment.js

``` javascript
require: "./math";
exports: function increment(val) {
    return add(val, 1);
};
```

# math.js

``` javascript
exports: function add() {
    var sum = 0, i = 0, args = arguments, l = args.length;
    while (i < l) {
        sum += args[i++];
    }
    return sum;
};
```

# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_LABELED_MODULE__1 = __webpack_require__(/*! ./increment */ 1), increment = __WEBPACK_LABELED_MODULE__1.increment;
	var a = 1;
	increment(a); // 2

/***/ },
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_LABELED_MODULE__2 = __webpack_require__(/*! ./math */ 2), add = __WEBPACK_LABELED_MODULE__2.add;
	exports: exports["increment"] = function increment(val) {
	    return add(val, 1);
	};

/***/ },
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

	exports: exports["add"] = function add() {
	    var sum = 0, i = 0, args = arguments, l = args.length;
	    while (i < l) {
	        sum += args[i++];
	    }
	    return sum;
	};

/***/ }
/******/ ])
```

The remaining labels are removed while minimizing.

# Info

## Uncompressed

```
Hash: f8fc9eca6fb91df6e48a
Version: webpack 1.3.2-beta7
Time: 35ms
    Asset  Size  Chunks             Chunk Names
output.js  2425       0  [emitted]  main
chunk    {0} output.js (main) 299 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 55 {0} [built]
    [1] ./increment.js 83 {0} [built]
        labeled require ./increment [0] ./example.js 1:0-23
    [2] ./math.js 161 {0} [built]
        labeled require ./math [1] ./increment.js 1:0-18
```

## Minimized (uglify-js, no zip)

```
Hash: 34470e6917b261b891ed
Version: webpack 1.3.2-beta7
Time: 75ms
    Asset  Size  Chunks             Chunk Names
output.js   427       0  [emitted]  main
chunk    {0} output.js (main) 299 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 55 {0} [built]
    [1] ./increment.js 83 {0} [built]
        labeled require ./increment [0] ./example.js 1:0-23
    [2] ./math.js 161 {0} [built]
        labeled require ./math [1] ./increment.js 1:0-18
```