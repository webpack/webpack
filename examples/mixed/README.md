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
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules, executeModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [], result;
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules, executeModules);
/******/ 		while(resolves.length)
/******/ 			resolves.shift()();

/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		1: 0
/******/ 	};

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

/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return Promise.resolve();

/******/ 		// an Promise means "currently loading".
/******/ 		if(installedChunks[chunkId]) {
/******/ 			return installedChunks[chunkId][2];
/******/ 		}
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;

/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".js";
/******/ 		var timeout = setTimeout(onScriptComplete, 120000);
/******/ 		script.onerror = script.onload = onScriptComplete;
/******/ 		function onScriptComplete() {
/******/ 			// avoid mem leaks in IE.
/******/ 			script.onerror = script.onload = null;
/******/ 			clearTimeout(timeout);
/******/ 			var chunk = installedChunks[chunkId];
/******/ 			if(chunk !== 0) {
/******/ 				if(chunk) chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};
/******/ 		head.appendChild(script);

/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		return installedChunks[chunkId][2] = promise;
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!****************!*\
  !*** ./amd.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// AMD Module Format
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! ./commonjs */ 1), __webpack_require__(/*! ./labeled */ 2)], __WEBPACK_AMD_DEFINE_RESULT__ = function(commonjs1, labeled1) {
			// but you can use CommonJs-style requires:
			var commonjs2 = __webpack_require__(/*! ./commonjs */ 1);
			var labeled2 = __webpack_require__(/*! ./labeled */ 2);
			// Do something...
			return 456;
		}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ },
/* 1 */
/*!*********************!*\
  !*** ./commonjs.js ***!
  \*********************/
/***/ function(module, exports, __webpack_require__) {

	// CommonJs Module Format
	module.exports = 123;

	// but you can use amd style requires
	Promise.resolve().catch(function(err) { __webpack_require__.oe(err); }).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./amd */ 0), __webpack_require__(/*! ./labeled */ 2)]; (function(amd1, labeled1) {
			var amd2 = __webpack_require__(/*! ./amd */ 0);
			var labeled2 = __webpack_require__(/*! ./labeled */ 2);
		}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});

/***/ },
/* 2 */
/*!********************!*\
  !*** ./labeled.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	// Labeled Module Format
	exports: var a = exports["a"] = 123;

	// but you can use amd and commonjs style requires
	Promise.resolve().catch(function(err) { __webpack_require__.oe(err); }).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./commonjs */ 1), __webpack_require__(/*! ./amd */ 0)]; (function(amd1) {
			var commonjs2 = __webpack_require__(/*! ./commonjs */ 1);
			var amd2 = __webpack_require__(/*! ./amd */ 0);
		}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});

/***/ },
/* 3 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	// CommonJs-style requires
	var commonjs1 = __webpack_require__(/*! ./commonjs */ 1);
	var amd1 = __webpack_require__(/*! ./amd */ 0);
	var labeled1 = __webpack_require__(/*! ./labeled */ 2);

	// AMD-style requires (with all webpack features)
	__webpack_require__.e/* require */(0).catch(function(err) { __webpack_require__.oe(err); }).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [
		__webpack_require__(/*! ./commonjs */ 1), __webpack_require__(/*! ./amd */ 0), __webpack_require__(/*! ./labeled */ 2),
		__webpack_require__(/*! ../require.context/templates */ 4)("./"+amd1+".js"),
		Math.random() < 0.5 ? __webpack_require__(/*! ./commonjs */ 1) : __webpack_require__(/*! ./amd */ 0)]; (function(commonjs2, amd2, labeled2, template, randModule) {
			// Do something with it...
		}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});

	// labeled modules requires
	var __WEBPACK_LABELED_MODULE__ = __webpack_require__(/*! ./labeled */ 2), a = __WEBPACK_LABELED_MODULE__.a;
	// with the require label you are only allowed to import labeled modules
	// the module needs static information about exports

/***/ }
/******/ ]);
```

# js/0.js

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
		var id = map[req];
		if(!(id + 1)) // check for number
			throw new Error("Cannot find module '" + req + "'.");
		return id;
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
/***/ function(module, exports) {

	module.exports = function() {
		return "This text was generated by template A";
	}

/***/ },
/* 6 */
/*!*****************************************!*\
  !*** ../require.context/templates/b.js ***!
  \*****************************************/
/***/ function(module, exports) {

	module.exports = function() {
		return "This text was generated by template B";
	}

/***/ },
/* 7 */
/*!*****************************************!*\
  !*** ../require.context/templates/c.js ***!
  \*****************************************/
/***/ function(module, exports) {

	module.exports = function() {
		return "This text was generated by template C";
	}

/***/ }
]);
```

# Info

## Uncompressed

```
Hash: e522c75d9311335767f2
Version: webpack 2.1.0-beta.11
Time: 111ms
    Asset     Size  Chunks             Chunk Names
     0.js  1.65 kB       0  [emitted]  
output.js  7.71 kB       1  [emitted]  main
chunk    {0} 0.js 439 bytes {1} [rendered]
    > [3] ./example.js 7:0-14:1
    [4] ../require.context/templates ^\.\/.*\.js$ 193 bytes {0} [built]
        amd require context ../require.context/templates [3] ./example.js 7:0-14:1
    [5] ../require.context/templates/a.js 82 bytes {0} [optional] [built]
        context element ./a.js [4] ../require.context/templates ^\.\/.*\.js$
    [6] ../require.context/templates/b.js 82 bytes {0} [optional] [built]
        context element ./b.js [4] ../require.context/templates ^\.\/.*\.js$
    [7] ../require.context/templates/c.js 82 bytes {0} [optional] [built]
        context element ./c.js [4] ../require.context/templates ^\.\/.*\.js$
chunk    {1} output.js (main) 1.4 kB [rendered]
    > main [3] ./example.js 
    [0] ./amd.js 309 bytes {1} [built]
        amd require ./amd [1] ./commonjs.js 5:0-11:1
        cjs require ./amd [1] ./commonjs.js 8:13-29
        amd require ./amd [2] ./labeled.js 5:0-11:1
        cjs require ./amd [2] ./labeled.js 9:13-29
        cjs require ./amd [3] ./example.js 3:11-27
        amd require ./amd [3] ./example.js 7:0-14:1
        amd require ./amd [3] ./example.js 7:0-14:1
    [1] ./commonjs.js 234 bytes {1} [built]
        amd require ./commonjs [0] ./amd.js 2:0-12:1
        cjs require ./commonjs [0] ./amd.js 7:18-39
        amd require ./commonjs [2] ./labeled.js 5:0-11:1
        cjs require ./commonjs [2] ./labeled.js 8:18-39
        cjs require ./commonjs [3] ./example.js 2:16-37
        amd require ./commonjs [3] ./example.js 7:0-14:1
        amd require ./commonjs [3] ./example.js 7:0-14:1
    [2] ./labeled.js 239 bytes {1} [built]
        amd require ./labeled [0] ./amd.js 2:0-12:1
        cjs require ./labeled [0] ./amd.js 8:17-37
        amd require ./labeled [1] ./commonjs.js 5:0-11:1
        cjs require ./labeled [1] ./commonjs.js 9:17-37
        cjs require ./labeled [3] ./example.js 4:15-35
        labeled require ./labeled [3] ./example.js 17:0-21
        amd require ./labeled [3] ./example.js 7:0-14:1
    [3] ./example.js 613 bytes {1} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: e522c75d9311335767f2
Version: webpack 2.1.0-beta.11
Time: 192ms
    Asset       Size  Chunks             Chunk Names
     0.js  523 bytes       0  [emitted]  
output.js    1.66 kB       1  [emitted]  main
chunk    {0} 0.js 439 bytes {1} [rendered]
    > [3] ./example.js 7:0-14:1
    [4] ../require.context/templates ^\.\/.*\.js$ 193 bytes {0} [built]
        amd require context ../require.context/templates [3] ./example.js 7:0-14:1
    [5] ../require.context/templates/a.js 82 bytes {0} [optional] [built]
        context element ./a.js [4] ../require.context/templates ^\.\/.*\.js$
    [6] ../require.context/templates/b.js 82 bytes {0} [optional] [built]
        context element ./b.js [4] ../require.context/templates ^\.\/.*\.js$
    [7] ../require.context/templates/c.js 82 bytes {0} [optional] [built]
        context element ./c.js [4] ../require.context/templates ^\.\/.*\.js$
chunk    {1} output.js (main) 1.4 kB [rendered]
    > main [3] ./example.js 
    [0] ./amd.js 309 bytes {1} [built]
        amd require ./amd [1] ./commonjs.js 5:0-11:1
        cjs require ./amd [1] ./commonjs.js 8:13-29
        amd require ./amd [2] ./labeled.js 5:0-11:1
        cjs require ./amd [2] ./labeled.js 9:13-29
        cjs require ./amd [3] ./example.js 3:11-27
        amd require ./amd [3] ./example.js 7:0-14:1
        amd require ./amd [3] ./example.js 7:0-14:1
    [1] ./commonjs.js 234 bytes {1} [built]
        amd require ./commonjs [0] ./amd.js 2:0-12:1
        cjs require ./commonjs [0] ./amd.js 7:18-39
        amd require ./commonjs [2] ./labeled.js 5:0-11:1
        cjs require ./commonjs [2] ./labeled.js 8:18-39
        cjs require ./commonjs [3] ./example.js 2:16-37
        amd require ./commonjs [3] ./example.js 7:0-14:1
        amd require ./commonjs [3] ./example.js 7:0-14:1
    [2] ./labeled.js 239 bytes {1} [built]
        amd require ./labeled [0] ./amd.js 2:0-12:1
        cjs require ./labeled [0] ./amd.js 8:17-37
        amd require ./labeled [1] ./commonjs.js 5:0-11:1
        cjs require ./labeled [1] ./commonjs.js 9:17-37
        cjs require ./labeled [3] ./example.js 4:15-35
        labeled require ./labeled [3] ./example.js 17:0-21
        amd require ./labeled [3] ./example.js 7:0-14:1
    [3] ./example.js 613 bytes {1} [built]
```
