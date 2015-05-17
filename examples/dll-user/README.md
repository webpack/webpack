# example.js

``` javascript
console.log(require("../dll/alpha"));
console.log(require("../dll/a"));

//console.log(require("beta/beta"));
//console.log(require("beta/b"));
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
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	console.log(__webpack_require__(/*! ../dll/alpha */ 1));
	console.log(__webpack_require__(/*! ../dll/a */ 3));

	//console.log(require("beta/beta"));
	//console.log(require("beta/b"));


/***/ },
/* 1 */
/*!*****************************************************************!*\
  !*** delegated 1 from dll-reference alpha_fda802f3c408a66ef744 ***!
  \*****************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(2))(1);

/***/ },
/* 2 */
/*!*********************************************!*\
  !*** external "alpha_fda802f3c408a66ef744" ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = alpha_fda802f3c408a66ef744;

/***/ },
/* 3 */
/*!*****************************************************************!*\
  !*** delegated 2 from dll-reference alpha_fda802f3c408a66ef744 ***!
  \*****************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = (__webpack_require__(2))(2);

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 08ef761d3df9cb02c0ab
Version: webpack 1.9.5
Time: 43ms
    Asset     Size  Chunks             Chunk Names
output.js  2.62 kB       0  [emitted]  main
chunk    {0} output.js (main) 275 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 149 bytes {0} [built]
     + 3 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: c02a95197e755bb65192
Version: webpack 1.9.5
Time: 107ms
    Asset       Size  Chunks             Chunk Names
output.js  382 bytes       0  [emitted]  main
chunk    {0} output.js (main) 275 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 149 bytes {0} [built]
     + 3 hidden modules
```