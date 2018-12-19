# example.js

``` javascript
var a = require("./a");

// get module id
var aId = require.resolve("./a.js");

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

# dist/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, __webpack_require__.c */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

var a = __webpack_require__(/*! ./a */ 1);

// get module id
var aId = /*require.resolve*/(/*! ./a.js */ 1);

// clear module in require.cache
delete __webpack_require__.c[aId];

// require module again, it should be reexecuted
var a2 = __webpack_require__(/*! ./a */ 1);

// verify it
if(a == a2) throw new Error("Cache clear failed :(");

/***/ }),
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = Math.random();

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset      Size  Chunks             Chunk Names
output.js  2.03 KiB     {0}  [emitted]  main
Entrypoint main = output.js
chunk {0} output.js (main) 313 bytes [entry] [rendered]
    > .\example.js main
 [0] ./example.js 282 bytes {0} [built]
     [used exports unknown]
     entry .\example.js main
 [1] ./a.js 31 bytes {0} [built]
     [used exports unknown]
     cjs require ./a [0] ./example.js 1:8-22
     require.resolve ./a.js [0] ./example.js 4:10-35
     cjs require ./a [0] ./example.js 10:9-23
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset       Size  Chunks             Chunk Names
output.js  333 bytes   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 313 bytes [entry] [rendered]
    > .\example.js main
 [162] ./a.js 31 bytes {404} [built]
       cjs require ./a [275] ./example.js 1:8-22
       require.resolve ./a.js [275] ./example.js 4:10-35
       cjs require ./a [275] ./example.js 10:9-23
 [275] ./example.js 282 bytes {404} [built]
       entry .\example.js main
```
