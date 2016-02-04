# example.js

``` javascript
var a = require("./a");

// get module id
var aId = require.resolve("./a.js");

// clear module in require.cache
delete require.cache[aId];

// require module again, it should be reexecuted
var a2 = require("./a");

// vertify it
if(a == a2) throw new Error("Cache clear failed :(");
```

# a.js


``` javascript
module.exports = Math.random();
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
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports) {

	module.exports = Math.random();

/***/ },
/* 1 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var a = __webpack_require__(/*! ./a */ 0);

	// get module id
	var aId = /*require.resolve*/(/*! ./a.js */ 0);

	// clear module in require.cache
	delete __webpack_require__.c[aId];

	// require module again, it should be reexecuted
	var a2 = __webpack_require__(/*! ./a */ 0);

	// vertify it
	if(a == a2) throw new Error("Cache clear failed :(");

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: ea909c1878908e23c0bf
Version: webpack 2.0.6-beta
Time: 65ms
    Asset     Size  Chunks             Chunk Names
output.js  2.02 kB       0  [emitted]  main
chunk    {0} output.js (main) 326 bytes [rendered]
    > main [1] ./example.js 
    [0] ./a.js 31 bytes {0} [built]
        cjs require ./a [1] ./example.js 1:8-22
        cjs require ./a [1] ./example.js 10:9-23
        require.resolve ./a.js [1] ./example.js 4:10-35
    [1] ./example.js 295 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: ea909c1878908e23c0bf
Version: webpack 2.0.6-beta
Time: 157ms
    Asset       Size  Chunks             Chunk Names
output.js  354 bytes       0  [emitted]  main
chunk    {0} output.js (main) 326 bytes [rendered]
    > main [1] ./example.js 
    [0] ./a.js 31 bytes {0} [built]
        cjs require ./a [1] ./example.js 1:8-22
        cjs require ./a [1] ./example.js 10:9-23
        require.resolve ./a.js [1] ./example.js 4:10-35
    [1] ./example.js 295 bytes {0} [built]
```
