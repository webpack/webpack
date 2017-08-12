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
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! exports provided: add, multiply, list */
/*! exports used: add, multiply */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = add;
/* harmony export (immutable) */ __webpack_exports__["b"] = multiply;
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
/* 1 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports provided:  */
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__math__ = __webpack_require__(/*! ./math */ 0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__library__ = __webpack_require__(/*! ./library */ 2);



Object(__WEBPACK_IMPORTED_MODULE_0__math__["a" /* add */])(1, 2);
__WEBPACK_IMPORTED_MODULE_1__library__["a" /* reexportedMultiply */](1, 2);


/***/ }),
/* 2 */
/*!********************!*\
  !*** ./library.js ***!
  \********************/
/*! exports provided: a, b, c, reexportedAdd, reexportedMultiply */
/*! exports used: reexportedMultiply */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__abc__ = __webpack_require__(/*! ./abc */ 3);
/* unused harmony reexport a */
/* unused harmony reexport b */
/* unused harmony reexport c */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__math__ = __webpack_require__(/*! ./math */ 0);
/* unused harmony reexport reexportedAdd */
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return __WEBPACK_IMPORTED_MODULE_1__math__["b"]; });



/***/ }),
/* 3 */
/*!****************!*\
  !*** ./abc.js ***!
  \****************/
/*! exports provided: a, b, c */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export a */
/* unused harmony export b */
/* unused harmony export c */
function a() { console.log("a"); }
function b() { console.log("b"); }
function c() { console.log("c"); }


/***/ })
/******/ ]);
```

# js/output.js

``` javascript
!function(t){function n(e){if(r[e])return r[e].exports;var u=r[e]={i:e,l:!1,exports:{}};return t[e].call(u.exports,u,u.exports,n),u.l=!0,u.exports}var r={};n.m=t,n.c=r,n.d=function(t,r,e){n.o(t,r)||Object.defineProperty(t,r,{configurable:!1,enumerable:!0,get:e})},n.n=function(t){var r=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(r,"a",r),r},n.o=function(t,n){return Object.prototype.hasOwnProperty.call(t,n)},n.p="js/",n(n.s=1)}([function(t,n,r){"use strict";function e(){for(var t=0,n=0,r=arguments,e=r.length;n<e;)t+=r[n++];return t}function u(){for(var t=1,n=0,r=arguments,e=r.length;n<e;)t*=r[n++];return t}n.a=e,n.b=u},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0});var e=r(0),u=r(2);Object(e.a)(1,2),u.a(1,2)},function(t,n,r){"use strict";var e=(r(3),r(0));r.d(n,"a",function(){return e.b})},function(t,n,r){"use strict"}]);
```

# Info

## Uncompressed

```
Hash: 4cac4181f66e42d03af9
Version: webpack 3.5.1
    Asset     Size  Chunks             Chunk Names
output.js  5.02 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 726 bytes [entry] [rendered]
    > main [1] ./example.js 
    [0] ./math.js 366 bytes {0} [built]
        [exports: add, multiply, list]
        [only some exports used: add, multiply]
        harmony import ./math [1] ./example.js 1:0-29
        harmony import ./math [2] ./library.js 2:0-78
    [1] ./example.js 119 bytes {0} [built]
        [no exports]
    [2] ./library.js 112 bytes {0} [built]
        [exports: a, b, c, reexportedAdd, reexportedMultiply]
        [only some exports used: reexportedMultiply]
        harmony import ./library [1] ./example.js 2:0-37
    [3] ./abc.js 129 bytes {0} [built]
        [exports: a, b, c]
        [no exports used]
        harmony import ./abc [2] ./library.js 1:0-32
```

## Minimized (uglify-js, no zip)

```
Hash: 4cac4181f66e42d03af9
Version: webpack 3.5.1
    Asset       Size  Chunks             Chunk Names
output.js  895 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 726 bytes [entry] [rendered]
    > main [1] ./example.js 
    [0] ./math.js 366 bytes {0} [built]
        [exports: add, multiply, list]
        [only some exports used: add, multiply]
        harmony import ./math [1] ./example.js 1:0-29
        harmony import ./math [2] ./library.js 2:0-78
    [1] ./example.js 119 bytes {0} [built]
        [no exports]
    [2] ./library.js 112 bytes {0} [built]
        [exports: a, b, c, reexportedAdd, reexportedMultiply]
        [only some exports used: reexportedMultiply]
        harmony import ./library [1] ./example.js 2:0-37
    [3] ./abc.js 129 bytes {0} [built]
        [exports: a, b, c]
        [no exports used]
        harmony import ./abc [2] ./library.js 1:0-32
```
