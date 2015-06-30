
# example.js

``` javascript
import { increment as inc } from './increment';
var a = 1;
inc(a); // 2

// async loading
System.import("./async-loaded").then((asyncLoaded) => {
	console.log(asyncLoaded);
});
```

# increment.js

``` javascript
import { add } from './math';
export function increment(val) {
    return add(val, 1);
};
```

# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules, executeModule) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(resolves.length)
/******/ 			resolves.shift()();

/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		0: 0
/******/ 	};

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

/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return Promise.resolve()

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

/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".output.js";
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

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__math__ = __webpack_require__(/*! ./math */ 3);
	/* harmony export declaration */function increment(val) {
	    return /* harmony import */ __WEBPACK_IMPORTED_MODULE_0__math__["add"](val, 1);
	}/* harmony export */ Object.defineProperty(exports, "increment", {configurable: false, enumerable: true, get: function() { return increment; }});;


/***/ },
/* 1 */,
/* 2 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__increment__ = __webpack_require__(/*! ./increment */ 0);
	var a = 1;
	/* harmony import */ __WEBPACK_IMPORTED_MODULE_0__increment__["increment"](a); // 2

	// async loading
	__webpack_require__.e/* System.import */(1).then(__webpack_require__.bind(null, /*! ./async-loaded */ 1)).then((asyncLoaded) => {
		console.log(asyncLoaded);
	});


/***/ },
/* 3 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

	/* harmony export declaration */function add() {
		var sum = 0, i = 0, args = arguments, l = args.length;
		while (i < l) {
			sum += args[i++];
		}
		return sum;
	}/* harmony export */ Object.defineProperty(exports, "add", {configurable: false, enumerable: true, get: function() { return add; }});


/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 12b612cd4c0d16b8de76
Version: webpack 1.9.10
Time: 99ms
      Asset       Size  Chunks             Chunk Names
  output.js    4.96 kB       0  [emitted]  main
1.output.js  387 bytes       1  [emitted]  
chunk    {0} output.js (main) 421 bytes [rendered]
    > main [2] ./example.js 
    [0] ./increment.js 94 bytes {0} [built]
        harmony import ./increment [2] ./example.js 1:0-47
    [2] ./example.js 185 bytes {0} [built]
    [3] ./math.js 142 bytes {0} [built]
        harmony import ./math [0] ./increment.js 1:0-29
chunk    {1} 1.output.js 25 bytes {0} [rendered]
    > [2] ./example.js 6:0-31
    [1] ./async-loaded.js 25 bytes {1} [built]
         ./async-loaded [2] ./example.js 6:0-31
```

## Minimized (uglify-js, no zip)

```
Hash: 12b612cd4c0d16b8de76
Version: webpack 1.9.10
Time: 171ms
      Asset       Size  Chunks             Chunk Names
  output.js    4.81 kB       0  [emitted]  main
1.output.js  138 bytes       1  [emitted]  
chunk    {0} output.js (main) 421 bytes [rendered]
    > main [2] ./example.js 
    [0] ./increment.js 94 bytes {0} [built]
        harmony import ./increment [2] ./example.js 1:0-47
    [2] ./example.js 185 bytes {0} [built]
    [3] ./math.js 142 bytes {0} [built]
        harmony import ./math [0] ./increment.js 1:0-29
chunk    {1} 1.output.js 25 bytes {0} [rendered]
    > [2] ./example.js 6:0-31
    [1] ./async-loaded.js 25 bytes {1} [built]
         ./async-loaded [2] ./example.js 6:0-31

ERROR in output.js from UglifyJs
Unexpected token: operator (>) [./example.js:6,0]
```