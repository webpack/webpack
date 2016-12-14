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

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
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
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports) {

module.exports = Math.random();

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
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
Hash: 00060b879bc0621a21be
Version: webpack 2.2.0-rc.2
    Asset     Size  Chunks             Chunk Names
output.js  3.21 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 326 bytes [entry] [rendered]
    > main [1] ./example.js 
    [0] ./a.js 31 bytes {0} [built]
        cjs require ./a [1] ./example.js 1:8-22
        cjs require ./a [1] ./example.js 10:9-23
        require.resolve ./a.js [1] ./example.js 4:10-35
    [1] ./example.js 295 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 00060b879bc0621a21be
Version: webpack 2.2.0-rc.2
    Asset       Size  Chunks             Chunk Names
output.js  644 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 326 bytes [entry] [rendered]
    > main [1] ./example.js 
    [0] ./a.js 31 bytes {0} [built]
        cjs require ./a [1] ./example.js 1:8-22
        cjs require ./a [1] ./example.js 10:9-23
        require.resolve ./a.js [1] ./example.js 4:10-35
    [1] ./example.js 295 bytes {0} [built]
```
