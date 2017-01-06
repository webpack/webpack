This very simple example shows usage of CommonJS.

The three files `example.js`, `increment.js` and `math.js` form a dependency chain. They use `require(dependency)` to declare dependencies.

You can see the output file that webpack creates by bundling them together in one file. Keep in mind that webpack adds comments to make reading this file easier. These comments are removed when minimizing the file.

You can also see the info messages webpack prints to console (for both normal and minimized build).

# example.js

``` javascript
var inc = require('./increment').increment;
var a = 1;
inc(a); // 2
```

# increment.js

``` javascript
var add = require('./math').add;
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
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

var add = __webpack_require__(/*! ./math */ 1).add;
exports.increment = function(val) {
    return add(val, 1);
};

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/***/ function(module, exports) {

exports.add = function() {
    var sum = 0, i = 0, args = arguments, l = args.length;
    while (i < l) {
        sum += args[i++];
    }
    return sum;
};

/***/ },
/* 2 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

var inc = __webpack_require__(/*! ./increment */ 0).increment;
var a = 1;
inc(a); // 2

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: e1255027e5264a895afa
Version: webpack 2.2.0-rc.2
    Asset     Size  Chunks             Chunk Names
output.js  3.42 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 329 bytes [entry] [rendered]
    > main [2] ./example.js 
    [0] ./increment.js 98 bytes {0} [built]
        cjs require ./increment [2] ./example.js 1:10-32
    [1] ./math.js 162 bytes {0} [built]
        cjs require ./math [0] ./increment.js 1:10-27
    [2] ./example.js 69 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: e1255027e5264a895afa
Version: webpack 2.2.0-rc.2
    Asset       Size  Chunks             Chunk Names
output.js  713 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 329 bytes [entry] [rendered]
    > main [2] ./example.js 
    [0] ./increment.js 98 bytes {0} [built]
        cjs require ./increment [2] ./example.js 1:10-32
    [1] ./math.js 162 bytes {0} [built]
        cjs require ./math [0] ./increment.js 1:10-27
    [2] ./example.js 69 bytes {0} [built]
```