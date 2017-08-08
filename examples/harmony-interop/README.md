
# example.js

``` javascript
// harmony module

// import from CommonJs module
import fs from "./fs";
import { readFile } from "./fs";
import * as fs2 from "./fs";
fs.readFile("file");
readFile("file");
fs2.readFile("file");

// import from harmony module
import { readFile as readFile2 } from "./reexport-commonjs";
readFile2("file");

// import a CommonJs module for sideeffects
import "./example2";
```

# fs.js

``` javascript
// an example CommonJs module
// content is omitted for brevity
exports.readFile = function() {};
// using module.exports would be equivalent,
// webpack doesn't care which syntax is used

// AMD modules are also possible and equvivalent to CommonJs modules
```

# reexport-commonjs.js

``` javascript
// reexport a CommonJs module
export * from "./fs";
// Note that the default export doesn't reexport via export *
// (this is not interop-specific, it applies for every export *)

// Note: reexporting a CommonJs module is a special case,
// because in this module we have no information about exports
```

# example2.js

``` javascript
// CommonJs module

// require a harmony module
var module = require("./harmony");

var defaultExport = module.default;
var namedExport = module.named;
```

# harmony.js

``` javascript
// just some exports
export default "default";
export var named = "named";
```

# js/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
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
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
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
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!***************!*\
  !*** ./fs.js ***!
  \***************/
/*! no static exports found */
/*! exports used: default, readFile */
/***/ (function(module, exports) {

// an example CommonJs module
// content is omitted for brevity
exports.readFile = function() {};
// using module.exports would be equivalent,
// webpack doesn't care which syntax is used

// AMD modules are also possible and equvivalent to CommonJs modules


/***/ }),
/* 1 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports provided:  */
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__fs__ = __webpack_require__(/*! ./fs */ 0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__fs___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__fs__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__reexport_commonjs__ = __webpack_require__(/*! ./reexport-commonjs */ 2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__example2__ = __webpack_require__(/*! ./example2 */ 3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__example2___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2__example2__);
// harmony module

// import from CommonJs module



__WEBPACK_IMPORTED_MODULE_0__fs___default.a.readFile("file");
Object(__WEBPACK_IMPORTED_MODULE_0__fs__["readFile"])("file");
__WEBPACK_IMPORTED_MODULE_0__fs__["readFile"]("file");

// import from harmony module

Object(__WEBPACK_IMPORTED_MODULE_1__reexport_commonjs__["readFile"])("file");

// import a CommonJs module for sideeffects



/***/ }),
/* 2 */
/*!******************************!*\
  !*** ./reexport-commonjs.js ***!
  \******************************/
/*! no static exports found */
/*! exports used: readFile */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__fs__ = __webpack_require__(/*! ./fs */ 0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__fs___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__fs__);
/* harmony namespace reexport (by used) */ if(__webpack_require__.o(__WEBPACK_IMPORTED_MODULE_0__fs__, "readFile")) __webpack_require__.d(__webpack_exports__, "readFile", function() { return __WEBPACK_IMPORTED_MODULE_0__fs__["readFile"]; });
// reexport a CommonJs module

// Note that the default export doesn't reexport via export *
// (this is not interop-specific, it applies for every export *)

// Note: reexporting a CommonJs module is a special case,
// because in this module we have no information about exports


/***/ }),
/* 3 */
/*!*********************!*\
  !*** ./example2.js ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

// CommonJs module

// require a harmony module
var module = __webpack_require__(/*! ./harmony */ 4);

var defaultExport = module.default;
var namedExport = module.named;


/***/ }),
/* 4 */
/*!********************!*\
  !*** ./harmony.js ***!
  \********************/
/*! exports provided: default, named */
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "named", function() { return named; });
// just some exports
/* harmony default export */ __webpack_exports__["default"] = ("default");
var named = "named";


/***/ })
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 756e5e3b676506d280a4
Version: webpack 3.5.1
    Asset     Size  Chunks             Chunk Names
output.js  6.13 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 1.2 kB [entry] [rendered]
    > main [1] ./example.js 
    [0] ./fs.js 265 bytes {0} [built]
        [only some exports used: default, readFile]
        harmony import ./fs [1] ./example.js 4:0-22
        harmony import ./fs [1] ./example.js 5:0-32
        harmony import ./fs [1] ./example.js 6:0-28
        harmony import ./fs [2] ./reexport-commonjs.js 2:0-21
    [1] ./example.js 389 bytes {0} [built]
        [no exports]
    [2] ./reexport-commonjs.js 308 bytes {0} [built]
        [only some exports used: readFile]
        harmony import ./reexport-commonjs [1] ./example.js 12:0-60
    [3] ./example2.js 159 bytes {0} [built]
        [no exports used]
        harmony import ./example2 [1] ./example.js 16:0-20
    [4] ./harmony.js 78 bytes {0} [built]
        [exports: default, named]
        cjs require ./harmony [3] ./example2.js 4:13-33
```

## Minimized (uglify-js, no zip)

```
Hash: 756e5e3b676506d280a4
Version: webpack 3.5.1
    Asset     Size  Chunks             Chunk Names
output.js  1.03 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 1.2 kB [entry] [rendered]
    > main [1] ./example.js 
    [0] ./fs.js 265 bytes {0} [built]
        [only some exports used: default, readFile]
        harmony import ./fs [1] ./example.js 4:0-22
        harmony import ./fs [1] ./example.js 5:0-32
        harmony import ./fs [1] ./example.js 6:0-28
        harmony import ./fs [2] ./reexport-commonjs.js 2:0-21
    [1] ./example.js 389 bytes {0} [built]
        [no exports]
    [2] ./reexport-commonjs.js 308 bytes {0} [built]
        [only some exports used: readFile]
        harmony import ./reexport-commonjs [1] ./example.js 12:0-60
    [3] ./example2.js 159 bytes {0} [built]
        [no exports used]
        harmony import ./example2 [1] ./example.js 16:0-20
    [4] ./harmony.js 78 bytes {0} [built]
        [exports: default, named]
        cjs require ./harmony [3] ./example2.js 4:13-33
```