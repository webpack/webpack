# example.js

``` javascript
var a = require("./a");

// get module id
var aId = require.resolve("./a");

// clear module in require.cache
delete require.cache[aId];

// require module again, it should be reexecuted
var a2 = require("./a");

// verify it
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
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var a = __webpack_require__(/*! ./a */ 1);

	// get module id
	var aId = /*require.resolve*/(/*! ./a.js */ 1);

	// clear module in require.cache
	delete __webpack_require__.c[aId];

	// require module again, it should be reexecuted
	var a2 = __webpack_require__(/*! ./a */ 1);

	// vertify it
	if(a == a2) throw new Error("Cache clear failed :(");

/***/ },
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports) {

	module.exports = Math.random();

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 45aa578eb2865bbacfee
Version: webpack 1.9.10
Time: 65ms
    Asset     Size  Chunks             Chunk Names
output.js  1.99 kB       0  [emitted]  main
chunk    {0} output.js (main) 326 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 295 bytes {0} [built]
    [1] ./a.js 31 bytes {0} [built]
        cjs require ./a [0] ./example.js 1:8-22
        cjs require ./a [0] ./example.js 10:9-23
        require.resolve ./a.js [0] ./example.js 4:10-35
```

## Minimized (uglify-js, no zip)

```
Hash: 45aa578eb2865bbacfee
Version: webpack 1.9.10
Time: 169ms
    Asset       Size  Chunks             Chunk Names
output.js  350 bytes       0  [emitted]  main
chunk    {0} output.js (main) 326 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 295 bytes {0} [built]
    [1] ./a.js 31 bytes {0} [built]
        cjs require ./a [0] ./example.js 1:8-22
        cjs require ./a [0] ./example.js 10:9-23
        require.resolve ./a.js [0] ./example.js 4:10-35
```
