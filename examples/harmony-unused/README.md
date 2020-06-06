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
/* 0 */,
/* 1 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! namespace exports */
/*! export add [provided] [used] [could be renamed] */
/*! export list [provided] [unused] [could be renamed] */
/*! export multiply [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": () => /* binding */ add,
/* harmony export */   "multiply": () => /* binding */ multiply
/* harmony export */ });
/* unused harmony export list */
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
/*! namespace exports */
/*! export a [provided] [unused] [could be renamed] */
/*! export b [provided] [unused] [could be renamed] */
/*! export c [provided] [unused] [could be renamed] */
/*! export reexportedAdd [provided] [unused] [could be renamed] */
/*! export reexportedMultiply [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "reexportedMultiply": () => /* reexport safe */ _math__WEBPACK_IMPORTED_MODULE_1__.multiply
/* harmony export */ });
/* harmony import */ var _abc__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./abc */ 3);
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./math */ 1);



/***/ }),
/* 3 */
/*!****************!*\
  !*** ./abc.js ***!
  \****************/
/*! namespace exports */
/*! export a [provided] [unused] [could be renamed] */
/*! export b [provided] [unused] [could be renamed] */
/*! export c [provided] [unused] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony exports a, b, c */
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
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./math */ 1);
/* harmony import */ var _library__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./library */ 2);



(0,_math__WEBPACK_IMPORTED_MODULE_0__.add)(1, 2);
_library__WEBPACK_IMPORTED_MODULE_1__.reexportedMultiply(1, 2);

})();

/******/ })()
;
```

# dist/output.js

```javascript
(()=>{"use strict";var r,e,t={169:(r,e,t)=>{},345:(r,e,t)=>{t.d(e,{n:()=>n.Jp});t(169);var n=t(451)},451:(r,e,t)=>{function n(){for(var r=0,e=0,t=arguments,n=t.length;e<n;)r+=t[e++];return r}function o(){for(var r=1,e=0,t=arguments,n=t.length;e<n;)r*=t[e++];return r}t.d(e,{IH:()=>n,Jp:()=>o})}},n={};function o(r){if(n[r])return n[r].exports;var e=n[r]={exports:{}};return t[r](e,e.exports,o),e.exports}o.d=(r,e)=>{for(var t in e)o.o(e,t)&&!o.o(r,t)&&Object.defineProperty(r,t,{enumerable:!0,get:e[t]})},o.o=(r,e)=>Object.prototype.hasOwnProperty.call(r,e),r=o(451),e=o(345),(0,r.IH)(1,2),e.n(1,2)})();
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
    Asset      Size
output.js  5.09 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 698 bytes (javascript) 394 bytes (runtime) [entry] [rendered]
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
     + 2 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
    Asset       Size
output.js  603 bytes  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 698 bytes (javascript) 394 bytes (runtime) [entry] [rendered]
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
     + 2 hidden chunk modules
```
