# example.js

``` javascript
require: "./increment";
var a = 1;
increment(a); // 2
```

# increment.js

``` javascript
require: "./math";
exports: function increment(val) {
    return add(val, 1);
};
```

# math.js

``` javascript
exports: function add() {
    var sum = 0, i = 0, args = arguments, l = args.length;
    while (i < l) {
        sum += args[i++];
    }
    return sum;
};
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

	var __WEBPACK_LABELED_MODULE__1 = require(/*! ./increment */ 1), increment = __WEBPACK_LABELED_MODULE__1.increment;
	var a = 1;
	increment(a); // 2

/***/ },
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/***/ function(module, exports, require) {

	var __WEBPACK_LABELED_MODULE__2 = require(/*! ./math */ 2), add = __WEBPACK_LABELED_MODULE__2.add;
	exports: exports["increment"] = function increment(val) {
	    return add(val, 1);
	};

/***/ },
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/***/ function(module, exports, require) {

	exports: exports["add"] = function add() {
	    var sum = 0, i = 0, args = arguments, l = args.length;
	    while (i < l) {
	        sum += args[i++];
	    }
	    return sum;
	};

/***/ }
/******/ ])
```

The remaining labels are removed while minimizing.

# Info

## Uncompressed

```
Hash: a09dcd87bf9b88c5e137
Version: webpack 1.0.0-rc5
Time: 63ms
    Asset  Size  Chunks             Chunk Names
output.js  2423       0  [emitted]  main       
chunk    {0} output.js (main) 299 [rendered]
    > main [0] ./example.js
    [0] ./example.js 55 {0} [built]
    [1] ./increment.js 83 {0} [built]
        labeled require ./increment [0] ./example.js 1:0-23
    [2] ./math.js 161 {0} [built]
        labeled require ./math [1] ./increment.js 1:0-18
```

## Minimized (uglify-js, no zip)

```
Hash: c5a0d96368c81b0a0d63
Version: webpack 1.0.0-rc5
Time: 119ms
    Asset  Size  Chunks             Chunk Names
output.js   429       0  [emitted]  main       
chunk    {0} output.js (main) 299 [rendered]
    > main [0] ./example.js
    [0] ./example.js 55 {0} [built]
    [1] ./increment.js 83 {0} [built]
        labeled require ./increment [0] ./example.js 1:0-23
    [2] ./math.js 161 {0} [built]
        labeled require ./math [1] ./increment.js 1:0-18
```