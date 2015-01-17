This example shows how you can mix different module styles in webpack. Here CommonJs, AMD and Labeled Modules are used. In addition to that there are different types of dynamic requires (`"../require.context/templates/"+amd1+".js"` and `Math.random() < 0.5 ? "./commonjs" : "./amd"`).

You see that everything is working nicely together.

# example.js

``` javascript
// CommonJs-style requires
var commonjs1 = require("./commonjs");
var amd1 = require("./amd");
var labeled1 = require("./labeled");

// AMD-style requires (with all webpack features)
require([
	"./commonjs", "./amd", "./labeled",
	"../require.context/templates/"+amd1+".js",
	Math.random() < 0.5 ? "./commonjs" : "./amd"],
	function(commonjs2, amd2, labeled2, template, randModule) {
		// Do something with it...
	}
);

// labeled modules requires
require: "./labeled";
// with the require label you are only allowed to import labeled modules
// the module needs static information about exports
```

# amd.js

``` javascript
// AMD Module Format
define(
	"app/amd", // anonym is also supported
	["./commonjs", "./labeled"],
	function(commonjs1, labeled1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = require("./commonjs");
		var labeled2 = require("./labeled");
		// Do something...
		return 456;
	}
);
```

# commonjs.js

``` javascript
// CommonJs Module Format
module.exports = 123;

// but you can use amd style requires
require(
	["./amd", "./labeled"],
	function(amd1, labeled1) {
		var amd2 = require("./amd");
		var labeled2 = require("./labeled");
	}
);
```

# labeled.js

``` javascript
// Labeled Module Format
exports: var a = 123;

// but you can use amd and commonjs style requires
require(
	["./commonjs", "./amd"],
	function(amd1) {
		var commonjs2 = require("./commonjs");
		var amd2 = require("./amd");
	}
);
```


# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, callbacks = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, __webpack_require__);
/******/
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		1:0
/******/ 	};
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
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, __webpack_require__);
/******/
/******/ 		// an array means "currently loading".
/******/ 		if(installedChunks[chunkId] !== undefined) {
/******/ 			installedChunks[chunkId].push(callback);
/******/ 		} else {
/******/ 			// start chunk loading
/******/ 			installedChunks[chunkId] = [callback];
/******/ 			var head = document.getElementsByTagName('head')[0];
/******/ 			var script = document.createElement('script');
/******/ 			script.type = 'text/javascript';
/******/ 			script.charset = 'utf-8';
/******/ 			script.async = true;
/******/ 			script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};
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

	// CommonJs-style requires
	var commonjs1 = __webpack_require__(/*! ./commonjs */ 2);
	var amd1 = __webpack_require__(/*! ./amd */ 1);
	var labeled1 = __webpack_require__(/*! ./labeled */ 3);

	// AMD-style requires (with all webpack features)
	__webpack_require__.e/* require */(0, function(__webpack_require__) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [
		__webpack_require__(/*! ./commonjs */ 2), __webpack_require__(/*! ./amd */ 1), __webpack_require__(/*! ./labeled */ 3),
		__webpack_require__(/*! ../require.context/templates */ 4)("./"+amd1+".js"),
		Math.random() < 0.5 ? __webpack_require__(/*! ./commonjs */ 2) : __webpack_require__(/*! ./amd */ 1)]; (function(commonjs2, amd2, labeled2, template, randModule) {
			// Do something with it...
		}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});

	// labeled modules requires
	var __WEBPACK_LABELED_MODULE__3 = __webpack_require__(/*! ./labeled */ 3), a = __WEBPACK_LABELED_MODULE__3.a;
	// with the require label you are only allowed to import labeled modules
	// the module needs static information about exports

/***/ },
/* 1 */
/*!****************!*\
  !*** ./amd.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// AMD Module Format
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! ./commonjs */ 2), __webpack_require__(/*! ./labeled */ 3)], __WEBPACK_AMD_DEFINE_RESULT__ = function(commonjs1, labeled1) {
			// but you can use CommonJs-style requires:
			var commonjs2 = __webpack_require__(/*! ./commonjs */ 2);
			var labeled2 = __webpack_require__(/*! ./labeled */ 3);
			// Do something...
			return 456;
		}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ },
/* 2 */
/*!*********************!*\
  !*** ./commonjs.js ***!
  \*********************/
/***/ function(module, exports, __webpack_require__) {

	// CommonJs Module Format
	module.exports = 123;

	// but you can use amd style requires
	!/* require */(/* empty */function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./amd */ 1), __webpack_require__(/*! ./labeled */ 3)]; (function(amd1, labeled1) {
			var amd2 = __webpack_require__(/*! ./amd */ 1);
			var labeled2 = __webpack_require__(/*! ./labeled */ 3);
		}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}());

/***/ },
/* 3 */
/*!********************!*\
  !*** ./labeled.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	// Labeled Module Format
	exports: var a = exports["a"] = 123;

	// but you can use amd and commonjs style requires
	!/* require */(/* empty */function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./commonjs */ 2), __webpack_require__(/*! ./amd */ 1)]; (function(amd1) {
			var commonjs2 = __webpack_require__(/*! ./commonjs */ 2);
			var amd2 = __webpack_require__(/*! ./amd */ 1);
		}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}());

/***/ }
/******/ ])
```

# js/0.output.js

``` javascript
webpackJsonp([0],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/*!*************************************************!*\
  !*** ../require.context/templates ^\.\/.*\.js$ ***!
  \*************************************************/
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./a.js": 5,
		"./b.js": 6,
		"./c.js": 7
	};
	function webpackContext(req) {
		return __webpack_require__(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;
	webpackContext.id = 4;


/***/ },
/* 5 */
/*!*****************************************!*\
  !*** ../require.context/templates/a.js ***!
  \*****************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = function() {
		return "This text was generated by template A";
	}

/***/ },
/* 6 */
/*!*****************************************!*\
  !*** ../require.context/templates/b.js ***!
  \*****************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = function() {
		return "This text was generated by template B";
	}

/***/ },
/* 7 */
/*!*****************************************!*\
  !*** ../require.context/templates/c.js ***!
  \*****************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = function() {
		return "This text was generated by template C";
	}

/***/ }
]);
```

# Info

## Uncompressed

```
Hash: eaf23592eedc3f55fb55
Version: webpack 1.5.0
Time: 55ms
      Asset  Size  Chunks             Chunk Names
0.output.js  1681       0  [emitted]  
  output.js  6831       1  [emitted]  main
chunk    {0} 0.output.js 439 {1} [rendered]
    > [0] ./example.js 7:0-14:1
    [4] ../require.context/templates ^\.\/.*\.js$ 193 {0} [built]
        amd require context ../require.context/templates [0] ./example.js 7:0-14:1
    [5] ../require.context/templates/a.js 82 {0} [optional] [built]
        context element ./a.js [4] ../require.context/templates ^\.\/.*\.js$
    [6] ../require.context/templates/b.js 82 {0} [optional] [built]
        context element ./b.js [4] ../require.context/templates ^\.\/.*\.js$
    [7] ../require.context/templates/c.js 82 {0} [optional] [built]
        context element ./c.js [4] ../require.context/templates ^\.\/.*\.js$
chunk    {1} output.js (main) 1395 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 613 {1} [built]
    [1] ./amd.js 309 {1} [built]
        cjs require ./amd [0] ./example.js 3:11-27
        amd require ./amd [0] ./example.js 7:0-14:1
        amd require ./amd [0] ./example.js 7:0-14:1
        amd require ./amd [2] ./commonjs.js 5:0-11:1
        cjs require ./amd [2] ./commonjs.js 8:13-29
        amd require ./amd [3] ./labeled.js 5:0-11:1
        cjs require ./amd [3] ./labeled.js 9:13-29
    [2] ./commonjs.js 234 {1} [built]
        cjs require ./commonjs [0] ./example.js 2:16-37
        amd require ./commonjs [0] ./example.js 7:0-14:1
        amd require ./commonjs [0] ./example.js 7:0-14:1
        amd require ./commonjs [1] ./amd.js 2:0-12:1
        cjs require ./commonjs [1] ./amd.js 7:18-39
        amd require ./commonjs [3] ./labeled.js 5:0-11:1
        cjs require ./commonjs [3] ./labeled.js 8:18-39
    [3] ./labeled.js 239 {1} [built]
        cjs require ./labeled [0] ./example.js 4:15-35
        labeled require ./labeled [0] ./example.js 17:0-21
        amd require ./labeled [0] ./example.js 7:0-14:1
        amd require ./labeled [1] ./amd.js 2:0-12:1
        cjs require ./labeled [1] ./amd.js 8:17-37
        amd require ./labeled [2] ./commonjs.js 5:0-11:1
        cjs require ./labeled [2] ./commonjs.js 9:17-37
```

## Minimized (uglify-js, no zip)

```
Hash: 6dd277afcc9156b2aa18
Version: webpack 1.5.0
Time: 199ms
      Asset  Size  Chunks             Chunk Names
0.output.js   514       0  [emitted]  
  output.js  1183       1  [emitted]  main
chunk    {0} 0.output.js 439 {1} [rendered]
    > [0] ./example.js 7:0-14:1
    [4] ../require.context/templates ^\.\/.*\.js$ 193 {0} [built]
        amd require context ../require.context/templates [0] ./example.js 7:0-14:1
    [5] ../require.context/templates/a.js 82 {0} [optional] [built]
        context element ./a.js [4] ../require.context/templates ^\.\/.*\.js$
    [6] ../require.context/templates/b.js 82 {0} [optional] [built]
        context element ./b.js [4] ../require.context/templates ^\.\/.*\.js$
    [7] ../require.context/templates/c.js 82 {0} [optional] [built]
        context element ./c.js [4] ../require.context/templates ^\.\/.*\.js$
chunk    {1} output.js (main) 1395 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 613 {1} [built]
    [1] ./amd.js 309 {1} [built]
        cjs require ./amd [0] ./example.js 3:11-27
        amd require ./amd [0] ./example.js 7:0-14:1
        amd require ./amd [0] ./example.js 7:0-14:1
        amd require ./amd [2] ./commonjs.js 5:0-11:1
        cjs require ./amd [2] ./commonjs.js 8:13-29
        amd require ./amd [3] ./labeled.js 5:0-11:1
        cjs require ./amd [3] ./labeled.js 9:13-29
    [2] ./commonjs.js 234 {1} [built]
        cjs require ./commonjs [0] ./example.js 2:16-37
        amd require ./commonjs [0] ./example.js 7:0-14:1
        amd require ./commonjs [0] ./example.js 7:0-14:1
        amd require ./commonjs [1] ./amd.js 2:0-12:1
        cjs require ./commonjs [1] ./amd.js 7:18-39
        amd require ./commonjs [3] ./labeled.js 5:0-11:1
        cjs require ./commonjs [3] ./labeled.js 8:18-39
    [3] ./labeled.js 239 {1} [built]
        cjs require ./labeled [0] ./example.js 4:15-35
        labeled require ./labeled [0] ./example.js 17:0-21
        amd require ./labeled [0] ./example.js 7:0-14:1
        amd require ./labeled [1] ./amd.js 2:0-12:1
        cjs require ./labeled [1] ./amd.js 8:17-37
        amd require ./labeled [2] ./commonjs.js 5:0-11:1
        cjs require ./labeled [2] ./commonjs.js 9:17-37

WARNING in output.js from UglifyJs
Dropping unused function argument randModule [./example.js:11,0]
Dropping unused function argument template [./example.js:11,0]
Dropping unused function argument labeled2 [./example.js:11,0]
Dropping unused function argument amd2 [./example.js:11,0]
Dropping unused function argument commonjs2 [./example.js:11,0]
Side effects in initialization of unused variable commonjs1 [./example.js:2,0]
Side effects in initialization of unused variable labeled1 [./example.js:4,0]
Side effects in initialization of unused variable a [./example.js:17,0]
Dropping unused function argument labeled1 [./amd.js:5,0]
Dropping unused function argument commonjs1 [./amd.js:5,0]
Side effects in initialization of unused variable commonjs2 [./amd.js:7,0]
Side effects in initialization of unused variable labeled2 [./amd.js:8,0]
Dropping unused function argument labeled1 [./commonjs.js:7,0]
Dropping unused function argument amd1 [./commonjs.js:7,0]
Side effects in initialization of unused variable amd2 [./commonjs.js:8,0]
Side effects in initialization of unused variable labeled2 [./commonjs.js:9,0]
Dropping unused function argument amd1 [./labeled.js:7,0]
Side effects in initialization of unused variable commonjs2 [./labeled.js:8,0]
Side effects in initialization of unused variable amd2 [./labeled.js:9,0]
Side effects in initialization of unused variable a [./labeled.js:2,0]
```
