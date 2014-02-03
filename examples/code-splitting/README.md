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
/******/ 	// shortcut for better minimizing
/******/ 	var exports = "exports";
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
/******/ 	function require(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId][exports];
/******/ 		
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/ 		
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module[exports], module, module[exports], require);
/******/ 		
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 		
/******/ 		// Return the exports of the module
/******/ 		return module[exports];
/******/ 	}
/******/ 	
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	require.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, require);
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
/******/ 			script.src = require.p + "" + chunkId + ".output.js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	require.modules = modules;
/******/ 	
/******/ 	// expose the module cache
/******/ 	require.cache = installedModules;
/******/ 	
/******/ 	// __webpack_public_path__
/******/ 	require.p = "js/";
/******/ 	
/******/ 	// install a JSONP callback for chunk loading
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, callbacks = [];
/******/ 		while(chunkIds.length) {
/******/ 			chunkId = chunkIds.shift();
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, require);
/******/ 		
/******/ 	};
/******/ 	
/******/ 	// Load entry module and return exports
/******/ 	return require(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, require) {

	var a = require(/*! a */ 2);
	var b = require(/*! b */ 1);
	require.e/*nsure*/(1, function(require) {
	    require(/*! b */ 1).xyz();
	    var d = require(/*! d */ 4);
	});

/***/ },
/* 1 */
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module b

/***/ },
/* 2 */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports, require) {

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
/***/ function(module, exports, require) {

	// module c

/***/ },
/* 4 */
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports, require) {

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
Version: webpack 1.0.0-rc1
Time: 69ms
      Asset  Size  Chunks             Chunk Names
  output.js  4035       0  [emitted]  main       
1.output.js   327       1  [emitted]             
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
Version: webpack 1.0.0-rc1
Time: 161ms
      Asset  Size  Chunks             Chunk Names
  output.js   739       0  [emitted]  main       
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
Side effects in initialization of unused variable d [./example.js:5,0]
Side effects in initialization of unused variable a [./example.js:1,0]
Side effects in initialization of unused variable b [./example.js:2,0]
```
