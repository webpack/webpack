# example.js

```javascript
import await { get, set, getNumber } from "./magic.js";

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
export await * from "./magic.wat";
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
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, module, __webpack_require__.* */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
module.exports = (async () => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _magic_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./magic.js */ 1);
_magic_js__WEBPACK_IMPORTED_MODULE_0__ = await Promise.resolve(_magic_js__WEBPACK_IMPORTED_MODULE_0__);


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

return __webpack_exports__;
})();

/***/ }),
/* 1 */
/*!******************!*\
  !*** ./magic.js ***!
  \******************/
/*! export get [provided] [no usage info] [missing usage info prevents renaming] */
/*! export getNumber [provided] [no usage info] [missing usage info prevents renaming] */
/*! export set [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.r, module, __webpack_require__.* */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
module.exports = (async () => {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "get": () => /* reexport safe */ _magic_wat__WEBPACK_IMPORTED_MODULE_0__.get,
/* harmony export */   "getNumber": () => /* reexport safe */ _magic_wat__WEBPACK_IMPORTED_MODULE_0__.getNumber,
/* harmony export */   "set": () => /* reexport safe */ _magic_wat__WEBPACK_IMPORTED_MODULE_0__.set
/* harmony export */ });
/* harmony import */ var _magic_wat__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./magic.wat */ 2);
_magic_wat__WEBPACK_IMPORTED_MODULE_0__ = await Promise.resolve(_magic_wat__WEBPACK_IMPORTED_MODULE_0__);
// reexporting


return __webpack_exports__;
})();

/***/ }),
/* 2 */
/*!*******************!*\
  !*** ./magic.wat ***!
  \*******************/
/*! export get [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! export getNumber [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! export set [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module, __webpack_exports__, __webpack_require__.v, __webpack_require__, __webpack_require__.* */
/***/ ((module, exports, __webpack_require__) => {

/* harmony import */ var WEBPACK_IMPORTED_MODULE_0 = __webpack_require__(/*! ./memory.js */ 3);

/* harmony import */ var WEBPACK_IMPORTED_MODULE_1 = __webpack_require__(/*! ./magic-number.js */ 4);

module.exports = Promise.resolve(WEBPACK_IMPORTED_MODULE_0).then(function(WEBPACK_IMPORTED_MODULE_0) { return __webpack_require__.v(exports, module.i, {
	"./memory.js": {
		"memory": WEBPACK_IMPORTED_MODULE_0.memory
	},
	"./magic-number.js": {
		"getRandomNumber": WEBPACK_IMPORTED_MODULE_1.getRandomNumber
	}
}); })

/***/ }),
/* 3 */
/*!*******************!*\
  !*** ./memory.js ***!
  \*******************/
/*! export memory [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.r, module, __webpack_require__.* */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
module.exports = (async () => {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "memory": () => /* binding */ memory
/* harmony export */ });
async function getMemoryFromParentInWorker() {
	await new Promise(r => setTimeout(r, 200));
	// fake
	return new WebAssembly.Memory({ initial: 1 });
}

const memory = await getMemoryFromParentInWorker();

return __webpack_exports__;
})();

/***/ }),
/* 4 */
/*!*************************!*\
  !*** ./magic-number.js ***!
  \*************************/
/*! export getNumber [provided] [no usage info] [missing usage info prevents renaming] */
/*! export getRandomNumber [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getNumber": () => /* binding */ getNumber,
/* harmony export */   "getRandomNumber": () => /* binding */ getRandomNumber
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
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(hasOwnProperty.call(definition, key) && !hasOwnProperty.call(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
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
/******/ 		__webpack_require__.v = function(exports, wasmModuleId, importsObj) {
/******/ 			var req = fetch(__webpack_require__.p + "" + {"2":"594f5a209057602bfc3f"}[wasmModuleId] + ".module.wasm");
/******/ 			if(typeof WebAssembly.instantiateStreaming === 'function') {
/******/ 				return WebAssembly.instantiateStreaming(req, importsObj)
/******/ 					.then(function(res) { return Object.assign(exports, res.instance.exports); });
/******/ 			}
/******/ 			return req
/******/ 				.then(function(x) { return x.arrayBuffer(); })
/******/ 				.then(function(bytes) { return WebAssembly.instantiate(bytes, importsObj); })
/******/ 				.then(function(res) { return Object.assign(exports, res.instance.exports); });
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
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
                           Asset       Size
594f5a209057602bfc3f.module.wasm  139 bytes  [emitted] [immutable]  [name: (main)]
                       output.js    8.7 KiB  [emitted]              [name: main]
Entrypoint main = output.js (594f5a209057602bfc3f.module.wasm)
chunk output.js (main) 708 bytes (javascript) 139 bytes (webassembly) 1.24 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 253 bytes [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 ./magic-number.js 124 bytes [built]
     [exports: getNumber, getRandomNumber]
     [used exports unknown]
     wasm import ./magic-number.js ./magic.wat
 ./magic.js 50 bytes [built]
     [exports: get, getNumber, set]
     [used exports unknown]
     harmony side effect evaluation ./magic.js ./example.js 1:0-55
     harmony import specifier ./magic.js ./example.js 4:12-15
     harmony import specifier ./magic.js ./example.js 5:0-3
     harmony import specifier ./magic.js ./example.js 6:12-15
     harmony import specifier ./magic.js ./example.js 7:0-3
     harmony import specifier ./magic.js ./example.js 8:12-15
     harmony import specifier ./magic.js ./example.js 11:12-21
     harmony import specifier ./magic.js ./example.js 12:12-21
     harmony import specifier ./magic.js ./example.js 13:12-21
 ./magic.wat 70 bytes (javascript) 139 bytes (webassembly) [built]
     [exports: get, getNumber, set]
     [used exports unknown]
     harmony side effect evaluation ./magic.wat ./magic.js 2:0-34
     harmony export imported specifier ./magic.wat ./magic.js 2:0-34
 ./memory.js 211 bytes [built]
     [exports: memory]
     [used exports unknown]
     wasm import ./memory.js ./magic.wat
     + 4 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
                           Asset       Size
4636ea8e62e0734a195f.module.wasm  139 bytes  [emitted] [immutable]  [name: (main)]
                       output.js   1.59 KiB  [emitted]              [name: main]
Entrypoint main = output.js (4636ea8e62e0734a195f.module.wasm)
chunk output.js (main) 708 bytes (javascript) 139 bytes (webassembly) 999 bytes (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 253 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./magic-number.js 124 bytes [built]
     [exports: getNumber, getRandomNumber]
     [only some exports used: getRandomNumber]
     wasm import ./magic-number.js ./magic.wat
 ./magic.js 50 bytes [built]
     [exports: get, getNumber, set]
     [all exports used]
     harmony side effect evaluation ./magic.js ./example.js 1:0-55
     harmony import specifier ./magic.js ./example.js 4:12-15
     harmony import specifier ./magic.js ./example.js 5:0-3
     harmony import specifier ./magic.js ./example.js 6:12-15
     harmony import specifier ./magic.js ./example.js 7:0-3
     harmony import specifier ./magic.js ./example.js 8:12-15
     harmony import specifier ./magic.js ./example.js 11:12-21
     harmony import specifier ./magic.js ./example.js 12:12-21
     harmony import specifier ./magic.js ./example.js 13:12-21
 ./magic.wat 70 bytes (javascript) 139 bytes (webassembly) [built]
     [exports: get, getNumber, set]
     [all exports used]
     harmony side effect evaluation ./magic.wat ./magic.js 2:0-34
     harmony export imported specifier ./magic.wat ./magic.js 2:0-34
 ./memory.js 211 bytes [built]
     [exports: memory]
     [all exports used]
     wasm import ./memory.js ./magic.wat
     + 3 hidden chunk modules
```
