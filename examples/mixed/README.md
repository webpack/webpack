# example.js

``` javascript
// CommonJs-style requires
var commonjs1 = require("./commonjs");
var amd1 = require("./amd");
var labeled1 = require("./labeled");

// AMD-style requires (with all webpack features)
require([
	"./commonjs", "./amd", "./labeled",
	"../require.context/templates/"+amd1+".js",
	Math.random() < 0.5 ? "./commonjs" : "./amd"],
	function(commonjs2, amd2, labeled2, template, randModule) {
		// Do something with it...
	}
);

// labeled modules requires
require: "./labeled";
// with the require label you are only allowed to import labeled modules
// the module needs static information about exports
```

# amd.js

``` javascript
// AMD Module Format
define(
	"app/amd", // anonym is also supported
	["./commonjs", "./labeled"],
	function(commonjs1, labeled1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = require("./commonjs");
		var labeled2 = require("./labeled");
		// Do something...
		return 456;
	}
);
```

# commonjs.js

``` javascript
// CommonJs Module Format
module.exports = 123;

// but you can use amd style requires
require(
	["./amd", "./labeled"],
	function(amd1, labeled1) {
		var amd2 = require("./amd");
		var labeled2 = require("./labeled");
	}
);
```

# labeled.js

``` javascript
// Labeled Module Format
exports: var a = 123;

// but you can use amd and commonjs style requires
require(
	["./commonjs", "./amd"],
	function(amd1) {
		var commonjs2 = require("./commonjs");
		var amd2 = require("./amd");
	}
);
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

	// CommonJs-style requires
	var commonjs1 = require(/*! ./commonjs */ 2);
	var amd1 = require(/*! ./amd */ 1);
	var labeled1 = require(/*! ./labeled */ 3);

	// AMD-style requires (with all webpack features)
	require.e/* require */(1, function(require) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [
		(require(/*! ./commonjs */ 2)), (require(/*! ./amd */ 1)), (require(/*! ./labeled */ 3)),
		require(/*! ../require.context/templates */ 4)("./"+amd1+".js"),
		Math.random() < 0.5 ? (require(/*! ./commonjs */ 2)) : (require(/*! ./amd */ 1))]; (function(commonjs2, amd2, labeled2, template, randModule) {
			// Do something with it...
		}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});

	// labeled modules requires
	var __WEBPACK_LABELED_MODULE__3 = require(/*! ./labeled */ 3), a = __WEBPACK_LABELED_MODULE__3.a;
	// with the require label you are only allowed to import labeled modules
	// the module needs static information about exports

/***/ },

/***/ 1:
/*!****************!*\
  !*** ./amd.js ***!
  \****************/
/***/ function(module, exports, require) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// AMD Module Format
	(__WEBPACK_AMD_DEFINE_ARRAY__ = [(require(/*! ./commonjs */ 2)), (require(/*! ./labeled */ 3))], __WEBPACK_AMD_DEFINE_RESULT__ = (function(commonjs1, labeled1) {
			// but you can use CommonJs-style requires:
			var commonjs2 = require(/*! ./commonjs */ 2);
			var labeled2 = require(/*! ./labeled */ 3);
			// Do something...
			return 456;
		}.apply(null, __WEBPACK_AMD_DEFINE_ARRAY__)), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ },

/***/ 2:
/*!*********************!*\
  !*** ./commonjs.js ***!
  \*********************/
/***/ function(module, exports, require) {

	// CommonJs Module Format
	module.exports = 123;

	// but you can use amd style requires
	require.e/* require */(0/* empty */, function(require) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [(require(/*! ./amd */ 1)), (require(/*! ./labeled */ 3))]; (function(amd1, labeled1) {
			var amd2 = require(/*! ./amd */ 1);
			var labeled2 = require(/*! ./labeled */ 3);
		}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});

/***/ },

/***/ 3:
/*!********************!*\
  !*** ./labeled.js ***!
  \********************/
/***/ function(module, exports, require) {

	// Labeled Module Format
	exports: var a = exports["a"] = 123;

	// but you can use amd and commonjs style requires
	require.e/* require */(0/* empty */, function(require) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [(require(/*! ./commonjs */ 2)), (require(/*! ./amd */ 1))]; (function(amd1) {
			var commonjs2 = require(/*! ./commonjs */ 2);
			var amd2 = require(/*! ./amd */ 1);
		}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));});

/***/ }
/******/ })
```

# js/1.output.js

``` javascript
webpackJsonp([1],
{

/***/ 4:
/*!*************************************************!*\
  !*** ../require.context/templates ^\.\/.*\.js$ ***!
  \*************************************************/
/***/ function(module, exports, require) {

	var map = {
		"./a.js": 5,
		"./b.js": 6,
		"./c.js": 7
	};
	function webpackContext(req) {
		return require(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;


/***/ },

/***/ 5:
/*!*****************************************!*\
  !*** ../require.context/templates/a.js ***!
  \*****************************************/
/***/ function(module, exports, require) {

	module.exports = function() {
		return "This text was generated by template A";
	}

/***/ },

/***/ 6:
/*!*****************************************!*\
  !*** ../require.context/templates/b.js ***!
  \*****************************************/
/***/ function(module, exports, require) {

	module.exports = function() {
		return "This text was generated by template B";
	}

/***/ },

/***/ 7:
/*!*****************************************!*\
  !*** ../require.context/templates/c.js ***!
  \*****************************************/
/***/ function(module, exports, require) {

	module.exports = function() {
		return "This text was generated by template C";
	}

/***/ }

}
)
```

# Info

## Uncompressed

```
Hash: afdf8d1d193c28a50902
Version: webpack 0.11.0
Time: 68ms
      Asset  Size  Chunks             Chunk Names
  output.js  6228       0  [emitted]  main       
1.output.js  1571       1  [emitted]             
chunk    {0} output.js (main) 1395 [rendered]
    [0] ./example.js 613 {0} [built]
    [1] ./amd.js 309 {0} [built]
        cjs require ./amd [0] ./example.js 3:11-27
        amd require ./amd [0] ./example.js 7:0-14:1
        amd require ./amd [0] ./example.js 7:0-14:1
        amd require ./amd [2] ./commonjs.js 5:0-11:1
        cjs require ./amd [2] ./commonjs.js 8:13-29
        amd require ./amd [3] ./labeled.js 5:0-11:1
        cjs require ./amd [3] ./labeled.js 9:13-29
    [2] ./commonjs.js 234 {0} [built]
        cjs require ./commonjs [0] ./example.js 2:16-37
        amd require ./commonjs [0] ./example.js 7:0-14:1
        amd require ./commonjs [0] ./example.js 7:0-14:1
        amd require ./commonjs [1] ./amd.js 2:0-12:1
        cjs require ./commonjs [1] ./amd.js 7:18-39
        amd require ./commonjs [3] ./labeled.js 5:0-11:1
        cjs require ./commonjs [3] ./labeled.js 8:18-39
    [3] ./labeled.js 239 {0} [built]
        cjs require ./labeled [0] ./example.js 4:15-35
        labeled require ./labeled [0] ./example.js 17:0-21
        amd require ./labeled [0] ./example.js 7:0-14:1
        amd require ./labeled [1] ./amd.js 2:0-12:1
        cjs require ./labeled [1] ./amd.js 8:17-37
        amd require ./labeled [2] ./commonjs.js 5:0-11:1
        cjs require ./labeled [2] ./commonjs.js 9:17-37
chunk    {1} 1.output.js 439 {0} [rendered]
    [4] ../require.context/templates ^\.\/.*\.js$ 193 {1} [built]
        amd require context ../require.context/templates [0] ./example.js 7:0-14:1
    [5] ../require.context/templates/a.js 82 {1} [built]
        context element ./a.js [4] ../require.context/templates ^\.\/.*\.js$
    [6] ../require.context/templates/b.js 82 {1} [built]
        context element ./b.js [4] ../require.context/templates ^\.\/.*\.js$
    [7] ../require.context/templates/c.js 82 {1} [built]
        context element ./c.js [4] ../require.context/templates ^\.\/.*\.js$
```
