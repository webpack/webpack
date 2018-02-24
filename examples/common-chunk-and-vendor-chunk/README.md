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
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[3],{

/***/ 1:
/*!*********************************!*\
  !*** ./node_modules/vendor1.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "vendor1";

/***/ }),

/***/ 5:
/*!*********************************!*\
  !*** ./node_modules/vendor2.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "vendor2";

/***/ })

}]);
```

# dist/commons~pageA~pageB~pageC.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[4],{

/***/ 3:
/*!*********************!*\
  !*** ./utility2.js ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "utility2";

/***/ })

}]);
```

# dist/commons~pageB~pageC.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[5],{

/***/ 6:
/*!*********************!*\
  !*** ./utility3.js ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "utility3";

/***/ })

}]);
```

# dist/pageA.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1]
/******/ 		var executeModules = data[2];
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
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fullfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fullfilled = false;
/******/ 			}
/******/ 			if(fullfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		0: 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
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
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// add entry module to deferred list
/******/ 	deferredModules.push([0,3,4]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
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
/***/ (function(module, exports, __webpack_require__) {

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
/***/ (function(module, exports) {

module.exports = "utility1";

/***/ })
/******/ ]);
```

# dist/pageB.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1]
/******/ 		var executeModules = data[2];
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
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fullfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fullfilled = false;
/******/ 			}
/******/ 			if(fullfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		1: 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
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
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// add entry module to deferred list
/******/ 	deferredModules.push([4,3,4,5]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ 4:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var vendor2 = __webpack_require__(/*! vendor2 */ 5);
var utility2 = __webpack_require__(/*! ./utility2 */ 3);
var utility3 = __webpack_require__(/*! ./utility3 */ 6);

module.exports = "pageB";


/***/ })

/******/ });
```

# dist/pageC.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1]
/******/ 		var executeModules = data[2];
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
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fullfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fullfilled = false;
/******/ 			}
/******/ 			if(fullfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		2: 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
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
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// add entry module to deferred list
/******/ 	deferredModules.push([7,4,5]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ 7:
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var utility2 = __webpack_require__(/*! ./utility2 */ 3);
var utility3 = __webpack_require__(/*! ./utility3 */ 6);

module.exports = "pageC";

/***/ })

/******/ });
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
                       Asset       Size  Chunks             Chunk Names
                    pageA.js    5.6 KiB       0  [emitted]  pageA
                    pageB.js    5.4 KiB       1  [emitted]  pageB
                    pageC.js   5.34 KiB       2  [emitted]  pageC
                   vendor.js  536 bytes       3  [emitted]  vendor
commons~pageA~pageB~pageC.js  269 bytes       4  [emitted]  commons~pageA~pageB~pageC
      commons~pageB~pageC.js  269 bytes       5  [emitted]  commons~pageB~pageC
Entrypoint pageA = vendor.js commons~pageA~pageB~pageC.js pageA.js
Entrypoint pageB = vendor.js commons~pageA~pageB~pageC.js commons~pageB~pageC.js pageB.js
Entrypoint pageC = commons~pageA~pageB~pageC.js commons~pageB~pageC.js pageC.js
chunk    {0} pageA.js (pageA) 170 bytes ={3}= ={4}= [entry] [rendered]
    > ./pageA pageA
    [0] ./pageA.js 142 bytes {0} [built]
        single entry ./pageA  pageA
    [2] ./utility1.js 28 bytes {0} [built]
        cjs require ./utility1 [0] ./pageA.js 2:15-36
chunk    {1} pageB.js (pageB) 142 bytes ={3}= ={4}= ={5}= [entry] [rendered]
    > ./pageB pageB
    [4] ./pageB.js 142 bytes {1} [built]
        single entry ./pageB  pageB
chunk    {2} pageC.js (pageC) 105 bytes ={4}= ={5}= [entry] [rendered]
    > ./pageC pageC
    [7] ./pageC.js 105 bytes {2} [built]
        single entry ./pageC  pageC
chunk    {3} vendor.js (vendor) 54 bytes ={0}= ={1}= ={4}= ={5}= [initial] [rendered] split chunk (cache group: vendor) (name: vendor)
    > ./pageA pageA
    > ./pageB pageB
    2 modules
chunk    {4} commons~pageA~pageB~pageC.js (commons~pageA~pageB~pageC) 28 bytes ={0}= ={1}= ={2}= ={3}= ={5}= [initial] [rendered] split chunk (cache group: commons) (name: commons~pageA~pageB~pageC)
    > ./pageA pageA
    > ./pageB pageB
    > ./pageC pageC
    [3] ./utility2.js 28 bytes {4} [built]
        cjs require ./utility2 [0] ./pageA.js 3:15-36
        cjs require ./utility2 [4] ./pageB.js 2:15-36
        cjs require ./utility2 [7] ./pageC.js 1:15-36
chunk    {5} commons~pageB~pageC.js (commons~pageB~pageC) 28 bytes ={1}= ={2}= ={3}= ={4}= [initial] [rendered] split chunk (cache group: commons) (name: commons~pageB~pageC)
    > ./pageB pageB
    > ./pageC pageC
    [6] ./utility3.js 28 bytes {5} [built]
        cjs require ./utility3 [4] ./pageB.js 3:15-36
        cjs require ./utility3 [7] ./pageC.js 2:15-36
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
                       Asset       Size  Chunks             Chunk Names
commons~pageA~pageB~pageC.js   96 bytes       0  [emitted]  commons~pageA~pageB~pageC
      commons~pageB~pageC.js   97 bytes       1  [emitted]  commons~pageB~pageC
                   vendor.js  134 bytes       2  [emitted]  vendor
                    pageC.js    1.1 KiB       3  [emitted]  pageC
                    pageB.js   1.11 KiB       4  [emitted]  pageB
                    pageA.js   1.15 KiB       5  [emitted]  pageA
Entrypoint pageA = vendor.js commons~pageA~pageB~pageC.js pageA.js
Entrypoint pageB = vendor.js commons~pageA~pageB~pageC.js commons~pageB~pageC.js pageB.js
Entrypoint pageC = commons~pageA~pageB~pageC.js commons~pageB~pageC.js pageC.js
chunk    {0} commons~pageA~pageB~pageC.js (commons~pageA~pageB~pageC) 28 bytes ={1}= ={2}= ={3}= ={4}= ={5}= [initial] [rendered] split chunk (cache group: commons) (name: commons~pageA~pageB~pageC)
    > ./pageA pageA
    > ./pageB pageB
    > ./pageC pageC
    [0] ./utility2.js 28 bytes {0} [built]
        cjs require ./utility2 [2] ./pageC.js 1:15-36
        cjs require ./utility2 [4] ./pageB.js 2:15-36
        cjs require ./utility2 [7] ./pageA.js 3:15-36
chunk    {1} commons~pageB~pageC.js (commons~pageB~pageC) 28 bytes ={0}= ={2}= ={3}= ={4}= [initial] [rendered] split chunk (cache group: commons) (name: commons~pageB~pageC)
    > ./pageB pageB
    > ./pageC pageC
    [1] ./utility3.js 28 bytes {1} [built]
        cjs require ./utility3 [2] ./pageC.js 2:15-36
        cjs require ./utility3 [4] ./pageB.js 3:15-36
chunk    {2} vendor.js (vendor) 54 bytes ={0}= ={1}= ={4}= ={5}= [initial] [rendered] split chunk (cache group: vendor) (name: vendor)
    > ./pageA pageA
    > ./pageB pageB
    2 modules
chunk    {3} pageC.js (pageC) 105 bytes ={0}= ={1}= [entry] [rendered]
    > ./pageC pageC
    [2] ./pageC.js 105 bytes {3} [built]
        single entry ./pageC  pageC
chunk    {4} pageB.js (pageB) 142 bytes ={0}= ={1}= ={2}= [entry] [rendered]
    > ./pageB pageB
    [4] ./pageB.js 142 bytes {4} [built]
        single entry ./pageB  pageB
chunk    {5} pageA.js (pageA) 170 bytes ={0}= ={2}= [entry] [rendered]
    > ./pageA pageA
    [5] ./utility1.js 28 bytes {5} [built]
        cjs require ./utility1 [7] ./pageA.js 2:15-36
    [7] ./pageA.js 142 bytes {5} [built]
        single entry ./pageA  pageA
```
