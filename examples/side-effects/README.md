This example shows how the `sideEffects` flag for library authors works.

The example contains a large library, `big-module`. `big-module` contains multiple child modules: `a`, `b` and `c`. The exports from the child modules are re-exported in the entry module (`index.js`) of the library. A consumer uses **some** of the exports, importing them from the library via `import { a, b } from "big-module"`. According to the EcmaScript spec, all child modules _must_ be evaluated because they could contain side effects.

The `"sideEffects": false` flag in `big-module`'s `package.json` indicates that the package's modules have no side effects (on evaluation) and only expose exports. This allows tools like webpack to optimize re-exports. In the case `import { a, b } from "big-module-with-flag"` is rewritten to `import { a } from "big-module-with-flag/a"; import { b } from "big-module-with-flag/b"`.

The example contains two variants of `big-module`. `big-module` has no `sideEffects` flag and `big-module-with-flag` has the `sideEffects` flag. The example client imports `a` and `b` from each of the variants.

After being built by webpack, the output bundle contains `index.js` `a.js` `b.js` `c.js` from `big-module`, but only `a.js` and `b.js` from `big-module-with-flag`.

Advantages:

- Smaller bundles
- Faster boot up

# example.js

```javascript
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

```javascript
{
  "name": "big-module"
}
```

# node_modules/big-module-with-flag/package.json

```javascript
{
  "name": "big-module-with-flag",
  "sideEffects": false
}
```

# node_modules/big-module(-with-flag)/index.js

```javascript
export { a } from "./a";
export { b } from "./b";
export { c } from "./c";

console.log("side effect");
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!******************************************!*\
  !*** ./node_modules/big-module/index.js ***!
  \******************************************/
/*! namespace exports */
/*! export a [provided] [no usage info] [missing usage info prevents renaming] -> ./node_modules/big-module/a.js .a */
/*! export b [provided] [no usage info] [missing usage info prevents renaming] -> ./node_modules/big-module/b.js .b */
/*! export c [provided] [no usage info] [missing usage info prevents renaming] -> ./node_modules/big-module/c.js .c */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.* */
/*! Statement (ExpressionStatement) with side effects in source code at 5:0-27 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": () => (/* reexport safe */ _a__WEBPACK_IMPORTED_MODULE_0__.a),
/* harmony export */   "b": () => (/* reexport safe */ _b__WEBPACK_IMPORTED_MODULE_1__.b),
/* harmony export */   "c": () => (/* reexport safe */ _c__WEBPACK_IMPORTED_MODULE_2__.c)
/* harmony export */ });
/* harmony import */ var _a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./a */ 2);
/* harmony import */ var _b__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./b */ 3);
/* harmony import */ var _c__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./c */ 4);




console.log("side effect");


/***/ }),
/* 2 */
/*!**************************************!*\
  !*** ./node_modules/big-module/a.js ***!
  \**************************************/
/*! namespace exports */
/*! export a [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": () => (/* binding */ a)
/* harmony export */ });
const a = "a";


/***/ }),
/* 3 */
/*!**************************************!*\
  !*** ./node_modules/big-module/b.js ***!
  \**************************************/
/*! namespace exports */
/*! export b [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "b": () => (/* binding */ b)
/* harmony export */ });
const b = "b";


/***/ }),
/* 4 */
/*!**************************************!*\
  !*** ./node_modules/big-module/c.js ***!
  \**************************************/
/*! namespace exports */
/*! export c [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "c": () => (/* binding */ c)
/* harmony export */ });
const c = "c";


/***/ }),
/* 5 */
/*!************************************************!*\
  !*** ./node_modules/big-module-with-flag/a.js ***!
  \************************************************/
/*! namespace exports */
/*! export a [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": () => (/* binding */ a)
/* harmony export */ });
const a = "a";


/***/ }),
/* 6 */
/*!************************************************!*\
  !*** ./node_modules/big-module-with-flag/b.js ***!
  \************************************************/
/*! namespace exports */
/*! export b [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "b": () => (/* binding */ b)
/* harmony export */ });
const b = "b";


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
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
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
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
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
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/*! Statement (ExpressionStatement) with side effects in source code at 4:0-9:2 */
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var big_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! big-module */ 1);
/* harmony import */ var big_module_with_flag__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! big-module-with-flag */ 5);
/* harmony import */ var big_module_with_flag__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! big-module-with-flag */ 6);



console.log(
	big_module__WEBPACK_IMPORTED_MODULE_0__.a,
	big_module__WEBPACK_IMPORTED_MODULE_0__.b,
	big_module_with_flag__WEBPACK_IMPORTED_MODULE_1__.a,
	big_module_with_flag__WEBPACK_IMPORTED_MODULE_2__.b
);

})();

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 8.55 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 354 bytes (javascript) 670 bytes (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 214 bytes [dependent] 6 modules
  runtime modules 670 bytes 3 modules
  ./example.js 140 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack 5.51.1 compiled successfully
```

## Production mode

```
asset output.js 79 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 332 bytes [entry] [rendered]
  > ./example.js main
  ./example.js + 5 modules 332 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack 5.51.1 compiled successfully
```
