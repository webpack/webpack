This example demonstrates how webpack tracks the using of ES6 imports and exports. Only used exports are emitted to the resulting bundle. The minimizing step then removes the declarations because they are ununsed. 

Excluding unused exports from bundles is known as "[tree-shaking](http://www.2ality.com/2015/12/webpack-tree-shaking.html)".

In this example, only `add` and `multiply` in `./math.js` are used used by the app. `list` is unused and is not included in the minimized bundle (Look for `Array.from` in the minimized bundle).

In addition to that, `library.js` simulates an entry point to a big library. `library.js` re-exports multiple identifiers from submodules. Often big parts of that is unused, like `abc.js`. Note how the usage information flows from `example.js` through `library.js` into `abc.js` and all declarations in `abc.js` are not included in the minimized bundle (Look for `console.log("a")` in the minimized bundle).

# example.js

``` javascript
import { add } from './math';
import { reexportedMultiply } from "./library";

add(1, 2);
reexportedMultiply(1, 2);
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
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

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

	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__abc__ = __webpack_require__(/*! ./abc */ 2);
	/* unused harmony reexport a *//* unused harmony reexport b *//* unused harmony reexport c *//* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__math__ = __webpack_require__(/*! ./math */ 0);
	/* unused harmony reexport reexportedAdd *//* harmony reexport */ Object.defineProperty(exports, "a", {configurable: false, enumerable: true, get: function() { return __WEBPACK_IMPORTED_MODULE_1__math__["b"]; }});


/***/ },
/* 2 */
/*!****************!*\
  !*** ./abc.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	/* unused harmony export a *//* unused harmony export b *//* unused harmony export c */function a() { console.log("a"); }
	function b() { console.log("b"); }
	function c() { console.log("c"); }


/***/ },
/* 3 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__math__ = __webpack_require__(/*! ./math */ 0);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__library__ = __webpack_require__(/*! ./library */ 1);



	/* harmony import */ __WEBPACK_IMPORTED_MODULE_0__math__["a"](1, 2);
	/* harmony import */ __WEBPACK_IMPORTED_MODULE_1__library__["a"](1, 2);


/***/ }
/******/ ]);
```

# js/output.js

``` javascript
!function(n){function r(e){if(t[e])return t[e].exports;var o=t[e]={exports:{},id:e,loaded:!1};return n[e].call(o.exports,o,o.exports,r),o.loaded=!0,o.exports}var t={};return r.m=n,r.c=t,r.p="js/",r(r.s=3)}([function(n,r,t){function e(){for(var n=0,r=0,t=arguments,e=t.length;e>r;)n+=t[r++];return n}function o(){for(var n=1,r=0,t=arguments,e=t.length;e>r;)n*=t[r++];return n}r.a=e,r.b=o},function(n,r,t){var e=(t(2),t(0));Object.defineProperty(r,"a",{configurable:!1,enumerable:!0,get:function(){return e.b}})},function(n,r,t){},function(n,r,t){var e=t(0),o=t(1);e.a(1,2),o.a(1,2)}]);
```

# Info

## Uncompressed

```
Hash: e3cda11c1e9e036a0c7b
Version: webpack 2.0.6-beta
Time: 91ms
    Asset    Size  Chunks             Chunk Names
output.js  3.5 kB       0  [emitted]  main
chunk    {0} output.js (main) 728 bytes [rendered]
    > main [3] ./example.js 
    [0] ./math.js 366 bytes {0} [built]
        harmony import ./math [1] ./library.js 2:0-78
        harmony import ./math [3] ./example.js 1:0-29
    [1] ./library.js 112 bytes {0} [built]
        harmony import ./library [3] ./example.js 2:0-47
    [2] ./abc.js 129 bytes {0} [built]
        harmony import ./abc [1] ./library.js 1:0-32
    [3] ./example.js 121 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: e3cda11c1e9e036a0c7b
Version: webpack 2.0.6-beta
Time: 188ms
    Asset       Size  Chunks             Chunk Names
output.js  584 bytes       0  [emitted]  main
chunk    {0} output.js (main) 728 bytes [rendered]
    > main [3] ./example.js 
    [0] ./math.js 366 bytes {0} [built]
        harmony import ./math [1] ./library.js 2:0-78
        harmony import ./math [3] ./example.js 1:0-29
    [1] ./library.js 112 bytes {0} [built]
        harmony import ./library [3] ./example.js 2:0-47
    [2] ./abc.js 129 bytes {0} [built]
        harmony import ./abc [1] ./library.js 1:0-32
    [3] ./example.js 121 bytes {0} [built]

WARNING in output.js from UglifyJs
Dropping unused function list [./math.js:17,0]
Dropping unused function a [./abc.js:1,0]
Dropping unused function b [./abc.js:2,0]
Dropping unused function c [./abc.js:3,0]
```
