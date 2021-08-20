# example.js

```javascript
import { get, set, getNumber } from "./magic.js";

// accessing memory
console.log(get());
set(42);
console.log(get());
set(123);
console.log(get());

// random numbers
console.log(getNumber());
console.log(getNumber());
console.log(getNumber());
```

# magic.js

```javascript
// reexporting
export * from "./magic.wat";
```

# magic.wat

```wat
(module
  (type $t0 (func (result i32)))
  (type $t1 (func (param i32)))
  (import "./memory.js" "memory" (memory 1))
  (import "./magic-number.js" "getRandomNumber" (func $getRandomNumber (type $t0)))
  (func $get (export "get") (type $t0) (result i32)
    (i32.load
      (i32.const 0)))
  (func $set (export "set") (type $t1) (param $p i32)
    (i32.store
      (i32.const 0)
      (get_local $p)))
  (func $get (export "getNumber") (type $t0) (result i32)
    (call $getRandomNumber))
)
```

# magic-number.js

```javascript
export function getNumber() {
	return 42;
}

export function getRandomNumber() {
	return Math.floor(Math.random() * 256);
}
```

# memory.js

```javascript
async function getMemoryFromParentInWorker() {
	await new Promise(r => setTimeout(r, 200));
	// fake
	return new WebAssembly.Memory({ initial: 1 });
}

export const memory = await getMemoryFromParentInWorker();
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
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, module, __webpack_require__.a, __webpack_require__.* */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__) => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _magic_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./magic.js */ 1);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_magic_js__WEBPACK_IMPORTED_MODULE_0__]);
_magic_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? await __webpack_async_dependencies__ : __webpack_async_dependencies__)[0];


// accessing memory
console.log((0,_magic_js__WEBPACK_IMPORTED_MODULE_0__.get)());
(0,_magic_js__WEBPACK_IMPORTED_MODULE_0__.set)(42);
console.log((0,_magic_js__WEBPACK_IMPORTED_MODULE_0__.get)());
(0,_magic_js__WEBPACK_IMPORTED_MODULE_0__.set)(123);
console.log((0,_magic_js__WEBPACK_IMPORTED_MODULE_0__.get)());

// random numbers
console.log((0,_magic_js__WEBPACK_IMPORTED_MODULE_0__.getNumber)());
console.log((0,_magic_js__WEBPACK_IMPORTED_MODULE_0__.getNumber)());
console.log((0,_magic_js__WEBPACK_IMPORTED_MODULE_0__.getNumber)());

});

/***/ }),
/* 1 */
/*!******************!*\
  !*** ./magic.js ***!
  \******************/
/*! namespace exports */
/*! export get [provided] [no usage info] [missing usage info prevents renaming] -> ./magic.wat .get */
/*! export getNumber [provided] [no usage info] [missing usage info prevents renaming] -> ./magic.wat .getNumber */
/*! export set [provided] [no usage info] [missing usage info prevents renaming] -> ./magic.wat .set */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.r, module, __webpack_require__.a, __webpack_require__.* */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__) => {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "get": () => (/* reexport safe */ _magic_wat__WEBPACK_IMPORTED_MODULE_0__.get),
/* harmony export */   "getNumber": () => (/* reexport safe */ _magic_wat__WEBPACK_IMPORTED_MODULE_0__.getNumber),
/* harmony export */   "set": () => (/* reexport safe */ _magic_wat__WEBPACK_IMPORTED_MODULE_0__.set)
/* harmony export */ });
/* harmony import */ var _magic_wat__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./magic.wat */ 2);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_magic_wat__WEBPACK_IMPORTED_MODULE_0__]);
_magic_wat__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? await __webpack_async_dependencies__ : __webpack_async_dependencies__)[0];
// reexporting


});

/***/ }),
/* 2 */
/*!*******************!*\
  !*** ./magic.wat ***!
  \*******************/
/*! namespace exports */
/*! export get [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! export getNumber [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! export set [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module, module.id, __webpack_exports__, __webpack_require__.v, __webpack_require__, __webpack_require__.a, __webpack_require__.* */
/***/ ((module, exports, __webpack_require__) => {

var __webpack_instantiate__ = ([WEBPACK_IMPORTED_MODULE_0]) => {
	return __webpack_require__.v(exports, module.id, "daa529a2a650ee3943a9", {
		"./memory.js": {
			"memory": WEBPACK_IMPORTED_MODULE_0.memory
		},
		"./magic-number.js": {
			"getRandomNumber": WEBPACK_IMPORTED_MODULE_1.getRandomNumber
		}
	});
}
__webpack_require__.a(module, (__webpack_handle_async_dependencies__) => {
	/* harmony import */ var WEBPACK_IMPORTED_MODULE_0 = __webpack_require__(/*! ./memory.js */ 3);
	/* harmony import */ var WEBPACK_IMPORTED_MODULE_1 = __webpack_require__(/*! ./magic-number.js */ 4);
	var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([WEBPACK_IMPORTED_MODULE_0]);
	return __webpack_async_dependencies__.then ? __webpack_async_dependencies__.then(__webpack_instantiate__) : __webpack_instantiate__(__webpack_async_dependencies__);
}, 1);

/***/ }),
/* 3 */
/*!*******************!*\
  !*** ./memory.js ***!
  \*******************/
/*! namespace exports */
/*! export memory [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, module, __webpack_require__.a, __webpack_require__.d, __webpack_require__.* */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__) => {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "memory": () => (/* binding */ memory)
/* harmony export */ });
async function getMemoryFromParentInWorker() {
	await new Promise(r => setTimeout(r, 200));
	// fake
	return new WebAssembly.Memory({ initial: 1 });
}

const memory = await getMemoryFromParentInWorker();

__webpack_handle_async_dependencies__();
}, 1);

/***/ }),
/* 4 */
/*!*************************!*\
  !*** ./magic-number.js ***!
  \*************************/
/*! namespace exports */
/*! export getNumber [provided] [no usage info] [missing usage info prevents renaming] */
/*! export getRandomNumber [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getNumber": () => (/* binding */ getNumber),
/* harmony export */   "getRandomNumber": () => (/* binding */ getRandomNumber)
/* harmony export */ });
function getNumber() {
	return 42;
}

function getRandomNumber() {
	return Math.floor(Math.random() * 256);
}


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
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
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
/******/ 	/* webpack/runtime/async module */
/******/ 	(() => {
/******/ 		var webpackThen = typeof Symbol === "function" ? Symbol("webpack then") : "__webpack_then__";
/******/ 		var webpackExports = typeof Symbol === "function" ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 		var completeQueue = (queue) => {
/******/ 			if(queue) {
/******/ 				queue.forEach((fn) => (fn.r--));
/******/ 				queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 			}
/******/ 		}
/******/ 		var completeFunction = (fn) => (!--fn.r && fn());
/******/ 		var queueFunction = (queue, fn) => (queue ? queue.push(fn) : completeFunction(fn));
/******/ 		var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 			if(dep !== null && typeof dep === "object") {
/******/ 				if(dep[webpackThen]) return dep;
/******/ 				if(dep.then) {
/******/ 					var queue = [];
/******/ 					dep.then((r) => {
/******/ 						obj[webpackExports] = r;
/******/ 						completeQueue(queue);
/******/ 						queue = 0;
/******/ 					});
/******/ 					var obj = {};
/******/ 												obj[webpackThen] = (fn, reject) => (queueFunction(queue, fn), dep.catch(reject));
/******/ 					return obj;
/******/ 				}
/******/ 			}
/******/ 			var ret = {};
/******/ 								ret[webpackThen] = (fn) => (completeFunction(fn));
/******/ 								ret[webpackExports] = dep;
/******/ 								return ret;
/******/ 		}));
/******/ 		__webpack_require__.a = (module, body, hasAwait) => {
/******/ 			var queue = hasAwait && [];
/******/ 			var exports = module.exports;
/******/ 			var currentDeps;
/******/ 			var outerResolve;
/******/ 			var reject;
/******/ 			var isEvaluating = true;
/******/ 			var nested = false;
/******/ 			var whenAll = (deps, onResolve, onReject) => {
/******/ 				if (nested) return;
/******/ 				nested = true;
/******/ 				onResolve.r += deps.length;
/******/ 				deps.map((dep, i) => (dep[webpackThen](onResolve, onReject)));
/******/ 				nested = false;
/******/ 			};
/******/ 			var promise = new Promise((resolve, rej) => {
/******/ 				reject = rej;
/******/ 				outerResolve = () => (resolve(exports), completeQueue(queue), queue = 0);
/******/ 			});
/******/ 			promise[webpackExports] = exports;
/******/ 			promise[webpackThen] = (fn, rejectFn) => {
/******/ 				if (isEvaluating) { return completeFunction(fn); }
/******/ 				if (currentDeps) whenAll(currentDeps, fn, rejectFn);
/******/ 				queueFunction(queue, fn);
/******/ 				promise.catch(rejectFn);
/******/ 			};
/******/ 			module.exports = promise;
/******/ 			body((deps) => {
/******/ 				if(!deps) return outerResolve();
/******/ 				currentDeps = wrapDeps(deps);
/******/ 				var fn, result;
/******/ 				var promise = new Promise((resolve, reject) => {
/******/ 					fn = () => (resolve(result = currentDeps.map((d) => (d[webpackExports]))));
/******/ 					fn.r = 0;
/******/ 					whenAll(currentDeps, fn, reject);
/******/ 				});
/******/ 				return fn.r ? promise : result;
/******/ 			}).then(outerResolve, reject);
/******/ 			isEvaluating = false;
/******/ 		};
/******/ 	})();
/******/ 	
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
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/wasm loading */
/******/ 	(() => {
/******/ 		__webpack_require__.v = (exports, wasmModuleId, wasmModuleHash, importsObj) => {
/******/ 			var req = fetch(__webpack_require__.p + "" + wasmModuleHash + ".module.wasm");
/******/ 			if (typeof WebAssembly.instantiateStreaming === 'function') {
/******/ 				return WebAssembly.instantiateStreaming(req, importsObj)
/******/ 					.then((res) => (Object.assign(exports, res.instance.exports)));
/******/ 			}
/******/ 			return req
/******/ 				.then((x) => (x.arrayBuffer()))
/******/ 				.then((bytes) => (WebAssembly.instantiate(bytes, importsObj)))
/******/ 				.then((res) => (Object.assign(exports, res.instance.exports)));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	
/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 12.8 KiB [emitted] (name: main)
asset daa529a2a650ee3943a9.module.wasm 139 bytes [emitted] [immutable] (auxiliary name: main)
chunk (runtime: main) output.js (main) 696 bytes (javascript) 139 bytes (webassembly) 3.36 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 3.36 KiB 6 modules
  dependent modules 449 bytes (javascript) 139 bytes (webassembly) [dependent] 4 modules
  ./example.js 247 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack 5.51.1 compiled successfully
```

## Production mode

```
asset output.js 2.34 KiB [emitted] [minimized] (name: main)
asset 05aa07f6a3836ded50d1.module.wasm 139 bytes [emitted] [immutable] (auxiliary name: main)
chunk (runtime: main) output.js (main) 696 bytes (javascript) 139 bytes (webassembly) 3.09 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 3.09 KiB 5 modules
  dependent modules 449 bytes (javascript) 139 bytes (webassembly) [dependent] 4 modules
  ./example.js 247 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack 5.51.1 compiled successfully
```
