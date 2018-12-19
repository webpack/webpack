This very simple example shows usage of CommonJS.

The three files `example.js`, `increment.js` and `math.js` form a dependency chain. They use `require(dependency)` to declare dependencies.

You can see the output file that webpack creates by bundling them together in one file. Keep in mind that webpack adds comments to make reading this file easier. These comments are removed when minimizing the file.

You can also see the info messages webpack prints to console (for both normal and minimized build).

# example.js

``` javascript
const inc = require('./increment').increment;
const a = 1;
inc(a); // 2
```

# increment.js

``` javascript
const add = require('./math').add;
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
/*! runtime requirements: __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

const inc = __webpack_require__(/*! ./increment */ 1).increment;
const a = 1;
inc(a); // 2


/***/ }),
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, __webpack_exports__ */
/***/ (function(__unusedmodule, exports, __webpack_require__) {

const add = __webpack_require__(/*! ./math */ 2).add;
exports.increment = function(val) {
    return add(val, 1);
};


/***/ }),
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! no static exports found */
/*! runtime requirements: __webpack_exports__ */
/***/ (function(__unusedmodule, exports) {

exports.add = function() {
    var sum = 0, i = 0, args = arguments, l = args.length;
    while (i < l) {
        sum += args[i++];
    }
    return sum;
};

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset      Size  Chunks             Chunk Names
output.js  2.21 KiB     {0}  [emitted]  main
Entrypoint main = output.js
chunk {0} output.js (main) 326 bytes [entry] [rendered]
    > .\example.js main
 [0] ./example.js 72 bytes {0} [built]
     [used exports unknown]
     entry .\example.js main
 [1] ./increment.js 98 bytes {0} [built]
     [used exports unknown]
     cjs require ./increment [0] ./example.js 1:12-34
 [2] ./math.js 156 bytes {0} [built]
     [used exports unknown]
     cjs require ./math [1] ./increment.js 1:12-29
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset       Size  Chunks             Chunk Names
output.js  407 bytes   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 326 bytes [entry] [rendered]
    > .\example.js main
 [275] ./example.js 72 bytes {404} [built]
       entry .\example.js main
 [529] ./increment.js 98 bytes {404} [built]
       cjs require ./increment [275] ./example.js 1:12-34
 [702] ./math.js 156 bytes {404} [built]
       cjs require ./math [529] ./increment.js 1:12-29
```