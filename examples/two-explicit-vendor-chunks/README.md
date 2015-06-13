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
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, callbacks = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, __webpack_require__);
/******/ 		if(moreModules[0]) {
/******/ 			installedModules[0] = 0;
/******/ 			return __webpack_require__(0);
/******/ 		}
/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		3:0
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
/******/ 	__webpack_require__.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, __webpack_require__);

/******/ 		// an array means "currently loading".
/******/ 		if(installedChunks[chunkId] !== undefined) {
/******/ 			installedChunks[chunkId].push(callback);
/******/ 		} else {
/******/ 			// start chunk loading
/******/ 			installedChunks[chunkId] = [callback];
/******/ 			var head = document.getElementsByTagName('head')[0];
/******/ 			var script = document.createElement('script');
/******/ 			script.type = 'text/javascript';
/******/ 			script.charset = 'utf-8';
/******/ 			script.async = true;

/******/ 			script.src = __webpack_require__.p + "" + chunkId + "." + ({"0":"pageA","1":"pageB","2":"pageC","4":"vendor2"}[chunkId]||chunkId) + ".js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*********************!*\
  !*** multi vendor1 ***!
  \*********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(/*! ./vendor1 */1);


/***/ },
/* 1 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/***/ function(module, exports) {

	module.exports = "Vendor1";

/***/ }
/******/ ]);
```

# js/vendor2.js

``` javascript
webpackJsonp([4],[
/* 0 */
/*!*********************!*\
  !*** multi vendor2 ***!
  \*********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(/*! ./vendor2 */2);


/***/ },
/* 1 */,
/* 2 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "Vendor2";
	__webpack_require__(/*! ./vendor1 */ 1);


/***/ }
]);
```

# js/pageA.js

``` javascript
webpackJsonp([0],[
/* 0 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "pageA";
	__webpack_require__(/*! ./vendor1 */ 1);
	__webpack_require__(/*! ./vendor2 */ 2);


/***/ }
]);
```

# Info

## Uncompressed

```
Hash: 3e055899b35229db5633
Version: webpack 1.9.10
Time: 76ms
     Asset       Size  Chunks             Chunk Names
  pageA.js  281 bytes       0  [emitted]  pageA
  pageB.js  172 bytes       1  [emitted]  pageB
  pageC.js  172 bytes       2  [emitted]  pageC
vendor1.js    4.06 kB       3  [emitted]  vendor1
vendor2.js  468 bytes       4  [emitted]  vendor2
chunk    {0} pageA.js (pageA) 73 bytes {4} [rendered]
    > pageA [0] ./pageA.js 
    [0] ./pageA.js 73 bytes {0} [built]
chunk    {1} pageB.js (pageB) 25 bytes {4} [rendered]
    > pageB [0] ./pageB.js 
    [0] ./pageB.js 25 bytes {1} [built]
chunk    {2} pageC.js (pageC) 25 bytes {4} [rendered]
    > pageC [0] ./pageC.js 
    [0] ./pageC.js 25 bytes {2} [built]
chunk    {3} vendor1.js (vendor1) 55 bytes [rendered]
    > vendor1 [0] multi vendor1 
    [0] multi vendor1 28 bytes {3} [built]
    [1] ./vendor1.js 27 bytes {3} [built]
        single entry ./vendor1 [0] multi vendor1
        cjs require ./vendor1 [0] ./pageA.js 2:0-20
        cjs require ./vendor1 [2] ./vendor2.js 2:0-20
chunk    {4} vendor2.js (vendor2) 80 bytes {3} [rendered]
    > vendor2 [0] multi vendor2 
    [0] multi vendor2 28 bytes {4} [built]
    [2] ./vendor2.js 52 bytes {4} [built]
        single entry ./vendor2 [0] multi vendor2
        cjs require ./vendor2 [0] ./pageA.js 3:0-20
```

## Minimized (uglify-js, no zip)

```
Hash: 1faf7c0010d184985c19
Version: webpack 1.9.10
Time: 232ms
     Asset       Size  Chunks             Chunk Names
vendor1.js  847 bytes       0  [emitted]  vendor1
vendor2.js   95 bytes       1  [emitted]  vendor2
  pageC.js   53 bytes       2  [emitted]  pageC
  pageB.js   53 bytes       3  [emitted]  pageB
  pageA.js   65 bytes       4  [emitted]  pageA
chunk    {0} vendor1.js (vendor1) 55 bytes [rendered]
    > vendor1 [0] multi vendor1 
    [0] multi vendor1 28 bytes {0} [built]
    [1] ./vendor1.js 27 bytes {0} [built]
        single entry ./vendor1 [0] multi vendor1
        cjs require ./vendor1 [0] ./pageA.js 2:0-20
        cjs require ./vendor1 [2] ./vendor2.js 2:0-20
chunk    {1} vendor2.js (vendor2) 80 bytes {0} [rendered]
    > vendor2 [0] multi vendor2 
    [0] multi vendor2 28 bytes {1} [built]
    [2] ./vendor2.js 52 bytes {1} [built]
        single entry ./vendor2 [0] multi vendor2
        cjs require ./vendor2 [0] ./pageA.js 3:0-20
chunk    {2} pageC.js (pageC) 25 bytes {1} [rendered]
    > pageC [0] ./pageC.js 
    [0] ./pageC.js 25 bytes {2} [built]
chunk    {3} pageB.js (pageB) 25 bytes {1} [rendered]
    > pageB [0] ./pageB.js 
    [0] ./pageB.js 25 bytes {3} [built]
chunk    {4} pageA.js (pageA) 73 bytes {1} [rendered]
    > pageA [0] ./pageA.js 
    [0] ./pageA.js 73 bytes {4} [built]
```
