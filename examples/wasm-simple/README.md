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
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
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
/*! runtime requirements: __webpack_require__.e, __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

__webpack_require__.e(/*! import() */ 183).then(__webpack_require__.bind(null, /*! ./add.wasm */ 1)).then(addModule => {
	console.log(addModule.add(22, 2200));
	__webpack_require__.e(/*! import() */ 702).then(__webpack_require__.bind(null, /*! ./math */ 2)).then(math => {
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
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) { __webpack_require__.f[key](chunkId, promises); return promises; }, []));
/******/ 		};
/******/ 	}();
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
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			return "" + chunkId + ".output.js";
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	!function() {
/******/ 		
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			404: 0
/******/ 		};
/******/ 		
/******/ 		
/******/ 		
/******/ 		__webpack_require__.f.j = function(chunkId, promises) {
/******/ 			// JSONP chunk loading for javascript
/******/ 			var installedChunkData = installedChunks[chunkId];
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[2]);
/******/ 				} else {
/******/ 					// setup Promise in chunk cache
/******/ 					var promise = new Promise(function(resolve, reject) {
/******/ 						installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 					});
/******/ 					promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 					// start chunk loading
/******/ 					var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 					var loadingEnded = function() { if(installedChunks[chunkId]) return installedChunks[chunkId][1]; if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined; };
/******/ 					var script = document.createElement('script');
/******/ 					var onScriptComplete;
/******/ 		
/******/ 					script.charset = 'utf-8';
/******/ 					script.timeout = 120;
/******/ 					if (__webpack_require__.nc) {
/******/ 						script.setAttribute("nonce", __webpack_require__.nc);
/******/ 					}
/******/ 					script.src = url;
/******/ 		
/******/ 					onScriptComplete = function (event) {
/******/ 						// avoid mem leaks in IE.
/******/ 						script.onerror = script.onload = null;
/******/ 						clearTimeout(timeout);
/******/ 						var reportError = loadingEnded();
/******/ 						if(reportError) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							reportError(error);
/******/ 						}
/******/ 					};
/******/ 					var timeout = setTimeout(function(){
/******/ 						onScriptComplete({ type: 'timeout', target: script });
/******/ 					}, 120000);
/******/ 					script.onerror = script.onload = onScriptComplete;
/******/ 					document.head.appendChild(script);
/******/ 		
/******/ 					// no HMR
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			// no chunk preloading needed
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
/******/ 			var runtime = data[3];
/******/ 		
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/wasm chunk loading */
/******/ 	!function() {
/******/ 		// object to store loaded and loading wasm modules
/******/ 		var installedWasmModules = {};
/******/ 		
/******/ 		function promiseResolve() { return Promise.resolve(); }
/******/ 		
/******/ 		
/******/ 		var wasmImportObjects = {
/******/ 			1: function() {
/******/ 				return {
/******/ 		
/******/ 				};
/******/ 			},
/******/ 			1: function() {
/******/ 				return {
/******/ 		
/******/ 				};
/******/ 			},
/******/ 			3: function() {
/******/ 				return {
/******/ 		
/******/ 				};
/******/ 			},
/******/ 			4: function() {
/******/ 				return {
/******/ 		
/******/ 				};
/******/ 			},
/******/ 		};
/******/ 		
/******/ 		var wasmModuleMap = {
/******/ 			"183": [
/******/ 				1
/******/ 			],
/******/ 			"702": [
/******/ 				1,
/******/ 				3,
/******/ 				4
/******/ 			]
/******/ 		};
/******/ 		
/******/ 		// object with all WebAssembly.instance exports
/******/ 		__webpack_require__.w = {};
/******/ 		
/******/ 		// Fetch + compile chunk loading for webassembly
/******/ 		__webpack_require__.f.wasm = function(chunkId, promises) {
/******/ 		
/******/ 			var wasmModules = wasmModuleMap[chunkId] || [];
/******/ 		
/******/ 			wasmModules.forEach(function(wasmModuleId) {
/******/ 				var installedWasmModuleData = installedWasmModules[wasmModuleId];
/******/ 		
/******/ 				// a Promise means "currently loading" or "already loaded".
/******/ 				if(installedWasmModuleData)
/******/ 					promises.push(installedWasmModuleData);
/******/ 				else {
/******/ 					var importObject = wasmImportObjects[wasmModuleId]();
/******/ 					var req = fetch(__webpack_require__.p + "" + {"1":"30aba380c690e17b4bf0","3":"a6532f8707795812a6b0","4":"c0de8ff404b59fb40223"}[wasmModuleId] + ".wasm");
/******/ 					var promise;
/******/ 					if(importObject instanceof Promise && typeof WebAssembly.compileStreaming === 'function') {
/******/ 						promise = Promise.all([WebAssembly.compileStreaming(req), importObject]).then(function(items) {
/******/ 							return WebAssembly.instantiate(items[0], items[1]);
/******/ 						});
/******/ 					} else if(typeof WebAssembly.instantiateStreaming === 'function') {
/******/ 						promise = WebAssembly.instantiateStreaming(req, importObject);
/******/ 					} else {
/******/ 						var bytesPromise = req.then(function(x) { return x.arrayBuffer(); });
/******/ 						promise = bytesPromise.then(function(bytes) {
/******/ 							return WebAssembly.instantiate(bytes, importObject);
/******/ 						});
/******/ 					}
/******/ 					promises.push(installedWasmModules[wasmModuleId] = promise.then(function(res) {
/******/ 						return __webpack_require__.w[wasmModuleId] = (res.instance || res).exports;
/******/ 					}));
/******/ 				}
/******/ 			});
/******/ 		};
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# dist/183.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[183],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./add.wasm ***!
  \******************/
/*! exports provided: add */
/*! runtime requirements: module, __webpack_require__.w, __webpack_exports__, __webpack_require__ */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// Instantiate WebAssembly module
var wasmExports = __webpack_require__.w[module.i];

// export exports from WebAssembly module
for(var name in wasmExports) if(name != "__webpack_init__") exports[name] = wasmExports[name];
// exec imports from WebAssembly module (for esm order)


// exec wasm module
wasmExports["__webpack_init__"]()

/***/ })
]]);
```

# dist/702.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[702],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./add.wasm ***!
  \******************/
/*! exports provided: add */
/*! runtime requirements: module, __webpack_require__.w, __webpack_exports__, __webpack_require__ */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// Instantiate WebAssembly module
var wasmExports = __webpack_require__.w[module.i];

// export exports from WebAssembly module
for(var name in wasmExports) if(name != "__webpack_init__") exports[name] = wasmExports[name];
// exec imports from WebAssembly module (for esm order)


// exec wasm module
wasmExports["__webpack_init__"]()

/***/ }),
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! exports provided: add, factorial, fibonacci, factorialJavascript, fibonacciJavascript */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__, __webpack_require__.d */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "add", function() { return _add_wasm__WEBPACK_IMPORTED_MODULE_0__["add"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "factorial", function() { return _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__["factorial"]; });
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "fibonacci", function() { return _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__["fibonacci"]; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "factorialJavascript", function() { return factorialJavascript; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fibonacciJavascript", function() { return fibonacciJavascript; });
/* harmony import */ var _add_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./add.wasm */ 1);
/* harmony import */ var _factorial_wasm__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./factorial.wasm */ 3);
/* harmony import */ var _fibonacci_wasm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./fibonacci.wasm */ 4);






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
/*! exports provided: factorial */
/*! runtime requirements: module, __webpack_require__.w, __webpack_exports__, __webpack_require__ */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// Instantiate WebAssembly module
var wasmExports = __webpack_require__.w[module.i];

// export exports from WebAssembly module
for(var name in wasmExports) if(name != "__webpack_init__") exports[name] = wasmExports[name];
// exec imports from WebAssembly module (for esm order)


// exec wasm module
wasmExports["__webpack_init__"]()

/***/ }),
/* 4 */
/*!************************!*\
  !*** ./fibonacci.wasm ***!
  \************************/
/*! exports provided: fibonacci */
/*! runtime requirements: module, __webpack_require__.w, __webpack_exports__, __webpack_require__ */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// Instantiate WebAssembly module
var wasmExports = __webpack_require__.w[module.i];

// export exports from WebAssembly module
for(var name in wasmExports) if(name != "__webpack_init__") exports[name] = wasmExports[name];
// exec imports from WebAssembly module (for esm order)


// exec wasm module
wasmExports["__webpack_init__"]()

/***/ })
]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
                    Asset       Size        Chunks             Chunk Names
            183.output.js  708 bytes         {183}  [emitted]
30aba380c690e17b4bf0.wasm   67 bytes  {183}, {702}  [emitted]
            702.output.js    3.7 KiB         {702}  [emitted]
a6532f8707795812a6b0.wasm   88 bytes         {702}  [emitted]
c0de8ff404b59fb40223.wasm   93 bytes         {702}  [emitted]
                output.js   11.6 KiB         {404}  [emitted]  main
Entrypoint main = output.js
chunk {183} 183.output.js, 30aba380c690e17b4bf0.wasm 100 bytes (javascript) 41 bytes (webassembly) <{404}> [rendered]
    > ./add.wasm [0] ./example.js 1:0-20
 [1] ./add.wasm 100 bytes (javascript) 41 bytes (webassembly) {183} {702} [built]
     [exports: add]
     [used exports unknown]
     import() ./add.wasm [0] ./example.js 1:0-20
     harmony side effect evaluation ./add.wasm [2] ./math.js 1:0-33
     harmony export imported specifier ./add.wasm [2] ./math.js 5:0-37
chunk {404} output.js (main) 762 bytes (javascript) 5.96 KiB (runtime) >{183}< >{702}< [entry] [rendered]
    > .\example.js main
 [0] ./example.js 762 bytes {404} [built]
     [used exports unknown]
     entry .\example.js main
     + 7 hidden chunk modules
chunk {702} 702.output.js, 30aba380c690e17b4bf0.wasm, a6532f8707795812a6b0.wasm, c0de8ff404b59fb40223.wasm 700 bytes (javascript) 170 bytes (webassembly) <{404}> [rendered]
    > ./math [0] ./example.js 3:1-17
 [1] ./add.wasm 100 bytes (javascript) 41 bytes (webassembly) {183} {702} [built]
     [exports: add]
     [used exports unknown]
     import() ./add.wasm [0] ./example.js 1:0-20
     harmony side effect evaluation ./add.wasm [2] ./math.js 1:0-33
     harmony export imported specifier ./add.wasm [2] ./math.js 5:0-37
 [2] ./math.js 400 bytes {702} [built]
     [exports: add, factorial, fibonacci, factorialJavascript, fibonacciJavascript]
     [used exports unknown]
     import() ./math [0] ./example.js 3:1-17
 [3] ./factorial.wasm 100 bytes (javascript) 62 bytes (webassembly) {702} [built]
     [exports: factorial]
     [used exports unknown]
     harmony side effect evaluation ./factorial.wasm [2] ./math.js 2:0-45
     harmony export imported specifier ./factorial.wasm [2] ./math.js 5:0-37
 [4] ./fibonacci.wasm 100 bytes (javascript) 67 bytes (webassembly) {702} [built]
     [exports: fibonacci]
     [used exports unknown]
     harmony side effect evaluation ./fibonacci.wasm [2] ./math.js 3:0-45
     harmony export imported specifier ./fibonacci.wasm [2] ./math.js 5:0-37
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
                    Asset       Size        Chunks             Chunk Names
            183.output.js  189 bytes         {183}  [emitted]
517a0da5a1df44a00c72.wasm   70 bytes  {183}, {702}  [emitted]
5c505fd3c48799e0340d.wasm   67 bytes  {183}, {702}  [emitted]
            702.output.js  699 bytes  {183}, {702}  [emitted]
b8cc0ef8f69c2d0eaeba.wasm   65 bytes  {183}, {702}  [emitted]
                output.js   3.06 KiB         {404}  [emitted]  main
Entrypoint main = output.js
chunk {183} 183.output.js, 5c505fd3c48799e0340d.wasm 100 bytes (javascript) 41 bytes (webassembly) <{404}> [rendered]
    > ./add.wasm [275] ./example.js 1:0-20
 [183] ./add.wasm 100 bytes (javascript) 41 bytes (webassembly) {183} {702} [built]
       [exports: add]
       import() ./add.wasm [275] ./example.js 1:0-20
       harmony side effect evaluation ./add.wasm [702] ./math.js 1:0-33
       harmony export imported specifier ./add.wasm [702] ./math.js 5:0-37
chunk {404} output.js (main) 762 bytes (javascript) 5.98 KiB (runtime) >{183}< >{702}< [entry] [rendered]
    > .\example.js main
 [275] ./example.js 762 bytes {404} [built]
       entry .\example.js main
     + 7 hidden chunk modules
chunk {702} 702.output.js, 5c505fd3c48799e0340d.wasm, 517a0da5a1df44a00c72.wasm, b8cc0ef8f69c2d0eaeba.wasm 700 bytes (javascript) 170 bytes (webassembly) <{404}> [rendered]
    > ./math [275] ./example.js 3:1-17
 [183] ./add.wasm 100 bytes (javascript) 41 bytes (webassembly) {183} {702} [built]
       [exports: add]
       import() ./add.wasm [275] ./example.js 1:0-20
       harmony side effect evaluation ./add.wasm [702] ./math.js 1:0-33
       harmony export imported specifier ./add.wasm [702] ./math.js 5:0-37
 [323] ./fibonacci.wasm 100 bytes (javascript) 67 bytes (webassembly) {702} [built]
       [exports: fibonacci]
       [all exports used]
       harmony side effect evaluation ./fibonacci.wasm [702] ./math.js 3:0-45
       harmony export imported specifier ./fibonacci.wasm [702] ./math.js 5:0-37
 [702] ./math.js 400 bytes {702} [built]
       [exports: add, factorial, fibonacci, factorialJavascript, fibonacciJavascript]
       import() ./math [275] ./example.js 3:1-17
 [707] ./factorial.wasm 100 bytes (javascript) 62 bytes (webassembly) {702} [built]
       [exports: factorial]
       [all exports used]
       harmony side effect evaluation ./factorial.wasm [702] ./math.js 2:0-45
       harmony export imported specifier ./factorial.wasm [702] ./math.js 5:0-37
```
