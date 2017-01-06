# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
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
}
```

# js/vendor1.js

<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>
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
/******/ 			if(installedChunks[chunkId])
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules, executeModules);
/******/ 		while(resolves.length)
/******/ 			resolves.shift()();
/******/ 		if(executeModules) {
/******/ 			for(i=0; i < executeModules.length; i++) {
/******/ 				result = __webpack_require__(__webpack_require__.s = executeModules[i]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		4: 0
/******/ 	};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}

/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return Promise.resolve();

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
/******/ 				if(chunk) chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};

/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		installedChunks[chunkId][2] = promise;

/******/ 		head.appendChild(script);
/******/ 		return promise;
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

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

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ({

/***/ 0:
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/***/ function(module, exports) {

module.exports = "Vendor1";

/***/ },

/***/ 5:
/* unknown exports provided */
/* all exports used */
/*!*********************!*\
  !*** multi vendor1 ***!
  \*********************/
/***/ function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./vendor1 */0);


/***/ }

/******/ });
```

# js/vendor2.js

``` javascript
webpackJsonp([0],{

/***/ 1:
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

module.exports = "Vendor2";
__webpack_require__(/*! ./vendor1 */ 0);


/***/ },

/***/ 6:
/* unknown exports provided */
/* all exports used */
/*!*********************!*\
  !*** multi vendor2 ***!
  \*********************/
/***/ function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./vendor2 */1);


/***/ }

},[6]);
```

# js/pageA.js

``` javascript
webpackJsonp([3],{

/***/ 2:
/* unknown exports provided */
/* all exports used */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

module.exports = "pageA";
__webpack_require__(/*! ./vendor1 */ 0);
__webpack_require__(/*! ./vendor2 */ 1);


/***/ }

},[2]);
```

# Info

## Uncompressed

```
Hash: e9433f5b10cba6978ef2
Version: webpack 2.2.0-rc.2
     Asset       Size  Chunks             Chunk Names
vendor2.js  573 bytes       0  [emitted]  vendor2
  pageC.js  232 bytes       1  [emitted]  pageC
  pageB.js  232 bytes       2  [emitted]  pageB
  pageA.js  339 bytes       3  [emitted]  pageA
vendor1.js    6.16 kB       4  [emitted]  vendor1
Entrypoint vendor1 = vendor1.js
Entrypoint vendor2 = vendor1.js vendor2.js
Entrypoint pageA = vendor1.js vendor2.js pageA.js
Entrypoint pageB = vendor1.js vendor2.js pageB.js
Entrypoint pageC = vendor1.js vendor2.js pageC.js
chunk    {0} vendor2.js (vendor2) 80 bytes {4} [initial] [rendered]
    > vendor2 [6] multi vendor2 
    [1] ./vendor2.js 52 bytes {0} [built]
        cjs require ./vendor2 [2] ./pageA.js 3:0-20
        single entry ./vendor2 [6] multi vendor2
    [6] multi vendor2 28 bytes {0} [built]
chunk    {1} pageC.js (pageC) 25 bytes {0} [initial] [rendered]
    > pageC [4] ./pageC.js 
    [4] ./pageC.js 25 bytes {1} [built]
chunk    {2} pageB.js (pageB) 25 bytes {0} [initial] [rendered]
    > pageB [3] ./pageB.js 
    [3] ./pageB.js 25 bytes {2} [built]
chunk    {3} pageA.js (pageA) 73 bytes {0} [initial] [rendered]
    > pageA [2] ./pageA.js 
    [2] ./pageA.js 73 bytes {3} [built]
chunk    {4} vendor1.js (vendor1) 55 bytes [entry] [rendered]
    > vendor1 [5] multi vendor1 
    [0] ./vendor1.js 27 bytes {4} [built]
        cjs require ./vendor1 [1] ./vendor2.js 2:0-20
        cjs require ./vendor1 [2] ./pageA.js 2:0-20
        single entry ./vendor1 [5] multi vendor1
    [5] multi vendor1 28 bytes {4} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: e9433f5b10cba6978ef2
Version: webpack 2.2.0-rc.2
     Asset       Size  Chunks             Chunk Names
vendor2.js  102 bytes       0  [emitted]  vendor2
  pageC.js   59 bytes       1  [emitted]  pageC
  pageB.js   59 bytes       2  [emitted]  pageB
  pageA.js   71 bytes       3  [emitted]  pageA
vendor1.js    1.46 kB       4  [emitted]  vendor1
Entrypoint vendor1 = vendor1.js
Entrypoint vendor2 = vendor1.js vendor2.js
Entrypoint pageA = vendor1.js vendor2.js pageA.js
Entrypoint pageB = vendor1.js vendor2.js pageB.js
Entrypoint pageC = vendor1.js vendor2.js pageC.js
chunk    {0} vendor2.js (vendor2) 80 bytes {4} [initial] [rendered]
    > vendor2 [6] multi vendor2 
    [1] ./vendor2.js 52 bytes {0} [built]
        cjs require ./vendor2 [2] ./pageA.js 3:0-20
        single entry ./vendor2 [6] multi vendor2
    [6] multi vendor2 28 bytes {0} [built]
chunk    {1} pageC.js (pageC) 25 bytes {0} [initial] [rendered]
    > pageC [4] ./pageC.js 
    [4] ./pageC.js 25 bytes {1} [built]
chunk    {2} pageB.js (pageB) 25 bytes {0} [initial] [rendered]
    > pageB [3] ./pageB.js 
    [3] ./pageB.js 25 bytes {2} [built]
chunk    {3} pageA.js (pageA) 73 bytes {0} [initial] [rendered]
    > pageA [2] ./pageA.js 
    [2] ./pageA.js 73 bytes {3} [built]
chunk    {4} vendor1.js (vendor1) 55 bytes [entry] [rendered]
    > vendor1 [5] multi vendor1 
    [0] ./vendor1.js 27 bytes {4} [built]
        cjs require ./vendor1 [1] ./vendor2.js 2:0-20
        cjs require ./vendor1 [2] ./pageA.js 2:0-20
        single entry ./vendor1 [5] multi vendor1
    [5] multi vendor1 28 bytes {4} [built]
```
