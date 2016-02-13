
# example.js

``` javascript
import { increment as inc } from './increment';
var a = 1;
inc(a); // 2

// async loading
System.import("./async-loaded").then(function(asyncLoaded) {
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
	/* harmony export */ exports["a"] = increment;
	function increment(val) {
	    return /* harmony import */__WEBPACK_IMPORTED_MODULE_0__math__["a"].bind()(val, 1);
	};


/***/ },
/* 1 */,
/* 2 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__increment__ = __webpack_require__(/*! ./increment */ 0);

	var a = 1;
	/* harmony import */__WEBPACK_IMPORTED_MODULE_0__increment__["a"].bind()(a); // 2

	// async loading
	__webpack_require__.e/* System.import */(1).then(__webpack_require__.bind(null, /*! ./async-loaded */ 1)).then(function(asyncLoaded) {
		console.log(asyncLoaded);
	});


/***/ },
/* 3 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

	/* harmony export */ exports["a"] = add;function add() {
		var sum = 0, i = 0, args = arguments, l = args.length;
		while (i < l) {
			sum += args[i++];
		}
		return sum;
	}


/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 03492ef5e250ea40b1d4
Version: webpack 2.0.7-beta
Time: 115ms
    Asset       Size  Chunks             Chunk Names
output.js    5.28 kB       0  [emitted]  main
     1.js  355 bytes       1  [emitted]  
chunk    {0} output.js (main) 426 bytes [rendered]
    > main [2] ./example.js 
    [0] ./increment.js 94 bytes {0} [built]
        harmony import ./increment [2] ./example.js 1:0-47
    [2] ./example.js 190 bytes {0} [built]
    [3] ./math.js 142 bytes {0} [built]
        harmony import ./math [0] ./increment.js 1:0-29
chunk    {1} 1.js 25 bytes {0} [rendered]
    > [2] ./example.js 6:0-31
    [1] ./async-loaded.js 25 bytes {1} [built]
        System.import ./async-loaded [2] ./example.js 6:0-31
```

## Minimized (uglify-js, no zip)

```
Hash: 03492ef5e250ea40b1d4
Version: webpack 2.0.7-beta
Time: 210ms
    Asset       Size  Chunks             Chunk Names
output.js     1.2 kB       0  [emitted]  main
     1.js  138 bytes       1  [emitted]  
chunk    {0} output.js (main) 426 bytes [rendered]
    > main [2] ./example.js 
    [0] ./increment.js 94 bytes {0} [built]
        harmony import ./increment [2] ./example.js 1:0-47
    [2] ./example.js 190 bytes {0} [built]
    [3] ./math.js 142 bytes {0} [built]
        harmony import ./math [0] ./increment.js 1:0-29
chunk    {1} 1.js 25 bytes {0} [rendered]
    > [2] ./example.js 6:0-31
    [1] ./async-loaded.js 25 bytes {1} [built]
        System.import ./async-loaded [2] ./example.js 6:0-31
```