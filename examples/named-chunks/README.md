# example.js

``` javascript
var a = require("a");

require.ensure(["b"], function(require) {
	// a named chunk
	var c = require("c");
}, "my own chunk");

require.ensure(["b"], function(require) {
	// another chunk with the same name
	var d = require("d");
}, "my own chunk");

require.ensure([], function(require) {
	// the same again
}, "my own chunk");

require.ensure(["b"], function(require) {
	// chunk without name
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
/******/ 		2:0
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

	var a = __webpack_require__(/*! a */ 3);

	__webpack_require__.e/*nsure*/(0, function(require) {
		// a named chunk
		var c = __webpack_require__(/*! c */ 4);
	}, /*! my own chunk */ 0);

	__webpack_require__.e/*nsure*/(0, function(require) {
		// another chunk with the same name
		var d = __webpack_require__(/*! d */ 2);
	}, /*! my own chunk */ 0);

	__webpack_require__.e/*nsure*/(0, function(require) {
		// the same again
	}, /*! my own chunk */ 0);

	__webpack_require__.e/*nsure*/(1, function(require) {
		// chunk without name
		var d = __webpack_require__(/*! d */ 2);
	});


/***/ },
/* 1 */,
/* 2 */,
/* 3 */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	// module a

/***/ }
/******/ ])
```

# js/0.output.js

``` javascript
webpackJsonp([0,1],[
/* 0 */,
/* 1 */
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	// module b

/***/ },
/* 2 */
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	// module d

/***/ },
/* 3 */,
/* 4 */
/*!****************!*\
  !*** ./~/c.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	// module c

/***/ }
])
```

# js/1.output.js

``` javascript
webpackJsonp([1],[
/* 0 */,
/* 1 */
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	// module b

/***/ },
/* 2 */
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	// module d

/***/ }
])
```

# Info

## Uncompressed

```
Hash: 2eb88f7447c15bcee0b6
Version: webpack 1.1.0
Time: 94ms
      Asset  Size  Chunks             Chunk Names 
0.output.js   496    0, 1  [emitted]  my own chunk
1.output.js   333       1  [emitted]              
  output.js  4540       2  [emitted]  main        
chunk    {0} 0.output.js (my own chunk) 33 {2} [rendered]
    > my own chunk [0] ./example.js 3:0-6:18
    > my own chunk [0] ./example.js 8:0-11:18
    > my own chunk [0] ./example.js 13:0-15:18
    [1] ./~/b.js 11 {0} {1} [built]
        require.ensure item b [0] ./example.js 3:0-6:18
        require.ensure item b [0] ./example.js 8:0-11:18
        require.ensure item b [0] ./example.js 17:0-20:2
    [2] ./~/d.js 11 {0} {1} [built]
        cjs require d [0] ./example.js 10:9-21
        cjs require d [0] ./example.js 19:9-21
    [4] ./~/c.js 11 {0} [built]
        cjs require c [0] ./example.js 5:9-21
chunk    {1} 1.output.js 22 {2} [rendered]
    > [0] ./example.js 17:0-20:2
    [1] ./~/b.js 11 {0} {1} [built]
        require.ensure item b [0] ./example.js 3:0-6:18
        require.ensure item b [0] ./example.js 8:0-11:18
        require.ensure item b [0] ./example.js 17:0-20:2
    [2] ./~/d.js 11 {0} {1} [built]
        cjs require d [0] ./example.js 10:9-21
        cjs require d [0] ./example.js 19:9-21
chunk    {2} output.js (main) 452 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 441 {2} [built]
    [3] ./~/a.js 11 {2} [built]
        cjs require a [0] ./example.js 1:8-20
```

## Minimized (uglify-js, no zip)

```
Hash: ce8f2578986b700b7792
Version: webpack 1.1.0
Time: 188ms
      Asset  Size  Chunks             Chunk Names 
0.output.js    63    0, 1  [emitted]  my own chunk
1.output.js    47       1  [emitted]              
  output.js   822       2  [emitted]  main        
chunk    {0} 0.output.js (my own chunk) 33 {2} [rendered]
    > my own chunk [0] ./example.js 3:0-6:18
    > my own chunk [0] ./example.js 8:0-11:18
    > my own chunk [0] ./example.js 13:0-15:18
    [1] ./~/b.js 11 {0} {1} [built]
        require.ensure item b [0] ./example.js 3:0-6:18
        require.ensure item b [0] ./example.js 8:0-11:18
        require.ensure item b [0] ./example.js 17:0-20:2
    [2] ./~/d.js 11 {0} {1} [built]
        cjs require d [0] ./example.js 10:9-21
        cjs require d [0] ./example.js 19:9-21
    [4] ./~/c.js 11 {0} [built]
        cjs require c [0] ./example.js 5:9-21
chunk    {1} 1.output.js 22 {2} [rendered]
    > [0] ./example.js 17:0-20:2
    [1] ./~/b.js 11 {0} {1} [built]
        require.ensure item b [0] ./example.js 3:0-6:18
        require.ensure item b [0] ./example.js 8:0-11:18
        require.ensure item b [0] ./example.js 17:0-20:2
    [2] ./~/d.js 11 {0} {1} [built]
        cjs require d [0] ./example.js 10:9-21
        cjs require d [0] ./example.js 19:9-21
chunk    {2} output.js (main) 452 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 441 {2} [built]
    [3] ./~/a.js 11 {2} [built]
        cjs require a [0] ./example.js 1:8-20

WARNING in output.js from UglifyJs
Dropping unused function argument require [./example.js:3,0]
Side effects in initialization of unused variable c [./example.js:5,0]
Dropping unused function argument require [./example.js:8,0]
Side effects in initialization of unused variable d [./example.js:10,0]
Dropping unused function argument require [./example.js:13,0]
Dropping unused function argument require [./example.js:17,0]
Side effects in initialization of unused variable d [./example.js:19,0]
Side effects in initialization of unused variable a [./example.js:1,0]
```
