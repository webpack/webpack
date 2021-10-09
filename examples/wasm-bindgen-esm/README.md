This is a simple example that shows the usage of an ES module packaging around a Rust module, built by wasm-pack.

The ES module can be imported like other async modules with `import` or `import()`.
When importing, the underlying WebAssembly module is downloaded and instantiated in a streaming way.

# example.js

```javascript
import { greeting } from "./pkg";

document.write(greeting('Bob'));
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
/* harmony import */ var _pkg__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./pkg */ 1);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_pkg__WEBPACK_IMPORTED_MODULE_0__]);
_pkg__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? await __webpack_async_dependencies__ : __webpack_async_dependencies__)[0];


document.write((0,_pkg__WEBPACK_IMPORTED_MODULE_0__.greeting)('Bob'));


});

/***/ }),
/* 1 */
/*!***************************!*\
  !*** ./pkg/hi_wasm_bg.js ***!
  \***************************/
/*! namespace exports */
/*! export greeting [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, module, __webpack_require__.a, __webpack_require__.d, __webpack_require__.* */
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__) => {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "greeting": () => (/* binding */ greeting)
/* harmony export */ });
/* harmony import */ var _hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./hi_wasm_bg.wasm */ 2);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__]);
_hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? await __webpack_async_dependencies__ : __webpack_async_dependencies__)[0];


let WASM_VECTOR_LEN = 0;

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== _hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(_hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__.memory.buffer);
    }
    return cachegetUint8Memory0;
}

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== _hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(_hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__.memory.buffer);
    }
    return cachegetInt32Memory0;
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}
/**
* @param {string} name
* @returns {string}
*/
function greeting(name) {
    try {
        const retptr = _hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__.__wbindgen_add_to_stack_pointer(-16);
        var ptr0 = passStringToWasm0(name, _hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__.__wbindgen_malloc, _hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        _hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__.greeting(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        _hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__.__wbindgen_add_to_stack_pointer(16);
        _hi_wasm_bg_wasm__WEBPACK_IMPORTED_MODULE_0__.__wbindgen_free(r0, r1);
    }
}


});

/***/ }),
/* 2 */
/*!*****************************!*\
  !*** ./pkg/hi_wasm_bg.wasm ***!
  \*****************************/
/*! namespace exports */
/*! export __wbindgen_add_to_stack_pointer [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! export __wbindgen_free [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! export __wbindgen_malloc [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! export __wbindgen_realloc [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! export greeting [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! export memory [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module, module.id, __webpack_exports__, __webpack_require__.v, __webpack_require__.* */
/***/ ((module, exports, __webpack_require__) => {

module.exports = __webpack_require__.v(exports, module.id, "ffe21e855d11d22ab54f");

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
/******/ 			var req = fetch(__webpack_require__.p + "" + wasmModuleHash + ".wasm");
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
asset ffe21e855d11d22ab54f.wasm 14.8 KiB [emitted] [immutable] (auxiliary name: main)
asset output.js 12.8 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 3.03 KiB (javascript) 14.8 KiB (webassembly) 3.35 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 3.35 KiB 6 modules
  dependent modules 2.97 KiB (javascript) 14.8 KiB (webassembly) [dependent] 2 modules
  ./example.js 69 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack 5.53.0 compiled successfully
```

## Production mode

```
asset f7199313c1125f249cd6.wasm 14.8 KiB [emitted] [immutable] (auxiliary name: main)
asset output.js 2.96 KiB [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 3.03 KiB (javascript) 14.8 KiB (webassembly) 3.08 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 3.08 KiB 5 modules
  dependent modules 2.97 KiB (javascript) 14.8 KiB (webassembly) [dependent] 2 modules
  ./example.js 69 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack 5.53.0 compiled successfully
```
