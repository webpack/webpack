This example shows how to create an explicit vendor chunk as well as a common chunk for code shared among entry points. In this example, we have 3 entry points: `pageA`, `pageB`, and `pageC`. Those entry points share some of the same utility modules, but not others. This configuration will pull out any modules common to at least 2 bundles and place it in the `common` bundle instead, all while keeping the specified vendor libraries in their own bundle by themselves.

To better understand, here are the entry points and which utility modules they depend on:

- `pageA`
  - `utility1`
  - `utility2`
- `pageB`
  - `utility2`
  - `utility3`
- `pageC`
  - `utility2`
  - `utility3`

Given this configuration, webpack will produce the following bundles:

- `vendor`
  - webpack runtime
  - `vendor1`
  - `vendor2`
- `common`
  - `utility2`
  - `utility3`
- `pageA`
  - `pageA`
  - `utility1`
- `pageB`
  - `pageB`
- `pageC`
  - `pageC`

With this bundle configuration, you would load your third party libraries, then your common application code, then your page-specific application code.

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");

module.exports = {
	entry: {
		vendor: ["./vendor1", "./vendor2"],
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
		// older versions of webpack may require an empty entry point declaration here
		// common: []
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js"
	},
	plugins: [
		new CommonsChunkPlugin({
			// The order of this array matters
			names: ["common", "vendor"],
			minChunks: 2
		})
	]
};
```

# js/vendor.js

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
/******/ 		if(executeModules) {
/******/ 			for(i=0; i < executeModules.length; i++) {
/******/ 				result = __webpack_require__(__webpack_require__.s = executeModules[i]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		4: 0
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
/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".js";
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
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */,
/* 1 */,
/* 2 */
/*!*********************************!*\
  !*** multi ./vendor1 ./vendor2 ***!
  \*********************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./vendor1 */3);
module.exports = __webpack_require__(/*! ./vendor2 */4);


/***/ }),
/* 3 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = "vendor1";

/***/ }),
/* 4 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = "vendor2";

/***/ })
/******/ ]);
```

# js/common.js

``` javascript
webpackJsonp([0],[
/* 0 */
/*!*********************!*\
  !*** ./utility2.js ***!
  \*********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = "utility2";

/***/ }),
/* 1 */
/*!*********************!*\
  !*** ./utility3.js ***!
  \*********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = "utility3";

/***/ })
]);
```

# js/pageA.js

``` javascript
webpackJsonp([1],{

/***/ 5:
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

var utility1 = __webpack_require__(/*! ./utility1 */ 6);
var utility2 = __webpack_require__(/*! ./utility2 */ 0);

module.exports = "pageA";

/***/ }),

/***/ 6:
/*!*********************!*\
  !*** ./utility1.js ***!
  \*********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = "utility1";

/***/ })

},[5]);
```

# js/pageB.js

``` javascript
webpackJsonp([3],{

/***/ 7:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

var utility2 = __webpack_require__(/*! ./utility2 */ 0);
var utility3 = __webpack_require__(/*! ./utility3 */ 1);

module.exports = "pageB";

/***/ })

},[7]);
```

# js/pageC.js

``` javascript
webpackJsonp([2],{

/***/ 8:
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

var utility2 = __webpack_require__(/*! ./utility2 */ 0);
var utility3 = __webpack_require__(/*! ./utility3 */ 1);

module.exports = "pageC";

/***/ })

},[8]);
```

# Info

## Uncompressed

```
Hash: 3b80b7c17398c31e4705
Version: webpack 3.5.1
    Asset       Size  Chunks             Chunk Names
common.js  459 bytes       0  [emitted]  common
 pageA.js  595 bytes       1  [emitted]  pageA
 pageC.js  374 bytes       2  [emitted]  pageC
 pageB.js  374 bytes       3  [emitted]  pageB
vendor.js     6.7 kB       4  [emitted]  vendor
Entrypoint vendor = vendor.js
Entrypoint pageA = vendor.js common.js pageA.js
Entrypoint pageB = vendor.js common.js pageB.js
Entrypoint pageC = vendor.js common.js pageC.js
chunk    {0} common.js (common) 56 bytes {4} [initial] [rendered]
    [0] ./utility2.js 28 bytes {0} [built]
        cjs require ./utility2 [5] ./pageA.js 2:15-36
        cjs require ./utility2 [7] ./pageB.js 1:15-36
        cjs require ./utility2 [8] ./pageC.js 1:15-36
    [1] ./utility3.js 28 bytes {0} [built]
        cjs require ./utility3 [7] ./pageB.js 2:15-36
        cjs require ./utility3 [8] ./pageC.js 2:15-36
chunk    {1} pageA.js (pageA) 133 bytes {0} [initial] [rendered]
    > pageA [5] ./pageA.js 
    [5] ./pageA.js 105 bytes {1} [built]
    [6] ./utility1.js 28 bytes {1} [built]
        cjs require ./utility1 [5] ./pageA.js 1:15-36
chunk    {2} pageC.js (pageC) 105 bytes {0} [initial] [rendered]
    > pageC [8] ./pageC.js 
    [8] ./pageC.js 105 bytes {2} [built]
chunk    {3} pageB.js (pageB) 105 bytes {0} [initial] [rendered]
    > pageB [7] ./pageB.js 
    [7] ./pageB.js 105 bytes {3} [built]
chunk    {4} vendor.js (vendor) 94 bytes [entry] [rendered]
    > vendor [2] multi ./vendor1 ./vendor2 
    [2] multi ./vendor1 ./vendor2 40 bytes {4} [built]
    [3] ./vendor1.js 27 bytes {4} [built]
        single entry ./vendor1 [2] multi ./vendor1 ./vendor2 vendor:100000
    [4] ./vendor2.js 27 bytes {4} [built]
        single entry ./vendor2 [2] multi ./vendor1 ./vendor2 vendor:100001
```

## Minimized (uglify-js, no zip)

```
Hash: 3b80b7c17398c31e4705
Version: webpack 3.5.1
    Asset       Size  Chunks             Chunk Names
common.js   92 bytes       0  [emitted]  common
 pageA.js  109 bytes       1  [emitted]  pageA
 pageC.js   71 bytes       2  [emitted]  pageC
 pageB.js   71 bytes       3  [emitted]  pageB
vendor.js    1.48 kB       4  [emitted]  vendor
Entrypoint vendor = vendor.js
Entrypoint pageA = vendor.js common.js pageA.js
Entrypoint pageB = vendor.js common.js pageB.js
Entrypoint pageC = vendor.js common.js pageC.js
chunk    {0} common.js (common) 56 bytes {4} [initial] [rendered]
    [0] ./utility2.js 28 bytes {0} [built]
        cjs require ./utility2 [5] ./pageA.js 2:15-36
        cjs require ./utility2 [7] ./pageB.js 1:15-36
        cjs require ./utility2 [8] ./pageC.js 1:15-36
    [1] ./utility3.js 28 bytes {0} [built]
        cjs require ./utility3 [7] ./pageB.js 2:15-36
        cjs require ./utility3 [8] ./pageC.js 2:15-36
chunk    {1} pageA.js (pageA) 133 bytes {0} [initial] [rendered]
    > pageA [5] ./pageA.js 
    [5] ./pageA.js 105 bytes {1} [built]
    [6] ./utility1.js 28 bytes {1} [built]
        cjs require ./utility1 [5] ./pageA.js 1:15-36
chunk    {2} pageC.js (pageC) 105 bytes {0} [initial] [rendered]
    > pageC [8] ./pageC.js 
    [8] ./pageC.js 105 bytes {2} [built]
chunk    {3} pageB.js (pageB) 105 bytes {0} [initial] [rendered]
    > pageB [7] ./pageB.js 
    [7] ./pageB.js 105 bytes {3} [built]
chunk    {4} vendor.js (vendor) 94 bytes [entry] [rendered]
    > vendor [2] multi ./vendor1 ./vendor2 
    [2] multi ./vendor1 ./vendor2 40 bytes {4} [built]
    [3] ./vendor1.js 27 bytes {4} [built]
        single entry ./vendor1 [2] multi ./vendor1 ./vendor2 vendor:100000
    [4] ./vendor2.js 27 bytes {4} [built]
        single entry ./vendor2 [2] multi ./vendor1 ./vendor2 vendor:100001
```
