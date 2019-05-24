This very simple example shows usage of WebAssembly.

WebAssembly modules can be imported like other async modules with `import await` or `import()`.
They are downloaded and instantiated in a streaming way when importing.

# example.js

```javascript
import await { add } from "./add.wasm";
import await { add as mathAdd, factorial, factorialJavascript, fibonacci, fibonacciJavascript } from "./math";

console.log(add(22, 2200));
console.log(mathAdd(10, 101));
console.log(factorial(15));
console.log(factorialJavascript(15));
console.log(fibonacci(15));
console.log(fibonacciJavascript(15));
timed("wasm factorial", () => factorial(1500));
timed("js factorial", () => factorialJavascript(1500));
timed("wasm fibonacci", () => fibonacci(22));
timed("js fibonacci", () => fibonacciJavascript(22));

function timed(name, fn) {
	if(!console.time || !console.timeEnd)
		return fn();
	// warmup
	for(var i = 0; i < 10; i++)
		fn();
	console.time(name)
	for(var i = 0; i < 5000; i++)
		fn();
	console.timeEnd(name)
}
```

# math.js

```javascript
import await { add } from "./add.wasm";
import await { factorial } from "./factorial.wasm";
import await { fibonacci } from "./fibonacci.wasm";

export { add, factorial, fibonacci };

export function factorialJavascript(i) {
	if(i < 1) return 1;
	return i * factorialJavascript(i - 1);
}

export function fibonacciJavascript(i) {
	if(i < 2) return 1;
	return fibonacciJavascript(i - 1) + fibonacciJavascript(i - 2);
}
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
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, module, __webpack_require__ */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _add_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./add.wasm */ 1);
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./math */ 2);
module.exports = Promise.all([_add_wasm__WEBPACK_IMPORTED_MODULE_0__, _math__WEBPACK_IMPORTED_MODULE_1__]).then(async function([_add_wasm__WEBPACK_IMPORTED_MODULE_0__, _math__WEBPACK_IMPORTED_MODULE_1__]) {



console.log(Object(_add_wasm__WEBPACK_IMPORTED_MODULE_0__["add"])(22, 2200));
console.log(Object(_math__WEBPACK_IMPORTED_MODULE_1__["add"])(10, 101));
console.log(Object(_math__WEBPACK_IMPORTED_MODULE_1__["factorial"])(15));
console.log(Object(_math__WEBPACK_IMPORTED_MODULE_1__["factorialJavascript"])(15));
console.log(Object(_math__WEBPACK_IMPORTED_MODULE_1__["fibonacci"])(15));
console.log(Object(_math__WEBPACK_IMPORTED_MODULE_1__["fibonacciJavascript"])(15));
timed("wasm factorial", () => Object(_math__WEBPACK_IMPORTED_MODULE_1__["factorial"])(1500));
timed("js factorial", () => Object(_math__WEBPACK_IMPORTED_MODULE_1__["factorialJavascript"])(1500));
timed("wasm fibonacci", () => Object(_math__WEBPACK_IMPORTED_MODULE_1__["fibonacci"])(22));
timed("js fibonacci", () => Object(_math__WEBPACK_IMPORTED_MODULE_1__["fibonacciJavascript"])(22));

function timed(name, fn) {
	if(!console.time || !console.timeEnd)
		return fn();
	// warmup
	for(var i = 0; i < 10; i++)
		fn();
	console.time(name)
	for(var i = 0; i < 5000; i++)
		fn();
	console.timeEnd(name)
}
return __webpack_exports__;
});


/***/ }),
/* 1 */
/*!******************!*\
  !*** ./add.wasm ***!
  \******************/
/*! export add [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module, __webpack_require__.v, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = __webpack_require__.v(module.i)

/***/ }),
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! export add [provided] [no usage info] [missing usage info prevents renaming] */
/*! export factorial [provided] [no usage info] [missing usage info prevents renaming] */
/*! export factorialJavascript [provided] [no usage info] [missing usage info prevents renaming] */
/*! export fibonacci [provided] [no usage info] [missing usage info prevents renaming] */
/*! export fibonacciJavascript [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, module, __webpack_require__, __webpack_require__.d */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _add_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./add.wasm */ 1);
/* harmony import */ var _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./factorial.wasm */ 3);
/* harmony import */ var _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./fibonacci.wasm */ 4);
module.exports = Promise.all([_add_wasm__WEBPACK_IMPORTED_MODULE_0__, _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__, _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__]).then(async function([_add_wasm__WEBPACK_IMPORTED_MODULE_0__, _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__, _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__]) {
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "add", function() { return _add_wasm__WEBPACK_IMPORTED_MODULE_0__["add"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "factorial", function() { return _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__["factorial"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "fibonacci", function() { return _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__["fibonacci"]; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "factorialJavascript", function() { return factorialJavascript; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fibonacciJavascript", function() { return fibonacciJavascript; });






function factorialJavascript(i) {
	if(i < 1) return 1;
	return i * factorialJavascript(i - 1);
}

function fibonacciJavascript(i) {
	if(i < 2) return 1;
	return fibonacciJavascript(i - 1) + fibonacciJavascript(i - 2);
}
return __webpack_exports__;
});


/***/ }),
/* 3 */
/*!************************!*\
  !*** ./factorial.wasm ***!
  \************************/
/*! export factorial [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module, __webpack_require__.v, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = __webpack_require__.v(module.i)

/***/ }),
/* 4 */
/*!************************!*\
  !*** ./fibonacci.wasm ***!
  \************************/
/*! export fibonacci [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module, __webpack_require__.v, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = __webpack_require__.v(module.i)

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
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/wasm chunk loading */
/******/ 	!function() {
/******/ 		__webpack_require__.v = function(wasmModuleId, importsObj) {
/******/ 			var req = fetch(__webpack_require__.p + "" + {"1":"216fd3b2e2c26ba17d6a","3":"ce408c5c3fbf4bafc915","4":"edf8dce07bda763a8ce8"}[wasmModuleId] + ".wasm");
/******/ 			if(typeof WebAssembly.instantiateStreaming === 'function') {
/******/ 				return WebAssembly.instantiateStreaming(req, importsObj)
/******/ 					.then(function(res) { return res.instance.exports; });
/******/ 			}
/******/ 			return req
/******/ 				.then(function(x) { return x.arrayBuffer(); })
/******/ 				.then(function(bytes) { return WebAssembly.instantiate(bytes, importsObj); })
/******/ 				.then(function(res) { return res.instance.exports; });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.14
                    Asset      Size  Chunks             Chunk Names
216fd3b2e2c26ba17d6a.wasm  41 bytes   {179}  [emitted]  main
ce408c5c3fbf4bafc915.wasm  62 bytes   {179}  [emitted]  main
edf8dce07bda763a8ce8.wasm  67 bytes   {179}  [emitted]  main
                output.js  8.92 KiB   {179}  [emitted]  main
Entrypoint main = output.js 216fd3b2e2c26ba17d6a.wasm ce408c5c3fbf4bafc915.wasm edf8dce07bda763a8ce8.wasm
chunk {179} output.js, 216fd3b2e2c26ba17d6a.wasm, ce408c5c3fbf4bafc915.wasm, edf8dce07bda763a8ce8.wasm (main) 1.3 KiB (javascript) 170 bytes (webassembly) 1.16 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [0] ./example.js 761 bytes {179} [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 [1] ./add.wasm 50 bytes (javascript) 41 bytes (webassembly) {179} [built]
     [exports: add]
     [used exports unknown]
     harmony side effect evaluation ./add.wasm [0] ./example.js 1:0-39
     harmony import specifier ./add.wasm [0] ./example.js 4:12-15
     harmony side effect evaluation ./add.wasm [2] ./math.js 1:0-39
     harmony export imported specifier ./add.wasm [2] ./math.js 5:0-37
 [2] ./math.js 418 bytes {179} [built]
     [exports: add, factorial, factorialJavascript, fibonacci, fibonacciJavascript]
     [used exports unknown]
     harmony side effect evaluation ./math [0] ./example.js 2:0-110
     harmony import specifier ./math [0] ./example.js 5:12-19
     harmony import specifier ./math [0] ./example.js 6:12-21
     harmony import specifier ./math [0] ./example.js 7:12-31
     harmony import specifier ./math [0] ./example.js 8:12-21
     harmony import specifier ./math [0] ./example.js 9:12-31
     harmony import specifier ./math [0] ./example.js 10:30-39
     harmony import specifier ./math [0] ./example.js 11:28-47
     harmony import specifier ./math [0] ./example.js 12:30-39
     harmony import specifier ./math [0] ./example.js 13:28-47
 [3] ./factorial.wasm 50 bytes (javascript) 62 bytes (webassembly) {179} [built]
     [exports: factorial]
     [used exports unknown]
     harmony side effect evaluation ./factorial.wasm [2] ./math.js 2:0-51
     harmony export imported specifier ./factorial.wasm [2] ./math.js 5:0-37
 [4] ./fibonacci.wasm 50 bytes (javascript) 67 bytes (webassembly) {179} [built]
     [exports: fibonacci]
     [used exports unknown]
     harmony side effect evaluation ./fibonacci.wasm [2] ./math.js 3:0-51
     harmony export imported specifier ./fibonacci.wasm [2] ./math.js 5:0-37
     + 4 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.14
                    Asset      Size  Chunks             Chunk Names
6d518704ecb4aa16ea4e.wasm  62 bytes   {179}  [emitted]  main
9099c5b3bb53a85154d5.wasm  41 bytes   {179}  [emitted]  main
b7e9245ccbc6eb4c52c9.wasm  67 bytes   {179}  [emitted]  main
                output.js  2.01 KiB   {179}  [emitted]  main
Entrypoint main = output.js 6d518704ecb4aa16ea4e.wasm 9099c5b3bb53a85154d5.wasm b7e9245ccbc6eb4c52c9.wasm
chunk {179} output.js, 6d518704ecb4aa16ea4e.wasm, 9099c5b3bb53a85154d5.wasm, b7e9245ccbc6eb4c52c9.wasm (main) 1.3 KiB (javascript) 170 bytes (webassembly) 1.17 KiB (runtime) [entry] [rendered]
    > ./example.js main
  [78] ./factorial.wasm 50 bytes (javascript) 62 bytes (webassembly) {179} [built]
       [exports: factorial]
       harmony side effect evaluation ./factorial.wasm [451] ./math.js 2:0-51
       harmony export imported specifier ./factorial.wasm [451] ./math.js 5:0-37
 [144] ./example.js 761 bytes {179} [built]
       [no exports]
       entry ./example.js main
 [451] ./math.js 418 bytes {179} [built]
       [exports: add, factorial, factorialJavascript, fibonacci, fibonacciJavascript]
       [all exports used]
       harmony side effect evaluation ./math [144] ./example.js 2:0-110
       harmony import specifier ./math [144] ./example.js 5:12-19
       harmony import specifier ./math [144] ./example.js 6:12-21
       harmony import specifier ./math [144] ./example.js 7:12-31
       harmony import specifier ./math [144] ./example.js 8:12-21
       harmony import specifier ./math [144] ./example.js 9:12-31
       harmony import specifier ./math [144] ./example.js 10:30-39
       harmony import specifier ./math [144] ./example.js 11:28-47
       harmony import specifier ./math [144] ./example.js 12:30-39
       harmony import specifier ./math [144] ./example.js 13:28-47
 [461] ./add.wasm 50 bytes (javascript) 41 bytes (webassembly) {179} [built]
       [exports: add]
       harmony side effect evaluation ./add.wasm [144] ./example.js 1:0-39
       harmony import specifier ./add.wasm [144] ./example.js 4:12-15
       harmony side effect evaluation ./add.wasm [451] ./math.js 1:0-39
       harmony export imported specifier ./add.wasm [451] ./math.js 5:0-37
 [605] ./fibonacci.wasm 50 bytes (javascript) 67 bytes (webassembly) {179} [built]
       [exports: fibonacci]
       harmony side effect evaluation ./fibonacci.wasm [451] ./math.js 3:0-51
       harmony export imported specifier ./fibonacci.wasm [451] ./math.js 5:0-37
     + 4 hidden chunk modules
```
