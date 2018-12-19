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
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
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
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, __webpack_require__.e, __webpack_require__.oe */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

// CommonJs-style requires
var commonjs1 = __webpack_require__(/*! ./commonjs */ 1);
var amd1 = __webpack_require__(/*! ./amd */ 2);
var harmony1 = __webpack_require__(/*! ./harmony */ 3);

// AMD-style requires (with all webpack features)
__webpack_require__.e(/*! AMD require */ 462).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [
	__webpack_require__(/*! ./commonjs */ 1), __webpack_require__(/*! ./amd */ 2),
	__webpack_require__(4)("./"+amd1+".js"),
	Math.random() < 0.5 ? __webpack_require__(/*! ./commonjs */ 1) : __webpack_require__(/*! ./amd */ 2)]; (function(commonjs2, amd2, template, randModule) {
		// Do something with it...
	}).apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);}).catch(__webpack_require__.oe);


/***/ }),
/* 1 */
/*!*********************!*\
  !*** ./commonjs.js ***!
  \*********************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__.oe, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

// CommonJs Module Format
module.exports = 123;

// but you can use amd style requires
Promise.resolve(/*! AMD require */).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./amd */ 2), __webpack_require__(/*! ./harmony */ 3)]; (function(amd1, harmony) {
		var amd2 = __webpack_require__(/*! ./amd */ 2);
		var harmony2 = __webpack_require__(/*! ./harmony */ 3);
	}).apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);}).catch(__webpack_require__.oe);

/***/ }),
/* 2 */
/*!****************!*\
  !*** ./amd.js ***!
  \****************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, __webpack_exports__ */
/***/ (function(__unusedmodule, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// AMD Module Format
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! ./commonjs */ 1), __webpack_require__(/*! ./harmony */ 3)], __WEBPACK_AMD_DEFINE_RESULT__ = (function(commonjs1, harmony1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = __webpack_require__(/*! ./commonjs */ 1);
		var harmony2 = __webpack_require__(/*! ./harmony */ 3);
		// Do something...
		return 456;
	}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 3 */
/*!********************!*\
  !*** ./harmony.js ***!
  \********************/
/*! exports provided: default */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__, __webpack_require__.n, __webpack_require__.d */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _commonjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./commonjs */ 1);
/* harmony import */ var _commonjs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_commonjs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _amd__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./amd */ 2);
/* harmony import */ var _amd__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_amd__WEBPACK_IMPORTED_MODULE_1__);
// ES6 Modules



/* harmony default export */ __webpack_exports__["default"] = (456);


/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) { __webpack_require__.f[key](chunkId, promises); return promises; }, []));
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function getDefault() { return module['default']; } :
/******/ 				function getModuleExports() { return module; };
/******/ 			__webpack_require__.d(getter, 'a', getter);
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getter */
/******/ 	!function() {
/******/ 		// define getter function for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = function(exports, name, getter) {
/******/ 			if(!hasOwnProperty.call(exports, name)) {
/******/ 				Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			return "" + chunkId + ".output.js";
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	!function() {
/******/ 		
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			404: 0
/******/ 		};
/******/ 		
/******/ 		
/******/ 		
/******/ 		__webpack_require__.f.j = function(chunkId, promises) {
/******/ 			// JSONP chunk loading for javascript
/******/ 			var installedChunkData = installedChunks[chunkId];
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[2]);
/******/ 				} else {
/******/ 					// setup Promise in chunk cache
/******/ 					var promise = new Promise(function(resolve, reject) {
/******/ 						installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 					});
/******/ 					promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 					// start chunk loading
/******/ 					var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 					var loadingEnded = function() { if(installedChunks[chunkId]) return installedChunks[chunkId][1]; if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined; };
/******/ 					var script = document.createElement('script');
/******/ 					var onScriptComplete;
/******/ 		
/******/ 					script.charset = 'utf-8';
/******/ 					script.timeout = 120;
/******/ 					if (__webpack_require__.nc) {
/******/ 						script.setAttribute("nonce", __webpack_require__.nc);
/******/ 					}
/******/ 					script.src = url;
/******/ 		
/******/ 					onScriptComplete = function (event) {
/******/ 						// avoid mem leaks in IE.
/******/ 						script.onerror = script.onload = null;
/******/ 						clearTimeout(timeout);
/******/ 						var reportError = loadingEnded();
/******/ 						if(reportError) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							reportError(error);
/******/ 						}
/******/ 					};
/******/ 					var timeout = setTimeout(function(){
/******/ 						onScriptComplete({ type: 'timeout', target: script });
/******/ 					}, 120000);
/******/ 					script.onerror = script.onload = onScriptComplete;
/******/ 					document.head.appendChild(script);
/******/ 		
/******/ 					// no HMR
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			// no chunk preloading needed
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
/******/ 			var runtime = data[3];
/******/ 		
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# dist/462.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[462],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/*!******************************************************!*\
  !*** ../require.context/templates sync ^\.\/.*\.js$ ***!
  \******************************************************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

var map = {
	"./a.js": 5,
	"./b.js": 6,
	"./c.js": 7
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	return __webpack_require__(id);
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
  !*** ../require.context/templates/a.js ***!
  \*****************************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = function() {
	return "This text was generated by template A";
}

/***/ }),
/* 6 */
/*!*****************************************!*\
  !*** ../require.context/templates/b.js ***!
  \*****************************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = function() {
	return "This text was generated by template B";
}

/***/ }),
/* 7 */
/*!*****************************************!*\
  !*** ../require.context/templates/c.js ***!
  \*****************************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = function() {
	return "This text was generated by template C";
}

/***/ })
]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
        Asset      Size  Chunks             Chunk Names
462.output.js  1.98 KiB   {462}  [emitted]
    output.js  11.6 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 1010 bytes (javascript) 4.42 KiB (runtime) >{462}< [entry] [rendered]
    > .\example.js main
 [0] ./example.js 396 bytes {404} [built]
     [used exports unknown]
     entry .\example.js main
 [1] ./commonjs.js 223 bytes {404} [built]
     [used exports unknown]
     cjs require ./commonjs [0] ./example.js 2:16-37
     amd require ./commonjs [0] ./example.js 7:0-14:1
     amd require ./commonjs [0] ./example.js 7:0-14:1
     amd require ./commonjs [2] ./amd.js 2:0-12:1
     cjs require ./commonjs [2] ./amd.js 7:18-39
     harmony side effect evaluation ./commonjs [3] ./harmony.js 2:0-34
 [2] ./amd.js 298 bytes {404} [built]
     [used exports unknown]
     cjs require ./amd [0] ./example.js 3:11-27
     amd require ./amd [0] ./example.js 7:0-14:1
     amd require ./amd [0] ./example.js 7:0-14:1
     amd require ./amd [1] ./commonjs.js 5:0-11:1
     cjs require ./amd [1] ./commonjs.js 8:13-29
     harmony side effect evaluation ./amd [3] ./harmony.js 3:0-24
 [3] ./harmony.js 96 bytes {404} [built]
     [exports: default]
     [used exports unknown]
     cjs require ./harmony [0] ./example.js 4:15-35
     amd require ./harmony [1] ./commonjs.js 5:0-11:1
     cjs require ./harmony [1] ./commonjs.js 9:17-37
     amd require ./harmony [2] ./amd.js 2:0-12:1
     cjs require ./harmony [2] ./amd.js 8:17-37
     + 7 hidden chunk modules
chunk {462} 462.output.js 433 bytes <{404}> [rendered]
    > [0] ./example.js 7:0-14:1
 [4] ../require.context/templates sync ^\.\/.*\.js$ 193 bytes {462} [built]
     [used exports unknown]
     amd require context ../require.context/templates [0] ./example.js 7:0-14:1
 [5] ../require.context/templates/a.js 80 bytes {462} [optional] [built]
     [used exports unknown]
     context element ./a.js [4] ../require.context/templates sync ^\.\/.*\.js$ ./a.js
 [6] ../require.context/templates/b.js 80 bytes {462} [optional] [built]
     [used exports unknown]
     context element ./b.js [4] ../require.context/templates sync ^\.\/.*\.js$ ./b.js
 [7] ../require.context/templates/c.js 80 bytes {462} [optional] [built]
     [used exports unknown]
     context element ./c.js [4] ../require.context/templates sync ^\.\/.*\.js$ ./c.js
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
        Asset       Size  Chunks             Chunk Names
462.output.js  621 bytes   {462}  [emitted]
    output.js   2.24 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 1010 bytes (javascript) 4.42 KiB (runtime) >{462}< [entry] [rendered]
    > .\example.js main
  [38] ./commonjs.js 223 bytes {404} [built]
       cjs require ./commonjs [275] ./example.js 2:16-37
       amd require ./commonjs [275] ./example.js 7:0-14:1
       amd require ./commonjs [275] ./example.js 7:0-14:1
       harmony side effect evaluation ./commonjs [325] ./harmony.js 2:0-34
       amd require ./commonjs [970] ./amd.js 2:0-12:1
       cjs require ./commonjs [970] ./amd.js 7:18-39
 [275] ./example.js 396 bytes {404} [built]
       entry .\example.js main
 [325] ./harmony.js 96 bytes {404} [built]
       [exports: default]
       amd require ./harmony [38] ./commonjs.js 5:0-11:1
       cjs require ./harmony [38] ./commonjs.js 9:17-37
       cjs require ./harmony [275] ./example.js 4:15-35
       amd require ./harmony [970] ./amd.js 2:0-12:1
       cjs require ./harmony [970] ./amd.js 8:17-37
 [970] ./amd.js 298 bytes {404} [built]
       amd require ./amd [38] ./commonjs.js 5:0-11:1
       cjs require ./amd [38] ./commonjs.js 8:13-29
       cjs require ./amd [275] ./example.js 3:11-27
       amd require ./amd [275] ./example.js 7:0-14:1
       amd require ./amd [275] ./example.js 7:0-14:1
       harmony side effect evaluation ./amd [325] ./harmony.js 3:0-24
     + 7 hidden chunk modules
chunk {462} 462.output.js 433 bytes <{404}> [rendered]
    > [275] ./example.js 7:0-14:1
 [145] ../require.context/templates/a.js 80 bytes {462} [optional] [built]
       context element ./a.js [462] ../require.context/templates sync ^\.\/.*\.js$ ./a.js
 [221] ../require.context/templates/c.js 80 bytes {462} [optional] [built]
       context element ./c.js [462] ../require.context/templates sync ^\.\/.*\.js$ ./c.js
 [462] ../require.context/templates sync ^\.\/.*\.js$ 193 bytes {462} [built]
       amd require context ../require.context/templates [275] ./example.js 7:0-14:1
 [641] ../require.context/templates/b.js 80 bytes {462} [optional] [built]
       context element ./b.js [462] ../require.context/templates sync ^\.\/.*\.js$ ./b.js
```
