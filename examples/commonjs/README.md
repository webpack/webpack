
# example.js

``` javascript
var inc = require('./increment').increment;
var a = 1;
inc(a); // 2
```

# increment.js

``` javascript
var add = require('./math').add;
exports.increment = function(val) {
    return add(val, 1);
};
```

# math.js

``` javascript
exports.add = function() {
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

	var inc = require(/*! ./increment */ 1).increment;
	var a = 1;
	inc(a); // 2

/***/ },
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/***/ function(module, exports, require) {

	var add = require(/*! ./math */ 2).add;
	exports.increment = function(val) {
	    return add(val, 1);
	};

/***/ },
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/***/ function(module, exports, require) {

	exports.add = function() {
	    var sum = 0, i = 0, args = arguments, l = args.length;
	    while (i < l) {
	        sum += args[i++];
	    }
	    return sum;
	};

/***/ }
/******/ ])
```

# Info

## Uncompressed

```
Hash: 463200a36258bb3ff5b2
Version: webpack 1.0.0-rc1
Time: 57ms
    Asset  Size  Chunks             Chunk Names
output.js  2255       0  [emitted]  main       
chunk    {0} output.js (main) 329 [rendered]
    > main [0] ./example.js
    [0] ./example.js 69 {0} [built]
    [1] ./increment.js 98 {0} [built]
        cjs require ./increment [0] ./example.js 1:10-32
    [2] ./math.js 162 {0} [built]
        cjs require ./math [1] ./increment.js 1:10-27
```

## Minimized (uglify-js, no zip)

```
Hash: 434f28b7ad3542e91dda
Version: webpack 1.0.0-rc1
Time: 115ms
    Asset  Size  Chunks             Chunk Names
output.js   421       0  [emitted]  main       
chunk    {0} output.js (main) 329 [rendered]
    > main [0] ./example.js
    [0] ./example.js 69 {0} [built]
    [1] ./increment.js 98 {0} [built]
        cjs require ./increment [0] ./example.js 1:10-32
    [2] ./math.js 162 {0} [built]
        cjs require ./math [1] ./increment.js 1:10-27
```