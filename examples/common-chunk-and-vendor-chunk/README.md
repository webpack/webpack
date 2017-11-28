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
	mode: "production",
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
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0], moreModules = data[1], executeModules = data[2];
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
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/ 		scheduledModules.push.apply(scheduledModules, executeModules || []);
/******/
/******/ 		for(i = 0; i < scheduledModules.length; i++) {
/******/ 			var scheduledModule = scheduledModules[i];
/******/ 			var fullfilled = true;
/******/ 			for(var j = 1; j < scheduledModule.length; j++) {
/******/ 				var depId = scheduledModule[j];
/******/ 				if(installedChunks[depId] !== 0) fullfilled = false;
/******/ 			}
/******/ 			if(fullfilled) {
/******/ 				scheduledModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = scheduledModule[0]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		4: 0
/******/ 	};
/******/
/******/ 	var scheduledModules = [];
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
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120000;
/******/
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = __webpack_require__.p + "" + chunkId + ".js";
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
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var parentJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
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
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
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
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

module.exports = "vendor1";

/***/ }),
/* 4 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

module.exports = "vendor2";

/***/ })
/******/ ]);
```

# js/common.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!*********************!*\
  !*** ./utility2.js ***!
  \*********************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

module.exports = "utility2";

/***/ }),
/* 1 */
/*!*********************!*\
  !*** ./utility3.js ***!
  \*********************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

module.exports = "utility3";

/***/ })
]]);
```

# js/pageA.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],{

/***/ 5:
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
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
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

module.exports = "utility1";

/***/ })

},[[5,4,0,1]]]);
```

# js/pageB.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[3],{

/***/ 7:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

var utility2 = __webpack_require__(/*! ./utility2 */ 0);
var utility3 = __webpack_require__(/*! ./utility3 */ 1);

module.exports = "pageB";

/***/ })

},[[7,4,0,3]]]);
```

# js/pageC.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[2],{

/***/ 8:
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

var utility2 = __webpack_require__(/*! ./utility2 */ 0);
var utility3 = __webpack_require__(/*! ./utility3 */ 1);

module.exports = "pageC";

/***/ })

},[[8,4,0,2]]]);
```

# Info

## Uncompressed

```
Hash: 4b8ef245065d9c193fc3
Version: webpack next
    Asset       Size  Chunks             Chunk Names
common.js  651 bytes       0  [emitted]  common
 pageA.js  795 bytes       1  [emitted]  pageA
 pageC.js  503 bytes       2  [emitted]  pageC
 pageB.js  503 bytes       3  [emitted]  pageB
vendor.js   8.15 KiB       4  [emitted]  vendor
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
        single entry ./pageA  pageA
    [6] ./utility1.js 28 bytes {1} [built]
        cjs require ./utility1 [5] ./pageA.js 1:15-36
chunk    {2} pageC.js (pageC) 105 bytes {0} [initial] [rendered]
    > pageC [8] ./pageC.js 
    [8] ./pageC.js 105 bytes {2} [built]
        single entry ./pageC  pageC
chunk    {3} pageB.js (pageB) 105 bytes {0} [initial] [rendered]
    > pageB [7] ./pageB.js 
    [7] ./pageB.js 105 bytes {3} [built]
        single entry ./pageB  pageB
chunk    {4} vendor.js (vendor) 94 bytes [entry] [rendered]
    > vendor [2] multi ./vendor1 ./vendor2 
    [2] multi ./vendor1 ./vendor2 40 bytes {4} [built]
        multi entry 
    [3] ./vendor1.js 27 bytes {4} [built]
        single entry ./vendor1 [2] multi ./vendor1 ./vendor2 vendor:100000
    [4] ./vendor2.js 27 bytes {4} [built]
        single entry ./vendor2 [2] multi ./vendor1 ./vendor2 vendor:100001
```

## Minimized (uglify-js, no zip)

```
Hash: 4b8ef245065d9c193fc3
Version: webpack next
    Asset       Size  Chunks             Chunk Names
common.js  132 bytes       0  [emitted]  common
 pageA.js  157 bytes       1  [emitted]  pageA
 pageC.js  119 bytes       2  [emitted]  pageC
 pageB.js  119 bytes       3  [emitted]  pageB
vendor.js   1.82 KiB       4  [emitted]  vendor
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
        single entry ./pageA  pageA
    [6] ./utility1.js 28 bytes {1} [built]
        cjs require ./utility1 [5] ./pageA.js 1:15-36
chunk    {2} pageC.js (pageC) 105 bytes {0} [initial] [rendered]
    > pageC [8] ./pageC.js 
    [8] ./pageC.js 105 bytes {2} [built]
        single entry ./pageC  pageC
chunk    {3} pageB.js (pageB) 105 bytes {0} [initial] [rendered]
    > pageB [7] ./pageB.js 
    [7] ./pageB.js 105 bytes {3} [built]
        single entry ./pageB  pageB
chunk    {4} vendor.js (vendor) 94 bytes [entry] [rendered]
    > vendor [2] multi ./vendor1 ./vendor2 
    [2] multi ./vendor1 ./vendor2 40 bytes {4} [built]
        multi entry 
    [3] ./vendor1.js 27 bytes {4} [built]
        single entry ./vendor1 [2] multi ./vendor1 ./vendor2 vendor:100000
    [4] ./vendor2.js 27 bytes {4} [built]
        single entry ./vendor2 [2] multi ./vendor1 ./vendor2 vendor:100001
```
