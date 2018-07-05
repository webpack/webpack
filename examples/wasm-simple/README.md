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

# dist/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
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
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// Promise = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		2: 0
/******/ 	};
/******/
/******/
/******/
/******/ 	// script path function
/******/ 	function jsonpScriptSrc(chunkId) {
/******/ 		return __webpack_require__.p + "" + chunkId + ".output.js"
/******/ 	}
/******/
/******/ 	// object to store loaded and loading wasm modules
/******/ 	var installedWasmModules = {};
/******/
/******/ 	var wasmImportObjects = {
/******/ 		1: function() {
/******/ 			return {
/******/
/******/ 			};
/******/ 		},
/******/ 		3: function() {
/******/ 			return {
/******/
/******/ 			};
/******/ 		},
/******/ 		4: function() {
/******/ 			return {
/******/
/******/ 			};
/******/ 		},
/******/ 		1: function() {
/******/ 			return {
/******/
/******/ 			};
/******/ 		},
/******/ 	};
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
/******/
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = jsonpScriptSrc(chunkId);
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
/******/ 			if(installedWasmModuleData)
/******/ 				promises.push(installedWasmModuleData);
/******/ 			else {
/******/ 				var importObject = wasmImportObjects[wasmModuleId]();
/******/ 				var req = fetch(__webpack_require__.p + "" + {"1":"30aba380c690e17b4bf0","3":"061d333ce184178519f1","4":"8ac55ff8d1119fe3b24f"}[wasmModuleId] + ".wasm");
/******/ 				var promise;
/******/ 				if(importObject instanceof Promise && typeof WebAssembly.compileStreaming === 'function') {
/******/ 					promise = Promise.all([WebAssembly.compileStreaming(req), importObject]).then(function(items) {
/******/ 						return WebAssembly.instantiate(items[0], items[1]);
/******/ 					});
/******/ 				} else if(typeof WebAssembly.instantiateStreaming === 'function') {
/******/ 					promise = WebAssembly.instantiateStreaming(req, importObject);
/******/ 				} else {
/******/ 					var bytesPromise = req.then(function(x) { return x.arrayBuffer(); });
/******/ 					promise = bytesPromise.then(function(bytes) {
/******/ 						return WebAssembly.instantiate(bytes, importObject);
/******/ 					});
/******/ 				}
/******/ 				promises.push(installedWasmModules[wasmModuleId] = promise.then(function(res) {
/******/ 					return __webpack_require__.w[wasmModuleId] = res.instance || res;
/******/ 				}));
/******/ 			}
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
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	// object with all WebAssembly.instance
/******/ 	__webpack_require__.w = {};
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
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
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__.e(/*! import() */ 1).then(__webpack_require__.bind(null, /*! ./add.wasm */ 1)).then(addModule => {
	console.log(addModule.add(22, 2200));
	__webpack_require__.e(/*! import() */ 0).then(__webpack_require__.bind(null, /*! ./math */ 2)).then(math => {
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

# dist/0.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./add.wasm ***!
  \******************/
/*! exports provided: add */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// Instantiate WebAssembly module
var instance = __webpack_require__.w[module.i];
// export exports from WebAssembly module
module.exports = instance.exports;
// exec imports from WebAssembly module (for esm order)

// exec wasm module
instance.exports.__webpack_init__()

/***/ }),
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! exports provided: add, factorial, fibonacci, factorialJavascript, fibonacciJavascript */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "factorialJavascript", function() { return factorialJavascript; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fibonacciJavascript", function() { return fibonacciJavascript; });
/* harmony import */ var _add_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./add.wasm */ 1);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "add", function() { return _add_wasm__WEBPACK_IMPORTED_MODULE_0__["add"]; });

/* harmony import */ var _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./factorial.wasm */ 4);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "factorial", function() { return _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__["factorial"]; });

/* harmony import */ var _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./fibonacci.wasm */ 3);
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
  !*** ./fibonacci.wasm ***!
  \************************/
/*! exports provided: fibonacci */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// Instantiate WebAssembly module
var instance = __webpack_require__.w[module.i];
// export exports from WebAssembly module
module.exports = instance.exports;
// exec imports from WebAssembly module (for esm order)

// exec wasm module
instance.exports.__webpack_init__()

/***/ }),
/* 4 */
/*!************************!*\
  !*** ./factorial.wasm ***!
  \************************/
/*! exports provided: factorial */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// Instantiate WebAssembly module
var instance = __webpack_require__.w[module.i];
// export exports from WebAssembly module
module.exports = instance.exports;
// exec imports from WebAssembly module (for esm order)

// exec wasm module
instance.exports.__webpack_init__()

/***/ })
]]);
```

# dist/1.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./add.wasm ***!
  \******************/
/*! exports provided: add */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// Instantiate WebAssembly module
var instance = __webpack_require__.w[module.i];
// export exports from WebAssembly module
module.exports = instance.exports;
// exec imports from WebAssembly module (for esm order)

// exec wasm module
instance.exports.__webpack_init__()

/***/ })
]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
                    Asset          Size  Chunks             Chunk Names
              0.output.js       3.1 KiB       0  [emitted]  
30aba380c690e17b4bf0.wasm  unknown size    0, 1  [emitted]  
061d333ce184178519f1.wasm  unknown size       0  [emitted]  
8ac55ff8d1119fe3b24f.wasm  unknown size       0  [emitted]  
              1.output.js     542 bytes       1  [emitted]  
                output.js      10.2 KiB       2  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js, 30aba380c690e17b4bf0.wasm, 061d333ce184178519f1.wasm, 8ac55ff8d1119fe3b24f.wasm 570 bytes <{2}> [rendered]
    > ./math [0] ./example.js 3:1-17
 [1] ./add.wasm 41 bytes {0} {1} [built]
     [exports: add]
     import() ./add.wasm [0] ./example.js 1:0-20
     harmony side effect evaluation ./add.wasm [2] ./math.js 1:0-33
     harmony export imported specifier ./add.wasm [2] ./math.js 5:0-37
 [2] ./math.js 400 bytes {0} [built]
     [exports: add, factorial, fibonacci, factorialJavascript, fibonacciJavascript]
     import() ./math [0] ./example.js 3:1-17
 [3] ./fibonacci.wasm 67 bytes {0} [built]
     [exports: fibonacci]
     harmony side effect evaluation ./fibonacci.wasm [2] ./math.js 3:0-45
     harmony export imported specifier ./fibonacci.wasm [2] ./math.js 5:0-37
 [4] ./factorial.wasm 62 bytes {0} [built]
     [exports: factorial]
     harmony side effect evaluation ./factorial.wasm [2] ./math.js 2:0-45
     harmony export imported specifier ./factorial.wasm [2] ./math.js 5:0-37
chunk    {1} 1.output.js, 30aba380c690e17b4bf0.wasm 41 bytes <{2}> [rendered]
    > ./add.wasm [0] ./example.js 1:0-20
 [1] ./add.wasm 41 bytes {0} {1} [built]
     [exports: add]
     import() ./add.wasm [0] ./example.js 1:0-20
     harmony side effect evaluation ./add.wasm [2] ./math.js 1:0-33
     harmony export imported specifier ./add.wasm [2] ./math.js 5:0-37
chunk    {2} output.js (main) 762 bytes >{0}< >{1}< [entry] [rendered]
    > .\example.js main
 [0] ./example.js 762 bytes {2} [built]
     single entry .\example.js  main
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
                    Asset          Size   Chunks             Chunk Names
              0.output.js     722 bytes     0, 1  [emitted]  
9e0b33732e07ce9eacd3.wasm  unknown size  0, 1, 1  [emitted]  
52a9b4a4020ad3ef6f0b.wasm  unknown size     0, 1  [emitted]  
68db91566fc0884f2a9b.wasm  unknown size     0, 1  [emitted]  
              1.output.js     155 bytes        1  [emitted]  
                output.js      2.92 KiB        2  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js, 9e0b33732e07ce9eacd3.wasm, 52a9b4a4020ad3ef6f0b.wasm, 68db91566fc0884f2a9b.wasm 570 bytes <{2}> [rendered]
    > ./math [0] ./example.js 3:1-17
 [1] ./add.wasm 41 bytes {0} {1} [built]
     [exports: add]
     import() ./add.wasm [0] ./example.js 1:0-20
     harmony side effect evaluation ./add.wasm [2] ./math.js 1:0-33
     harmony export imported specifier ./add.wasm [2] ./math.js 5:0-37
 [2] ./math.js 400 bytes {0} [built]
     [exports: add, factorial, fibonacci, factorialJavascript, fibonacciJavascript]
     import() ./math [0] ./example.js 3:1-17
 [3] ./fibonacci.wasm 67 bytes {0} [built]
     [exports: fibonacci]
     [all exports used]
     harmony side effect evaluation ./fibonacci.wasm [2] ./math.js 3:0-45
     harmony export imported specifier ./fibonacci.wasm [2] ./math.js 5:0-37
 [4] ./factorial.wasm 62 bytes {0} [built]
     [exports: factorial]
     [all exports used]
     harmony side effect evaluation ./factorial.wasm [2] ./math.js 2:0-45
     harmony export imported specifier ./factorial.wasm [2] ./math.js 5:0-37
chunk    {1} 1.output.js, 9e0b33732e07ce9eacd3.wasm 41 bytes <{2}> [rendered]
    > ./add.wasm [0] ./example.js 1:0-20
 [1] ./add.wasm 41 bytes {0} {1} [built]
     [exports: add]
     import() ./add.wasm [0] ./example.js 1:0-20
     harmony side effect evaluation ./add.wasm [2] ./math.js 1:0-33
     harmony export imported specifier ./add.wasm [2] ./math.js 5:0-37
chunk    {2} output.js (main) 762 bytes >{0}< >{1}< [entry] [rendered]
    > .\example.js main
 [0] ./example.js 762 bytes {2} [built]
     single entry .\example.js  main
```
