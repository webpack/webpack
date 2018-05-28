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

# dist/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 	};
/******/
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// Promise = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		1: 0
/******/ 	};
/******/
/******/
/******/
/******/ 	// script path function
/******/ 	function jsonpScriptSrc(chunkId) {
/******/ 		return __webpack_require__.p + "" + chunkId + ".output.js"
/******/ 	}
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		var promises = [];
/******/
/******/
/******/ 		// JSONP chunk loading for javascript
/******/
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData !== 0) { // 0 means "already installed".
/******/
/******/ 			// a Promise means "currently loading".
/******/ 			if(installedChunkData) {
/******/ 				promises.push(installedChunkData[2]);
/******/ 			} else {
/******/ 				// setup Promise in chunk cache
/******/ 				var promise = new Promise(function(resolve, reject) {
/******/ 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 				});
/******/ 				promises.push(installedChunkData[2] = promise);
/******/
/******/ 				// start chunk loading
/******/ 				var head = document.getElementsByTagName('head')[0];
/******/ 				var script = document.createElement('script');
/******/
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = jsonpScriptSrc(chunkId);
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				function onScriptComplete(event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				head.appendChild(script);
/******/ 			}
/******/ 		}
/******/ 		return Promise.all(promises);
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
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
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!****************!*\
  !*** ./amd.js ***!
  \****************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// AMD Module Format
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! ./commonjs */ 1), __webpack_require__(/*! ./harmony */ 2)], __WEBPACK_AMD_DEFINE_RESULT__ = (function(commonjs1, harmony1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = __webpack_require__(/*! ./commonjs */ 1);
		var harmony2 = __webpack_require__(/*! ./harmony */ 2);
		// Do something...
		return 456;
	}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 1 */
/*!*********************!*\
  !*** ./commonjs.js ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

// CommonJs Module Format
module.exports = 123;

// but you can use amd style requires
Promise.resolve(/*! AMD require */).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./amd */ 0), __webpack_require__(/*! ./harmony */ 2)]; (function(amd1, harmony) {
		var amd2 = __webpack_require__(/*! ./amd */ 0);
		var harmony2 = __webpack_require__(/*! ./harmony */ 2);
	}).apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);}).catch(__webpack_require__.oe);

/***/ }),
/* 2 */
/*!********************!*\
  !*** ./harmony.js ***!
  \********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _commonjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./commonjs */ 1);
/* harmony import */ var _commonjs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_commonjs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _amd__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./amd */ 0);
/* harmony import */ var _amd__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_amd__WEBPACK_IMPORTED_MODULE_1__);
// ES6 Modules



/* harmony default export */ __webpack_exports__["default"] = (456);


/***/ }),
/* 3 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

// CommonJs-style requires
var commonjs1 = __webpack_require__(/*! ./commonjs */ 1);
var amd1 = __webpack_require__(/*! ./amd */ 0);
var harmony1 = __webpack_require__(/*! ./harmony */ 2);

// AMD-style requires (with all webpack features)
__webpack_require__.e(/*! AMD require */ 0).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [
	__webpack_require__(/*! ./commonjs */ 1), __webpack_require__(/*! ./amd */ 0),
	__webpack_require__(4)("./"+amd1+".js"),
	Math.random() < 0.5 ? __webpack_require__(/*! ./commonjs */ 1) : __webpack_require__(/*! ./amd */ 0)]; (function(commonjs2, amd2, template, randModule) {
		// Do something with it...
	}).apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);}).catch(__webpack_require__.oe);


/***/ })
/******/ ]);
```

# dist/0.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/*!******************************************************!*\
  !*** ../require.context/templates sync ^\.\/.*\.js$ ***!
  \******************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var map = {
	"./a.js": 7,
	"./b.js": 6,
	"./c.js": 5
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	var module = __webpack_require__(id);
	return module;
}
function webpackContextResolve(req) {
	var id = map[req];
	if(!(id + 1)) { // check for number or string
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return id;
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = 4;

/***/ }),
/* 5 */
/*!*****************************************!*\
  !*** ../require.context/templates/c.js ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = function() {
	return "This text was generated by template C";
}

/***/ }),
/* 6 */
/*!*****************************************!*\
  !*** ../require.context/templates/b.js ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = function() {
	return "This text was generated by template B";
}

/***/ }),
/* 7 */
/*!*****************************************!*\
  !*** ../require.context/templates/a.js ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = function() {
	return "This text was generated by template A";
}

/***/ })
]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
      Asset      Size  Chunks             Chunk Names
0.output.js  1.87 KiB       0  [emitted]  
  output.js    10 KiB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 439 bytes <{1}> [rendered]
    > [3] ./example.js 7:0-14:1
 [4] ../require.context/templates sync ^\.\/.*\.js$ 193 bytes {0} [built]
     amd require context ../require.context/templates [3] ./example.js 7:0-14:1
 [5] ../require.context/templates/c.js 82 bytes {0} [optional] [built]
     context element ./c.js [4] ../require.context/templates sync ^\.\/.*\.js$ ./c.js
 [6] ../require.context/templates/b.js 82 bytes {0} [optional] [built]
     context element ./b.js [4] ../require.context/templates sync ^\.\/.*\.js$ ./b.js
 [7] ../require.context/templates/a.js 82 bytes {0} [optional] [built]
     context element ./a.js [4] ../require.context/templates sync ^\.\/.*\.js$ ./a.js
chunk    {1} output.js (main) 1.03 KiB >{0}< [entry] [rendered]
    > .\example.js main
 [0] ./amd.js 309 bytes {1} [built]
     amd require ./amd [1] ./commonjs.js 5:0-11:1
     cjs require ./amd [1] ./commonjs.js 8:13-29
     harmony side effect evaluation ./amd [2] ./harmony.js 3:0-24
     cjs require ./amd [3] ./example.js 3:11-27
     amd require ./amd [3] ./example.js 7:0-14:1
     amd require ./amd [3] ./example.js 7:0-14:1
 [1] ./commonjs.js 233 bytes {1} [built]
     amd require ./commonjs [0] ./amd.js 2:0-12:1
     cjs require ./commonjs [0] ./amd.js 7:18-39
     harmony side effect evaluation ./commonjs [2] ./harmony.js 2:0-34
     cjs require ./commonjs [3] ./example.js 2:16-37
     amd require ./commonjs [3] ./example.js 7:0-14:1
     amd require ./commonjs [3] ./example.js 7:0-14:1
 [2] ./harmony.js 101 bytes {1} [built]
     [exports: default]
     amd require ./harmony [0] ./amd.js 2:0-12:1
     cjs require ./harmony [0] ./amd.js 8:17-37
     amd require ./harmony [1] ./commonjs.js 5:0-11:1
     cjs require ./harmony [1] ./commonjs.js 9:17-37
     cjs require ./harmony [3] ./example.js 4:15-35
 [3] ./example.js 410 bytes {1} [built]
     single entry .\example.js  main
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
      Asset       Size  Chunks             Chunk Names
0.output.js  606 bytes       0  [emitted]  
  output.js   2.06 KiB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 439 bytes <{1}> [rendered]
    > [3] ./example.js 7:0-14:1
 [4] ../require.context/templates sync ^\.\/.*\.js$ 193 bytes {0} [built]
     amd require context ../require.context/templates [3] ./example.js 7:0-14:1
 [5] ../require.context/templates/c.js 82 bytes {0} [optional] [built]
     context element ./c.js [4] ../require.context/templates sync ^\.\/.*\.js$ ./c.js
 [6] ../require.context/templates/b.js 82 bytes {0} [optional] [built]
     context element ./b.js [4] ../require.context/templates sync ^\.\/.*\.js$ ./b.js
 [7] ../require.context/templates/a.js 82 bytes {0} [optional] [built]
     context element ./a.js [4] ../require.context/templates sync ^\.\/.*\.js$ ./a.js
chunk    {1} output.js (main) 1.03 KiB >{0}< [entry] [rendered]
    > .\example.js main
 [0] ./amd.js 309 bytes {1} [built]
     amd require ./amd [1] ./commonjs.js 5:0-11:1
     cjs require ./amd [1] ./commonjs.js 8:13-29
     harmony side effect evaluation ./amd [2] ./harmony.js 3:0-24
     cjs require ./amd [3] ./example.js 3:11-27
     amd require ./amd [3] ./example.js 7:0-14:1
     amd require ./amd [3] ./example.js 7:0-14:1
 [1] ./commonjs.js 233 bytes {1} [built]
     amd require ./commonjs [0] ./amd.js 2:0-12:1
     cjs require ./commonjs [0] ./amd.js 7:18-39
     harmony side effect evaluation ./commonjs [2] ./harmony.js 2:0-34
     cjs require ./commonjs [3] ./example.js 2:16-37
     amd require ./commonjs [3] ./example.js 7:0-14:1
     amd require ./commonjs [3] ./example.js 7:0-14:1
 [2] ./harmony.js 101 bytes {1} [built]
     [exports: default]
     amd require ./harmony [0] ./amd.js 2:0-12:1
     cjs require ./harmony [0] ./amd.js 8:17-37
     amd require ./harmony [1] ./commonjs.js 5:0-11:1
     cjs require ./harmony [1] ./commonjs.js 9:17-37
     cjs require ./harmony [3] ./example.js 4:15-35
 [3] ./example.js 410 bytes {1} [built]
     single entry .\example.js  main
```
