This example combines Code Splitting and Loaders. Make sure you have read the documentation of the examples that show the feature alone.

The bundle loader is used to create a wrapper module for `file.js` that loads this module on demand. The wrapper module returns a function that can be called to asynchronously receive the inner module.

# example.js

``` javascript
require("bundle!./file.js")(function(fileJsExports) {
	console.log(fileJsExports);
});
```

# file.js

``` javascript
module.exports = "It works";
```


# js/output.js

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
/******/
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		0:0
/******/ 	};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, __webpack_require__);
/******/
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
/******/ 			script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! bundle!./file.js */ 2)(function(fileJsExports) {
		console.log(fileJsExports);
	});

/***/ },
/* 1 */,
/* 2 */
/*!*******************************************!*\
  !*** (webpack)/~/bundle-loader!./file.js ***!
  \*******************************************/
/***/ function(module, exports, __webpack_require__) {

	var cbs = [], 
		data;
	module.exports = function(cb) {
		if(cbs) cbs.push(cb);
		else cb(data);
	}
	__webpack_require__.e/*nsure*/(1, function(require) {
		data = __webpack_require__(/*! !./file.js */ 1);
		var callbacks = cbs;
		cbs = null;
		for(var i = 0, l = callbacks.length; i < l; i++) {
			callbacks[i](data);
		}
	});

/***/ }
/******/ ])
```

# js/1.output.js

``` javascript
webpackJsonp([1],[
/* 0 */,
/* 1 */
/*!*****************!*\
  !*** ./file.js ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "It works";

/***/ }
]);
```

# Info

## Uncompressed

```
Hash: b389ce75f4a8788f2e19
Version: webpack 1.3.2-beta4
Time: 87ms
      Asset  Size  Chunks             Chunk Names
  output.js  4397       0  [emitted]  main
1.output.js   202       1  [emitted]  
chunk    {0} output.js (main) 458 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 88 {0} [built]
    [2] (webpack)/~/bundle-loader!./file.js 370 {0} [built]
        cjs require bundle!./file.js [0] ./example.js 1:0-27
chunk    {1} 1.output.js 28 {0} [rendered]
    > [2] (webpack)/~/bundle-loader!./file.js 7:0-14:2
    [1] ./file.js 28 {1} [built]
        cjs require !!.\file.js [2] (webpack)/~/bundle-loader!./file.js 8:8-119
```

## Minimized (uglify-js, no zip)

```
Hash: 414fa29b08ae6edc6940
Version: webpack 1.3.2-beta4
Time: 185ms
      Asset  Size  Chunks             Chunk Names
  output.js   887       0  [emitted]  main
1.output.js    55       1  [emitted]  
chunk    {0} output.js (main) 458 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 88 {0} [built]
    [2] (webpack)/~/bundle-loader!./file.js 370 {0} [built]
        cjs require bundle!./file.js [0] ./example.js 1:0-27
chunk    {1} 1.output.js 28 {0} [rendered]
    > [2] (webpack)/~/bundle-loader!./file.js 7:0-14:2
    [1] ./file.js 28 {1} [built]
        cjs require !!.\file.js [2] (webpack)/~/bundle-loader!./file.js 8:8-119

WARNING in output.js from UglifyJs
Dropping unused function argument require [(webpack)/~/bundle-loader!./file.js:7,0]
```
