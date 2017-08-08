
# example.js

``` javascript
import { increment as inc } from './increment';
var a = 1;
inc(a); // 2

// async loading
import("./async-loaded").then(function(asyncLoaded) {
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

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

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
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules, executeModules);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		1: 0
/******/ 	};
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
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData === 0) {
/******/ 			return new Promise(function(resolve) { resolve(); });
/******/ 		}
/******/
/******/ 		// a Promise means "currently loading".
/******/ 		if(installedChunkData) {
/******/ 			return installedChunkData[2];
/******/ 		}
/******/
/******/ 		// setup Promise in chunk cache
/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		installedChunkData[2] = promise;
/******/
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;
/******/
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
/******/ 				if(chunk) {
/******/ 					chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				}
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};
/******/ 		head.appendChild(script);
/******/
/******/ 		return promise;
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
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
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
/*! exports provided:  */
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__increment__ = __webpack_require__(/*! ./increment */ 1);

var a = 1;
Object(__WEBPACK_IMPORTED_MODULE_0__increment__["a" /* increment */])(a); // 2

// async loading
__webpack_require__.e/* import() */(0).then(__webpack_require__.bind(null, /*! ./async-loaded */ 3)).then(function(asyncLoaded) {
	console.log(asyncLoaded);
});


/***/ }),
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/*! exports provided: increment */
/*! exports used: increment */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = increment;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__math__ = __webpack_require__(/*! ./math */ 2);

function increment(val) {
    return Object(__WEBPACK_IMPORTED_MODULE_0__math__["a" /* add */])(val, 1);
};


/***/ }),
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! exports provided: add */
/*! exports used: add */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = add;
function add() {
	var sum = 0, i = 0, args = arguments, l = args.length;
	while (i < l) {
		sum += args[i++];
	}
	return sum;
}


/***/ })
/******/ ]);
```

# Info

## Uncompressed

```
Hash: f5982ea38c08a86ed265
Version: webpack 3.5.1
      Asset       Size  Chunks             Chunk Names
0.output.js  484 bytes       0  [emitted]  
  output.js    7.36 kB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 25 bytes {1} [rendered]
    > [0] ./example.js 6:0-24
    [3] ./async-loaded.js 25 bytes {0} [built]
        [exports: answer]
        import() ./async-loaded [0] ./example.js 6:0-24
chunk    {1} output.js (main) 419 bytes [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 183 bytes {1} [built]
        [no exports]
    [1] ./increment.js 94 bytes {1} [built]
        [exports: increment]
        [only some exports used: increment]
        harmony import ./increment [0] ./example.js 1:0-47
    [2] ./math.js 142 bytes {1} [built]
        [exports: add]
        [only some exports used: add]
        harmony import ./math [1] ./increment.js 1:0-29
```

## Minimized (uglify-js, no zip)

```
Hash: f5982ea38c08a86ed265
Version: webpack 3.5.1
      Asset       Size  Chunks             Chunk Names
0.output.js  147 bytes       0  [emitted]  
  output.js    1.69 kB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 25 bytes {1} [rendered]
    > [0] ./example.js 6:0-24
    [3] ./async-loaded.js 25 bytes {0} [built]
        [exports: answer]
        import() ./async-loaded [0] ./example.js 6:0-24
chunk    {1} output.js (main) 419 bytes [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 183 bytes {1} [built]
        [no exports]
    [1] ./increment.js 94 bytes {1} [built]
        [exports: increment]
        [only some exports used: increment]
        harmony import ./increment [0] ./example.js 1:0-47
    [2] ./math.js 142 bytes {1} [built]
        [exports: add]
        [only some exports used: add]
        harmony import ./math [1] ./increment.js 1:0-29
```