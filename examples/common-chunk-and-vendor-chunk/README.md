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

module.exports = {
	// mode: "development" || "production",
	entry: {
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	optimization: {
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				commons: {
					chunks: "initial",
					minChunks: 2,
					maxInitialRequests: 5, // The default limit is too small to showcase the effect
					minSize: 0 // This is example is too small to create commons chunks
				},
				vendor: {
					test: /node_modules/,
					chunks: "initial",
					name: "vendor",
					priority: 10,
					enforce: true
				}
			}
		}
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	}
};
```

# dist/vendor.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["vendor"],{

/***/ 1:
/*!*********************************!*\
  !*** ./node_modules/vendor1.js ***!
  \*********************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "vendor1";

/***/ }),

/***/ 5:
/*!*********************************!*\
  !*** ./node_modules/vendor2.js ***!
  \*********************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "vendor2";

/***/ })

}]);
```

# dist/commons-utility2_js.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["commons-utility2_js"],{

/***/ 3:
/*!*********************!*\
  !*** ./utility2.js ***!
  \*********************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "utility2";

/***/ })

}]);
```

# dist/commons-utility3_js.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["commons-utility3_js"],{

/***/ 6:
/*!*********************!*\
  !*** ./utility3.js ***!
  \*********************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "utility3";

/***/ })

}]);
```

# dist/pageA.js

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
/******/ 	// run modules when ready
/******/ 	return __webpack_require__.x();
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, module */
/***/ (function(module, __unusedexports, __webpack_require__) {

var vendor1 = __webpack_require__(/*! vendor1 */ 1);
var utility1 = __webpack_require__(/*! ./utility1 */ 2);
var utility2 = __webpack_require__(/*! ./utility2 */ 3);

module.exports = "pageA";


/***/ }),
/* 1 */,
/* 2 */
/*!*********************!*\
  !*** ./utility1.js ***!
  \*********************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "utility1";

/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	!function() {
/******/ 		
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"pageA": 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[0,"vendor","commons-utility2_js"]
/******/ 		];
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		var checkDeferredModules = function() {};
/******/ 		function checkDeferredModulesImpl() {
/******/ 			var result;
/******/ 			for(var i = 0; i < deferredModules.length; i++) {
/******/ 				var deferredModule = deferredModules[i];
/******/ 				var fulfilled = true;
/******/ 				for(var j = 1; j < deferredModule.length; j++) {
/******/ 					var depId = deferredModule[j];
/******/ 					if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferredModules.splice(i--, 1);
/******/ 					result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = function() {
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var executeModules = data[2];
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
/******/ 			// add entry modules from loaded chunk to deferred list
/******/ 			if(executeModules) deferredModules.push.apply(deferredModules, executeModules);
/******/ 		
/******/ 			// run deferred modules when all chunks ready
/******/ 			return checkDeferredModules();
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		jsonpArray = jsonpArray.slice();
/******/ 		for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# dist/pageB.js

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
/******/ 	// run modules when ready
/******/ 	return __webpack_require__.x();
/******/ })
/************************************************************************/
/******/ ({

/***/ 4:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, module */
/***/ (function(module, __unusedexports, __webpack_require__) {

var vendor2 = __webpack_require__(/*! vendor2 */ 5);
var utility2 = __webpack_require__(/*! ./utility2 */ 3);
var utility3 = __webpack_require__(/*! ./utility3 */ 6);

module.exports = "pageB";


/***/ })

/******/ },
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	!function() {
/******/ 		
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"pageB": 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[4,"vendor","commons-utility2_js","commons-utility3_js"]
/******/ 		];
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		var checkDeferredModules = function() {};
/******/ 		function checkDeferredModulesImpl() {
/******/ 			var result;
/******/ 			for(var i = 0; i < deferredModules.length; i++) {
/******/ 				var deferredModule = deferredModules[i];
/******/ 				var fulfilled = true;
/******/ 				for(var j = 1; j < deferredModule.length; j++) {
/******/ 					var depId = deferredModule[j];
/******/ 					if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferredModules.splice(i--, 1);
/******/ 					result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = function() {
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var executeModules = data[2];
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
/******/ 			// add entry modules from loaded chunk to deferred list
/******/ 			if(executeModules) deferredModules.push.apply(deferredModules, executeModules);
/******/ 		
/******/ 			// run deferred modules when all chunks ready
/******/ 			return checkDeferredModules();
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		jsonpArray = jsonpArray.slice();
/******/ 		for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ }
);
```

# dist/pageC.js

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
/******/ 	// run modules when ready
/******/ 	return __webpack_require__.x();
/******/ })
/************************************************************************/
/******/ ({

/***/ 7:
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, module */
/***/ (function(module, __unusedexports, __webpack_require__) {

var utility2 = __webpack_require__(/*! ./utility2 */ 3);
var utility3 = __webpack_require__(/*! ./utility3 */ 6);

module.exports = "pageC";

/***/ })

/******/ },
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	!function() {
/******/ 		
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"pageC": 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[7,"commons-utility2_js","commons-utility3_js"]
/******/ 		];
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		var checkDeferredModules = function() {};
/******/ 		function checkDeferredModulesImpl() {
/******/ 			var result;
/******/ 			for(var i = 0; i < deferredModules.length; i++) {
/******/ 				var deferredModule = deferredModules[i];
/******/ 				var fulfilled = true;
/******/ 				for(var j = 1; j < deferredModule.length; j++) {
/******/ 					var depId = deferredModule[j];
/******/ 					if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferredModules.splice(i--, 1);
/******/ 					result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = function() {
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var executeModules = data[2];
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
/******/ 			// add entry modules from loaded chunk to deferred list
/******/ 			if(executeModules) deferredModules.push.apply(deferredModules, executeModules);
/******/ 		
/******/ 			// run deferred modules when all chunks ready
/******/ 			return checkDeferredModules();
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		jsonpArray = jsonpArray.slice();
/******/ 		for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ }
);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
                 Asset       Size                 Chunks             Chunk Names
commons-utility2_js.js  316 bytes  {commons-utility2_js}  [emitted]
commons-utility3_js.js  316 bytes  {commons-utility3_js}  [emitted]
              pageA.js   5.35 KiB                {pageA}  [emitted]  pageA
              pageB.js   5.15 KiB                {pageB}  [emitted]  pageB
              pageC.js   5.09 KiB                {pageC}  [emitted]  pageC
             vendor.js  597 bytes               {vendor}  [emitted]  vendor
Entrypoint pageA = vendor.js commons-utility2_js.js pageA.js
Entrypoint pageB = vendor.js commons-utility2_js.js commons-utility3_js.js pageB.js
Entrypoint pageC = commons-utility2_js.js commons-utility3_js.js pageC.js
chunk {commons-utility2_js} commons-utility2_js.js 28 bytes ={commons-utility3_js}= ={pageA}= ={pageB}= ={pageC}= ={vendor}= [initial] [rendered] split chunk (cache group: commons)
    > ./pageA pageA
    > ./pageB pageB
    > ./pageC pageC
 [3] ./utility2.js 28 bytes {commons-utility2_js} [built]
     [used exports unknown]
     cjs require ./utility2 [0] ./pageA.js 3:15-36
     cjs require ./utility2 [4] ./pageB.js 2:15-36
     cjs require ./utility2 [7] ./pageC.js 1:15-36
chunk {commons-utility3_js} commons-utility3_js.js 28 bytes ={commons-utility2_js}= ={pageB}= ={pageC}= ={vendor}= [initial] [rendered] split chunk (cache group: commons)
    > ./pageB pageB
    > ./pageC pageC
 [6] ./utility3.js 28 bytes {commons-utility3_js} [built]
     [used exports unknown]
     cjs require ./utility3 [4] ./pageB.js 3:15-36
     cjs require ./utility3 [7] ./pageC.js 2:15-36
chunk {pageA} pageA.js (pageA) 165 bytes (javascript) 2.28 KiB (runtime) ={commons-utility2_js}= ={vendor}= [entry] [rendered]
    > ./pageA pageA
 [0] ./pageA.js 137 bytes {pageA} [built]
     [used exports unknown]
     entry ./pageA pageA
 [2] ./utility1.js 28 bytes {pageA} [built]
     [used exports unknown]
     cjs require ./utility1 [0] ./pageA.js 2:15-36
     + 1 hidden chunk module
chunk {pageB} pageB.js (pageB) 137 bytes (javascript) 2.3 KiB (runtime) ={commons-utility2_js}= ={commons-utility3_js}= ={vendor}= [entry] [rendered]
    > ./pageB pageB
 [4] ./pageB.js 137 bytes {pageB} [built]
     [used exports unknown]
     entry ./pageB pageB
     + 1 hidden chunk module
chunk {pageC} pageC.js (pageC) 102 bytes (javascript) 2.29 KiB (runtime) ={commons-utility2_js}= ={commons-utility3_js}= [entry] [rendered]
    > ./pageC pageC
 [7] ./pageC.js 102 bytes {pageC} [built]
     [used exports unknown]
     entry ./pageC pageC
     + 1 hidden chunk module
chunk {vendor} vendor.js (vendor) 54 bytes ={commons-utility2_js}= ={commons-utility3_js}= ={pageA}= ={pageB}= [initial] [rendered] split chunk (cache group: vendor) (name: vendor)
    > ./pageA pageA
    > ./pageB pageB
 [1] ./node_modules/vendor1.js 27 bytes {vendor} [built]
     [used exports unknown]
     cjs require vendor1 [0] ./pageA.js 1:14-32
 [5] ./node_modules/vendor2.js 27 bytes {vendor} [built]
     [used exports unknown]
     cjs require vendor2 [4] ./pageB.js 1:14-32
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
                 Asset       Size                 Chunks             Chunk Names
commons-utility2_js.js  117 bytes  {commons-utility2_js}  [emitted]
commons-utility3_js.js  118 bytes  {commons-utility3_js}  [emitted]
              pageA.js  959 bytes                {pageA}  [emitted]  pageA
              pageB.js  943 bytes                {pageB}  [emitted]  pageB
              pageC.js  927 bytes                {pageC}  [emitted]  pageC
             vendor.js  141 bytes               {vendor}  [emitted]  vendor
Entrypoint pageA = vendor.js commons-utility2_js.js pageA.js
Entrypoint pageB = vendor.js commons-utility2_js.js commons-utility3_js.js pageB.js
Entrypoint pageC = commons-utility2_js.js commons-utility3_js.js pageC.js
chunk {commons-utility2_js} commons-utility2_js.js 28 bytes ={commons-utility3_js}= ={pageA}= ={pageB}= ={pageC}= ={vendor}= [initial] [rendered] split chunk (cache group: commons)
    > ./pageA pageA
    > ./pageB pageB
    > ./pageC pageC
 [37] ./utility2.js 28 bytes {commons-utility2_js} [built]
      cjs require ./utility2 [912] ./pageC.js 1:15-36
      cjs require ./utility2 [953] ./pageA.js 3:15-36
      cjs require ./utility2 [954] ./pageB.js 2:15-36
chunk {commons-utility3_js} commons-utility3_js.js 28 bytes ={commons-utility2_js}= ={pageB}= ={pageC}= ={vendor}= [initial] [rendered] split chunk (cache group: commons)
    > ./pageB pageB
    > ./pageC pageC
 [544] ./utility3.js 28 bytes {commons-utility3_js} [built]
       cjs require ./utility3 [912] ./pageC.js 2:15-36
       cjs require ./utility3 [954] ./pageB.js 3:15-36
chunk {pageA} pageA.js (pageA) 165 bytes (javascript) 2.28 KiB (runtime) ={commons-utility2_js}= ={vendor}= [entry] [rendered]
    > ./pageA pageA
 [105] ./utility1.js 28 bytes {pageA} [built]
       cjs require ./utility1 [953] ./pageA.js 2:15-36
 [953] ./pageA.js 137 bytes {pageA} [built]
       entry ./pageA pageA
     + 1 hidden chunk module
chunk {pageB} pageB.js (pageB) 137 bytes (javascript) 2.3 KiB (runtime) ={commons-utility2_js}= ={commons-utility3_js}= ={vendor}= [entry] [rendered]
    > ./pageB pageB
 [954] ./pageB.js 137 bytes {pageB} [built]
       entry ./pageB pageB
     + 1 hidden chunk module
chunk {pageC} pageC.js (pageC) 102 bytes (javascript) 2.3 KiB (runtime) ={commons-utility2_js}= ={commons-utility3_js}= [entry] [rendered]
    > ./pageC pageC
 [912] ./pageC.js 102 bytes {pageC} [built]
       entry ./pageC pageC
     + 1 hidden chunk module
chunk {vendor} vendor.js (vendor) 54 bytes ={commons-utility2_js}= ={commons-utility3_js}= ={pageA}= ={pageB}= [initial] [rendered] split chunk (cache group: vendor) (name: vendor)
    > ./pageA pageA
    > ./pageB pageB
 [333] ./node_modules/vendor1.js 27 bytes {vendor} [built]
       cjs require vendor1 [953] ./pageA.js 1:14-32
 [407] ./node_modules/vendor2.js 27 bytes {vendor} [built]
       cjs require vendor2 [954] ./pageB.js 1:14-32
```
