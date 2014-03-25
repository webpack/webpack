# example.js

``` javascript
var a = require("a");
var b = require("b");
require.ensure(["c"], function(require) {
    require("b").xyz();
    var d = require("d");
});
```


# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
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

	var a = __webpack_require__(/*! a */ 2);
	var b = __webpack_require__(/*! b */ 1);
	__webpack_require__.e/*nsure*/(1, function(require) {
	    __webpack_require__(/*! b */ 1).xyz();
	    var d = __webpack_require__(/*! d */ 4);
	});

/***/ },
/* 1 */
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	// module b

/***/ },
/* 2 */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	// module a

/***/ }
/******/ ])
```

# js/1.output.js

``` javascript
webpackJsonp([1],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */
/*!****************!*\
  !*** ./~/c.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	// module c

/***/ },
/* 4 */
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	// module d

/***/ }
])
```

Minimized

``` javascript
webpackJsonp([1],[,,,function(){},function(){}]);
```

# Info

## Uncompressed

```
Hash: 51eb9c135b6c6fe4e444
Version: webpack 1.1.0
Time: 85ms
      Asset  Size  Chunks             Chunk Names
  output.js  4307       0  [emitted]  main       
1.output.js   351       1  [emitted]             
chunk    {0} output.js (main) 166 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 144 {0} [built]
    [1] ./~/b.js 11 {0} [built]
        cjs require b [0] ./example.js 2:8-20
        cjs require b [0] ./example.js 4:4-16
    [2] ./~/a.js 11 {0} [built]
        cjs require a [0] ./example.js 1:8-20
chunk    {1} 1.output.js 22 {0} [rendered]
    > [0] ./example.js 3:0-6:2
    [3] ./~/c.js 11 {1} [built]
        require.ensure item c [0] ./example.js 3:0-6:2
    [4] ./~/d.js 11 {1} [built]
        cjs require d [0] ./example.js 5:12-24
```

## Minimized (uglify-js, no zip)

```
Hash: 0b0f0366fa1aab3ebbc4
Version: webpack 1.1.0
Time: 174ms
      Asset  Size  Chunks             Chunk Names
  output.js   775       0  [emitted]  main       
1.output.js    49       1  [emitted]             
chunk    {0} output.js (main) 166 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 144 {0} [built]
    [1] ./~/b.js 11 {0} [built]
        cjs require b [0] ./example.js 2:8-20
        cjs require b [0] ./example.js 4:4-16
    [2] ./~/a.js 11 {0} [built]
        cjs require a [0] ./example.js 1:8-20
chunk    {1} 1.output.js 22 {0} [rendered]
    > [0] ./example.js 3:0-6:2
    [3] ./~/c.js 11 {1} [built]
        require.ensure item c [0] ./example.js 3:0-6:2
    [4] ./~/d.js 11 {1} [built]
        cjs require d [0] ./example.js 5:12-24

WARNING in output.js from UglifyJs
Dropping unused function argument require [./example.js:3,0]
Side effects in initialization of unused variable d [./example.js:5,0]
Side effects in initialization of unused variable a [./example.js:1,0]
Side effects in initialization of unused variable b [./example.js:2,0]
```
