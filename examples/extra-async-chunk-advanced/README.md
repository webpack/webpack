

# example.js

``` javascript
require(["./a", "./b", "./c"], function(a, b, c) {});

require.ensure(["./a"], function(require) {
	require("./b");
	require("./d");
});

require.ensure(["./a", "./e"], function(require) {
	require("./a");
	require.ensure(["./b"], function(require) {
		require("./f");
	});
	require.ensure(["./b"], function(require) {
		require("./g");
	});
});
```

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	plugins: [
		new CommonsChunkPlugin({
			name: "main",
			async: "async1"
		}),
		new CommonsChunkPlugin({
			name: "main",
			async: "async2",
			minChunks: 2
		}),
		new CommonsChunkPlugin({
			async: true
		}),
	]
}
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
/******/ 		2:0
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
/******/ 			script.async = true;
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

	(function(/* require */) {var __WEBPACK_REMAINING_CHUNKS__ = 3;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(__webpack_require__) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./a */ 1), __webpack_require__(/*! ./b */ 2), __webpack_require__(/*! ./c */ 3)]; (function(a, b, c) {}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}(__webpack_require__));};__webpack_require__.e(0, __WEBPACK_CALLBACK__);__webpack_require__.e(1, __WEBPACK_CALLBACK__);__webpack_require__.e(5, __WEBPACK_CALLBACK__);}());

	(function(/* nsure */) {var __WEBPACK_REMAINING_CHUNKS__ = 3;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(require) {
		__webpack_require__(/*! ./b */ 2);
		__webpack_require__(/*! ./d */ 4);
	}(__webpack_require__));};__webpack_require__.e(0, __WEBPACK_CALLBACK__);__webpack_require__.e(1, __WEBPACK_CALLBACK__);__webpack_require__.e(4, __WEBPACK_CALLBACK__);}());

	(function(/* nsure */) {var __WEBPACK_REMAINING_CHUNKS__ = 2;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(require) {
		__webpack_require__(/*! ./a */ 1);
		(function(/* nsure */) {var __WEBPACK_REMAINING_CHUNKS__ = 2;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(require) {
			__webpack_require__(/*! ./f */ 6);
		}(__webpack_require__));};__webpack_require__.e(0, __WEBPACK_CALLBACK__);__webpack_require__.e(7, __WEBPACK_CALLBACK__);}());
		(function(/* nsure */) {var __WEBPACK_REMAINING_CHUNKS__ = 2;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(require) {
			__webpack_require__(/*! ./g */ 7);
		}(__webpack_require__));};__webpack_require__.e(0, __WEBPACK_CALLBACK__);__webpack_require__.e(6, __WEBPACK_CALLBACK__);}());
	}(__webpack_require__));};__webpack_require__.e(1, __WEBPACK_CALLBACK__);__webpack_require__.e(3, __WEBPACK_CALLBACK__);}());


/***/ }
/******/ ])
```

# Info

## Uncompressed

```
Hash: d802167b5bd787d676e6
Version: webpack 1.4.15
Time: 70ms
      Asset  Size  Chunks             Chunk Names
0.output.js   180       0  [emitted]  async2
1.output.js   186       1  [emitted]  async1
  output.js  5727       2  [emitted]  main
3.output.js   180       3  [emitted]  
4.output.js   180       4  [emitted]  
5.output.js   180       5  [emitted]  
6.output.js   180       6  [emitted]  
7.output.js   180       7  [emitted]  
chunk    {0} 0.output.js (async2) 21 {2} {3} [rendered]
    > async commons [0] ./example.js 1:0-52
    > async commons [0] ./example.js 3:0-6:2
    > duplicate async commons [0] ./example.js 10:1-12:3
    > duplicate async commons [0] ./example.js 13:1-15:3
    [2] ./b.js 21 {0} [built]
        amd require ./b [0] ./example.js 1:0-52
        cjs require ./b [0] ./example.js 4:1-15
        require.ensure item ./b [0] ./example.js 10:1-12:3
        require.ensure item ./b [0] ./example.js 13:1-15:3
chunk    {1} 1.output.js (async1) 21 {2} [rendered]
    > async commons [0] ./example.js 1:0-52
    > async commons [0] ./example.js 3:0-6:2
    > async commons [0] ./example.js 8:0-16:2
    [1] ./a.js 21 {1} [built]
        amd require ./a [0] ./example.js 1:0-52
        require.ensure item ./a [0] ./example.js 3:0-6:2
        require.ensure item ./a [0] ./example.js 8:0-16:2
        cjs require ./a [0] ./example.js 9:1-15
chunk    {2} output.js (main) 362 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 362 {2} [built]
chunk    {3} 3.output.js 21 {2} [rendered]
    > [0] ./example.js 8:0-16:2
    [5] ./e.js 21 {3} [built]
        require.ensure item ./e [0] ./example.js 8:0-16:2
chunk    {4} 4.output.js 21 {2} [rendered]
    > [0] ./example.js 3:0-6:2
    [4] ./d.js 21 {4} [built]
        cjs require ./d [0] ./example.js 5:1-15
chunk    {5} 5.output.js 21 {2} [rendered]
    > [0] ./example.js 1:0-52
    [3] ./c.js 21 {5} [built]
        amd require ./c [0] ./example.js 1:0-52
chunk    {6} 6.output.js 21 {3} [rendered]
    > [0] ./example.js 13:1-15:3
    [7] ./g.js 21 {6} [built]
        cjs require ./g [0] ./example.js 14:2-16
chunk    {7} 7.output.js 21 {3} [rendered]
    > [0] ./example.js 10:1-12:3
    [6] ./f.js 21 {7} [built]
        cjs require ./f [0] ./example.js 11:2-16
```

## Minimized (uglify-js, no zip)

```
Hash: e7c7815873cbcaadbd7d
Version: webpack 1.4.15
Time: 200ms
      Asset  Size  Chunks             Chunk Names
0.output.js    49       0  [emitted]  async2
1.output.js    48       1  [emitted]  async1
  output.js  1192       2  [emitted]  main
3.output.js    49       3  [emitted]  
4.output.js    49       4  [emitted]  
5.output.js    49       5  [emitted]  
6.output.js    49       6  [emitted]  
7.output.js    49       7  [emitted]  
chunk    {0} 0.output.js (async2) 21 {2} {3} [rendered]
    > async commons [0] ./example.js 1:0-52
    > async commons [0] ./example.js 3:0-6:2
    > duplicate async commons [0] ./example.js 10:1-12:3
    > duplicate async commons [0] ./example.js 13:1-15:3
    [2] ./b.js 21 {0} [built]
        amd require ./b [0] ./example.js 1:0-52
        cjs require ./b [0] ./example.js 4:1-15
        require.ensure item ./b [0] ./example.js 10:1-12:3
        require.ensure item ./b [0] ./example.js 13:1-15:3
chunk    {1} 1.output.js (async1) 21 {2} [rendered]
    > async commons [0] ./example.js 1:0-52
    > async commons [0] ./example.js 3:0-6:2
    > async commons [0] ./example.js 8:0-16:2
    [1] ./a.js 21 {1} [built]
        amd require ./a [0] ./example.js 1:0-52
        require.ensure item ./a [0] ./example.js 3:0-6:2
        require.ensure item ./a [0] ./example.js 8:0-16:2
        cjs require ./a [0] ./example.js 9:1-15
chunk    {2} output.js (main) 362 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 362 {2} [built]
chunk    {3} 3.output.js 21 {2} [rendered]
    > [0] ./example.js 8:0-16:2
    [5] ./e.js 21 {3} [built]
        require.ensure item ./e [0] ./example.js 8:0-16:2
chunk    {4} 4.output.js 21 {2} [rendered]
    > [0] ./example.js 3:0-6:2
    [4] ./d.js 21 {4} [built]
        cjs require ./d [0] ./example.js 5:1-15
chunk    {5} 5.output.js 21 {2} [rendered]
    > [0] ./example.js 1:0-52
    [3] ./c.js 21 {5} [built]
        amd require ./c [0] ./example.js 1:0-52
chunk    {6} 6.output.js 21 {3} [rendered]
    > [0] ./example.js 13:1-15:3
    [7] ./g.js 21 {6} [built]
        cjs require ./g [0] ./example.js 14:2-16
chunk    {7} 7.output.js 21 {3} [rendered]
    > [0] ./example.js 10:1-12:3
    [6] ./f.js 21 {7} [built]
        cjs require ./f [0] ./example.js 11:2-16

WARNING in output.js from UglifyJs
Dropping unused function argument c [./example.js:1,0]
Dropping unused function argument b [./example.js:1,0]
Dropping unused function argument a [./example.js:1,0]
Dropping unused function argument require [./example.js:3,0]
Dropping unused function argument require [./example.js:10,0]
Dropping unused function argument require [./example.js:13,0]
Dropping unused function argument require [./example.js:8,0]
```
