# Using WebAssembly compiled by Emscripten (or any external runtime)

Tools like **Emscripten** (and other C/C++/Rust toolchains) emit a `.wasm`
binary plus a JavaScript "glue" module that **instantiates the wasm itself** —
it builds the import object, provides memory, runs constructors and reads back
the exports. Because only the glue can build that import object, webpack must
**not** instantiate the module; routing the `.wasm` through the normal
`webassembly/async` _instantiation_ path fails with
`export 'default' ... was not found` (webpack instantiates and exposes the raw
wasm exports, which is not what the glue expects).

The fix is a **WebAssembly source-phase import** (`import source`). webpack still
treats the `.wasm` as a first-class async WebAssembly module — it is fetched,
compiled, content-hashed and code-split — but it stops at _compile_ and hands
the consumer the `WebAssembly.Module`. The glue then instantiates it through
Emscripten's official `instantiateWasm` hook.

No `asset/resource`, no `locateFile`, no `resolve.fallback: { fs: false }`, no
`copy-webpack-plugin`.

> The `emscripten-module.js` here is a tiny stand-in that mirrors the contract
> of real Emscripten `-sMODULARIZE -sEXPORT_ES6` output (a default-exported
> factory honoring `Module.instantiateWasm`). Swap in your real glue unchanged.

# example.js

```javascript
import source programWasm from "./program.wasm";
import createModule from "./emscripten-module";

// webpack fetches and compiles program.wasm through its async WebAssembly
// pipeline (content-hashed, code-split-capable) and hands us the compiled
// WebAssembly.Module. The glue then instantiates it, supplying the imports
// webpack cannot know about.
createModule({
	onLog: (value) => console.log("wasm logged:", value),
	instantiateWasm(imports, receiveInstance) {
		WebAssembly.instantiate(programWasm, imports).then((instance) =>
			receiveInstance(instance, programWasm)
		);
		return {}; // signal that instantiation happens asynchronously
	}
}).then((Module) => {
	console.log("run(10) =", Module.run(10));
});
```

# emscripten-module.js

```javascript
// Minimal stand-in for the JS "glue" Emscripten emits with
// `-sMODULARIZE -sEXPORT_ES6`. Real glue is large and minified, but the
// contract a bundler must satisfy is small: a default-exported factory that
// owns wasm instantiation and honors the `instantiateWasm` escape hatch.
export default function createModule(moduleArg = {}) {
	const Module = moduleArg;

	// The import object the wasm needs. Only the glue knows how to build it,
	// which is why webpack cannot instantiate the module itself.
	const imports = {
		env: {
			log(value) {
				if (Module.onLog) Module.onLog(value);
			}
		}
	};

	return new Promise((resolve, reject) => {
		const receiveInstance = (instance) => {
			Module.run = (n) => instance.exports.run(n);
			resolve(Module);
		};

		// Emscripten's official hook: hand instantiation to the embedder.
		if (Module.instantiateWasm) {
			Module.instantiateWasm(imports, receiveInstance);
			return;
		}

		reject(new Error("This minimal glue requires an instantiateWasm hook"));
	});
}
```

# webpack.config.js

```javascript
"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	module: {
		rules: [
			{
				test: /\.wasm$/,
				type: "webassembly/async"
			}
		]
	},
	experiments: {
		// `import source` for WebAssembly: compile (not instantiate) the module.
		asyncWebAssembly: true,
		sourceImport: true
	},
	optimization: {
		chunkIds: "deterministic" // keep filenames stable between modes
	}
};

module.exports = config;
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

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _program_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./program.wasm */ 1);
/* harmony import */ var _emscripten_module__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./emscripten-module */ 2);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_program_wasm__WEBPACK_IMPORTED_MODULE_0__]);
var __webpack_async_dependencies_result__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);
_program_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_async_dependencies_result__[0];



// webpack fetches and compiles program.wasm through its async WebAssembly
// pipeline (content-hashed, code-split-capable) and hands us the compiled
// WebAssembly.Module. The glue then instantiates it, supplying the imports
// webpack cannot know about.
(0,_emscripten_module__WEBPACK_IMPORTED_MODULE_1__["default"])({
	onLog: (value) => console.log("wasm logged:", value),
	instantiateWasm(imports, receiveInstance) {
		WebAssembly.instantiate(_program_wasm__WEBPACK_IMPORTED_MODULE_0__["default"], imports).then((instance) =>
			receiveInstance(instance, _program_wasm__WEBPACK_IMPORTED_MODULE_0__["default"])
		);
		return {}; // signal that instantiation happens asynchronously
	}
}).then((Module) => {
	console.log("run(10) =", Module.run(10));
});

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),
/* 1 */
/*!**********************!*\
  !*** ./program.wasm ***!
  \**********************/
/*! namespace exports */
/*! export default [provided] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module, module.id, __webpack_exports__, __webpack_require__.vs, __webpack_require__.a, __webpack_require__.d, __webpack_require__.* */
/***/ ((module, exports, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => {
	try {
	var __webpack_wasm_module__ = await __webpack_require__.vs(module.id, "f052564a523e50ee50a2");
	__webpack_require__.d(exports, { "default": () => (__webpack_wasm_module__) });
	__webpack_async_result__();
	} catch(e) { __webpack_async_result__(e); }
}, 1);

/***/ }),
/* 2 */
/*!******************************!*\
  !*** ./emscripten-module.js ***!
  \******************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ createModule)
/* harmony export */ });
// Minimal stand-in for the JS "glue" Emscripten emits with
// `-sMODULARIZE -sEXPORT_ES6`. Real glue is large and minified, but the
// contract a bundler must satisfy is small: a default-exported factory that
// owns wasm instantiation and honors the `instantiateWasm` escape hatch.
function createModule(moduleArg = {}) {
	const Module = moduleArg;

	// The import object the wasm needs. Only the glue knows how to build it,
	// which is why webpack cannot instantiate the module itself.
	const imports = {
		env: {
			log(value) {
				if (Module.onLog) Module.onLog(value);
			}
		}
	};

	return new Promise((resolve, reject) => {
		const receiveInstance = (instance) => {
			Module.run = (n) => instance.exports.run(n);
			resolve(Module);
		};

		// Emscripten's official hook: hand instantiation to the embedder.
		if (Module.instantiateWasm) {
			Module.instantiateWasm(imports, receiveInstance);
			return;
		}

		reject(new Error("This minimal glue requires an instantiateWasm hook"));
	});
}


/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
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
/******/ 		const webpackQueues = Symbol("webpack queues");
/******/ 		const webpackExports = Symbol("webpack exports");
/******/ 		const webpackError = Symbol("webpack error");
/******/ 		
/******/ 		const resolveQueue = (queue) => {
/******/ 			if(queue?.d < 1) {
/******/ 				queue.d = 1;
/******/ 				queue.forEach((fn) => (fn.r--));
/******/ 				queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 			}
/******/ 		}
/******/ 		const wrapDeps = (deps) => (deps.map((dep) => {
/******/ 			if(dep !== null && typeof dep === "object") {
/******/ 		
/******/ 				if(dep[webpackQueues]) return dep;
/******/ 				if(dep.then) {
/******/ 					const queue = [];
/******/ 					queue.d = 0;
/******/ 					dep.then((r) => {
/******/ 						obj[webpackExports] = r;
/******/ 						resolveQueue(queue);
/******/ 					}, (e) => {
/******/ 						obj[webpackError] = e;
/******/ 						resolveQueue(queue);
/******/ 					});
/******/ 					const obj = {};
/******/ 		
/******/ 					obj[webpackQueues] = (fn) => (fn(queue));
/******/ 					return obj;
/******/ 				}
/******/ 			}
/******/ 			const ret = {};
/******/ 			ret[webpackQueues] = x => {};
/******/ 			ret[webpackExports] = dep;
/******/ 			return ret;
/******/ 		}));
/******/ 		__webpack_require__.a = (module, body, hasAwait) => {
/******/ 			let queue;
/******/ 			hasAwait && ((queue = []).d = -1);
/******/ 			const depQueues = new Set();
/******/ 			const exports = module.exports;
/******/ 			let currentDeps;
/******/ 			let outerResolve;
/******/ 			let reject;
/******/ 			const promise = new Promise((resolve, rej) => {
/******/ 				reject = rej;
/******/ 				outerResolve = resolve;
/******/ 			});
/******/ 			promise[webpackExports] = exports;
/******/ 			promise[webpackQueues] = (fn) => (queue && fn(queue), depQueues.forEach(fn), promise["catch"](x => {}));
/******/ 			module.exports = promise;
/******/ 			const handle = (deps) => {
/******/ 				currentDeps = wrapDeps(deps);
/******/ 				let fn;
/******/ 				const getResult = () => (currentDeps.map((d) => {
/******/ 		
/******/ 					if(d[webpackError]) throw d[webpackError];
/******/ 					return d[webpackExports];
/******/ 				}))
/******/ 				const promise = new Promise((resolve) => {
/******/ 					fn = () => (resolve(getResult));
/******/ 					fn.r = 0;
/******/ 					const fnQueue = (q) => (q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))));
/******/ 					currentDeps.forEach((dep) => (dep[webpackQueues](fnQueue)));
/******/ 				});
/******/ 				return fn.r ? promise : getResult();
/******/ 			}
/******/ 			const done = (err) => ((err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue))
/******/ 		
/******/ 			body(handle, done);
/******/ 			queue?.d < 0 && (queue.d = 0);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter/value functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			if(Array.isArray(definition)) {
/******/ 				var i = 0;
/******/ 				while(i < definition.length) {
/******/ 					var key = definition[i++];
/******/ 					var binding = definition[i++];
/******/ 					if(!__webpack_require__.o(exports, key)) {
/******/ 						if(binding === 0) {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });
/******/ 						} else {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, get: binding });
/******/ 						}
/******/ 					} else if(binding === 0) { i++; }
/******/ 				}
/******/ 			} else {
/******/ 				for(var key in definition) {
/******/ 					if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 					}
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
/******/ 			if(Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/wasm compile */
/******/ 	(() => {
/******/ 		__webpack_require__.vs = (wasmModuleId, wasmModuleHash) => {
/******/ 		
/******/ 			var req = fetch(__webpack_require__.p + "" + wasmModuleHash + ".module.wasm");
/******/ 			var fallback = () => (req
/******/ 				.then((x) => (x.arrayBuffer()))
/******/ 				.then((bytes) => (WebAssembly.compile(bytes))));
/******/ 			return req.then((res) => {
/******/ 				if (typeof WebAssembly.compileStreaming === "function") {
/******/ 		
/******/ 					return WebAssembly.compileStreaming(res)
/******/ 						.catch(
/******/ 							(e) => {
/******/ 								if(res.headers.get("Content-Type") !== "application/wasm") {
/******/ 									console.warn("`WebAssembly.compileStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.compile` which is slower. Original error:\n", e);
/******/ 									return fallback();
/******/ 								}
/******/ 								throw e;
/******/ 							}
/******/ 						);
/******/ 				}
/******/ 				return fallback();
/******/ 			});
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
/******/ 	let __webpack_exports__ = __webpack_require__(0);
/******/ 	
/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 11.6 KiB [emitted] (name: main)
asset f052564a523e50ee50a2.module.wasm 96 bytes [emitted] [immutable] (auxiliary name: main)
chunk (runtime: main) output.js (main) 1.74 KiB (javascript) 96 bytes (webassembly) 3.83 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 3.83 KiB 6 modules
  dependent modules 1.04 KiB (javascript) 96 bytes (webassembly) [dependent] 2 modules
  ./example.js 720 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 2.5 KiB [emitted] [minimized] (name: main)
asset f5155e54cc54c8650d10.module.wasm 96 bytes [emitted] [immutable] (auxiliary name: main)
chunk (runtime: main) output.js (main) 1.74 KiB (javascript) 96 bytes (webassembly) 3.59 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 3.59 KiB 5 modules
  dependent modules 1.04 KiB (javascript) 96 bytes (webassembly) [dependent] 2 modules
  ./example.js 720 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
