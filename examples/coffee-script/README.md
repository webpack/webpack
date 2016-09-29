
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

<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>
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
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmory exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		Object.defineProperty(exports, name, {
/******/ 			configurable: false,
/******/ 			enumerable: true,
/******/ 			get: getter
/******/ 		});
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!*********************!*\
  !*** ./cup2.coffee ***!
  \*********************/
/***/ function(module, exports) {

console.log("yeah coffee-script");

module.exports = 42;


/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
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
/* unknown exports provided */
/* all exports used */
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
Hash: 0718a799b127b2e3e2e1
Version: webpack 2.1.0-beta.25
Time: 245ms
    Asset     Size  Chunks             Chunk Names
output.js  3.25 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 206 bytes [entry] [rendered]
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
Hash: 0718a799b127b2e3e2e1
Version: webpack 2.1.0-beta.25
Time: 344ms
    Asset       Size  Chunks             Chunk Names
output.js  663 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 206 bytes [entry] [rendered]
    > main [2] ./example.js 
    [0] ./cup2.coffee 57 bytes {0} [built]
        cjs require ./cup2.coffee [1] ./cup1.coffee 4:12-36
        cjs require ./cup2 [1] ./cup1.coffee 5:9-26
    [1] ./cup1.coffee 118 bytes {0} [built]
        cjs require ./cup1 [2] ./example.js 1:12-29
    [2] ./example.js 31 bytes {0} [built]
```