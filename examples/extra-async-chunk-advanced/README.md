

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

/******/ 			script.src = __webpack_require__.p + "" + chunkId + ".output.js";
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
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	(function(/* require */) {var __WEBPACK_REMAINING_CHUNKS__ = 3;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(__webpack_require__) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./a */ 1), __webpack_require__(/*! ./b */ 2), __webpack_require__(/*! ./c */ 3)]; (function(a, b, c) {}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}(__webpack_require__));};__webpack_require__.e(7, __WEBPACK_CALLBACK__);__webpack_require__.e(6, __WEBPACK_CALLBACK__);__webpack_require__.e(1, __WEBPACK_CALLBACK__);}());

	(function(/* nsure */) {var __WEBPACK_REMAINING_CHUNKS__ = 3;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(require) {
		__webpack_require__(/*! ./b */ 2);
		__webpack_require__(/*! ./d */ 4);
	}(__webpack_require__));};__webpack_require__.e(7, __WEBPACK_CALLBACK__);__webpack_require__.e(6, __WEBPACK_CALLBACK__);__webpack_require__.e(2, __WEBPACK_CALLBACK__);}());

	(function(/* nsure */) {var __WEBPACK_REMAINING_CHUNKS__ = 2;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(require) {
		__webpack_require__(/*! ./a */ 1);
		(function(/* nsure */) {var __WEBPACK_REMAINING_CHUNKS__ = 2;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(require) {
			__webpack_require__(/*! ./f */ 6);
		}(__webpack_require__));};__webpack_require__.e(7, __WEBPACK_CALLBACK__);__webpack_require__.e(4, __WEBPACK_CALLBACK__);}());
		(function(/* nsure */) {var __WEBPACK_REMAINING_CHUNKS__ = 2;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(require) {
			__webpack_require__(/*! ./g */ 7);
		}(__webpack_require__));};__webpack_require__.e(7, __WEBPACK_CALLBACK__);__webpack_require__.e(5, __WEBPACK_CALLBACK__);}());
	}(__webpack_require__));};__webpack_require__.e(6, __WEBPACK_CALLBACK__);__webpack_require__.e(3, __WEBPACK_CALLBACK__);}());


/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 95201f98f0e200184c65
Version: webpack 1.9.10
Time: 97ms
      Asset       Size  Chunks             Chunk Names
  output.js    5.61 kB       0  [emitted]  main
1.output.js  159 bytes       1  [emitted]  
2.output.js  159 bytes       2  [emitted]  
3.output.js  159 bytes       3  [emitted]  
4.output.js  159 bytes       4  [emitted]  
5.output.js  159 bytes       5  [emitted]  
6.output.js  165 bytes       6  [emitted]  async1
7.output.js  159 bytes       7  [emitted]  async2
chunk    {0} output.js (main) 362 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 362 bytes {0} [built]
chunk    {1} 1.output.js 21 bytes {0} [rendered]
    > [0] ./example.js 1:0-52
    [3] ./c.js 21 bytes {1} [built]
        amd require ./c [0] ./example.js 1:0-52
chunk    {2} 2.output.js 21 bytes {0} [rendered]
    > [0] ./example.js 3:0-6:2
    [4] ./d.js 21 bytes {2} [built]
        cjs require ./d [0] ./example.js 5:1-15
chunk    {3} 3.output.js 21 bytes {0} [rendered]
    > [0] ./example.js 8:0-16:2
    [5] ./e.js 21 bytes {3} [built]
        require.ensure item ./e [0] ./example.js 8:0-16:2
chunk    {4} 4.output.js 21 bytes {3} [rendered]
    > [0] ./example.js 10:1-12:3
    [6] ./f.js 21 bytes {4} [built]
        cjs require ./f [0] ./example.js 11:2-16
chunk    {5} 5.output.js 21 bytes {3} [rendered]
    > [0] ./example.js 13:1-15:3
    [7] ./g.js 21 bytes {5} [built]
        cjs require ./g [0] ./example.js 14:2-16
chunk    {6} 6.output.js (async1) 21 bytes {0} [rendered]
    > async commons [0] ./example.js 1:0-52
    > async commons [0] ./example.js 3:0-6:2
    > async commons [0] ./example.js 8:0-16:2
    [1] ./a.js 21 bytes {6} [built]
        amd require ./a [0] ./example.js 1:0-52
        require.ensure item ./a [0] ./example.js 3:0-6:2
        require.ensure item ./a [0] ./example.js 8:0-16:2
        cjs require ./a [0] ./example.js 9:1-15
chunk    {7} 7.output.js (async2) 21 bytes {0} {3} [rendered]
    > async commons [0] ./example.js 1:0-52
    > async commons [0] ./example.js 3:0-6:2
    > duplicate async commons [0] ./example.js 10:1-12:3
    > duplicate async commons [0] ./example.js 13:1-15:3
    [2] ./b.js 21 bytes {7} [built]
        amd require ./b [0] ./example.js 1:0-52
        cjs require ./b [0] ./example.js 4:1-15
        require.ensure item ./b [0] ./example.js 10:1-12:3
        require.ensure item ./b [0] ./example.js 13:1-15:3
```

## Minimized (uglify-js, no zip)

```
Hash: 9e4bffc9a8df97d12921
Version: webpack 1.9.10
Time: 286ms
      Asset      Size  Chunks             Chunk Names
0.output.js  51 bytes       0  [emitted]  async2
1.output.js  50 bytes       1  [emitted]  async1
  output.js    1.2 kB       2  [emitted]  main
3.output.js  51 bytes       3  [emitted]  
4.output.js  51 bytes       4  [emitted]  
5.output.js  51 bytes       5  [emitted]  
6.output.js  51 bytes       6  [emitted]  
7.output.js  51 bytes       7  [emitted]  
chunk    {0} 0.output.js (async2) 21 bytes {2} {3} [rendered]
    > async commons [0] ./example.js 1:0-52
    > async commons [0] ./example.js 3:0-6:2
    > duplicate async commons [0] ./example.js 10:1-12:3
    > duplicate async commons [0] ./example.js 13:1-15:3
    [2] ./b.js 21 bytes {0} [built]
        amd require ./b [0] ./example.js 1:0-52
        cjs require ./b [0] ./example.js 4:1-15
        require.ensure item ./b [0] ./example.js 10:1-12:3
        require.ensure item ./b [0] ./example.js 13:1-15:3
chunk    {1} 1.output.js (async1) 21 bytes {2} [rendered]
    > async commons [0] ./example.js 1:0-52
    > async commons [0] ./example.js 3:0-6:2
    > async commons [0] ./example.js 8:0-16:2
    [1] ./a.js 21 bytes {1} [built]
        amd require ./a [0] ./example.js 1:0-52
        require.ensure item ./a [0] ./example.js 3:0-6:2
        require.ensure item ./a [0] ./example.js 8:0-16:2
        cjs require ./a [0] ./example.js 9:1-15
chunk    {2} output.js (main) 362 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 362 bytes {2} [built]
chunk    {3} 3.output.js 21 bytes {2} [rendered]
    > [0] ./example.js 8:0-16:2
    [5] ./e.js 21 bytes {3} [built]
        require.ensure item ./e [0] ./example.js 8:0-16:2
chunk    {4} 4.output.js 21 bytes {2} [rendered]
    > [0] ./example.js 3:0-6:2
    [4] ./d.js 21 bytes {4} [built]
        cjs require ./d [0] ./example.js 5:1-15
chunk    {5} 5.output.js 21 bytes {2} [rendered]
    > [0] ./example.js 1:0-52
    [3] ./c.js 21 bytes {5} [built]
        amd require ./c [0] ./example.js 1:0-52
chunk    {6} 6.output.js 21 bytes {3} [rendered]
    > [0] ./example.js 13:1-15:3
    [7] ./g.js 21 bytes {6} [built]
        cjs require ./g [0] ./example.js 14:2-16
chunk    {7} 7.output.js 21 bytes {3} [rendered]
    > [0] ./example.js 10:1-12:3
    [6] ./f.js 21 bytes {7} [built]
        cjs require ./f [0] ./example.js 11:2-16
```
