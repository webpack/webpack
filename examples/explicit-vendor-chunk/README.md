# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		vendor: ["./vendor"],
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
			name: "vendor",
			minChunks: Infinity
		})
	]
};
```

# js/vendor.js

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
/******/ 		0:0
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

/******/ 			script.src = __webpack_require__.p + "" + chunkId + "." + ({"1":"pageC","2":"pageB","3":"pageA"}[chunkId]||chunkId) + ".js";
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
/*!********************!*\
  !*** multi vendor ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(/*! ./vendor */1);


/***/ },
/* 1 */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "Vendor";

/***/ }
/******/ ]);
```

# js/pageA.js

``` javascript
webpackJsonp([3],[
/* 0 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "pageA";

/***/ }
]);
```

# Info

## Uncompressed

```
Hash: 7ba2182676e9cab55532
Version: webpack 1.8.11
Time: 68ms
    Asset       Size  Chunks             Chunk Names
vendor.js    4.06 kB       0  [emitted]  vendor
 pageC.js  193 bytes       1  [emitted]  pageC
 pageB.js  193 bytes       2  [emitted]  pageB
 pageA.js  193 bytes       3  [emitted]  pageA
chunk    {0} vendor.js (vendor) 54 bytes [rendered]
    > vendor [0] multi vendor 
    [0] multi vendor 28 bytes {0} [built]
    [1] ./vendor.js 26 bytes {0} [built]
        single entry ./vendor [0] multi vendor
chunk    {1} pageC.js (pageC) 25 bytes {0} [rendered]
    > pageC [0] ./pageC.js 
    [0] ./pageC.js 25 bytes {1} [built]
chunk    {2} pageB.js (pageB) 25 bytes {0} [rendered]
    > pageB [0] ./pageB.js 
    [0] ./pageB.js 25 bytes {2} [built]
chunk    {3} pageA.js (pageA) 25 bytes {0} [rendered]
    > pageA [0] ./pageA.js 
    [0] ./pageA.js 25 bytes {3} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 7ba2182676e9cab55532
Version: webpack 1.8.11
Time: 194ms
    Asset       Size  Chunks             Chunk Names
vendor.js  836 bytes       0  [emitted]  vendor
 pageC.js   55 bytes       1  [emitted]  pageC
 pageB.js   55 bytes       2  [emitted]  pageB
 pageA.js   55 bytes       3  [emitted]  pageA
chunk    {0} vendor.js (vendor) 54 bytes [rendered]
    > vendor [0] multi vendor 
    [0] multi vendor 28 bytes {0} [built]
    [1] ./vendor.js 26 bytes {0} [built]
        single entry ./vendor [0] multi vendor
chunk    {1} pageC.js (pageC) 25 bytes {0} [rendered]
    > pageC [0] ./pageC.js 
    [0] ./pageC.js 25 bytes {1} [built]
chunk    {2} pageB.js (pageB) 25 bytes {0} [rendered]
    > pageB [0] ./pageB.js 
    [0] ./pageB.js 25 bytes {2} [built]
chunk    {3} pageA.js (pageA) 25 bytes {0} [rendered]
    > pageA [0] ./pageA.js 
    [0] ./pageA.js 25 bytes {3} [built]
```
