This example demonstrates how webpack tracks the using of ES6 imports and exports. Only used exports are emitted to the resulting bundle. The minimizing step then removes the declarations because they are unused.

Excluding unused exports from bundles is known as "[tree-shaking](http://www.2ality.com/2015/12/webpack-tree-shaking.html)".

In this example, only `add` and `multiply` in `./math.js` are used by the app. `list` is unused and is not included in the minimized bundle (Look for `Array.from` in the minimized bundle).

In addition to that, `library.js` simulates an entry point to a big library. `library.js` re-exports multiple identifiers from submodules. Often big parts of that is unused, like `abc.js`. Note how the usage information flows from `example.js` through `library.js` into `abc.js` and all declarations in `abc.js` are not included in the minimized bundle (Look for `console.log("a")` in the minimized bundle).

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

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

```javascript
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
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
```

</details>

```javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r__webpack_exports__, __webpack_require__,  */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

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
/*! export add [provided] [no usage info] [missing usage info prevents renaming] */
/*! export list [provided] [no usage info] [missing usage info prevents renaming] */
/*! export multiply [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r__webpack_exports__, __webpack_require__.d, __webpack_require__,  */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

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
/*! export a [provided] [no usage info] [missing usage info prevents renaming] */
/*! export b [provided] [no usage info] [missing usage info prevents renaming] */
/*! export c [provided] [no usage info] [missing usage info prevents renaming] */
/*! export reexportedAdd [provided] [no usage info] [missing usage info prevents renaming] */
/*! export reexportedMultiply [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r__webpack_exports__, __webpack_require__, __webpack_require__.d,  */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "a", function() { return _abc__WEBPACK_IMPORTED_MODULE_0__["a"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "b", function() { return _abc__WEBPACK_IMPORTED_MODULE_0__["b"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "c", function() { return _abc__WEBPACK_IMPORTED_MODULE_0__["c"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "reexportedAdd", function() { return _math__WEBPACK_IMPORTED_MODULE_1__["add"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "reexportedMultiply", function() { return _math__WEBPACK_IMPORTED_MODULE_1__["multiply"]; });
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
/*! runtime requirements: __webpack_require__.r__webpack_exports__, __webpack_require__.d, __webpack_require__,  */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return a; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return b; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return c; });
function a() { console.log("a"); }
function b() { console.log("b"); }
function c() { console.log("c"); }


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


# dist/output.js

```javascript
!function(t,e){"use strict";var r={};function n(e){if(r[e])return r[e].exports;var o=r[e]={i:e,l:!1,exports:{}};return t[e].call(o.exports,o,o.exports,n),o.l=!0,o.exports}(function(t){t.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},e=Object.prototype.hasOwnProperty,t.d=function(t,r,n){e.call(t,r)||Object.defineProperty(t,r,{enumerable:!0,get:n})};var e})(n),n(144)}({144:function(t,e,r){"use strict";r.r(e);var n=r(451),o=r(345);Object(n.k)(1,2),o.h(1,2)},169:function(){"use strict"},345:function(t,e,r){"use strict";r.d(e,"h",function(){return n.j});r(169);var n=r(451)},451:function(t,e,r){"use strict";function n(){for(var t=0,e=0,r=arguments,n=r.length;e<n;)t+=r[e++];return t}function o(){for(var t=1,e=0,r=arguments,n=r.length;e<n;)t*=r[e++];return t}r.d(e,"k",function(){return n}),r.d(e,"j",function(){return o})}});
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
    Asset      Size  Chunks             Chunk Names
output.js  7.12 KiB     {0}  [emitted]  main
Entrypoint main = output.js
chunk {0} output.js (main) 698 bytes (javascript) 560 bytes (runtime) [entry] [rendered]
    > ./example.js main
 [0] ./example.js 114 bytes {0} [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 [1] ./math.js 347 bytes {0} [built]
     [exports: add, list, multiply]
     [used exports unknown]
     harmony side effect evaluation ./math [0] ./example.js 1:0-29
     harmony import specifier ./math [0] ./example.js 4:0-3
     harmony side effect evaluation ./math [2] ./library.js 2:0-78
     harmony export imported specifier ./math [2] ./library.js 2:0-78
     harmony export imported specifier ./math [2] ./library.js 2:0-78
 [2] ./library.js 111 bytes {0} [built]
     [exports: a, b, c, reexportedAdd, reexportedMultiply]
     [used exports unknown]
     harmony side effect evaluation ./library [0] ./example.js 2:0-37
     harmony import specifier ./library [0] ./example.js 5:0-26
 [3] ./abc.js 126 bytes {0} [built]
     [exports: a, b, c]
     [used exports unknown]
     harmony side effect evaluation ./abc [2] ./library.js 1:0-32
     harmony export imported specifier ./abc [2] ./library.js 1:0-32
     harmony export imported specifier ./abc [2] ./library.js 1:0-32
     harmony export imported specifier ./abc [2] ./library.js 1:0-32
     + 2 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
    Asset       Size  Chunks             Chunk Names
output.js  954 bytes   {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 698 bytes (javascript) 560 bytes (runtime) [entry] [rendered]
    > ./example.js main
 [144] ./example.js 114 bytes {179} [built]
       [no exports]
       entry ./example.js main
 [169] ./abc.js 126 bytes {179} [built]
       [exports: a, b, c]
       [no exports used]
       harmony side effect evaluation ./abc [345] ./library.js 1:0-32
       harmony export imported specifier ./abc [345] ./library.js 1:0-32
       harmony export imported specifier ./abc [345] ./library.js 1:0-32
       harmony export imported specifier ./abc [345] ./library.js 1:0-32
 [345] ./library.js 111 bytes {179} [built]
       [exports: a, b, c, reexportedAdd, reexportedMultiply]
       [only some exports used: reexportedMultiply]
       harmony side effect evaluation ./library [144] ./example.js 2:0-37
       harmony import specifier ./library [144] ./example.js 5:0-26
 [451] ./math.js 347 bytes {179} [built]
       [exports: add, list, multiply]
       [only some exports used: add, multiply]
       harmony side effect evaluation ./math [144] ./example.js 1:0-29
       harmony import specifier ./math [144] ./example.js 4:0-3
       harmony side effect evaluation ./math [345] ./library.js 2:0-78
       harmony export imported specifier ./math [345] ./library.js 2:0-78
       harmony export imported specifier ./math [345] ./library.js 2:0-78
     + 2 hidden chunk modules
```
