This very simple example shows usage of CommonsJS.

The three files `example.js`, `increment.js` and `math.js` form a dependency chain. They use `require(dependency)` to declare dependencies.

You can see the output file that webpack creates by bundling them together in one file. Keep in mind that webpack adds comments to make reading this file easier. These commonent are removed when minimizing the file.

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
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
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
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
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

	var inc = __webpack_require__(/*! ./increment */ 1).increment;
	var a = 1;
	inc(a); // 2

/***/ },
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	var add = __webpack_require__(/*! ./math */ 2).add;
	exports.increment = function(val) {
	    return add(val, 1);
	};

/***/ },
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

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
Hash: f20c1cdaf768293603f5
Version: webpack 1.5.0
Time: 47ms
    Asset  Size  Chunks             Chunk Names
output.js  2257       0  [emitted]  main
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
Hash: fd25a122b2db47818529
Version: webpack 1.5.0
Time: 132ms
    Asset  Size  Chunks             Chunk Names
output.js   419       0  [emitted]  main
chunk    {0} output.js (main) 329 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 69 {0} [built]
    [1] ./increment.js 98 {0} [built]
        cjs require ./increment [0] ./example.js 1:10-32
    [2] ./math.js 162 {0} [built]
        cjs require ./math [1] ./increment.js 1:10-27
```