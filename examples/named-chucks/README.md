# example.js

``` javascript
var a = require("a");

require.ensure(["b"], function(require) {
	// a named chuck
	var c = require("c");
}, "my own chuck");

require.ensure(["b"], function(require) {
	// another chuck with the same name
	var d = require("d");
}, "my own chuck");

require.ensure([], function(require) {
	// the same again
}, "my own chuck");

require.ensure(["b"], function(require) {
	// chuck without name
	var d = require("d");
});
```


# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {0:0};
/******/ 	
/******/ 	// The require function
/******/ 	function require(moduleId) {
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
/******/ 		modules[moduleId].call(null, module, module.exports, require);
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
/******/ 			script.src = modules.c + "" + chunkId + ".output.js";
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
/******/ 	};
/******/ 	
/******/ 	// Load entry module and return exports
/******/ 	return require(0);
/******/ })
/************************************************************************/
/******/ ({
/******/ // __webpack_public_path__
/******/ c: "",

/***/ 0:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, require) {

	var a = require(/*! a */ 3);
	
	require.e/*nsure*/(1, function(require) {
		// a named chuck
		var c = require(/*! c */ 4);
	}, /*! my own chuck */ 0);
	
	require.e/*nsure*/(1, function(require) {
		// another chuck with the same name
		var d = require(/*! d */ 2);
	}, /*! my own chuck */ 0);
	
	require.e/*nsure*/(1, function(require) {
		// the same again
	}, /*! my own chuck */ 0);
	
	require.e/*nsure*/(2, function(require) {
		// chuck without name
		var d = require(/*! d */ 2);
	});

/***/ },

/***/ 3:
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module a

/***/ }
/******/ })
```

# js/1.output.js and js/my own chunk.js

``` javascript
webpackJsonp([1,2],
{

/***/ 1:
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module b

/***/ },

/***/ 2:
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module d

/***/ },

/***/ 4:
/*!****************!*\
  !*** ./~/c.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module c

/***/ }

}
)
```

# js/2.output.js

``` javascript
webpackJsonp([2],
{

/***/ 1:
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module b

/***/ },

/***/ 2:
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module d

/***/ }

}
)
```

# Info

## Uncompressed

```
Hash: 120ef41916d014813c0e
Version: webpack 0.11.0-beta19
Time: 75ms
          Asset  Size  Chunks             Chunk Names 
      output.js  4068       0  [emitted]  main        
    1.output.js   451    1, 2  [emitted]  my own chuck
my own chuck.js   451    1, 2  [emitted]  my own chuck
    2.output.js   307       2  [emitted]              
chunk    {0} output.js (main) 450 [rendered]
    [0] ./example.js 439 {0} [built]
    [3] ./~/a.js 11 {0} [built]
        cjs require a [0] ./example.js 1:8-20
chunk    {1} 1.output.js, my own chuck.js (my own chuck) 33 {0} [rendered]
    [1] ./~/b.js 11 {1} {2} [built]
        require.ensure item b [0] ./example.js 3:0-6:18
        require.ensure item b [0] ./example.js 8:0-11:18
        require.ensure item b [0] ./example.js 17:0-20:2
    [2] ./~/d.js 11 {1} {2} [built]
        cjs require d [0] ./example.js 10:9-21
        cjs require d [0] ./example.js 19:9-21
    [4] ./~/c.js 11 {1} [built]
        cjs require c [0] ./example.js 5:9-21
chunk    {2} 2.output.js 22 {0} [rendered]
    [1] ./~/b.js 11 {1} {2} [built]
        require.ensure item b [0] ./example.js 3:0-6:18
        require.ensure item b [0] ./example.js 8:0-11:18
        require.ensure item b [0] ./example.js 17:0-20:2
    [2] ./~/d.js 11 {1} {2} [built]
        cjs require d [0] ./example.js 10:9-21
        cjs require d [0] ./example.js 19:9-21
```
