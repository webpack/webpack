This example demonstrates how webpack tracks the usage of ES6 imports and exports. Only used exports are emitted to the resulting bundle. The minimizing step then removes the declarations because they are unused.

Excluding unused exports from bundles is known as "[tree-shaking](http://www.2ality.com/2015/12/webpack-tree-shaking.html)".

In this example, only `add` and `multiply` in `./math.js` are used by the app. `list` is unused and is not included in the minimized bundle (Look for `Array.from` in the minimized bundle).

In addition to that, `library.js` simulates an entry point to a big library. `library.js` re-exports multiple identifiers from submodules. Often big parts of that are unused, like `abc.js`. Note how the usage information flows from `example.js` through `library.js` into `abc.js` and all declarations in `abc.js` are not included in the minimized bundle (Look for `console.log("a")` in the minimized bundle).

# example.js

```javascript
import { add } from './math';
import * as library from "./library";

add(1, 2);
library.reexportedMultiply(1, 2);
```

# math.js

```javascript
export function add() {
	var sum = 0, i = 0, args = arguments, l = args.length;
	while (i < l) {
		sum += args[i++];
	}
	return sum;
}

export function multiply() {
	var product = 1, i = 0, args = arguments, l = args.length;
	while (i < l) {
		product *= args[i++];
	}
	return product;
}

export function list() {
	return Array.from(arguments);
}
```

# library.js

```javascript
export { a, b, c } from "./abc";
export { add as reexportedAdd, multiply as reexportedMultiply } from "./math";
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./math */ 1);
/* harmony import */ var _library__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./library */ 2);



(0,_math__WEBPACK_IMPORTED_MODULE_0__.add)(1, 2);
_library__WEBPACK_IMPORTED_MODULE_1__.reexportedMultiply(1, 2);


/***/ }),
/* 1 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! export add [provided] [no usage info] [missing usage info prevents renaming] */
/*! export list [provided] [no usage info] [missing usage info prevents renaming] */
/*! export multiply [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": () => /* binding */ add,
/* harmony export */   "multiply": () => /* binding */ multiply,
/* harmony export */   "list": () => /* binding */ list
/* harmony export */ });
function add() {
	var sum = 0, i = 0, args = arguments, l = args.length;
	while (i < l) {
		sum += args[i++];
	}
	return sum;
}

function multiply() {
	var product = 1, i = 0, args = arguments, l = args.length;
	while (i < l) {
		product *= args[i++];
	}
	return product;
}

function list() {
	return Array.from(arguments);
}


/***/ }),
/* 2 */
/*!********************!*\
  !*** ./library.js ***!
  \********************/
/*! export a [provided] [no usage info] [missing usage info prevents renaming] */
/*! export b [provided] [no usage info] [missing usage info prevents renaming] */
/*! export c [provided] [no usage info] [missing usage info prevents renaming] */
/*! export reexportedAdd [provided] [no usage info] [missing usage info prevents renaming] */
/*! export reexportedMultiply [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": () => /* reexport safe */ _abc__WEBPACK_IMPORTED_MODULE_0__.a,
/* harmony export */   "b": () => /* reexport safe */ _abc__WEBPACK_IMPORTED_MODULE_0__.b,
/* harmony export */   "c": () => /* reexport safe */ _abc__WEBPACK_IMPORTED_MODULE_0__.c,
/* harmony export */   "reexportedAdd": () => /* reexport safe */ _math__WEBPACK_IMPORTED_MODULE_1__.add,
/* harmony export */   "reexportedMultiply": () => /* reexport safe */ _math__WEBPACK_IMPORTED_MODULE_1__.multiply
/* harmony export */ });
/* harmony import */ var _abc__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./abc */ 3);
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./math */ 1);



/***/ }),
/* 3 */
/*!****************!*\
  !*** ./abc.js ***!
  \****************/
/*! export a [provided] [no usage info] [missing usage info prevents renaming] */
/*! export b [provided] [no usage info] [missing usage info prevents renaming] */
/*! export c [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": () => /* binding */ a,
/* harmony export */   "b": () => /* binding */ b,
/* harmony export */   "c": () => /* binding */ c
/* harmony export */ });
function a() { console.log("a"); }
function b() { console.log("b"); }
function c() { console.log("c"); }


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

# dist/output.js

```javascript
(()=>{"use strict";var r={169:(r,t,e)=>{},345:(r,t,e)=>{e.d(t,{H:()=>n.jj});e(169);var n=e(451)},451:(r,t,e)=>{function n(){for(var r=0,t=0,e=arguments,n=e.length;t<n;)r+=e[t++];return r}function o(){for(var r=1,t=0,e=arguments,n=e.length;t<n;)r*=e[t++];return r}e.d(t,{Kn:()=>n,jj:()=>o})}},t={};function e(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return r[n](o,o.exports,e),o.l=!0,o.exports}!function(){var r=Object.prototype.hasOwnProperty;e.d=(t,e)=>{for(var n in e)r.call(e,n)&&!r.call(t,n)&&Object.defineProperty(t,n,{enumerable:!0,get:e[n]})}}(),function(){var r=e(451),t=e(345);(0,r.Kn)(1,2),t.H(1,2)}()})();
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset     Size
output.js  6.8 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 698 bytes (javascript) 632 bytes (runtime) [entry] [rendered]
    > ./example.js main
 ./abc.js 126 bytes [built]
     [exports: a, b, c]
     [used exports unknown]
     harmony side effect evaluation ./abc ./library.js 1:0-32
     harmony export imported specifier ./abc ./library.js 1:0-32
     harmony export imported specifier ./abc ./library.js 1:0-32
     harmony export imported specifier ./abc ./library.js 1:0-32
 ./example.js 114 bytes [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 ./library.js 111 bytes [built]
     [exports: a, b, c, reexportedAdd, reexportedMultiply]
     [used exports unknown]
     harmony side effect evaluation ./library ./example.js 2:0-37
     harmony import specifier ./library ./example.js 5:0-26
 ./math.js 347 bytes [built]
     [exports: add, list, multiply]
     [used exports unknown]
     harmony side effect evaluation ./math ./example.js 1:0-29
     harmony import specifier ./math ./example.js 4:0-3
     harmony side effect evaluation ./math ./library.js 2:0-78
     harmony export imported specifier ./math ./library.js 2:0-78
     harmony export imported specifier ./math ./library.js 2:0-78
     + 2 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset       Size
output.js  639 bytes  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 698 bytes (javascript) 358 bytes (runtime) [entry] [rendered]
    > ./example.js main
 ./abc.js 126 bytes [built]
     [exports: a, b, c]
     [no exports used]
     harmony side effect evaluation ./abc ./library.js 1:0-32
     [inactive] harmony export imported specifier ./abc ./library.js 1:0-32
     [inactive] harmony export imported specifier ./abc ./library.js 1:0-32
     [inactive] harmony export imported specifier ./abc ./library.js 1:0-32
 ./example.js 114 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./library.js 111 bytes [built]
     [exports: a, b, c, reexportedAdd, reexportedMultiply]
     [only some exports used: reexportedMultiply]
     harmony side effect evaluation ./library ./example.js 2:0-37
     harmony import specifier ./library ./example.js 5:0-26
 ./math.js 347 bytes [built]
     [exports: add, list, multiply]
     [only some exports used: add, multiply]
     harmony side effect evaluation ./math ./example.js 1:0-29
     harmony import specifier ./math ./example.js 4:0-3
     harmony side effect evaluation ./math ./library.js 2:0-78
     [inactive] harmony export imported specifier ./math ./library.js 2:0-78
     harmony export imported specifier ./math ./library.js 2:0-78
     + 1 hidden chunk module
```
