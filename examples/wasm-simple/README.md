This very simple example shows usage of WebAssembly.

WebAssembly modules can be imported like other modules. Their download and compilation happens in parallel to the download and evaluation of the javascript chunk.

# example.js

``` javascript
import("./add.wasm").then(addModule => {
	console.log(addModule.add(22, 2200));
	import("./math").then(math => {
		console.log(math.add(10, 101));
		console.log(math.factorial(15));
		console.log(math.factorialJavascript(15));
		console.log(math.fibonacci(15));
		console.log(math.fibonacciJavascript(15));
		timed("wasm factorial", () => math.factorial(1500));
		timed("js factorial", () => math.factorialJavascript(1500));
		timed("wasm fibonacci", () => math.fibonacci(22));
		timed("js fibonacci", () => math.fibonacciJavascript(22));
	});
});

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

``` javascript
import { add } from "./add.wasm";
import { factorial } from "./factorial.wasm";
import { fibonacci } from "./fibonacci.wasm";

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

# js/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0], moreModules = data[1], executeModules = data[2];
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [], result;
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		2: 0
/******/ 	};
/******/
/******/ 	var scheduledModules = [];
/******/
/******/ 	// object to store loaded and loading wasm modules
/******/ 	var installedWasmModules = {};
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
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		var promises = [];
/******/
/******/
/******/ 		// JSONP chunk loading for javascript
/******/
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData !== 0) { // 0 means "already installed".
/******/
/******/ 			// a Promise means "currently loading".
/******/ 			if(installedChunkData) {
/******/ 				promises.push(installedChunkData[2]);
/******/ 			} else {
/******/ 				// setup Promise in chunk cache
/******/ 				var promise = new Promise(function(resolve, reject) {
/******/ 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 				});
/******/ 				promises.push(installedChunkData[2] = promise);
/******/
/******/ 				// start chunk loading
/******/ 				var head = document.getElementsByTagName('head')[0];
/******/ 				var script = document.createElement('script');
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120000;
/******/
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				function onScriptComplete(event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				head.appendChild(script);
/******/ 			}
/******/ 		}
/******/
/******/ 		// Fetch + compile chunk loading for webassembly
/******/
/******/ 		var wasmModules = {"0":[1,3,4],"1":[1]}[chunkId] || [];
/******/
/******/ 		wasmModules.forEach(function(wasmModuleId) {
/******/ 			var installedWasmModuleData = installedWasmModules[wasmModuleId];
/******/
/******/ 			// a Promise means "currently loading" or "already loaded".
/******/ 			promises.push(installedWasmModuleData ||
/******/ 				(installedWasmModules[wasmModuleId] = fetch(__webpack_require__.p + "" + {"1":"80925f35a6f1cf550d38","3":"3d28950d91bc7246f5af","4":"1d2268b99656e9575a63"}[wasmModuleId] + ".wasm").then(function(response) {
/******/ 					if(WebAssembly.compileStreaming) {
/******/ 						return WebAssembly.compileStreaming(response);
/******/ 					} else {
/******/ 						return response.arrayBuffer().then(function(bytes) { return WebAssembly.compile(bytes); });
/******/ 					}
/******/ 				}).then(function(module) { __webpack_require__.w[wasmModuleId] = module; }))
/******/ 			);
/******/ 		});
/******/ 		return Promise.all(promises);
/******/ 	};
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
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	// object with all compiled WebAssmbly.Modules
/******/ 	__webpack_require__.w = {};
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var parentJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
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
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__.e/* import() */(1).then(function() { var module = __webpack_require__(/*! ./add.wasm */1); return typeof module === "object" && module && module.__esModule ? module : /* fake namespace object */ { "default": module }; }).then(addModule => {
	console.log(addModule.add(22, 2200));
	__webpack_require__.e/* import() */(0).then(__webpack_require__.bind(null, /*! ./math */2)).then(math => {
		console.log(math.add(10, 101));
		console.log(math.factorial(15));
		console.log(math.factorialJavascript(15));
		console.log(math.fibonacci(15));
		console.log(math.fibonacciJavascript(15));
		timed("wasm factorial", () => math.factorial(1500));
		timed("js factorial", () => math.factorialJavascript(1500));
		timed("wasm fibonacci", () => math.fibonacci(22));
		timed("js fibonacci", () => math.fibonacciJavascript(22));
	});
});

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


/***/ })
/******/ ]);
```

# js/0.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0,1],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./add.wasm ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// Instanciate WebAssembly module
var instance = new WebAssembly.Instance(__webpack_require__.w[module.i], {});

// export exports from WebAssmbly module
module.exports = instance.exports;

/***/ }),
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! exports provided: add, factorial, fibonacci, factorialJavascript, fibonacciJavascript */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is referenced from these modules with unsupported syntax: ./example.js (referenced with import()) */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "factorialJavascript", function() { return factorialJavascript; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fibonacciJavascript", function() { return fibonacciJavascript; });
/* harmony import */ var _add_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./add.wasm */1);
/* harmony import */ var _add_wasm__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_add_wasm__WEBPACK_IMPORTED_MODULE_0__);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "add", function() { return _add_wasm__WEBPACK_IMPORTED_MODULE_0__["add"]; });

/* harmony import */ var _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./factorial.wasm */3);
/* harmony import */ var _factorial_wasm__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_factorial_wasm__WEBPACK_IMPORTED_MODULE_1__);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "factorial", function() { return _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__["factorial"]; });

/* harmony import */ var _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./fibonacci.wasm */4);
/* harmony import */ var _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "fibonacci", function() { return _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__["fibonacci"]; });







function factorialJavascript(i) {
	if(i < 1) return 1;
	return i * factorialJavascript(i - 1);
}

function fibonacciJavascript(i) {
	if(i < 2) return 1;
	return fibonacciJavascript(i - 1) + fibonacciJavascript(i - 2);
}


/***/ }),
/* 3 */
/*!************************!*\
  !*** ./factorial.wasm ***!
  \************************/
/*! no static exports found */
/*! exports used: factorial */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// Instanciate WebAssembly module
var instance = new WebAssembly.Instance(__webpack_require__.w[module.i], {});

// export exports from WebAssmbly module
module.exports = instance.exports;

/***/ }),
/* 4 */
/*!************************!*\
  !*** ./fibonacci.wasm ***!
  \************************/
/*! no static exports found */
/*! exports used: fibonacci */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// Instanciate WebAssembly module
var instance = new WebAssembly.Instance(__webpack_require__.w[module.i], {});

// export exports from WebAssmbly module
module.exports = instance.exports;

/***/ })
]]);
```

# js/1.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./add.wasm ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// Instanciate WebAssembly module
var instance = new WebAssembly.Instance(__webpack_require__.w[module.i], {});

// export exports from WebAssmbly module
module.exports = instance.exports;

/***/ })
]]);
```

# Info

## Uncompressed

```
Hash: ab6e4a9175255d038490
Version: webpack next
                    Asset       Size   Chunks             Chunk Names
              0.output.js   3.78 KiB     0, 1  [emitted]  
80925f35a6f1cf550d38.wasm   41 bytes  0, 1, 1  [emitted]  
3d28950d91bc7246f5af.wasm   62 bytes     0, 1  [emitted]  
1d2268b99656e9575a63.wasm   67 bytes     0, 1  [emitted]  
              1.output.js  557 bytes        1  [emitted]  
                output.js   9.09 KiB        2  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js, 80925f35a6f1cf550d38.wasm, 3d28950d91bc7246f5af.wasm, 1d2268b99656e9575a63.wasm 585 bytes {2} [rendered]
    > [0] ./example.js 3:1-17
    [1] ./add.wasm 41 bytes {0} {1} [built]
        import() ./add.wasm [0] ./example.js 1:0-20
        harmony side effect evaluation ./add.wasm [2] ./math.js 1:0-33
        harmony export imported specifier ./add.wasm [2] ./math.js 5:0-37
    [2] ./math.js 415 bytes {0} [built]
        [exports: add, factorial, fibonacci, factorialJavascript, fibonacciJavascript]
        import() ./math [0] ./example.js 3:1-17
    [3] ./factorial.wasm 62 bytes {0} [built]
        [only some exports used: factorial]
        harmony side effect evaluation ./factorial.wasm [2] ./math.js 2:0-45
        harmony export imported specifier ./factorial.wasm [2] ./math.js 5:0-37
    [4] ./fibonacci.wasm 67 bytes {0} [built]
        [only some exports used: fibonacci]
        harmony side effect evaluation ./fibonacci.wasm [2] ./math.js 3:0-45
        harmony export imported specifier ./fibonacci.wasm [2] ./math.js 5:0-37
chunk    {1} 1.output.js, 80925f35a6f1cf550d38.wasm 41 bytes {2} [rendered]
    > [0] ./example.js 1:0-20
    [1] ./add.wasm 41 bytes {0} {1} [built]
        import() ./add.wasm [0] ./example.js 1:0-20
        harmony side effect evaluation ./add.wasm [2] ./math.js 1:0-33
        harmony export imported specifier ./add.wasm [2] ./math.js 5:0-37
chunk    {2} output.js (main) 788 bytes [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 788 bytes {2} [built]
        single entry .\example.js  main
```

## Minimized (uglify-js, no zip)

```
Hash: ab6e4a9175255d038490
Version: webpack next
 6 assets
Entrypoint main = output.js
chunk    {0} 0.output.js, 80925f35a6f1cf550d38.wasm, 3d28950d91bc7246f5af.wasm, 1d2268b99656e9575a63.wasm 585 bytes {2} [rendered]
    > [0] ./example.js 3:1-17
    [1] ./add.wasm 41 bytes {0} {1} [built]
        import() ./add.wasm [0] ./example.js 1:0-20
        harmony side effect evaluation ./add.wasm [2] ./math.js 1:0-33
        harmony export imported specifier ./add.wasm [2] ./math.js 5:0-37
    [2] ./math.js 415 bytes {0} [built]
        [exports: add, factorial, fibonacci, factorialJavascript, fibonacciJavascript]
        import() ./math [0] ./example.js 3:1-17
    [3] ./factorial.wasm 62 bytes {0} [built]
        [only some exports used: factorial]
        harmony side effect evaluation ./factorial.wasm [2] ./math.js 2:0-45
        harmony export imported specifier ./factorial.wasm [2] ./math.js 5:0-37
    [4] ./fibonacci.wasm 67 bytes {0} [built]
        [only some exports used: fibonacci]
        harmony side effect evaluation ./fibonacci.wasm [2] ./math.js 3:0-45
        harmony export imported specifier ./fibonacci.wasm [2] ./math.js 5:0-37
chunk    {1} 1.output.js, 80925f35a6f1cf550d38.wasm 41 bytes {2} [rendered]
    > [0] ./example.js 1:0-20
    [1] ./add.wasm 41 bytes {0} {1} [built]
        import() ./add.wasm [0] ./example.js 1:0-20
        harmony side effect evaluation ./add.wasm [2] ./math.js 1:0-33
        harmony export imported specifier ./add.wasm [2] ./math.js 5:0-37
chunk    {2} output.js (main) 788 bytes [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 788 bytes {2} [built]
        single entry .\example.js  main

ERROR in output.js from UglifyJs
Unexpected token: operator (>) [output.js:198,240]
```
