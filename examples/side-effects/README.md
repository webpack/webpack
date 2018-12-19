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
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
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
/*! no exports provided */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__ */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

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
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__, __webpack_require__.d */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "a", function() { return _a__WEBPACK_IMPORTED_MODULE_0__["a"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "b", function() { return _b__WEBPACK_IMPORTED_MODULE_1__["b"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "c", function() { return _c__WEBPACK_IMPORTED_MODULE_2__["c"]; });
/* harmony import */ var _a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./a */ 2);
/* harmony import */ var _b__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./b */ 3);
/* harmony import */ var _c__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./c */ 4);





/***/ }),
/* 2 */
/*!**************************************!*\
  !*** ./node_modules/big-module/a.js ***!
  \**************************************/
/*! exports provided: a */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__ */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

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
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__ */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

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
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__ */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

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
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__, __webpack_require__.d */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "a", function() { return _a__WEBPACK_IMPORTED_MODULE_0__["a"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "b", function() { return _b__WEBPACK_IMPORTED_MODULE_1__["b"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "c", function() { return _c__WEBPACK_IMPORTED_MODULE_2__["c"]; });
/* harmony import */ var _a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./a */ 6);
/* harmony import */ var _b__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./b */ 7);
/* harmony import */ var _c__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./c */ 8);





/***/ }),
/* 6 */
/*!************************************************!*\
  !*** ./node_modules/big-module-with-flag/a.js ***!
  \************************************************/
/*! exports provided: a */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__ */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

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
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__ */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

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
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__ */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return c; });
const c = "c";


/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
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
/******/ 	/* webpack/runtime/define property getter */
/******/ 	!function() {
/******/ 		// define getter function for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = function(exports, name, getter) {
/******/ 			if(!hasOwnProperty.call(exports, name)) {
/******/ 				Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset      Size  Chunks             Chunk Names
output.js  8.62 KiB     {0}  [emitted]  main
Entrypoint main = output.js
chunk {0} output.js (main) 422 bytes (javascript) 560 bytes (runtime) [entry] [rendered]
    > .\example.js main
 [0] ./example.js 140 bytes {0} [built]
     [no exports]
     [used exports unknown]
     entry .\example.js main
 [1] ./node_modules/big-module/index.js 75 bytes {0} [built]
     [exports: a, b, c]
     [used exports unknown]
     harmony side effect evaluation big-module [0] ./example.js 1:0-46
     harmony import specifier big-module [0] ./example.js 5:1-3
     harmony import specifier big-module [0] ./example.js 6:1-3
 [2] ./node_modules/big-module/a.js 22 bytes {0} [built]
     [exports: a]
     [used exports unknown]
     harmony side effect evaluation ./a [1] ./node_modules/big-module/index.js 1:0-24
     harmony export imported specifier ./a [1] ./node_modules/big-module/index.js 1:0-24
 [3] ./node_modules/big-module/b.js 22 bytes {0} [built]
     [exports: b]
     [used exports unknown]
     harmony side effect evaluation ./b [1] ./node_modules/big-module/index.js 2:0-24
     harmony export imported specifier ./b [1] ./node_modules/big-module/index.js 2:0-24
 [4] ./node_modules/big-module/c.js 22 bytes {0} [built]
     [exports: c]
     [used exports unknown]
     harmony side effect evaluation ./c [1] ./node_modules/big-module/index.js 3:0-24
     harmony export imported specifier ./c [1] ./node_modules/big-module/index.js 3:0-24
 [5] ./node_modules/big-module-with-flag/index.js 75 bytes {0} [built]
     [exports: a, b, c]
     [used exports unknown]
     harmony side effect evaluation big-module-with-flag [0] ./example.js 2:0-56
     harmony import specifier big-module-with-flag [0] ./example.js 7:1-3
     harmony import specifier big-module-with-flag [0] ./example.js 8:1-3
 [6] ./node_modules/big-module-with-flag/a.js 22 bytes {0} [built]
     [exports: a]
     [used exports unknown]
     harmony side effect evaluation ./a [5] ./node_modules/big-module-with-flag/index.js 1:0-24
     harmony export imported specifier ./a [5] ./node_modules/big-module-with-flag/index.js 1:0-24
 [7] ./node_modules/big-module-with-flag/b.js 22 bytes {0} [built]
     [exports: b]
     [used exports unknown]
     harmony side effect evaluation ./b [5] ./node_modules/big-module-with-flag/index.js 2:0-24
     harmony export imported specifier ./b [5] ./node_modules/big-module-with-flag/index.js 2:0-24
 [8] ./node_modules/big-module-with-flag/c.js 22 bytes {0} [built]
     [exports: c]
     [used exports unknown]
     harmony side effect evaluation ./c [5] ./node_modules/big-module-with-flag/index.js 3:0-24
     harmony export imported specifier ./c [5] ./node_modules/big-module-with-flag/index.js 3:0-24
     + 2 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset       Size  Chunks             Chunk Names
output.js  566 bytes   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 325 bytes (javascript) 560 bytes (runtime) [entry] [rendered]
    > .\example.js main
 [56] ./example.js + 6 modules 325 bytes {404} [built]
      [no exports]
      harmony side effect evaluation ./a ./node_modules/big-module-with-flag/index.js 1:0-24
      harmony export imported specifier ./a ./node_modules/big-module-with-flag/index.js 1:0-24
      harmony side effect evaluation ./b ./node_modules/big-module-with-flag/index.js 2:0-24
      harmony export imported specifier ./b ./node_modules/big-module-with-flag/index.js 2:0-24
      entry .\example.js main
     + 2 hidden chunk modules
```
