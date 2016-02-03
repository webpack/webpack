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
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules, executeModule) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(resolves.length)
/******/ 			resolves.shift()();

/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		0: 0
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
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return Promise.resolve()

/******/ 		// an Promise means "currently loading".
/******/ 		if(installedChunks[chunkId]) {
/******/ 			return installedChunks[chunkId][2];
/******/ 		}
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;

/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".js";
/******/ 		var timeout = setTimeout(onScriptComplete, 120000);
/******/ 		script.onerror = script.onload = onScriptComplete;
/******/ 		function onScriptComplete() {
/******/ 			// avoid mem leaks in IE.
/******/ 			script.onerror = script.onload = null;
/******/ 			clearTimeout(timeout);
/******/ 			var chunk = installedChunks[chunkId];
/******/ 			if(chunk !== 0) {
/******/ 				if(chunk) chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};
/******/ 		head.appendChild(script);

/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		return installedChunks[chunkId][2] = promise;
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { throw err; };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
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
	__webpack_require__.e/* nsure */(1).then(function(require) {
		data = __webpack_require__(/*! !./file.js */ 2);
		var callbacks = cbs;
		cbs = null;
		for(var i = 0, l = callbacks.length; i < l; i++) {
			callbacks[i](data);
		}
	}.bind(null, __webpack_require__)).catch(function(err) { __webpack_require__.oe(err); });

/***/ },
/* 1 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! bundle!./file.js */ 0)(function(fileJsExports) {
		console.log(fileJsExports);
	});

/***/ }
/******/ ]);
```

# js/1.js

``` javascript
webpackJsonp([1],{

/***/ 2:
/*!*****************!*\
  !*** ./file.js ***!
  \*****************/
/***/ function(module, exports) {

	module.exports = "It works";

/***/ }

});
```

# Info

## Uncompressed

```
Hash: 5e83b5be2cdc348222db
Version: webpack 2.0.6-beta
Time: 112ms
    Asset       Size  Chunks             Chunk Names
output.js    4.98 kB       0  [emitted]  main
     1.js  175 bytes       1  [emitted]  
chunk    {0} output.js (main) 369 bytes [rendered]
    > main [1] ./example.js 
    [0] (webpack)/~/bundle-loader!./file.js 281 bytes {0} [built]
        cjs require bundle!./file.js [1] ./example.js 1:0-27
    [1] ./example.js 88 bytes {0} [built]
chunk    {1} 1.js 28 bytes {0} [rendered]
    > [0] (webpack)/~/bundle-loader!./file.js 7:0-14:2
    [2] ./file.js 28 bytes {1} [built]
        cjs require !!./file.js [0] (webpack)/~/bundle-loader!./file.js 8:8-30
```

## Minimized (uglify-js, no zip)

```
Hash: 5e83b5be2cdc348222db
Version: webpack 2.0.6-beta
Time: 235ms
    Asset      Size  Chunks             Chunk Names
output.js   1.19 kB       0  [emitted]  main
     1.js  58 bytes       1  [emitted]  
chunk    {0} output.js (main) 369 bytes [rendered]
    > main [1] ./example.js 
    [0] (webpack)/~/bundle-loader!./file.js 281 bytes {0} [built]
        cjs require bundle!./file.js [1] ./example.js 1:0-27
    [1] ./example.js 88 bytes {0} [built]
chunk    {1} 1.js 28 bytes {0} [rendered]
    > [0] (webpack)/~/bundle-loader!./file.js 7:0-14:2
    [2] ./file.js 28 bytes {1} [built]
        cjs require !!./file.js [0] (webpack)/~/bundle-loader!./file.js 8:8-30
```
