
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
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

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

	if(false) {
		require("./mobile-stuff");
	}
	console.log("Running " + ("desktop") + " build");

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
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

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

	if(true) {
		__webpack_require__(/*! ./mobile-stuff */ 1);
	}
	console.log("Running " + ("mobile") + " build");

/***/ },
/* 1 */
/*!*************************!*\
  !*** ./mobile-stuff.js ***!
  \*************************/
/***/ function(module, exports) {

	// mobile only stuff

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: f7ca6364953a74846973bca985cdc67a34d859e1
Version: webpack 1.9.10
Child mobile:
    Hash: f7ca6364953a74846973
    Version: webpack 1.9.10
    Time: 75ms
        Asset     Size  Chunks             Chunk Names
    mobile.js  1.77 kB       0  [emitted]  main
    chunk    {0} mobile.js (main) 117 bytes [rendered]
        > main [0] ./example.js 
        [0] ./example.js 97 bytes {0} [built]
        [1] ./mobile-stuff.js 20 bytes {0} [built]
            cjs require ./mobile-stuff [0] ./example.js 2:1-26
Child desktop:
    Hash: bca985cdc67a34d859e1
    Version: webpack 1.9.10
    Time: 60ms
         Asset     Size  Chunks             Chunk Names
    desktop.js  1.59 kB       0  [emitted]  main
    chunk    {0} desktop.js (main) 97 bytes [rendered]
        > main [0] ./example.js 
        [0] ./example.js 97 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: f7ca6364953a74846973bca985cdc67a34d859e1
Version: webpack 1.9.10

WARNING in (mobile) mobile.js from UglifyJs
Condition always true [./example.js:1,0]

WARNING in (desktop) desktop.js from UglifyJs
Condition always false [./example.js:1,0]
Dropping unreachable code [./example.js:2,0]
Child mobile:
    Hash: f7ca6364953a74846973
    Version: webpack 1.9.10
    Time: 193ms
        Asset       Size  Chunks             Chunk Names
    mobile.js  279 bytes       0  [emitted]  main
    chunk    {0} mobile.js (main) 117 bytes [rendered]
        > main [0] ./example.js 
        [0] ./example.js 97 bytes {0} [built]
        [1] ./mobile-stuff.js 20 bytes {0} [built]
            cjs require ./mobile-stuff [0] ./example.js 2:1-26
    
    WARNING in mobile.js from UglifyJs
    Condition always true [./example.js:1,0]
Child desktop:
    Hash: bca985cdc67a34d859e1
    Version: webpack 1.9.10
    Time: 178ms
         Asset       Size  Chunks             Chunk Names
    desktop.js  259 bytes       0  [emitted]  main
    chunk    {0} desktop.js (main) 97 bytes [rendered]
        > main [0] ./example.js 
        [0] ./example.js 97 bytes {0} [built]
    
    WARNING in desktop.js from UglifyJs
    Condition always false [./example.js:1,0]
    Dropping unreachable code [./example.js:2,0]
```