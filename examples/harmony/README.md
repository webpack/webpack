
# example.js

``` javascript
import { increment as inc } from './increment';
var a = 1;
inc(a); // 2
```

# increment.js

``` javascript
import { add } from './math';
export function increment(val) {
    return add(val, 1);
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

	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__increment__ = __webpack_require__(/*! ./increment */ 1);
	var a = 1;
	/* harmony import */ __WEBPACK_IMPORTED_MODULE_0__increment__["increment"](a); // 2

/***/ },
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__math__ = __webpack_require__(/*! ./math */ 2);
	/* harmony export declaration */function increment(val) {
	    return /* harmony import */ __WEBPACK_IMPORTED_MODULE_0__math__["add"](val, 1);
	}/* harmony export */ Object.defineProperty(exports, "increment", {configurable: false, enumerable: true, get: function() { return increment; }});;


/***/ },
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

	/* harmony export declaration */function add() {
		var sum = 0, i = 0, args = arguments, l = args.length;
		while (i < l) {
			sum += args[i++];
		}
		return sum;
	}/* harmony export */ Object.defineProperty(exports, "add", {configurable: false, enumerable: true, get: function() { return add; }});


/***/ }
/******/ ])
```

# Info

## Uncompressed

```
Hash: 2cddb2c302ef93d23ea9
Version: webpack 1.4.15
Time: 47ms
    Asset  Size  Chunks             Chunk Names
output.js  2792       0  [emitted]  main
chunk    {0} output.js (main) 309 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 73 {0} [built]
    [1] ./increment.js 94 {0} [built]
        harmony import ./increment [0] ./example.js 1:0-47
    [2] ./math.js 142 {0} [built]
        harmony import ./math [1] ./increment.js 1:0-29
```

## Minimized (uglify-js, no zip)

```
Hash: 810b804d71afd4672772
Version: webpack 1.4.15
Time: 141ms
    Asset  Size  Chunks             Chunk Names
output.js   585       0  [emitted]  main
chunk    {0} output.js (main) 309 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 73 {0} [built]
    [1] ./increment.js 94 {0} [built]
        harmony import ./increment [0] ./example.js 1:0-47
    [2] ./math.js 142 {0} [built]
        harmony import ./math [1] ./increment.js 1:0-29
```