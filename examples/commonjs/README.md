
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
/******/ 	// The module cache
/******/ 	var installedModules = {};
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
/******/ 	// The bundle contains no chunks. A empty chunk loading function.
/******/ 	require.e = function requireEnsure(_, callback) {
/******/ 		callback.call(null, require);
/******/ 	};
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	require.modules = modules;
/******/ 	
/******/ 	// expose the module cache
/******/ 	require.cache = installedModules;
/******/ 	
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

	var inc = require(/*! ./increment */ 1).increment;
	var a = 1;
	inc(a); // 2

/***/ },

/***/ 1:
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/***/ function(module, exports, require) {

	var add = require(/*! ./math */ 2).add;
	exports.increment = function(val) {
	    return add(val, 1);
	};

/***/ },

/***/ 2:
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
/******/ })
```

# Info

## Uncompressed

```
Hash: 58e793ed9773263580f89dd2c34efe6a
Version: webpack 0.10.0-beta6
Time: 36ms
    Asset  Size  Chunks             Chunk Names
output.js  2311       0  [emitted]  main       
chunk    {0} output.js (main) 318 [rendered]
    [0] ./example.js 67 [built] {0}
    [1] ./increment.js 95 [built] {0}
        cjs require ./increment [0] ./example.js 1:10-32
    [2] ./math.js 156 [built] {0}
        cjs require ./math [1] ./increment.js 1:10-27
```

## Minimized (uglify-js, no zip)

```
Hash: 58e793ed9773263580f89dd2c34efe6a
Version: webpack 0.10.0-beta6
Time: 80ms
    Asset  Size  Chunks             Chunk Names
output.js   460       0  [emitted]  main       
chunk    {0} output.js (main) 318 [rendered]
    [0] ./example.js 67 [built] {0}
    [1] ./increment.js 95 [built] {0}
        cjs require ./increment [0] ./example.js 1:10-32
    [2] ./math.js 156 [built] {0}
        cjs require ./math [1] ./increment.js 1:10-27
```