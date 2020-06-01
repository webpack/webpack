This is a simple example that shows the usage of WebAssembly.

WebAssembly modules can be imported like other async modules with `import await` or `import()`.
When importing, they are downloaded and instantiated in a streaming way.

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

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, module, __webpack_exports__ */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

module.exports = (async () => {
/* harmony import */ var _add_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./add.wasm */ 1);
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./math */ 2);
([_math__WEBPACK_IMPORTED_MODULE_1__, _add_wasm__WEBPACK_IMPORTED_MODULE_0__] = await Promise.all([_math__WEBPACK_IMPORTED_MODULE_1__, _add_wasm__WEBPACK_IMPORTED_MODULE_0__]));



console.log((0,_add_wasm__WEBPACK_IMPORTED_MODULE_0__.add)(22, 2200));
console.log((0,_math__WEBPACK_IMPORTED_MODULE_1__.add)(10, 101));
console.log((0,_math__WEBPACK_IMPORTED_MODULE_1__.factorial)(15));
console.log((0,_math__WEBPACK_IMPORTED_MODULE_1__.factorialJavascript)(15));
console.log((0,_math__WEBPACK_IMPORTED_MODULE_1__.fibonacci)(15));
console.log((0,_math__WEBPACK_IMPORTED_MODULE_1__.fibonacciJavascript)(15));
timed("wasm factorial", () => (0,_math__WEBPACK_IMPORTED_MODULE_1__.factorial)(1500));
timed("js factorial", () => (0,_math__WEBPACK_IMPORTED_MODULE_1__.factorialJavascript)(1500));
timed("wasm fibonacci", () => (0,_math__WEBPACK_IMPORTED_MODULE_1__.fibonacci)(22));
timed("js fibonacci", () => (0,_math__WEBPACK_IMPORTED_MODULE_1__.fibonacciJavascript)(22));

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
})();

/***/ }),
/* 1 */
/*!******************!*\
  !*** ./add.wasm ***!
  \******************/
/*! namespace exports */
/*! export add [provided] [used] [provision prevents renaming] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: module, module.id, __webpack_exports__, __webpack_require__.v, __webpack_require__.* */
/***/ ((module, exports, __webpack_require__) => {

module.exports = __webpack_require__.v(exports, module.id)

/***/ }),
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! namespace exports */
/*! export add [provided] [used] [could be renamed] */
/*! export factorial [provided] [used] [could be renamed] */
/*! export factorialJavascript [provided] [used] [could be renamed] */
/*! export fibonacci [provided] [used] [could be renamed] */
/*! export fibonacciJavascript [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, module, __webpack_require__.* */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

module.exports = (async () => {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "add": () => /* reexport safe */ _add_wasm__WEBPACK_IMPORTED_MODULE_0__.add,
/* harmony export */   "factorial": () => /* reexport safe */ _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__.factorial,
/* harmony export */   "fibonacci": () => /* reexport safe */ _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__.fibonacci,
/* harmony export */   "factorialJavascript": () => /* binding */ factorialJavascript,
/* harmony export */   "fibonacciJavascript": () => /* binding */ fibonacciJavascript
/* harmony export */ });
/* harmony import */ var _add_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./add.wasm */ 1);
/* harmony import */ var _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./factorial.wasm */ 3);
/* harmony import */ var _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./fibonacci.wasm */ 4);
([_fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__, _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__, _add_wasm__WEBPACK_IMPORTED_MODULE_0__] = await Promise.all([_fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__, _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__, _add_wasm__WEBPACK_IMPORTED_MODULE_0__]));






function factorialJavascript(i) {
	if(i < 1) return 1;
	return i * factorialJavascript(i - 1);
}

function fibonacciJavascript(i) {
	if(i < 2) return 1;
	return fibonacciJavascript(i - 1) + fibonacciJavascript(i - 2);
}

return __webpack_exports__;
})();

/***/ }),
/* 3 */
/*!************************!*\
  !*** ./factorial.wasm ***!
  \************************/
/*! namespace exports */
/*! export factorial [provided] [used] [provision prevents renaming] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: module, module.id, __webpack_exports__, __webpack_require__.v, __webpack_require__.* */
/***/ ((module, exports, __webpack_require__) => {

module.exports = __webpack_require__.v(exports, module.id)

/***/ }),
/* 4 */
/*!************************!*\
  !*** ./fibonacci.wasm ***!
  \************************/
/*! namespace exports */
/*! export fibonacci [provided] [used] [provision prevents renaming] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: module, module.id, __webpack_exports__, __webpack_require__.v, __webpack_require__.* */
/***/ ((module, exports, __webpack_require__) => {

module.exports = __webpack_require__.v(exports, module.id)

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
/******/ 			id: moduleId,
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
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/wasm chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.v = function(exports, wasmModuleId, importsObj) {
/******/ 			var req = fetch(__webpack_require__.p + "" + {"1":"1c8378066da027821f98","3":"9989aee1a31bab8d342f","4":"aa9360d4a460c66559cc"}[wasmModuleId] + ".wasm");
/******/ 			if(typeof WebAssembly.instantiateStreaming === 'function') {
/******/ 				return WebAssembly.instantiateStreaming(req, importsObj)
/******/ 					.then(function(res) { return Object.assign(exports, res.instance.exports); });
/******/ 			}
/******/ 			return req
/******/ 				.then(function(x) { return x.arrayBuffer(); })
/******/ 				.then(function(bytes) { return WebAssembly.instantiate(bytes, importsObj); })
/******/ 				.then(function(res) { return Object.assign(exports, res.instance.exports); });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__(0);
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
                    Asset      Size
1c8378066da027821f98.wasm  41 bytes  [emitted] [immutable]  [name: (main)]
9989aee1a31bab8d342f.wasm  62 bytes  [emitted] [immutable]  [name: (main)]
aa9360d4a460c66559cc.wasm  67 bytes  [emitted] [immutable]  [name: (main)]
                output.js   8.2 KiB  [emitted]              [name: main]
Entrypoint main = output.js (1c8378066da027821f98.wasm 9989aee1a31bab8d342f.wasm aa9360d4a460c66559cc.wasm)
chunk output.js (main) 1.3 KiB (javascript) 170 bytes (webassembly) 1.06 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./add.wasm 50 bytes (javascript) 41 bytes (webassembly) [built]
     [exports: add]
     [all exports used]
     harmony side effect evaluation ./add.wasm ./example.js 1:0-39
     harmony import specifier ./add.wasm ./example.js 4:12-15
     harmony side effect evaluation ./add.wasm ./math.js 1:0-39
     harmony export imported specifier ./add.wasm ./math.js 5:0-37
 ./example.js 761 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./factorial.wasm 50 bytes (javascript) 62 bytes (webassembly) [built]
     [exports: factorial]
     [all exports used]
     harmony side effect evaluation ./factorial.wasm ./math.js 2:0-51
     harmony export imported specifier ./factorial.wasm ./math.js 5:0-37
 ./fibonacci.wasm 50 bytes (javascript) 67 bytes (webassembly) [built]
     [exports: fibonacci]
     [all exports used]
     harmony side effect evaluation ./fibonacci.wasm ./math.js 3:0-51
     harmony export imported specifier ./fibonacci.wasm ./math.js 5:0-37
 ./math.js 418 bytes [built]
     [exports: add, factorial, factorialJavascript, fibonacci, fibonacciJavascript]
     [all exports used]
     harmony side effect evaluation ./math ./example.js 2:0-110
     harmony import specifier ./math ./example.js 5:12-19
     harmony import specifier ./math ./example.js 6:12-21
     harmony import specifier ./math ./example.js 7:12-31
     harmony import specifier ./math ./example.js 8:12-21
     harmony import specifier ./math ./example.js 9:12-31
     harmony import specifier ./math ./example.js 10:30-39
     harmony import specifier ./math ./example.js 11:28-47
     harmony import specifier ./math ./example.js 12:30-39
     harmony import specifier ./math ./example.js 13:28-47
     + 4 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
                    Asset      Size
5ba3e3921117e9d828f5.wasm  67 bytes  [emitted] [immutable]  [name: (main)]
5dd947250fab86306d49.wasm  62 bytes  [emitted] [immutable]  [name: (main)]
6f6c0ffc52ce3a45ff7e.wasm  41 bytes  [emitted] [immutable]  [name: (main)]
                output.js  1.67 KiB  [emitted]              [name: main]
Entrypoint main = output.js (5ba3e3921117e9d828f5.wasm 5dd947250fab86306d49.wasm 6f6c0ffc52ce3a45ff7e.wasm)
chunk output.js (main) 1.3 KiB (javascript) 170 bytes (webassembly) 1.06 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./add.wasm 50 bytes (javascript) 41 bytes (webassembly) [built]
     [exports: add]
     [all exports used]
     harmony side effect evaluation ./add.wasm ./example.js 1:0-39
     harmony import specifier ./add.wasm ./example.js 4:12-15
     harmony side effect evaluation ./add.wasm ./math.js 1:0-39
     harmony export imported specifier ./add.wasm ./math.js 5:0-37
 ./example.js 761 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./factorial.wasm 50 bytes (javascript) 62 bytes (webassembly) [built]
     [exports: factorial]
     [all exports used]
     harmony side effect evaluation ./factorial.wasm ./math.js 2:0-51
     harmony export imported specifier ./factorial.wasm ./math.js 5:0-37
 ./fibonacci.wasm 50 bytes (javascript) 67 bytes (webassembly) [built]
     [exports: fibonacci]
     [all exports used]
     harmony side effect evaluation ./fibonacci.wasm ./math.js 3:0-51
     harmony export imported specifier ./fibonacci.wasm ./math.js 5:0-37
 ./math.js 418 bytes [built]
     [exports: add, factorial, factorialJavascript, fibonacci, fibonacciJavascript]
     [all exports used]
     harmony side effect evaluation ./math ./example.js 2:0-110
     harmony import specifier ./math ./example.js 5:12-19
     harmony import specifier ./math ./example.js 6:12-21
     harmony import specifier ./math ./example.js 7:12-31
     harmony import specifier ./math ./example.js 8:12-21
     harmony import specifier ./math ./example.js 9:12-31
     harmony import specifier ./math ./example.js 10:30-39
     harmony import specifier ./math ./example.js 11:28-47
     harmony import specifier ./math ./example.js 12:30-39
     harmony import specifier ./math ./example.js 13:28-47
     + 4 hidden chunk modules
```
