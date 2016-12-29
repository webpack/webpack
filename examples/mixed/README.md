This example shows how you can mix different module styles in webpack. Here CommonJs, AMD and Harmony Modules (ES6 Modules) are used. In addition to that there are different types of dynamic requires (`"../require.context/templates/"+amd1+".js"` and `Math.random() < 0.5 ? "./commonjs" : "./amd"`).

You see that everything is working nicely together.

# example.js

``` javascript
// CommonJs-style requires
var commonjs1 = require("./commonjs");
var amd1 = require("./amd");
var harmony1 = require("./harmony");

// AMD-style requires (with all webpack features)
require([
	"./commonjs", "./amd",
	"../require.context/templates/"+amd1+".js",
	Math.random() < 0.5 ? "./commonjs" : "./amd"],
	function(commonjs2, amd2, template, randModule) {
		// Do something with it...
	}
);
```

# amd.js

``` javascript
// AMD Module Format
define(
	"app/amd", // anonym is also supported
	["./commonjs", "./harmony"],
	function(commonjs1, harmony1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = require("./commonjs");
		var harmony2 = require("./harmony");
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
	["./amd", "./harmony"],
	function(amd1, harmony) {
		var amd2 = require("./amd");
		var harmony2 = require("./harmony");
	}
);
```

# js/output.js

<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>
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

/******/ 		if (__webpack_require__.nc) {
/******/ 			script.setAttribute("nonce", __webpack_require__.nc);
/******/ 		}
/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".output.js";
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

/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		installedChunks[chunkId][2] = promise;

/******/ 		head.appendChild(script);
/******/ 		return promise;
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!****************!*\
  !*** ./amd.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// AMD Module Format
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! ./commonjs */ 1), __webpack_require__(/*! ./harmony */ 2)], __WEBPACK_AMD_DEFINE_RESULT__ = function(commonjs1, harmony1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = __webpack_require__(/*! ./commonjs */ 1);
		var harmony2 = __webpack_require__(/*! ./harmony */ 2);
		// Do something...
		return 456;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!*********************!*\
  !*** ./commonjs.js ***!
  \*********************/
/***/ function(module, exports, __webpack_require__) {

// CommonJs Module Format
module.exports = 123;

// but you can use amd style requires
Promise.resolve().then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./amd */ 0), __webpack_require__(/*! ./harmony */ 2)]; (function(amd1, harmony) {
		var amd2 = __webpack_require__(/*! ./amd */ 0);
		var harmony2 = __webpack_require__(/*! ./harmony */ 2);
	}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}).catch(__webpack_require__.oe);

/***/ },
/* 2 */
/* exports provided: default */
/* all exports used */
/*!********************!*\
  !*** ./harmony.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__commonjs__ = __webpack_require__(/*! ./commonjs */ 1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__commonjs___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__commonjs__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__amd__ = __webpack_require__(/*! ./amd */ 0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__amd___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__amd__);
// ES6 Modules



/* harmony default export */ exports["default"] = 456;


/***/ },
/* 3 */,
/* 4 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

// CommonJs-style requires
var commonjs1 = __webpack_require__(/*! ./commonjs */ 1);
var amd1 = __webpack_require__(/*! ./amd */ 0);
var harmony1 = __webpack_require__(/*! ./harmony */ 2);

// AMD-style requires (with all webpack features)
__webpack_require__.e/* require */(0).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [
	__webpack_require__(/*! ./commonjs */ 1), __webpack_require__(/*! ./amd */ 0),
	__webpack_require__(/*! ../require.context/templates */ 3)("./"+amd1+".js"),
	Math.random() < 0.5 ? __webpack_require__(/*! ./commonjs */ 1) : __webpack_require__(/*! ./amd */ 0)]; (function(commonjs2, amd2, template, randModule) {
		// Do something with it...
	}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}).catch(__webpack_require__.oe);


/***/ }
/******/ ]);
```

# js/0.output.js

``` javascript
webpackJsonp([0],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */
/* unknown exports provided */
/* all exports used */
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
webpackContext.id = 3;


/***/ },
/* 4 */,
/* 5 */
/* unknown exports provided */
/* all exports used */
/*!*****************************************!*\
  !*** ../require.context/templates/a.js ***!
  \*****************************************/
/***/ function(module, exports) {

module.exports = function() {
	return "This text was generated by template A";
}

/***/ },
/* 6 */
/* unknown exports provided */
/* all exports used */
/*!*****************************************!*\
  !*** ../require.context/templates/b.js ***!
  \*****************************************/
/***/ function(module, exports) {

module.exports = function() {
	return "This text was generated by template B";
}

/***/ },
/* 7 */
/* unknown exports provided */
/* all exports used */
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
Hash: ace5df2215cddfd52d9a
Version: webpack 2.2.0-rc.2
      Asset     Size  Chunks             Chunk Names
0.output.js  1.84 kB       0  [emitted]  
  output.js  8.76 kB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 439 bytes {1} [rendered]
    > [4] ./example.js 7:0-14:1
    [3] ../require.context/templates ^\.\/.*\.js$ 193 bytes {0} [built]
        amd require context ../require.context/templates [4] ./example.js 7:0-14:1
    [5] ../require.context/templates/a.js 82 bytes {0} [optional] [built]
        context element ./a.js [3] ../require.context/templates ^\.\/.*\.js$
    [6] ../require.context/templates/b.js 82 bytes {0} [optional] [built]
        context element ./b.js [3] ../require.context/templates ^\.\/.*\.js$
    [7] ../require.context/templates/c.js 82 bytes {0} [optional] [built]
        context element ./c.js [3] ../require.context/templates ^\.\/.*\.js$
chunk    {1} output.js (main) 1.05 kB [entry] [rendered]
    > main [4] ./example.js 
    [0] ./amd.js 309 bytes {1} [built]
        amd require ./amd [1] ./commonjs.js 5:0-11:1
        cjs require ./amd [1] ./commonjs.js 8:13-29
        harmony import ./amd [2] ./harmony.js 3:0-24
        cjs require ./amd [4] ./example.js 3:11-27
        amd require ./amd [4] ./example.js 7:0-14:1
        amd require ./amd [4] ./example.js 7:0-14:1
    [1] ./commonjs.js 233 bytes {1} [built]
        amd require ./commonjs [0] ./amd.js 2:0-12:1
        cjs require ./commonjs [0] ./amd.js 7:18-39
        harmony import ./commonjs [2] ./harmony.js 2:0-34
        cjs require ./commonjs [4] ./example.js 2:16-37
        amd require ./commonjs [4] ./example.js 7:0-14:1
        amd require ./commonjs [4] ./example.js 7:0-14:1
    [2] ./harmony.js 101 bytes {1} [built]
        [exports: default]
        amd require ./harmony [0] ./amd.js 2:0-12:1
        cjs require ./harmony [0] ./amd.js 8:17-37
        amd require ./harmony [1] ./commonjs.js 5:0-11:1
        cjs require ./harmony [1] ./commonjs.js 9:17-37
        cjs require ./harmony [4] ./example.js 4:15-35
    [4] ./example.js 410 bytes {1} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: ace5df2215cddfd52d9a
Version: webpack 2.2.0-rc.2
      Asset       Size  Chunks             Chunk Names
0.output.js  523 bytes       0  [emitted]  
  output.js     1.9 kB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 439 bytes {1} [rendered]
    > [4] ./example.js 7:0-14:1
    [3] ../require.context/templates ^\.\/.*\.js$ 193 bytes {0} [built]
        amd require context ../require.context/templates [4] ./example.js 7:0-14:1
    [5] ../require.context/templates/a.js 82 bytes {0} [optional] [built]
        context element ./a.js [3] ../require.context/templates ^\.\/.*\.js$
    [6] ../require.context/templates/b.js 82 bytes {0} [optional] [built]
        context element ./b.js [3] ../require.context/templates ^\.\/.*\.js$
    [7] ../require.context/templates/c.js 82 bytes {0} [optional] [built]
        context element ./c.js [3] ../require.context/templates ^\.\/.*\.js$
chunk    {1} output.js (main) 1.05 kB [entry] [rendered]
    > main [4] ./example.js 
    [0] ./amd.js 309 bytes {1} [built]
        amd require ./amd [1] ./commonjs.js 5:0-11:1
        cjs require ./amd [1] ./commonjs.js 8:13-29
        harmony import ./amd [2] ./harmony.js 3:0-24
        cjs require ./amd [4] ./example.js 3:11-27
        amd require ./amd [4] ./example.js 7:0-14:1
        amd require ./amd [4] ./example.js 7:0-14:1
    [1] ./commonjs.js 233 bytes {1} [built]
        amd require ./commonjs [0] ./amd.js 2:0-12:1
        cjs require ./commonjs [0] ./amd.js 7:18-39
        harmony import ./commonjs [2] ./harmony.js 2:0-34
        cjs require ./commonjs [4] ./example.js 2:16-37
        amd require ./commonjs [4] ./example.js 7:0-14:1
        amd require ./commonjs [4] ./example.js 7:0-14:1
    [2] ./harmony.js 101 bytes {1} [built]
        [exports: default]
        amd require ./harmony [0] ./amd.js 2:0-12:1
        cjs require ./harmony [0] ./amd.js 8:17-37
        amd require ./harmony [1] ./commonjs.js 5:0-11:1
        cjs require ./harmony [1] ./commonjs.js 9:17-37
        cjs require ./harmony [4] ./example.js 4:15-35
    [4] ./example.js 410 bytes {1} [built]
```
