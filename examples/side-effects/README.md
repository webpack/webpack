This example shows how the `sideEffects` flag for library authors works.

The example contains a large library, `big-module`. `big-module` contains multiple child modules: `a`, `b` and `c`. The exports from the child modules are re-exported in the entry module (`index.js`) of the library. A consumer uses **some** of the exports, importing them from the library via `import { a, b } from "big-module"`. According to the EcmaScript spec, all child modules _must_ be evaluated because they could contain side effects.

The `"sideEffects": false` flag in `big-module`'s `package.json` indicates that the package's modules have no side effects (on evaluation) and only expose exports. This allows tools like webpack to optimize re-exports. In the case `import { a, b } from "big-module-with-flag"` is rewritten to `import { a } from "big-module-with-flag/a"; import { b } from "big-module-with-flag/b"`.

The example contains two variants of `big-module`. `big-module` has no `sideEffects` flag and `big-module-with-flag` has the `sideEffects` flag. The example client imports `a` and `b` from each of the variants.

After being built by webpack, the output bundle contains `index.js` `a.js` `b.js` `c.js` from `big-module`, but only `a.js` and `b.js` from `big-module-with-flag`.

Advantages:

* Smaller bundles
* Faster bootup

# example.js

``` javascript
import { a as a1, b as b1 } from "big-module";
import { a as a2, b as b2 } from "big-module-with-flag";

console.log(
	a1,
	b1,
	a2,
	b2
);
```

# node_modules/big-module/package.json

``` javascript
{
  "name": "big-module"
}
```

# node_modules/big-module-with-flag/package.json

``` javascript
{
  "name": "big-module-with-flag",
  "sideEffects": false
}
```

# node_modules/big-module(-with-flag)/index.js

``` javascript
export { a } from "./a";
export { b } from "./b";
export { c } from "./c";
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
/* harmony import */ var big_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! big-module */ 1);
/* harmony import */ var big_module_with_flag__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! big-module-with-flag */ 5);



console.log(
	big_module__WEBPACK_IMPORTED_MODULE_0__["a"],
	big_module__WEBPACK_IMPORTED_MODULE_0__["b"],
	big_module_with_flag__WEBPACK_IMPORTED_MODULE_1__["a"],
	big_module_with_flag__WEBPACK_IMPORTED_MODULE_1__["b"]
);


/***/ }),
/* 1 */
/*!******************************************!*\
  !*** ./node_modules/big-module/index.js ***!
  \******************************************/
/*! exports provided: a, b, c */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./a */ 2);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "a", function() { return _a__WEBPACK_IMPORTED_MODULE_0__["a"]; });

/* harmony import */ var _b__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./b */ 3);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "b", function() { return _b__WEBPACK_IMPORTED_MODULE_1__["b"]; });

/* harmony import */ var _c__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./c */ 4);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "c", function() { return _c__WEBPACK_IMPORTED_MODULE_2__["c"]; });






/***/ }),
/* 2 */
/*!**************************************!*\
  !*** ./node_modules/big-module/a.js ***!
  \**************************************/
/*! exports provided: a */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return a; });
const a = "a";


/***/ }),
/* 3 */
/*!**************************************!*\
  !*** ./node_modules/big-module/b.js ***!
  \**************************************/
/*! exports provided: b */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return b; });
const b = "b";


/***/ }),
/* 4 */
/*!**************************************!*\
  !*** ./node_modules/big-module/c.js ***!
  \**************************************/
/*! exports provided: c */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return c; });
const c = "c";


/***/ }),
/* 5 */
/*!****************************************************!*\
  !*** ./node_modules/big-module-with-flag/index.js ***!
  \****************************************************/
/*! exports provided: a, b, c */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./a */ 6);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "a", function() { return _a__WEBPACK_IMPORTED_MODULE_0__["a"]; });

/* harmony import */ var _b__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./b */ 7);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "b", function() { return _b__WEBPACK_IMPORTED_MODULE_1__["b"]; });

/* harmony import */ var _c__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./c */ 8);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "c", function() { return _c__WEBPACK_IMPORTED_MODULE_2__["c"]; });






/***/ }),
/* 6 */
/*!************************************************!*\
  !*** ./node_modules/big-module-with-flag/a.js ***!
  \************************************************/
/*! exports provided: a */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return a; });
const a = "a";


/***/ }),
/* 7 */
/*!************************************************!*\
  !*** ./node_modules/big-module-with-flag/b.js ***!
  \************************************************/
/*! exports provided: b */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return b; });
const b = "b";


/***/ }),
/* 8 */
/*!************************************************!*\
  !*** ./node_modules/big-module-with-flag/c.js ***!
  \************************************************/
/*! exports provided: c */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return c; });
const c = "c";


/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
    Asset      Size  Chunks             Chunk Names
output.js  7.89 KiB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 422 bytes [entry] [rendered]
    > .\example.js main
 [0] ./example.js 140 bytes {0} [built]
     [no exports]
     single entry .\example.js  main
     + 8 hidden modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
    Asset       Size  Chunks             Chunk Names
output.js  600 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 325 bytes [entry] [rendered]
    > .\example.js main
 [0] ./example.js + 6 modules 325 bytes {0} [built]
     [no exports]
     single entry .\example.js  main
     | ./example.js 140 bytes [built]
     |     [no exports]
     |     single entry .\example.js  main
     |     + 6 hidden modules
```
