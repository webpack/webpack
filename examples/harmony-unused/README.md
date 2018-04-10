This example demonstrates how webpack tracks the using of ES6 imports and exports. Only used exports are emitted to the resulting bundle. The minimizing step then removes the declarations because they are unused. 

Excluding unused exports from bundles is known as "[tree-shaking](http://www.2ality.com/2015/12/webpack-tree-shaking.html)".

In this example, only `add` and `multiply` in `./math.js` are used by the app. `list` is unused and is not included in the minimized bundle (Look for `Array.from` in the minimized bundle).

In addition to that, `library.js` simulates an entry point to a big library. `library.js` re-exports multiple identifiers from submodules. Often big parts of that is unused, like `abc.js`. Note how the usage information flows from `example.js` through `library.js` into `abc.js` and all declarations in `abc.js` are not included in the minimized bundle (Look for `console.log("a")` in the minimized bundle).

# example.js

``` javascript
import { add } from './math';
import * as library from "./library";

add(1, 2);
library.reexportedMultiply(1, 2);
```

# math.js

``` javascript
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

``` javascript
export { a, b, c } from "./abc";
export { add as reexportedAdd, multiply as reexportedMultiply } from "./math";
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
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./math */ 1);
/* harmony import */ var _library__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./library */ 2);



Object(_math__WEBPACK_IMPORTED_MODULE_0__["add"])(1, 2);
_library__WEBPACK_IMPORTED_MODULE_1__["reexportedMultiply"](1, 2);


/***/ }),
/* 1 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! exports provided: add, multiply, list */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiply", function() { return multiply; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "list", function() { return list; });
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
/*! exports provided: a, b, c, reexportedAdd, reexportedMultiply */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _abc__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./abc */ 3);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "a", function() { return _abc__WEBPACK_IMPORTED_MODULE_0__["a"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "b", function() { return _abc__WEBPACK_IMPORTED_MODULE_0__["b"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "c", function() { return _abc__WEBPACK_IMPORTED_MODULE_0__["c"]; });

/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./math */ 1);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "reexportedAdd", function() { return _math__WEBPACK_IMPORTED_MODULE_1__["add"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "reexportedMultiply", function() { return _math__WEBPACK_IMPORTED_MODULE_1__["multiply"]; });




/***/ }),
/* 3 */
/*!****************!*\
  !*** ./abc.js ***!
  \****************/
/*! exports provided: a, b, c */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return a; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return b; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return c; });
function a() { console.log("a"); }
function b() { console.log("b"); }
function c() { console.log("c"); }


/***/ })
/******/ ]);
```

# dist/output.js

``` javascript
!function(t){var n={};function r(e){if(n[e])return n[e].exports;var u=n[e]={i:e,l:!1,exports:{}};return t[e].call(u.exports,u,u.exports,r),u.l=!0,u.exports}r.m=t,r.c=n,r.d=function(t,n,e){r.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:e})},r.r=function(t){Object.defineProperty(t,"__esModule",{value:!0})},r.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(n,"a",n),n},r.o=function(t,n){return Object.prototype.hasOwnProperty.call(t,n)},r.p="dist/",r(r.s=3)}([function(t,n,r){"use strict";function e(){for(var t=0,n=0,r=arguments,e=r.length;n<e;)t+=r[n++];return t}function u(){for(var t=1,n=0,r=arguments,e=r.length;n<e;)t*=r[n++];return t}r.d(n,"a",function(){return e}),r.d(n,"b",function(){return u})},function(t,n,r){"use strict"},function(t,n,r){"use strict";r(1);var e=r(0);r.d(n,"a",function(){return e.b})},function(t,n,r){"use strict";r.r(n);var e=r(0),u=r(2);Object(e.a)(1,2),u.a(1,2)}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.5.0
    Asset      Size  Chunks             Chunk Names
output.js  5.93 KiB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 726 bytes [entry] [rendered]
    > .\example.js main
    [0] ./example.js 119 bytes {0} [built]
        [no exports]
        single entry .\example.js  main
    [1] ./math.js 366 bytes {0} [built]
        [exports: add, multiply, list]
        harmony side effect evaluation ./math [0] ./example.js 1:0-29
        harmony import specifier ./math [0] ./example.js 4:0-3
        harmony side effect evaluation ./math [2] ./library.js 2:0-78
        harmony export imported specifier ./math [2] ./library.js 2:0-78
        harmony export imported specifier ./math [2] ./library.js 2:0-78
    [2] ./library.js 112 bytes {0} [built]
        [exports: a, b, c, reexportedAdd, reexportedMultiply]
        harmony side effect evaluation ./library [0] ./example.js 2:0-37
        harmony import specifier ./library [0] ./example.js 5:0-26
    [3] ./abc.js 129 bytes {0} [built]
        [exports: a, b, c]
        harmony side effect evaluation ./abc [2] ./library.js 1:0-32
        harmony export imported specifier ./abc [2] ./library.js 1:0-32
        harmony export imported specifier ./abc [2] ./library.js 1:0-32
        harmony export imported specifier ./abc [2] ./library.js 1:0-32
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.5.0
    Asset       Size  Chunks             Chunk Names
output.js  971 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 726 bytes [entry] [rendered]
    > .\example.js main
    [0] ./math.js 366 bytes {0} [built]
        [exports: add, multiply, list]
        [only some exports used: add, multiply]
        harmony side effect evaluation ./math [2] ./library.js 2:0-78
        harmony export imported specifier ./math [2] ./library.js 2:0-78
        harmony export imported specifier ./math [2] ./library.js 2:0-78
        harmony side effect evaluation ./math [3] ./example.js 1:0-29
        harmony import specifier ./math [3] ./example.js 4:0-3
    [1] ./abc.js 129 bytes {0} [built]
        [exports: a, b, c]
        [no exports used]
        harmony side effect evaluation ./abc [2] ./library.js 1:0-32
        harmony export imported specifier ./abc [2] ./library.js 1:0-32
        harmony export imported specifier ./abc [2] ./library.js 1:0-32
        harmony export imported specifier ./abc [2] ./library.js 1:0-32
    [2] ./library.js 112 bytes {0} [built]
        [exports: a, b, c, reexportedAdd, reexportedMultiply]
        [only some exports used: reexportedMultiply]
        harmony side effect evaluation ./library [3] ./example.js 2:0-37
        harmony import specifier ./library [3] ./example.js 5:0-26
    [3] ./example.js 119 bytes {0} [built]
        [no exports]
        single entry .\example.js  main
```
