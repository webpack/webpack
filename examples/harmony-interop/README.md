# example.js

```javascript
// harmony module

// import from CommonJS module
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
/* 0 */,
/* 1 */
/*!***************!*\
  !*** ./fs.js ***!
  \***************/
/*! default exports */
/*! export readFile [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
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
/*! namespace exports */
/*! export readFile [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "readFile": () => /* reexport safe */ _fs__WEBPACK_IMPORTED_MODULE_0__.readFile
/* harmony export */ });
/* harmony import */ var _fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./fs */ 1);
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
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [unused] */
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
/*! namespace exports */
/*! export default [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! export named [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
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
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
(() => {
"use strict";
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.* */
/* harmony import */ var _fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./fs */ 1);
/* harmony import */ var _reexport_commonjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./reexport-commonjs */ 2);
/* harmony import */ var _example2__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./example2 */ 3);
/* harmony import */ var _example2__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_example2__WEBPACK_IMPORTED_MODULE_2__);
// harmony module

// import from CommonJS module



_fs__WEBPACK_IMPORTED_MODULE_0__.readFile("file");
(0,_fs__WEBPACK_IMPORTED_MODULE_0__.readFile)("file");
_fs__WEBPACK_IMPORTED_MODULE_0__.readFile("file");

// import from harmony module

(0,_reexport_commonjs__WEBPACK_IMPORTED_MODULE_1__.readFile)("file");

// import a CommonJs module for side effects


})();

/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
    Asset      Size
output.js  6.79 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 1.13 KiB (javascript) 931 bytes (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 374 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./example2.js 152 bytes [built]
     [no exports used]
     harmony side effect evaluation ./example2 ./example.js 16:0-20
 ./fs.js 257 bytes [built]
     [exports: readFile]
     [all exports used]
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
     [exports: readFile]
     [all exports used]
     harmony side effect evaluation ./reexport-commonjs ./example.js 12:0-60
     harmony import specifier ./reexport-commonjs ./example.js 13:0-9
     + 4 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
    Asset       Size
output.js  724 bytes  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 1.14 KiB (javascript) 668 bytes (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js + 1 modules 685 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./example2.js 152 bytes [built]
     [no exports used]
     harmony side effect evaluation ./example2 ./example.js + 1 modules ./example.js 16:0-20
 ./fs.js 257 bytes [built]
     [exports: readFile]
     [all exports used]
     harmony side effect evaluation ./fs ./example.js + 1 modules ./example.js 4:0-22
     harmony side effect evaluation ./fs ./example.js + 1 modules ./example.js 5:0-32
     harmony side effect evaluation ./fs ./example.js + 1 modules ./example.js 6:0-28
     harmony import specifier ./fs ./example.js + 1 modules ./example.js 7:0-11
     harmony import specifier ./fs ./example.js + 1 modules ./example.js 8:0-8
     harmony import specifier ./fs ./example.js + 1 modules ./example.js 9:0-12
     harmony side effect evaluation ./fs ./example.js + 1 modules ./reexport-commonjs.js 2:0-21
     harmony export imported specifier ./fs ./example.js + 1 modules ./reexport-commonjs.js 2:0-21
 ./harmony.js 75 bytes [built]
     [exports: default, named]
     cjs require ./harmony ./example2.js 4:13-33
     + 3 hidden chunk modules
```
