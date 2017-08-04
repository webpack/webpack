This example shows how the `pure-module` flag for library authors works.

The example contains a large library, `big-module`. `big-module` contains multiple child modules: `a`, `b` and `c`. The exports from the child modules are re-exported in the entry module (`index.js`) of the library. A consumer uses **some** of the exports, importing them from the library via `import { a, b } from "big-module"`. According to the EcmaScript spec, all child modules _must_ be evaluated because they could contain side effects.

The `"pure-module": true` flag in `big-module`'s `package.json` indicates that the package's modules have no side effects (on evaluation) and only expose exports. This allows tools like webpack to optimize re-exports. In the case `import { a, b } from "big-module-pure"` is rewritten to `import { a } from "big-module-pure/a"; import { b } from "big-module-pure/b"`.

The example contains two variants of `big-module`. `big-module` has no pure-module flag and `big-module-pure` has the pure-module flag. The example client imports `a` and `b` from each of the variants.

After being built by webpack, the output bundle contains `index.js` `a.js` `b.js` `c.js` from `big-module`, but only `a.js` and `b.js` from `big-module-pure`.

Advantages:

* Smaller bundles
* Faster bootup

# example.js

``` javascript
import { a, b } from "big-module";
import { a as pa, b as pb } from "big-module-pure";

console.log(
	a,
	b,
	pa,
	pb
);
```

# node_modules/big-module/package.json

``` javascript
{
  "name": "big-module"
}
```

# node_modules/big-module-pure/package.json

``` javascript
{
  "name": "big-module-pure",
  "pure-module": true
}
```

# node_modules/big-module(-pure)/index.js

``` javascript
export { a } from "./a";
export { b } from "./b";
export { c } from "./c";
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
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!******************************************!*\
  !*** ./node_modules/big-module/index.js ***!
  \******************************************/
/*! exports provided: a, b, c */
/*! exports used: a, b */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./a */1);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "a", function() { return _a__WEBPACK_IMPORTED_MODULE_0__["a"]; });

/* harmony import */ var _b__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./b */2);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "b", function() { return _b__WEBPACK_IMPORTED_MODULE_1__["a"]; });

/* harmony import */ var _c__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./c */3);





/***/ }),
/* 1 */
/*!**************************************!*\
  !*** ./node_modules/big-module/a.js ***!
  \**************************************/
/*! exports provided: a */
/*! exports used: a */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return a; });
const a = "a";


/***/ }),
/* 2 */
/*!**************************************!*\
  !*** ./node_modules/big-module/b.js ***!
  \**************************************/
/*! exports provided: b */
/*! exports used: b */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return b; });
const b = "b";


/***/ }),
/* 3 */
/*!**************************************!*\
  !*** ./node_modules/big-module/c.js ***!
  \**************************************/
/*! exports provided: c */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export c */
const c = "c";


/***/ }),
/* 4 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports provided:  */
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var big_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! big-module */0);
/* harmony import */ var big_module_pure__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! big-module-pure */5);
/* harmony import */ var big_module_pure__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! big-module-pure */6);



console.log(
	big_module__WEBPACK_IMPORTED_MODULE_0__["a"],
	big_module__WEBPACK_IMPORTED_MODULE_0__["b"],
	big_module_pure__WEBPACK_IMPORTED_MODULE_1__["a"],
	big_module_pure__WEBPACK_IMPORTED_MODULE_2__["a" /* b */]
);


/***/ }),
/* 5 */
/*!*******************************************!*\
  !*** ./node_modules/big-module-pure/a.js ***!
  \*******************************************/
/*! exports provided: a */
/*! exports used: a */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return a; });
const a = "a";


/***/ }),
/* 6 */
/*!*******************************************!*\
  !*** ./node_modules/big-module-pure/b.js ***!
  \*******************************************/
/*! exports provided: b */
/*! exports used: b */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return b; });
const b = "b";


/***/ })
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 5102bad4505037b2ceee
Version: webpack 3.4.1
    Asset     Size  Chunks             Chunk Names
output.js  6.13 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 323 bytes [entry] [rendered]
    > main [4] ./example.js 
    [4] ./example.js 130 bytes {0} [built]
        [no exports]
     + 6 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: 5102bad4505037b2ceee
Version: webpack 3.4.1
    Asset     Size  Chunks             Chunk Names
output.js  1.05 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 323 bytes [entry] [rendered]
    > main [4] ./example.js 
    [4] ./example.js 130 bytes {0} [built]
        [no exports]
     + 6 hidden modules
```
