# example.js

```javascript
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

// import a CommonJs module for side effects
import "./example2";
```

# fs.js

```javascript
// an example CommonJs module
// content is omitted for brevity
exports.readFile = function() {};
// using module.exports would be equivalent,
// webpack doesn't care which syntax is used

// AMD modules are also possible and equivalent to CommonJs modules
```

# reexport-commonjs.js

```javascript
// reexport a CommonJs module
export * from "./fs";
// Note that the default export doesn't reexport via export *
// (this is not interop-specific, it applies for every export *)

// Note: reexporting a CommonJs module is a special case,
// because in this module we have no information about exports
```

# example2.js

```javascript
// CommonJs module

// require a harmony module
var module = require("./harmony");

var defaultExport = module.default;
var namedExport = module.named;
```

# harmony.js

```javascript
// just some exports
export default "default";
export var named = "named";
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./fs */ 1);
/* harmony import */ var _fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _reexport_commonjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./reexport-commonjs */ 2);
/* harmony import */ var _example2__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./example2 */ 3);
/* harmony import */ var _example2__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_example2__WEBPACK_IMPORTED_MODULE_2__);
// harmony module

// import from CommonJs module



_fs__WEBPACK_IMPORTED_MODULE_0___default().readFile("file");
(0,_fs__WEBPACK_IMPORTED_MODULE_0__.readFile)("file");
_fs__WEBPACK_IMPORTED_MODULE_0__.readFile("file");

// import from harmony module

(0,_reexport_commonjs__WEBPACK_IMPORTED_MODULE_1__.readFile)("file");

// import a CommonJs module for side effects



/***/ }),
/* 1 */
/*!***************!*\
  !*** ./fs.js ***!
  \***************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

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
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./fs */ 1);
/* harmony import */ var _fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony reexport (unknown) */ var __WEBPACK_REEXPORT_OBJECT__ = {};
/* harmony reexport (unknown) */ for(const __WEBPACK_IMPORT_KEY__ in _fs__WEBPACK_IMPORTED_MODULE_0__) if(__WEBPACK_IMPORT_KEY__ !== "default") __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = () => _fs__WEBPACK_IMPORTED_MODULE_0__[__WEBPACK_IMPORT_KEY__]
/* harmony reexport (unknown) */ __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
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
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__ */
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

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
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! export named [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => __WEBPACK_DEFAULT_EXPORT__,
/* harmony export */   "named": () => /* binding */ named
/* harmony export */ });
// just some exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("default");
var named = "named";


/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(hasOwnProperty.call(definition, key) && !hasOwnProperty.call(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__(0);
/******/ 	// This entry module used 'exports' so it can't be inlined
/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset      Size
output.js  7.42 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 1.13 KiB (javascript) 895 bytes (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 373 bytes [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 ./example2.js 152 bytes [built]
     [used exports unknown]
     harmony side effect evaluation ./example2 ./example.js 16:0-20
 ./fs.js 257 bytes [built]
     [used exports unknown]
     harmony side effect evaluation ./fs ./example.js 4:0-22
     harmony side effect evaluation ./fs ./example.js 5:0-32
     harmony side effect evaluation ./fs ./example.js 6:0-28
     harmony import specifier ./fs ./example.js 7:0-11
     harmony import specifier ./fs ./example.js 8:0-8
     harmony import specifier ./fs ./example.js 9:0-12
     harmony side effect evaluation ./fs ./reexport-commonjs.js 2:0-21
     harmony export imported specifier ./fs ./reexport-commonjs.js 2:0-21
 ./harmony.js 75 bytes [built]
     [exports: default, named]
     [used exports unknown]
     cjs require ./harmony ./example2.js 4:13-33
 ./reexport-commonjs.js 301 bytes [built]
     [used exports unknown]
     harmony side effect evaluation ./reexport-commonjs ./example.js 12:0-60
     harmony import specifier ./reexport-commonjs ./example.js 13:0-9
     + 3 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset        Size
output.js  1020 bytes  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 1.13 KiB (javascript) 895 bytes (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 373 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./example2.js 152 bytes [built]
     [no exports used]
     harmony side effect evaluation ./example2 ./example.js 16:0-20
 ./fs.js 257 bytes [built]
     [only some exports used: default, readFile]
     harmony side effect evaluation ./fs ./example.js 4:0-22
     harmony side effect evaluation ./fs ./example.js 5:0-32
     harmony side effect evaluation ./fs ./example.js 6:0-28
     harmony import specifier ./fs ./example.js 7:0-11
     harmony import specifier ./fs ./example.js 8:0-8
     harmony import specifier ./fs ./example.js 9:0-12
     harmony side effect evaluation ./fs ./reexport-commonjs.js 2:0-21
     harmony export imported specifier ./fs ./reexport-commonjs.js 2:0-21
 ./harmony.js 75 bytes [built]
     [exports: default, named]
     cjs require ./harmony ./example2.js 4:13-33
 ./reexport-commonjs.js 301 bytes [built]
     [only some exports used: readFile]
     harmony side effect evaluation ./reexport-commonjs ./example.js 12:0-60
     harmony import specifier ./reexport-commonjs ./example.js 13:0-9
     + 3 hidden chunk modules
```
