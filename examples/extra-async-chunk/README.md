

# example.js

``` javascript
// a chunks with a, b, c
require(["./a", "./b", "./c"], function(a, b, c) {});

// a chunk with a, b, d
require.ensure(["./a"], function(require) {
	require("./b");
	require("./d");
});
```

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	plugins: [
		new CommonsChunkPlugin({
			// process all children of the main chunk
			// if omitted it would process all chunks
			name: "main",
			// create a additional async chunk for the common modules
			// which is loaded in parallel to the requested chunks
			async: true
		})
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
/******/ 		1:0
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

	// a chunks with a, b, c
	(function(/* require */) {var __WEBPACK_REMAINING_CHUNKS__ = 2;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(__webpack_require__) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./a */ 1), __webpack_require__(/*! ./b */ 2), __webpack_require__(/*! ./c */ 3)]; (function(a, b, c) {}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}(__webpack_require__));};__webpack_require__.e(0, __WEBPACK_CALLBACK__);__webpack_require__.e(3, __WEBPACK_CALLBACK__);}());

	// a chunk with a, b, d
	(function(/* nsure */) {var __WEBPACK_REMAINING_CHUNKS__ = 2;var __WEBPACK_CALLBACK__ = function() {if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (function(require) {
		__webpack_require__(/*! ./b */ 2);
		__webpack_require__(/*! ./d */ 4);
	}(__webpack_require__));};__webpack_require__.e(0, __WEBPACK_CALLBACK__);__webpack_require__.e(2, __WEBPACK_CALLBACK__);}());


/***/ }
/******/ ])
```

# js/0.output.js

``` javascript
webpackJsonp([0],[
/* 0 */,
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "a";

/***/ },
/* 2 */
/*!**************!*\
  !*** ./b.js ***!
  \**************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "b";

/***/ }
]);
```

# js/2.output.js

``` javascript
webpackJsonp([2],{

/***/ 4:
/*!**************!*\
  !*** ./d.js ***!
  \**************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "d";

/***/ }

});
```

# js/3.output.js

``` javascript
webpackJsonp([3],{

/***/ 3:
/*!**************!*\
  !*** ./c.js ***!
  \**************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "c";

/***/ }

});
```

# Info

## Uncompressed

```
Hash: 310f71157717394fc874
Version: webpack 1.4.15
Time: 82ms
      Asset  Size  Chunks             Chunk Names
0.output.js   342       0  [emitted]  
  output.js  4694       1  [emitted]  main
2.output.js   180       2  [emitted]  
3.output.js   180       3  [emitted]  
chunk    {0} 0.output.js 42 {1} [rendered]
    > async commons [0] ./example.js 2:0-52
    > async commons [0] ./example.js 5:0-8:2
    [1] ./a.js 21 {0} [built]
        amd require ./a [0] ./example.js 2:0-52
        require.ensure item ./a [0] ./example.js 5:0-8:2
    [2] ./b.js 21 {0} [built]
        amd require ./b [0] ./example.js 2:0-52
        cjs require ./b [0] ./example.js 6:1-15
chunk    {1} output.js (main) 194 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 194 {1} [built]
chunk    {2} 2.output.js 21 {1} [rendered]
    > [0] ./example.js 5:0-8:2
    [4] ./d.js 21 {2} [built]
        cjs require ./d [0] ./example.js 7:1-15
chunk    {3} 3.output.js 21 {1} [rendered]
    > [0] ./example.js 2:0-52
    [3] ./c.js 21 {3} [built]
        amd require ./c [0] ./example.js 2:0-52
```

## Minimized (uglify-js, no zip)

```
Hash: 2bf4007377287b9601db
Version: webpack 1.4.15
Time: 287ms
      Asset  Size  Chunks             Chunk Names
0.output.js    75       0  [emitted]  
  output.js   931       1  [emitted]  main
2.output.js    49       2  [emitted]  
3.output.js    49       3  [emitted]  
chunk    {0} 0.output.js 42 {1} [rendered]
    > async commons [0] ./example.js 2:0-52
    > async commons [0] ./example.js 5:0-8:2
    [1] ./a.js 21 {0} [built]
        amd require ./a [0] ./example.js 2:0-52
        require.ensure item ./a [0] ./example.js 5:0-8:2
    [2] ./b.js 21 {0} [built]
        amd require ./b [0] ./example.js 2:0-52
        cjs require ./b [0] ./example.js 6:1-15
chunk    {1} output.js (main) 194 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 194 {1} [built]
chunk    {2} 2.output.js 21 {1} [rendered]
    > [0] ./example.js 5:0-8:2
    [4] ./d.js 21 {2} [built]
        cjs require ./d [0] ./example.js 7:1-15
chunk    {3} 3.output.js 21 {1} [rendered]
    > [0] ./example.js 2:0-52
    [3] ./c.js 21 {3} [built]
        amd require ./c [0] ./example.js 2:0-52

WARNING in output.js from UglifyJs
Dropping unused function argument c [./example.js:2,0]
Dropping unused function argument b [./example.js:2,0]
Dropping unused function argument a [./example.js:2,0]
Dropping unused function argument require [./example.js:5,0]
```
