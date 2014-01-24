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
/******/ 		modules[moduleId].call(module.exports, module, module.exports, require);
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

	require(/*! bundle!./file.js */ 2)(function(fileJsExports) {
		console.log(fileJsExports);
	});

/***/ },
/* 1 */,
/* 2 */
/*!*******************************************!*\
  !*** (webpack)/~/bundle-loader!./file.js ***!
  \*******************************************/
/***/ function(module, exports, require) {

	var cbs = [], 
		data;
	module.exports = function(cb) {
		if(cbs) cbs.push(cb);
		else cb(data);
	}
	require.e/*nsure*/(1, function(require) {
		data = require(/*! !./file.js */ 1);
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
/***/ function(module, exports, require) {

	module.exports = "It works";

/***/ }
])
```

# Info

## Uncompressed

```
Hash: b48eaa219fe67eefd271
Version: webpack 1.0.0-beta8
Time: 83ms
      Asset  Size  Chunks             Chunk Names
  output.js  4114       0  [emitted]  main       
1.output.js   189       1  [emitted]             
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
Hash: 64de800a2a6968acaf66
Version: webpack 1.0.0-beta8
Time: 197ms
      Asset  Size  Chunks             Chunk Names
  output.js   859       0  [emitted]  main       
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
```
