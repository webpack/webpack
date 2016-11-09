This example illustrates a very simple case of Code Splitting with `require.ensure`.

* `a` and `b` are required normally via CommonJS
* `c` is depdended through the `require.ensure` array.
  * This means: make it available, but don't execute it
  * webpack will load it on demand
* `b` and `d` are required via CommonJs in the `require.ensure` callback
  * webpack detects that these are in the on-demand-callback and
  * will load them on demand
  * webpacks optimizer can optimize `b` away
    * as it is already available through the parent chunks

You can see that webpack outputs two files/chunks:

* `output.js` is the entry chunk and contains
  * the module system
  * chunk loading logic
  * the entry point `example.js`
  * module `a`
  * module `b`
* `1.output.js` is an additional chunk (on demand loaded) and contains
  * module `c`
  * module `d`

You can see that chunks are loaded via JSONP. The additional chunks are pretty small and minimize well.

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

	var a = __webpack_require__(/*! a */ 1);
	var b = __webpack_require__(/*! b */ 2);
	__webpack_require__.e/* nsure */(1, function(require) {
	    __webpack_require__(/*! b */ 2).xyz();
	    var d = __webpack_require__(/*! d */ 4);
	});

/***/ },
/* 1 */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports) {

	// module a

/***/ },
/* 2 */
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports) {

	// module b

/***/ }
/******/ ]);
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
/***/ function(module, exports) {

	// module c

/***/ },
/* 4 */
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports) {

	// module d

/***/ }
]);
```

Minimized

``` javascript
webpackJsonp([1],[,,,function(n,t){},function(n,t){}]);
```

# Info

## Uncompressed

```
Hash: 597f16bd0c3e725bb744
Version: webpack 1.9.10
Time: 84ms
      Asset       Size  Chunks             Chunk Names
  output.js    4.15 kB       0  [emitted]  main
1.output.js  310 bytes       1  [emitted]  
chunk    {0} output.js (main) 166 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 144 bytes {0} [built]
    [1] ./~/a.js 11 bytes {0} [built]
        cjs require a [0] ./example.js 1:8-20
    [2] ./~/b.js 11 bytes {0} [built]
        cjs require b [0] ./example.js 2:8-20
        cjs require b [0] ./example.js 4:4-16
chunk    {1} 1.output.js 22 bytes {0} [rendered]
    > [0] ./example.js 3:0-6:2
    [3] ./~/c.js 11 bytes {1} [built]
        require.ensure item c [0] ./example.js 3:0-6:2
    [4] ./~/d.js 11 bytes {1} [built]
        cjs require d [0] ./example.js 5:12-24
```

## Minimized (uglify-js, no zip)

```
Hash: f511399c91173988d568
Version: webpack 1.9.10
Time: 213ms
      Asset       Size  Chunks             Chunk Names
  output.js  793 bytes       0  [emitted]  main
1.output.js   55 bytes       1  [emitted]  
chunk    {0} output.js (main) 166 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 144 bytes {0} [built]
    [1] ./~/b.js 11 bytes {0} [built]
        cjs require b [0] ./example.js 2:8-20
        cjs require b [0] ./example.js 4:4-16
    [2] ./~/a.js 11 bytes {0} [built]
        cjs require a [0] ./example.js 1:8-20
chunk    {1} 1.output.js 22 bytes {0} [rendered]
    > [0] ./example.js 3:0-6:2
    [3] ./~/c.js 11 bytes {1} [built]
        require.ensure item c [0] ./example.js 3:0-6:2
    [4] ./~/d.js 11 bytes {1} [built]
        cjs require d [0] ./example.js 5:12-24

WARNING in output.js from UglifyJs
Side effects in initialization of unused variable d [./example.js:5,0]
Side effects in initialization of unused variable a [./example.js:1,0]
Side effects in initialization of unused variable b [./example.js:2,0]
```
