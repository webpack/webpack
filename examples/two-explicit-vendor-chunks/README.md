# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	mode: "production",
	entry: {
		vendor1: ["./vendor1"],
		vendor2: ["./vendor2"],
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js"
	},
	plugins: [
		new CommonsChunkPlugin({
			names: ["vendor2", "vendor1"],
			minChunks: Infinity
		})
	]
};
```

# js/vendor1.js

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
/* 0 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

module.exports = "Vendor1";

/***/ }),
/* 1 */,
/* 2 */
/*!***********************!*\
  !*** multi ./vendor1 ***!
  \***********************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./vendor1 */0);


/***/ })
/******/ ]);
```

# js/vendor2.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */,
/* 1 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = "Vendor2";
__webpack_require__(/*! ./vendor1 */ 0);


/***/ }),
/* 2 */,
/* 3 */
/*!***********************!*\
  !*** multi ./vendor2 ***!
  \***********************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./vendor2 */1);


/***/ })
],[[3,4,0]]]);
```

# js/pageA.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[3],{

/***/ 4:
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = "pageA";
__webpack_require__(/*! ./vendor1 */ 0);
__webpack_require__(/*! ./vendor2 */ 1);


/***/ })

},[[4,4,0,3]]]);
```

# Info

## Uncompressed

```
Hash: 6fe4b98832b1f1c2bd5b
Version: webpack next
     Asset       Size  Chunks             Chunk Names
vendor2.js  796 bytes       0  [emitted]  vendor2
  pageC.js  364 bytes       1  [emitted]  pageC
  pageB.js  364 bytes       2  [emitted]  pageB
  pageA.js  471 bytes       3  [emitted]  pageA
vendor1.js   7.79 KiB       4  [emitted]  vendor1
Entrypoint vendor1 = vendor1.js
Entrypoint vendor2 = vendor1.js vendor2.js
Entrypoint pageA = vendor1.js vendor2.js pageA.js
Entrypoint pageB = vendor1.js vendor2.js pageB.js
Entrypoint pageC = vendor1.js vendor2.js pageC.js
chunk    {0} vendor2.js (vendor2) 80 bytes {4} [initial] [rendered]
    > vendor2 [3] multi ./vendor2 
    [1] ./vendor2.js 52 bytes {0} [built]
        single entry ./vendor2 [3] multi ./vendor2 vendor2:100000
        cjs require ./vendor2 [4] ./pageA.js 3:0-20
    [3] multi ./vendor2 28 bytes {0} [built]
        multi entry 
chunk    {1} pageC.js (pageC) 25 bytes {0} [initial] [rendered]
    > pageC [6] ./pageC.js 
    [6] ./pageC.js 25 bytes {1} [built]
        single entry ./pageC  pageC
chunk    {2} pageB.js (pageB) 25 bytes {0} [initial] [rendered]
    > pageB [5] ./pageB.js 
    [5] ./pageB.js 25 bytes {2} [built]
        single entry ./pageB  pageB
chunk    {3} pageA.js (pageA) 73 bytes {0} [initial] [rendered]
    > pageA [4] ./pageA.js 
    [4] ./pageA.js 73 bytes {3} [built]
        single entry ./pageA  pageA
chunk    {4} vendor1.js (vendor1) 55 bytes [entry] [rendered]
    > vendor1 [2] multi ./vendor1 
    [0] ./vendor1.js 27 bytes {4} [built]
        cjs require ./vendor1 [1] ./vendor2.js 2:0-20
        single entry ./vendor1 [2] multi ./vendor1 vendor1:100000
        cjs require ./vendor1 [4] ./pageA.js 2:0-20
    [2] multi ./vendor1 28 bytes {4} [built]
        multi entry 
```

## Minimized (uglify-js, no zip)

```
Hash: 6fe4b98832b1f1c2bd5b
Version: webpack next
     Asset       Size  Chunks             Chunk Names
vendor2.js  146 bytes       0  [emitted]  vendor2
  pageC.js  107 bytes       1  [emitted]  pageC
  pageB.js  107 bytes       2  [emitted]  pageB
  pageA.js  119 bytes       3  [emitted]  pageA
vendor1.js   1.78 KiB       4  [emitted]  vendor1
Entrypoint vendor1 = vendor1.js
Entrypoint vendor2 = vendor1.js vendor2.js
Entrypoint pageA = vendor1.js vendor2.js pageA.js
Entrypoint pageB = vendor1.js vendor2.js pageB.js
Entrypoint pageC = vendor1.js vendor2.js pageC.js
chunk    {0} vendor2.js (vendor2) 80 bytes {4} [initial] [rendered]
    > vendor2 [3] multi ./vendor2 
    [1] ./vendor2.js 52 bytes {0} [built]
        single entry ./vendor2 [3] multi ./vendor2 vendor2:100000
        cjs require ./vendor2 [4] ./pageA.js 3:0-20
    [3] multi ./vendor2 28 bytes {0} [built]
        multi entry 
chunk    {1} pageC.js (pageC) 25 bytes {0} [initial] [rendered]
    > pageC [6] ./pageC.js 
    [6] ./pageC.js 25 bytes {1} [built]
        single entry ./pageC  pageC
chunk    {2} pageB.js (pageB) 25 bytes {0} [initial] [rendered]
    > pageB [5] ./pageB.js 
    [5] ./pageB.js 25 bytes {2} [built]
        single entry ./pageB  pageB
chunk    {3} pageA.js (pageA) 73 bytes {0} [initial] [rendered]
    > pageA [4] ./pageA.js 
    [4] ./pageA.js 73 bytes {3} [built]
        single entry ./pageA  pageA
chunk    {4} vendor1.js (vendor1) 55 bytes [entry] [rendered]
    > vendor1 [2] multi ./vendor1 
    [0] ./vendor1.js 27 bytes {4} [built]
        cjs require ./vendor1 [1] ./vendor2.js 2:0-20
        single entry ./vendor1 [2] multi ./vendor1 vendor1:100000
        cjs require ./vendor1 [4] ./pageA.js 2:0-20
    [2] multi ./vendor1 28 bytes {4} [built]
        multi entry 
```
