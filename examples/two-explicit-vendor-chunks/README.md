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
/******/ 		if(executeModule + 1) { // typeof executeModule === "number"
/******/ 			return __webpack_require__(executeModule);
/******/ 		}
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

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { throw err; };

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
/******/ ({

/***/ 0:
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/***/ function(module, exports) {

	module.exports = "Vendor1";

/***/ },

/***/ 5:
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
webpackJsonp([1],{

/***/ 1:
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "Vendor2";
	__webpack_require__(/*! ./vendor1 */ 0);


/***/ },

/***/ 6:
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
webpackJsonp([4],{

/***/ 2:
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
Hash: 9b8fef24cd332883f41b
Version: webpack 2.0.6-beta
Time: 90ms
     Asset       Size  Chunks             Chunk Names
vendor1.js    4.59 kB       0  [emitted]  vendor1
vendor2.js  468 bytes       1  [emitted]  vendor2
  pageC.js  179 bytes       2  [emitted]  pageC
  pageB.js  179 bytes       3  [emitted]  pageB
  pageA.js  288 bytes       4  [emitted]  pageA
chunk    {0} vendor1.js (vendor1) 55 bytes [rendered]
    > vendor1 [5] multi vendor1 
    [0] ./vendor1.js 27 bytes {0} [built]
        cjs require ./vendor1 [1] ./vendor2.js 2:0-20
        cjs require ./vendor1 [2] ./pageA.js 2:0-20
        single entry ./vendor1 [5] multi vendor1
    [5] multi vendor1 28 bytes {0} [built]
chunk    {1} vendor2.js (vendor2) 80 bytes {0} [rendered]
    > vendor2 [6] multi vendor2 
    [1] ./vendor2.js 52 bytes {1} [built]
        cjs require ./vendor2 [2] ./pageA.js 3:0-20
        single entry ./vendor2 [6] multi vendor2
    [6] multi vendor2 28 bytes {1} [built]
chunk    {2} pageC.js (pageC) 25 bytes {1} [rendered]
    > pageC [4] ./pageC.js 
    [4] ./pageC.js 25 bytes {2} [built]
chunk    {3} pageB.js (pageB) 25 bytes {1} [rendered]
    > pageB [3] ./pageB.js 
    [3] ./pageB.js 25 bytes {3} [built]
chunk    {4} pageA.js (pageA) 73 bytes {1} [rendered]
    > pageA [2] ./pageA.js 
    [2] ./pageA.js 73 bytes {4} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 9b8fef24cd332883f41b
Version: webpack 2.0.6-beta
Time: 160ms
     Asset       Size  Chunks             Chunk Names
vendor1.js    1.04 kB       0  [emitted]  vendor1
vendor2.js  102 bytes       1  [emitted]  vendor2
  pageC.js   59 bytes       2  [emitted]  pageC
  pageB.js   59 bytes       3  [emitted]  pageB
  pageA.js   71 bytes       4  [emitted]  pageA
chunk    {0} vendor1.js (vendor1) 55 bytes [rendered]
    > vendor1 [5] multi vendor1 
    [0] ./vendor1.js 27 bytes {0} [built]
        cjs require ./vendor1 [1] ./vendor2.js 2:0-20
        cjs require ./vendor1 [2] ./pageA.js 2:0-20
        single entry ./vendor1 [5] multi vendor1
    [5] multi vendor1 28 bytes {0} [built]
chunk    {1} vendor2.js (vendor2) 80 bytes {0} [rendered]
    > vendor2 [6] multi vendor2 
    [1] ./vendor2.js 52 bytes {1} [built]
        cjs require ./vendor2 [2] ./pageA.js 3:0-20
        single entry ./vendor2 [6] multi vendor2
    [6] multi vendor2 28 bytes {1} [built]
chunk    {2} pageC.js (pageC) 25 bytes {1} [rendered]
    > pageC [4] ./pageC.js 
    [4] ./pageC.js 25 bytes {2} [built]
chunk    {3} pageB.js (pageB) 25 bytes {1} [rendered]
    > pageB [3] ./pageB.js 
    [3] ./pageB.js 25 bytes {3} [built]
chunk    {4} pageA.js (pageA) 73 bytes {1} [rendered]
    > pageA [2] ./pageA.js 
    [2] ./pageA.js 73 bytes {4} [built]
```
