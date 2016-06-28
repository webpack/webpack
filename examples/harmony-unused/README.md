This example demonstrates how webpack tracks the using of ES6 imports and exports. Only used exports are emitted to the resulting bundle. The minimizing step then removes the declarations because they are ununsed. 

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

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmory exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		Object.defineProperty(exports, name, {
/******/ 			configurable: false,
/******/ 			enumerable: true,
/******/ 			get: getter
/******/ 		});
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony export */ exports["a"] = add;/* harmony export */ exports["b"] = multiply;/* unused harmony export list */function add() {
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


/***/ },
/* 1 */
/*!********************!*\
  !*** ./library.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__abc__ = __webpack_require__(/*! ./abc */ 2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__math__ = __webpack_require__(/*! ./math */ 0);
/* unused harmony reexport a */
/* unused harmony reexport b */
/* unused harmony reexport c */
/* unused harmony reexport reexportedAdd */
/* harmony reexport */ if(__webpack_require__.o(__WEBPACK_IMPORTED_MODULE_1__math__, "b")) __webpack_require__.d(exports, "a", function() { return __WEBPACK_IMPORTED_MODULE_1__math__["b"]; });



/***/ },
/* 2 */
/*!****************!*\
  !*** ./abc.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* unused harmony export a *//* unused harmony export b *//* unused harmony export c */function a() { console.log("a"); }
function b() { console.log("b"); }
function c() { console.log("c"); }


/***/ },
/* 3 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__math__ = __webpack_require__(/*! ./math */ 0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__library__ = __webpack_require__(/*! ./library */ 1);



__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__math__["a" /* add */])(1, 2);
__WEBPACK_IMPORTED_MODULE_1__library__["a" /* reexportedMultiply */](1, 2);


/***/ }
/******/ ]);
```

# js/output.js

``` javascript
!function(t){function r(e){if(n[e])return n[e].exports;var u=n[e]={i:e,l:!1,exports:{}};return t[e].call(u.exports,u,u.exports,r),u.l=!0,u.exports}var n={};return r.m=t,r.c=n,r.i=function(t){return t},r.d=function(t,r,n){Object.defineProperty(t,r,{configurable:!1,enumerable:!0,get:n})},r.o=function(t,r){return Object.prototype.hasOwnProperty.call(t,r)},r.p="js/",r(r.s=3)}([function(t,r,n){"use strict";function e(){for(var t=0,r=0,n=arguments,e=n.length;e>r;)t+=n[r++];return t}function u(){for(var t=1,r=0,n=arguments,e=n.length;e>r;)t*=n[r++];return t}r.a=e,r.b=u},function(t,r,n){"use strict";var e=(n(2),n(0));n.o(e,"b")&&n.d(r,"a",function(){return e.b})},function(t,r,n){"use strict"},function(t,r,n){"use strict";var e=n(0),u=n(1);n.i(e.a)(1,2),u.a(1,2)}]);
```

# Info

## Uncompressed

```
Hash: a205275478a27b1aeb72
Version: webpack 2.1.0-beta.14
Time: 72ms
    Asset     Size  Chunks             Chunk Names
output.js  4.18 kB       0  [emitted]  main
chunk    {0} output.js (main) 726 bytes [rendered]
    > main [3] ./example.js 
    [0] ./math.js 366 bytes {0} [built]
        [only some exports used: add, multiply]
        harmony import ./math [1] ./library.js 2:0-78
        harmony import ./math [3] ./example.js 1:0-29
    [1] ./library.js 112 bytes {0} [built]
        [only some exports used: reexportedMultiply]
        harmony import ./library [3] ./example.js 2:0-37
    [2] ./abc.js 129 bytes {0} [built]
        [no exports used]
        harmony import ./abc [1] ./library.js 1:0-32
    [3] ./example.js 119 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: a205275478a27b1aeb72
Version: webpack 2.1.0-beta.14
Time: 131ms
    Asset       Size  Chunks             Chunk Names
output.js  767 bytes       0  [emitted]  main
chunk    {0} output.js (main) 726 bytes [rendered]
    > main [3] ./example.js 
    [0] ./math.js 366 bytes {0} [built]
        [only some exports used: add, multiply]
        harmony import ./math [1] ./library.js 2:0-78
        harmony import ./math [3] ./example.js 1:0-29
    [1] ./library.js 112 bytes {0} [built]
        [only some exports used: reexportedMultiply]
        harmony import ./library [3] ./example.js 2:0-37
    [2] ./abc.js 129 bytes {0} [built]
        [no exports used]
        harmony import ./abc [1] ./library.js 1:0-32
    [3] ./example.js 119 bytes {0} [built]
```
