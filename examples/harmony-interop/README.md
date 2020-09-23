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
/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
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



/***/ }),
/* 1 */
/*!***************!*\
  !*** ./fs.js ***!
  \***************/
/*! default exports */
/*! export readFile [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ (function(__unused_webpack_module, exports) {

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
/*! export readFile [provided] [no usage info] [missing usage info prevents renaming] -> ./fs.js .readFile */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.* */
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "readFile": function() { return /* reexport safe */ _fs__WEBPACK_IMPORTED_MODULE_0__.readFile; }
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
/*! runtime requirements: __webpack_require__ */
/***/ (function(__unused_webpack_module, __unused_webpack_exports, __webpack_require__) {

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
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! export named [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "named": function() { return /* binding */ named; }
/* harmony export */ });
// just some exports
/* harmony default export */ __webpack_exports__["default"] = ("default");
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
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
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
asset output.js 7.26 KiB [emitted] (name: main)
chunk output.js (main) 1.13 KiB (javascript) 997 bytes (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 785 bytes [dependent] 4 modules
  runtime modules 997 bytes 4 modules
  ./example.js 374 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack 5.0.0-rc.0 compiled successfully
```

## Production mode

```
asset output.js 783 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 1.13 KiB (javascript) 695 bytes (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 484 bytes [dependent] 3 modules
  runtime modules 695 bytes 3 modules
  ./example.js + 1 modules 675 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack 5.0.0-rc.0 compiled successfully
```
