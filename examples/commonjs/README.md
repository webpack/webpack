This very simple example shows usage of CommonJS.

The three files `example.js`, `increment.js` and `math.js` form a dependency chain. They use `require(dependency)` to declare dependencies.

You can see the output file that webpack creates by bundling them together in one file. Keep in mind that webpack adds comments to make reading this file easier. These comments are removed when minimizing the file.

You can also see the info messages webpack prints to console (for both normal and minimized build).

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


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	var add = __webpack_require__(/*! ./math */ 2).add;
	exports.increment = function(val) {
	    return add(val, 1);
	};

/***/ },
/* 1 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var inc = __webpack_require__(/*! ./increment */ 0).increment;
	var a = 1;
	inc(a); // 2

/***/ },
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/***/ function(module, exports) {

	exports.add = function() {
	    var sum = 0, i = 0, args = arguments, l = args.length;
	    while (i < l) {
	        sum += args[i++];
	    }
	    return sum;
	};

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 604c5c1fe4f4a9772853
Version: webpack 2.0.6-beta
Time: 75ms
    Asset     Size  Chunks             Chunk Names
output.js  2.17 kB       0  [emitted]  main
chunk    {0} output.js (main) 329 bytes [rendered]
    > main [1] ./example.js 
    [0] ./increment.js 98 bytes {0} [built]
        cjs require ./increment [1] ./example.js 1:10-32
    [1] ./example.js 69 bytes {0} [built]
    [2] ./math.js 162 bytes {0} [built]
        cjs require ./math [0] ./increment.js 1:10-27
```

## Minimized (uglify-js, no zip)

```
Hash: 604c5c1fe4f4a9772853
Version: webpack 2.0.6-beta
Time: 137ms
    Asset       Size  Chunks             Chunk Names
output.js  423 bytes       0  [emitted]  main
chunk    {0} output.js (main) 329 bytes [rendered]
    > main [1] ./example.js 
    [0] ./increment.js 98 bytes {0} [built]
        cjs require ./increment [1] ./example.js 1:10-32
    [1] ./example.js 69 bytes {0} [built]
    [2] ./math.js 162 bytes {0} [built]
        cjs require ./math [0] ./increment.js 1:10-27
```