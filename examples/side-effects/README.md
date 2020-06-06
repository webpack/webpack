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
/*! export a [provided] [used] [could be renamed] */
/*! export b [provided] [used] [could be renamed] */
/*! export c [provided] [unused] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": () => /* reexport safe */ _a__WEBPACK_IMPORTED_MODULE_0__.a,
/* harmony export */   "b": () => /* reexport safe */ _b__WEBPACK_IMPORTED_MODULE_1__.b
/* harmony export */ });
/* harmony import */ var _a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./a */ 2);
/* harmony import */ var _b__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./b */ 3);
/* harmony import */ var _c__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./c */ 4);





/***/ }),
/* 2 */
/*!**************************************!*\
  !*** ./node_modules/big-module/a.js ***!
  \**************************************/
/*! namespace exports */
/*! export a [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": () => /* binding */ a
/* harmony export */ });
const a = "a";


/***/ }),
/* 3 */
/*!**************************************!*\
  !*** ./node_modules/big-module/b.js ***!
  \**************************************/
/*! namespace exports */
/*! export b [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "b": () => /* binding */ b
/* harmony export */ });
const b = "b";


/***/ }),
/* 4 */
/*!**************************************!*\
  !*** ./node_modules/big-module/c.js ***!
  \**************************************/
/*! namespace exports */
/*! export c [provided] [unused] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony export c */
const c = "c";


/***/ }),
/* 5 */
/*!************************************************!*\
  !*** ./node_modules/big-module-with-flag/a.js ***!
  \************************************************/
/*! namespace exports */
/*! export a [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": () => /* binding */ a
/* harmony export */ });
const a = "a";


/***/ }),
/* 6 */
/*!************************************************!*\
  !*** ./node_modules/big-module-with-flag/b.js ***!
  \************************************************/
/*! namespace exports */
/*! export b [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "b": () => /* binding */ b
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
/************************************************************************/
```

</details>

``` js
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__ */
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
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
    Asset      Size
output.js  6.65 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 325 bytes (javascript) 394 bytes (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 140 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./node_modules/big-module-with-flag/a.js 22 bytes [built]
     [exports: a]
     [all exports used]
     harmony import specifier big-module-with-flag ./example.js 7:1-3 (skipped side-effect-free modules)
     [inactive] harmony side effect evaluation ./a ./node_modules/big-module-with-flag/index.js 1:0-24
     [inactive] harmony export imported specifier ./a ./node_modules/big-module-with-flag/index.js 1:0-24
 ./node_modules/big-module-with-flag/b.js 22 bytes [built]
     [exports: b]
     [all exports used]
     harmony import specifier big-module-with-flag ./example.js 8:1-3 (skipped side-effect-free modules)
     [inactive] harmony side effect evaluation ./b ./node_modules/big-module-with-flag/index.js 2:0-24
     [inactive] harmony export imported specifier ./b ./node_modules/big-module-with-flag/index.js 2:0-24
 ./node_modules/big-module/a.js 22 bytes [built]
     [exports: a]
     [all exports used]
     harmony side effect evaluation ./a ./node_modules/big-module/index.js 1:0-24
     harmony export imported specifier ./a ./node_modules/big-module/index.js 1:0-24
 ./node_modules/big-module/b.js 22 bytes [built]
     [exports: b]
     [all exports used]
     harmony side effect evaluation ./b ./node_modules/big-module/index.js 2:0-24
     harmony export imported specifier ./b ./node_modules/big-module/index.js 2:0-24
 ./node_modules/big-module/c.js 22 bytes [built]
     [exports: c]
     [no exports used]
     harmony side effect evaluation ./c ./node_modules/big-module/index.js 3:0-24
     [inactive] harmony export imported specifier ./c ./node_modules/big-module/index.js 3:0-24
 ./node_modules/big-module/index.js 75 bytes [built]
     [exports: a, b, c]
     [only some exports used: a, b]
     harmony side effect evaluation big-module ./example.js 1:0-46
     harmony import specifier big-module ./example.js 5:1-3
     harmony import specifier big-module ./example.js 6:1-3
     + 2 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
    Asset      Size
output.js  52 bytes  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 325 bytes [entry] [rendered]
    > ./example.js main
 ./example.js + 6 modules 325 bytes [built]
     [no exports]
     [no exports used]
     [inactive] harmony side effect evaluation ./a ./node_modules/big-module-with-flag/index.js 1:0-24
     [inactive] harmony export imported specifier ./a ./node_modules/big-module-with-flag/index.js 1:0-24
     [inactive] harmony side effect evaluation ./b ./node_modules/big-module-with-flag/index.js 2:0-24
     [inactive] harmony export imported specifier ./b ./node_modules/big-module-with-flag/index.js 2:0-24
     entry ./example.js main
```
