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
/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

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
/*! namespace exports */
/*! export add [provided] [no usage info] [missing usage info prevents renaming] */
/*! export list [provided] [no usage info] [missing usage info prevents renaming] */
/*! export multiply [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": function() { return /* binding */ add; },
/* harmony export */   "multiply": function() { return /* binding */ multiply; },
/* harmony export */   "list": function() { return /* binding */ list; }
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
/*! namespace exports */
/*! export a [provided] [no usage info] [missing usage info prevents renaming] -> ./abc.js .a */
/*! export b [provided] [no usage info] [missing usage info prevents renaming] -> ./abc.js .b */
/*! export c [provided] [no usage info] [missing usage info prevents renaming] -> ./abc.js .c */
/*! export reexportedAdd [provided] [no usage info] [missing usage info prevents renaming] -> ./math.js .add */
/*! export reexportedMultiply [provided] [no usage info] [missing usage info prevents renaming] -> ./math.js .multiply */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.* */
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": function() { return /* reexport safe */ _abc__WEBPACK_IMPORTED_MODULE_0__.a; },
/* harmony export */   "b": function() { return /* reexport safe */ _abc__WEBPACK_IMPORTED_MODULE_0__.b; },
/* harmony export */   "c": function() { return /* reexport safe */ _abc__WEBPACK_IMPORTED_MODULE_0__.c; },
/* harmony export */   "reexportedAdd": function() { return /* reexport safe */ _math__WEBPACK_IMPORTED_MODULE_1__.add; },
/* harmony export */   "reexportedMultiply": function() { return /* reexport safe */ _math__WEBPACK_IMPORTED_MODULE_1__.multiply; }
/* harmony export */ });
/* harmony import */ var _abc__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./abc */ 3);
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./math */ 1);



/***/ }),
/* 3 */
/*!****************!*\
  !*** ./abc.js ***!
  \****************/
/*! namespace exports */
/*! export a [provided] [no usage info] [missing usage info prevents renaming] */
/*! export b [provided] [no usage info] [missing usage info prevents renaming] */
/*! export c [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": function() { return /* binding */ a; },
/* harmony export */   "b": function() { return /* binding */ b; },
/* harmony export */   "c": function() { return /* binding */ c; }
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

# dist/output.js

```javascript
!function(){"use strict";var n,r,t={169:function(n,r,t){},345:function(n,r,t){t.d(r,{n:function(){return e.Jp}}),t(169);var e=t(451)},451:function(n,r,t){function e(){for(var n=0,r=0,t=arguments,e=t.length;r<e;)n+=t[r++];return n}function o(){for(var n=1,r=0,t=arguments,e=t.length;r<e;)n*=t[r++];return n}t.d(r,{IH:function(){return e},Jp:function(){return o}})}},e={};function o(n){if(e[n])return e[n].exports;var r=e[n]={exports:{}};return t[n](r,r.exports,o),r.exports}o.d=function(n,r){for(var t in r)o.o(r,t)&&!o.o(n,t)&&Object.defineProperty(n,t,{enumerable:!0,get:r[t]})},o.o=function(n,r){return Object.prototype.hasOwnProperty.call(n,r)},n=o(451),r=o(345),(0,n.IH)(1,2),r.n(1,2)}();
```

# Info

## Unoptimized

```
asset output.js 7.31 KiB [emitted] (name: main)
chunk output.js (main) 698 bytes (javascript) 695 bytes (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 584 bytes [dependent] 3 modules
  runtime modules 695 bytes 3 modules
  ./example.js 114 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack 5.0.0-rc.0 compiled successfully
```

## Production mode

```
asset output.js 692 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 698 bytes (javascript) 416 bytes (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 584 bytes [dependent] 3 modules
  runtime modules 416 bytes 2 modules
  ./example.js 114 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack 5.0.0-rc.0 compiled successfully
```
