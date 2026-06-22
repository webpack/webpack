This example shows the **`universal` target** — `target: "universal"` — which makes a single webpack compiler emit **one ESM bundle that runs in the browser, web workers, Node.js, Electron and NW.js**. Because the output is plain ECMAScript modules with no platform assumptions baked in, the same bundle also runs on other ESM runtimes such as **Deno** and **Bun**.

The `universal` preset is the intersection of every platform webpack knows about: it only uses runtime features (chunk loading, global object, etc.) that all of them support, and output is **always ECMAScript modules**. The bundle bakes in no platform-specific assumptions, so anything platform-dependent is resolved at **runtime** instead. Because output is always ESM, `experiments.outputModule` and `output.module` default to `true` for this target — no extra config needed.

This example demonstrates the full potential of that setup:

- **One source, every runtime** — `example.js` is built once and runs unchanged on each platform.
- **Runtime environment detection** — `env.js` reports the current platform (browser, Node.js, Deno, Bun, …) without any build-time `target` branch.
- **Universal code splitting** — the dynamic `import("./render")` is emitted as a separate `.mjs` chunk, and webpack generates a chunk loader that works everywhere (native `import()` in the browser, dynamic `import()` of the emitted module in Node).
- **Universal output sink** — the lazily-loaded `render.js` writes to the DOM in a browser and to stdout in Node.

# example.js

```javascript
// One source file, one ESM bundle, every runtime. `target: "universal"` tells
// webpack to emit only the runtime features that browser, web worker, Node.js,
// Electron and NW.js all share, so this entry runs as-is on each one.
import { platform } from "./env";

const banner = `Hello from webpack — running on: ${platform()}`;

async function main() {
	// Code-split into its own chunk. The universal chunk loader knows how to
	// fetch it on either platform (native `import()` in the browser, dynamic
	// `import()` of the emitted `.mjs` in Node).
	const { render } = await import("./render");

	render(banner);
}

main();
```

# env.js

```javascript
// Universal feature detection. The bundle assumes no platform-specific global at
// build time, so the environment is resolved at runtime instead. Deno and Bun
// are checked before Node because both also expose a Node-compatible `process`.
export function platform() {
	if (typeof Deno !== "undefined") return "Deno";

	if (typeof Bun !== "undefined") return "Bun";

	if (typeof window !== "undefined") return "browser";

	if (
		typeof process !== "undefined" &&
		process.versions &&
		process.versions.node
	) {
		return "Node.js";
	}

	return "unknown";
}
```

# render.js

```javascript
// Lazily loaded on both platforms. Picks the right output sink at runtime: the
// DOM in a browser, stdout in Node.
export function render(message) {
	if (typeof document !== "undefined") {
		document.body.textContent = message;
	} else {
		console.log(message);
	}
}
```

# webpack.config.js

```javascript
"use strict";

const path = require("path");

/** @type {import("../../").Configuration} */
const config = {
	// The universal target: one compiler emits a single bundle that runs in the
	// browser, web workers, Node.js, Electron and NW.js. Output is always ESM, so
	// `experiments.outputModule` and `output.module` default to `true` here.
	target: "universal",
	entry: "./example.js",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "output.mjs",
		chunkFilename: "[name].mjs"
	},
	optimization: {
		// Keep the async chunk filename stable across the example's three builds.
		chunkIds: "named"
	}
};

module.exports = config;
```

# dist/output.mjs

```javascript
/******/ var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!****************!*\
  !*** ./env.js ***!
  \****************/
/*! namespace exports */
/*! export platform [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   platform: () => (/* binding */ platform)
/* harmony export */ });
// Universal feature detection. The bundle assumes no platform-specific global at
// build time, so the environment is resolved at runtime instead. Deno and Bun
// are checked before Node because both also expose a Node-compatible `process`.
function platform() {
	if (typeof Deno !== "undefined") return "Deno";

	if (typeof Bun !== "undefined") return "Bun";

	if (typeof window !== "undefined") return "browser";

	if (
		typeof process !== "undefined" &&
		process.versions &&
		process.versions.node
	) {
		return "Node.js";
	}

	return "unknown";
}


/***/ })
/******/ ]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ // The module cache
/******/ const __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	const cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	const module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/******/ // expose the modules object (__webpack_modules__)
/******/ __webpack_require__.m = __webpack_modules__;
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter/value functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		if(Array.isArray(definition)) {
/******/ 			var i = 0;
/******/ 			while(i < definition.length) {
/******/ 				var key = definition[i++];
/******/ 				var binding = definition[i++];
/******/ 				if(!__webpack_require__.o(exports, key)) {
/******/ 					if(binding === 0) {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });
/******/ 					} else {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, get: binding });
/******/ 					}
/******/ 				} else if(binding === 0) { i++; }
/******/ 			}
/******/ 		} else {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/ensure chunk */
/******/ (() => {
/******/ 	__webpack_require__.f = {};
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = (chunkId) => {
/******/ 		return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 			__webpack_require__.f[key](chunkId, promises);
/******/ 			return promises;
/******/ 		}, []));
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/get javascript chunk filename */
/******/ (() => {
/******/ 	// This function allow to reference async chunks
/******/ 	__webpack_require__.u = (chunkId) => {
/******/ 		// return url for filenames based on template
/******/ 		return "" + chunkId + ".mjs";
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		if(Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/import chunk loading */
/******/ (() => {
/******/ 	// no baseURI
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// [resolve, Promise] = chunk loading, 0 = chunk loaded
/******/ 	const installedChunks = {
/******/ 		"main": 0
/******/ 	};
/******/ 	
/******/ 	const installChunk = (data) => {
/******/ 		let {__webpack_esm_ids__, __webpack_esm_modules__, __webpack_esm_runtime__} = data;
/******/ 		// add "modules" to the modules object,
/******/ 		// then flag all "ids" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0;
/******/ 		for(moduleId in __webpack_esm_modules__) {
/******/ 			if(__webpack_require__.o(__webpack_esm_modules__, moduleId)) {
/******/ 				__webpack_require__.m[moduleId] = __webpack_esm_modules__[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(__webpack_esm_runtime__) __webpack_esm_runtime__(__webpack_require__);
/******/ 		for(;i < __webpack_esm_ids__.length; i++) {
/******/ 			chunkId = __webpack_esm_ids__[i];
/******/ 			if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 				installedChunks[chunkId][0]();
/******/ 			}
/******/ 			installedChunks[__webpack_esm_ids__[i]] = 0;
/******/ 		}
/******/ 	
/******/ 	}
/******/ 	
/******/ 	__webpack_require__.f.j = (chunkId, promises) => {
/******/ 			// import() chunk loading for javascript
/******/ 			let installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 	
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[1]);
/******/ 				} else {
/******/ 					if(true) { // all chunks have JS
/******/ 						// setup Promise in chunk cache
/******/ 						let promise = import("./" + __webpack_require__.u(chunkId)).then(installChunk, (e) => {
/******/ 							if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined;
/******/ 							throw e;
/******/ 						});
/******/ 						promise = Promise.race([promise, new Promise((resolve) => (installedChunkData = installedChunks[chunkId] = [resolve]))])
/******/ 						promises.push(installedChunkData[1] = promise);
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 	};
/******/ 	
/******/ 	// no prefetching
/******/ 	
/******/ 	// no preloaded
/******/ 	
/******/ 	// no external install chunk
/******/ 	
/******/ 	// no on chunks loaded
/******/ 	// no HMR
/******/ 	
/******/ 	// no HMR manifest
/******/ })();
/******/ 
/************************************************************************/
```

</details>

``` js
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.e, __webpack_require__.* */
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _env__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./env */ 1);
// One source file, one ESM bundle, every runtime. `target: "universal"` tells
// webpack to emit only the runtime features that browser, web worker, Node.js,
// Electron and NW.js all share, so this entry runs as-is on each one.


const banner = `Hello from webpack — running on: ${(0,_env__WEBPACK_IMPORTED_MODULE_0__.platform)()}`;

async function main() {
	// Code-split into its own chunk. The universal chunk loader knows how to
	// fetch it on either platform (native `import()` in the browser, dynamic
	// `import()` of the emitted `.mjs` in Node).
	const { render } = await __webpack_require__.e(/*! import() */ "render_js").then(__webpack_require__.bind(__webpack_require__, /*! ./render */ 2));

	render(banner);
}

main();

})();
```

# dist/render_js.mjs

```javascript
export const __webpack_esm_id__ = "render_js";
export const __webpack_esm_ids__ = ["render_js"];
export const __webpack_esm_modules__ = {

/***/ 2
/*!*******************!*\
  !*** ./render.js ***!
  \*******************/
/*! namespace exports */
/*! export render [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* binding */ render)
/* harmony export */ });
// Lazily loaded on both platforms. Picks the right output sink at runtime: the
// DOM in a browser, stdout in Node.
function render(message) {
	if (typeof document !== "undefined") {
		document.body.textContent = message;
	} else {
		console.log(message);
	}
}


/***/ }

};
```

# Info

## Unoptimized

```
asset output.mjs 8.8 KiB [emitted] [javascript module] (name: main)
asset render_js.mjs 1.02 KiB [emitted] [javascript module]
chunk (runtime: main) output.mjs (main) 1.16 KiB (javascript) 3.48 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 3.48 KiB 6 modules
  dependent modules 562 bytes [dependent] 1 module
  ./example.js 629 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: main) render_js.mjs 269 bytes [rendered]
  > ./render ./example.js 12:26-44
  ./render.js 269 bytes [built] [code generated]
    [exports: render]
    [used exports unknown]
    import() ./render ./example.js 12:26-44
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.mjs 1.33 KiB [emitted] [javascript module] [minimized] (name: main)
asset render_js.mjs 250 bytes [emitted] [javascript module] [minimized]
chunk (runtime: main) output.mjs (main) 1.16 KiB (javascript) 3.25 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 3.25 KiB 5 modules
  ./example.js + 1 modules 1.16 KiB [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
chunk (runtime: main) render_js.mjs 269 bytes [rendered]
  > ./render ./example.js 12:26-44
  ./render.js 269 bytes [built] [code generated]
    [exports: render]
    [all exports used]
    import() ./render ./example.js + 1 modules ./example.js 12:26-44
webpack X.X.X compiled successfully
```
