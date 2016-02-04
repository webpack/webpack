
# example.js

``` javascript
console.log(require("./cup1"));
```

# cup1.coffee

``` coffee-script
module.exports =
	cool: "stuff"
	answer: 42
	external: require "./cup2.coffee"
	again: require "./cup2"
```

# cup2.coffee

``` coffee-script
console.log "yeah coffee-script"

module.exports = 42
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
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*********************!*\
  !*** ./cup2.coffee ***!
  \*********************/
/***/ function(module, exports) {

	console.log("yeah coffee-script");

	module.exports = 42;


/***/ },
/* 1 */
/*!*********************!*\
  !*** ./cup1.coffee ***!
  \*********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	  cool: "stuff",
	  answer: 42,
	  external: __webpack_require__(/*! ./cup2.coffee */ 0),
	  again: __webpack_require__(/*! ./cup2 */ 0)
	};


/***/ },
/* 2 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	console.log(__webpack_require__(/*! ./cup1 */ 1));

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: fa6a322e8d9b34546553
Version: webpack 2.0.6-beta
Time: 178ms
    Asset     Size  Chunks             Chunk Names
output.js  2.07 kB       0  [emitted]  main
chunk    {0} output.js (main) 206 bytes [rendered]
    > main [2] ./example.js 
    [0] ./cup2.coffee 57 bytes {0} [built]
        cjs require ./cup2.coffee [1] ./cup1.coffee 4:12-36
        cjs require ./cup2 [1] ./cup1.coffee 5:9-26
    [1] ./cup1.coffee 118 bytes {0} [built]
        cjs require ./cup1 [2] ./example.js 1:12-29
    [2] ./example.js 31 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: fa6a322e8d9b34546553
Version: webpack 2.0.6-beta
Time: 229ms
    Asset       Size  Chunks             Chunk Names
output.js  383 bytes       0  [emitted]  main
chunk    {0} output.js (main) 206 bytes [rendered]
    > main [2] ./example.js 
    [0] ./cup2.coffee 57 bytes {0} [built]
        cjs require ./cup2.coffee [1] ./cup1.coffee 4:12-36
        cjs require ./cup2 [1] ./cup1.coffee 5:9-26
    [1] ./cup1.coffee 118 bytes {0} [built]
        cjs require ./cup1 [2] ./example.js 1:12-29
    [2] ./example.js 31 bytes {0} [built]
```