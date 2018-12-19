
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

console.log(__webpack_require__(/*! ./cup1 */ 1));

/***/ }),
/* 1 */
/*!*********************!*\
  !*** ./cup1.coffee ***!
  \*********************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = {
  cool: "stuff",
  answer: 42,
  external: __webpack_require__(/*! ./cup2.coffee */ 2),
  again: __webpack_require__(/*! ./cup2 */ 2)
};


/***/ }),
/* 2 */
/*!*********************!*\
  !*** ./cup2.coffee ***!
  \*********************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

console.log("yeah coffee-script");

module.exports = 42;


/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset      Size  Chunks             Chunk Names
output.js  2.08 KiB     {0}  [emitted]  main
Entrypoint main = output.js
chunk {0} output.js (main) 206 bytes [entry] [rendered]
    > .\example.js main
 [0] ./example.js 31 bytes {0} [built]
     [used exports unknown]
     entry .\example.js main
 [1] ./cup1.coffee 118 bytes {0} [built]
     [used exports unknown]
     cjs require ./cup1 [0] ./example.js 1:12-29
 [2] ./cup2.coffee 57 bytes {0} [built]
     [used exports unknown]
     cjs require ./cup2.coffee [1] ./cup1.coffee 4:12-36
     cjs require ./cup2 [1] ./cup1.coffee 5:9-26
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset       Size  Chunks             Chunk Names
output.js  373 bytes   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 206 bytes [entry] [rendered]
    > .\example.js main
 [275] ./example.js 31 bytes {404} [built]
       entry .\example.js main
 [642] ./cup1.coffee 118 bytes {404} [built]
       cjs require ./cup1 [275] ./example.js 1:12-29
 [976] ./cup2.coffee 57 bytes {404} [built]
       cjs require ./cup2.coffee [642] ./cup1.coffee 4:12-36
       cjs require ./cup2 [642] ./cup1.coffee 5:9-26
```