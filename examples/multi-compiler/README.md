
# example.js

``` javascript
if(ENV === "mobile") {
	require("./mobile-stuff");
}
console.log("Running " + ENV + " build");
```

# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = [
	{
		name: "mobile",
		entry: "./example",
		output: {
			path: path.join(__dirname, "js"),
			filename: "mobile.js"
		},
		plugins: [
			new webpack.DefinePlugin({
				ENV: JSON.stringify("mobile")
			})
		]
	},
	{
		name: "desktop",
		entry: "./example",
		output: {
			path: path.join(__dirname, "js"),
			filename: "desktop.js"
		},
		plugins: [
			new webpack.DefinePlugin({
				ENV: JSON.stringify("desktop")
			})
		]
	}
];
```

# js/desktop.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	if(false) {
		require("./mobile-stuff");
	}
	console.log("Running " + "desktop" + " build");

/***/ }
/******/ ]);
```

# js/mobile.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*************************!*\
  !*** ./mobile-stuff.js ***!
  \*************************/
/***/ function(module, exports) {

	// mobile only stuff

/***/ },
/* 1 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	if(true) {
		__webpack_require__(/*! ./mobile-stuff */ 0);
	}
	console.log("Running " + "mobile" + " build");

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 6ce19ec5d44a5170ba3b6af152727b3d5da03eaa
Version: webpack 2.1.0-beta.11
Child mobile:
    Hash: 6ce19ec5d44a5170ba3b
    Version: webpack 2.1.0-beta.11
    Time: 70ms
        Asset     Size  Chunks             Chunk Names
    mobile.js  1.94 kB       0  [emitted]  main
    chunk    {0} mobile.js (main) 117 bytes [rendered]
        > main [1] ./example.js 
        [0] ./mobile-stuff.js 20 bytes {0} [built]
            cjs require ./mobile-stuff [1] ./example.js 2:1-26
        [1] ./example.js 97 bytes {0} [built]
Child desktop:
    Hash: 6af152727b3d5da03eaa
    Version: webpack 2.1.0-beta.11
    Time: 59ms
         Asset     Size  Chunks             Chunk Names
    desktop.js  1.75 kB       0  [emitted]  main
    chunk    {0} desktop.js (main) 97 bytes [rendered]
        > main [0] ./example.js 
        [0] ./example.js 97 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 6ce19ec5d44a5170ba3b6af152727b3d5da03eaa
Version: webpack 2.1.0-beta.11
Child mobile:
    Hash: 6ce19ec5d44a5170ba3b
    Version: webpack 2.1.0-beta.11
    Time: 115ms
        Asset       Size  Chunks             Chunk Names
    mobile.js  298 bytes       0  [emitted]  main
    chunk    {0} mobile.js (main) 117 bytes [rendered]
        > main [1] ./example.js 
        [0] ./mobile-stuff.js 20 bytes {0} [built]
            cjs require ./mobile-stuff [1] ./example.js 2:1-26
        [1] ./example.js 97 bytes {0} [built]
Child desktop:
    Hash: 6af152727b3d5da03eaa
    Version: webpack 2.1.0-beta.11
    Time: 104ms
         Asset       Size  Chunks             Chunk Names
    desktop.js  278 bytes       0  [emitted]  main
    chunk    {0} desktop.js (main) 97 bytes [rendered]
        > main [0] ./example.js 
        [0] ./example.js 97 bytes {0} [built]
```