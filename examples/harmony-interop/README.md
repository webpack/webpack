
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

// AMD modules are also possible and equivalent to CommonJs modules
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

# dist/output.js

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
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
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
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
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
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./fs */ 1);
/* harmony import */ var _fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _reexport_commonjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./reexport-commonjs */ 2);
/* harmony import */ var _example2__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./example2 */ 3);
/* harmony import */ var _example2__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_example2__WEBPACK_IMPORTED_MODULE_2__);
// harmony module

// import from CommonJs module



_fs__WEBPACK_IMPORTED_MODULE_0___default.a.readFile("file");
Object(_fs__WEBPACK_IMPORTED_MODULE_0__["readFile"])("file");
_fs__WEBPACK_IMPORTED_MODULE_0__["readFile"]("file");

// import from harmony module

Object(_reexport_commonjs__WEBPACK_IMPORTED_MODULE_1__["readFile"])("file");

// import a CommonJs module for sideeffects



/***/ }),
/* 1 */
/*!***************!*\
  !*** ./fs.js ***!
  \***************/
/*! no static exports found */
/***/ (function(module, exports) {

// an example CommonJs module
// content is omitted for brevity
exports.readFile = function() {};
// using module.exports would be equivalent,
// webpack doesn't care which syntax is used

// AMD modules are also possible and equivalent to CommonJs modules


/***/ }),
/* 2 */
/*!******************************!*\
  !*** ./reexport-commonjs.js ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./fs */ 1);
/* harmony import */ var _fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony reexport (unknown) */ for(var __WEBPACK_IMPORT_KEY__ in _fs__WEBPACK_IMPORTED_MODULE_0__) if(__WEBPACK_IMPORT_KEY__ !== 'default') (function(key) { __webpack_require__.d(__webpack_exports__, key, function() { return _fs__WEBPACK_IMPORTED_MODULE_0__[key]; }) }(__WEBPACK_IMPORT_KEY__));
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
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "named", function() { return named; });
// just some exports
/* harmony default export */ __webpack_exports__["default"] = ("default");
var named = "named";


/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
    Asset      Size  Chunks             Chunk Names
output.js  6.12 KiB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 1.16 KiB [entry] [rendered]
    > .\example.js main
 [0] ./example.js 389 bytes {0} [built]
     [no exports]
     single entry .\example.js  main
 [1] ./fs.js 257 bytes {0} [built]
     harmony side effect evaluation ./fs [0] ./example.js 4:0-22
     harmony side effect evaluation ./fs [0] ./example.js 5:0-32
     harmony side effect evaluation ./fs [0] ./example.js 6:0-28
     harmony import specifier ./fs [0] ./example.js 7:0-2
     harmony import specifier ./fs [0] ./example.js 8:0-8
     harmony import specifier ./fs [0] ./example.js 9:0-12
     harmony side effect evaluation ./fs [2] ./reexport-commonjs.js 2:0-21
     harmony export imported specifier ./fs [2] ./reexport-commonjs.js 2:0-21
 [2] ./reexport-commonjs.js 308 bytes {0} [built]
     harmony side effect evaluation ./reexport-commonjs [0] ./example.js 12:0-60
     harmony import specifier ./reexport-commonjs [0] ./example.js 13:0-9
 [3] ./example2.js 159 bytes {0} [built]
     harmony side effect evaluation ./example2 [0] ./example.js 16:0-20
 [4] ./harmony.js 78 bytes {0} [built]
     [exports: default, named]
     cjs require ./harmony [3] ./example2.js 4:13-33
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
    Asset       Size  Chunks             Chunk Names
output.js  993 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 1.16 KiB [entry] [rendered]
    > .\example.js main
 [0] ./fs.js 257 bytes {0} [built]
     [only some exports used: default, readFile]
     harmony side effect evaluation ./fs [1] ./reexport-commonjs.js 2:0-21
     harmony export imported specifier ./fs [1] ./reexport-commonjs.js 2:0-21
     harmony side effect evaluation ./fs [4] ./example.js 4:0-22
     harmony side effect evaluation ./fs [4] ./example.js 5:0-32
     harmony side effect evaluation ./fs [4] ./example.js 6:0-28
     harmony import specifier ./fs [4] ./example.js 7:0-2
     harmony import specifier ./fs [4] ./example.js 8:0-8
     harmony import specifier ./fs [4] ./example.js 9:0-12
 [1] ./reexport-commonjs.js 308 bytes {0} [built]
     [only some exports used: readFile]
     harmony side effect evaluation ./reexport-commonjs [4] ./example.js 12:0-60
     harmony import specifier ./reexport-commonjs [4] ./example.js 13:0-9
 [2] ./harmony.js 78 bytes {0} [built]
     [exports: default, named]
     cjs require ./harmony [3] ./example2.js 4:13-33
 [3] ./example2.js 159 bytes {0} [built]
     [no exports used]
     harmony side effect evaluation ./example2 [4] ./example.js 16:0-20
 [4] ./example.js 389 bytes {0} [built]
     [no exports]
     single entry .\example.js  main
```