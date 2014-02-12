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
/******/ 		2:0
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

	var a = require(/*! a */ 3);

	require.e/*nsure*/(0, function(require) {
		// a named chunk
		var c = require(/*! c */ 4);
	}, /*! my own chunk */ 0);

	require.e/*nsure*/(0, function(require) {
		// another chunk with the same name
		var d = require(/*! d */ 2);
	}, /*! my own chunk */ 0);

	require.e/*nsure*/(0, function(require) {
		// the same again
	}, /*! my own chunk */ 0);

	require.e/*nsure*/(1, function(require) {
		// chunk without name
		var d = require(/*! d */ 2);
	});


/***/ },
/* 1 */,
/* 2 */,
/* 3 */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports, require) {

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
/***/ function(module, exports, require) {

	// module b

/***/ },
/* 2 */
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module d

/***/ },
/* 3 */,
/* 4 */
/*!****************!*\
  !*** ./~/c.js ***!
  \****************/
/***/ function(module, exports, require) {

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
/***/ function(module, exports, require) {

	// module b

/***/ },
/* 2 */
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module d

/***/ }
])
```

# Info

## Uncompressed

```
Hash: 2eb88f7447c15bcee0b6
Version: webpack 1.0.0-rc5
Time: 67ms
      Asset  Size  Chunks             Chunk Names 
0.output.js   460    0, 1  [emitted]  my own chunk
1.output.js   309       1  [emitted]              
  output.js  4244       2  [emitted]  main        
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
Hash: 43d429ec15f56a083d20
Version: webpack 1.0.0-rc5
Time: 196ms
      Asset  Size  Chunks             Chunk Names 
0.output.js    63    0, 1  [emitted]  my own chunk
1.output.js    47       1  [emitted]              
  output.js   788       2  [emitted]  main        
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
Side effects in initialization of unused variable c [./example.js:5,0]
Side effects in initialization of unused variable d [./example.js:10,0]
Dropping unused function argument require [./example.js:13,0]
Side effects in initialization of unused variable d [./example.js:19,0]
Side effects in initialization of unused variable a [./example.js:1,0]
```
