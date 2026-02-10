# example.js

```javascript
import { msg } from "virtual:my-module";
import myAsyncMessage from "virtual:my-async-module";
import { version } from "virtual:build-info";
import json from "virtual:my-json-modules";
import value from "virtual:my-typescript-module";
import { hello } from "virtual:hello.ts";

console.log(msg); // Output `from virtual module`
console.log(myAsyncMessage); // Output `async-value`
console.log(version); // Output value of `1.0.0`
console.log(json.name); // Output `virtual-url-plugin`
console.log(value); // Output `value-from-typescript`
console.log(hello); // Output `hello`

import { routes } from "virtual:routes";

async function loadRoute(route) {
	return (await routes[route]()).default;
}

console.log(await loadRoute("a")); // Output `a`
console.log(await loadRoute("b")); // Output `b`

import { first, second } from "virtual:code-from-file";

console.log(first); // Output `first`
console.log(second); // Output `second`

import message from "my-custom-scheme:my-module";

console.log(message); // Output `from virtual module with custom scheme`
```

# routes/a.js

```javascript
export default "a";
```

# routes/b.js

```javascript
export default "b";
```

# code.js

```javascript
const first = "first";
const second = "second";

export { first, second };
```

# webpack.config.js

```javascript
"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../");

const routesPath = path.join(__dirname, "./routes");

const VERSION = "1.0.0";

/** @type {(env: "development" | "production") => import("webpack").Configuration} */
const config = (env = "development") => ({
	mode: env,
	// Just for examples, you can use any target
	target: "node",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			}
		]
	},
	plugins: [
		new webpack.experiments.schemes.VirtualUrlPlugin({
			"my-module": 'export const msg = "from virtual module"',
			"my-async-module": async () => {
				const value = await Promise.resolve("async-value");

				return `export default "${value}"`;
			},
			"build-info": {
				source() {
					return `export const version = "${VERSION}"`;
				},
				// Re-evaluate this value at each compilation, useful when getting a value from a variable
				version: true
			},
			"hello.ts": "export const hello = 'hello';",
			"my-json-modules": {
				type: ".json",
				source: () => '{"name": "virtual-url-plugin"}'
			},
			// Loaders will work with virtual modules
			"my-typescript-module": {
				type: ".ts",
				source: () => `
const value: string = "value-from-typescript";

export default value;`
			},
			routes: {
				source(loaderContext) {
					// Use `loaderContext.addContextDependency` to monitor the addition or removal of subdirectories in routesPath to trigger the rebuilding of virtual modules.
					// See more - https://webpack.js.org/api/loaders/#the-loader-context
					loaderContext.addContextDependency(routesPath);

					const files = fs.readdirSync(routesPath);

					return `export const routes = {${files
						.map(
							(key) => `${key.split(".")[0]}: () => import('./routes/${key}')`
						)
						.join(",\n")}}`;
				}
			},
			"code-from-file": {
				async source(loaderContext) {
					const pathToFile = path.resolve(__dirname, "./code.js");

					// Will trigger rebuild on changes in the file
					loaderContext.addDependency(pathToFile);

					const code = await fs.promises.readFile(pathToFile, "utf8");

					return code;
				}
			}
		}),
		new webpack.experiments.schemes.VirtualUrlPlugin(
			{
				"my-module": `const msg = "from virtual module with custom scheme";

export default msg`
			},
			"my-custom-scheme"
		)
	]
});

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
/* harmony import */ var virtual_my_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! virtual:my-module */ 1);
/* harmony import */ var virtual_my_async_module__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! virtual:my-async-module */ 2);
/* harmony import */ var virtual_build_info__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! virtual:build-info */ 3);
/* harmony import */ var virtual_my_json_modules__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! virtual:my-json-modules */ 4);
/* harmony import */ var virtual_my_typescript_module__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! virtual:my-typescript-module */ 5);
/* harmony import */ var virtual_hello_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! virtual:hello.ts */ 6);
/* harmony import */ var virtual_routes__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! virtual:routes */ 7);
/* harmony import */ var virtual_code_from_file__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! virtual:code-from-file */ 8);
/* harmony import */ var my_custom_scheme_my_module__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! my-custom-scheme:my-module */ 9);







console.log(virtual_my_module__WEBPACK_IMPORTED_MODULE_0__.msg); // Output `from virtual module`
console.log(virtual_my_async_module__WEBPACK_IMPORTED_MODULE_1__["default"]); // Output `async-value`
console.log(virtual_build_info__WEBPACK_IMPORTED_MODULE_2__.version); // Output value of `1.0.0`
console.log(virtual_my_json_modules__WEBPACK_IMPORTED_MODULE_3__.name); // Output `virtual-url-plugin`
console.log(virtual_my_typescript_module__WEBPACK_IMPORTED_MODULE_4__["default"]); // Output `value-from-typescript`
console.log(virtual_hello_ts__WEBPACK_IMPORTED_MODULE_5__.hello); // Output `hello`



async function loadRoute(route) {
	return (await virtual_routes__WEBPACK_IMPORTED_MODULE_6__.routes[route]()).default;
}

console.log(await loadRoute("a")); // Output `a`
console.log(await loadRoute("b")); // Output `b`



console.log(virtual_code_from_file__WEBPACK_IMPORTED_MODULE_7__.first); // Output `first`
console.log(virtual_code_from_file__WEBPACK_IMPORTED_MODULE_7__.second); // Output `second`



console.log(my_custom_scheme_my_module__WEBPACK_IMPORTED_MODULE_8__["default"]); // Output `from virtual module with custom scheme`

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),
/* 1 */
/*!*************************!*\
  !*** virtual:my-module ***!
  \*************************/
/*! namespace exports */
/*! export msg [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   msg: () => (/* binding */ msg)
/* harmony export */ });
const msg = "from virtual module"

/***/ }),
/* 2 */
/*!*******************************!*\
  !*** virtual:my-async-module ***!
  \*******************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("async-value");

/***/ }),
/* 3 */
/*!**************************!*\
  !*** virtual:build-info ***!
  \**************************/
/*! namespace exports */
/*! export version [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   version: () => (/* binding */ version)
/* harmony export */ });
const version = "1.0.0"

/***/ }),
/* 4 */
/*!*******************************!*\
  !*** virtual:my-json-modules ***!
  \*******************************/
/*! default exports */
/*! export name [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = /*#__PURE__*/JSON.parse('{"name":"virtual-url-plugin"}');

/***/ }),
/* 5 */
/*!************************************!*\
  !*** virtual:my-typescript-module ***!
  \************************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var value = "value-from-typescript";
exports["default"] = value;


/***/ }),
/* 6 */
/*!************************!*\
  !*** virtual:hello.ts ***!
  \************************/
/*! flagged exports */
/*! export __esModule [provided] [no usage info] [missing usage info prevents renaming] */
/*! export hello [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.hello = void 0;
exports.hello = 'hello';


/***/ }),
/* 7 */
/*!**********************!*\
  !*** virtual:routes ***!
  \**********************/
/*! namespace exports */
/*! export routes [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.e, __webpack_require__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   routes: () => (/* binding */ routes)
/* harmony export */ });
const routes = {a: () => __webpack_require__.e(/*! import() */ 1).then(__webpack_require__.bind(__webpack_require__, /*! ./routes/a.js */ 10)),
b: () => __webpack_require__.e(/*! import() */ 2).then(__webpack_require__.bind(__webpack_require__, /*! ./routes/b.js */ 11))}

/***/ }),
/* 8 */
/*!******************************!*\
  !*** virtual:code-from-file ***!
  \******************************/
/*! namespace exports */
/*! export first [provided] [no usage info] [missing usage info prevents renaming] */
/*! export second [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   first: () => (/* binding */ first),
/* harmony export */   second: () => (/* binding */ second)
/* harmony export */ });
const first = "first";
const second = "second";




/***/ }),
/* 9 */
/*!**********************************!*\
  !*** my-custom-scheme:my-module ***!
  \**********************************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const msg = "from virtual module with custom scheme";

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (msg);

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
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
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
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/async module */
/******/ 	(() => {
/******/ 		var hasSymbol = typeof Symbol === "function";
/******/ 		var webpackQueues = hasSymbol ? Symbol("webpack queues") : "__webpack_queues__";
/******/ 		var webpackExports = hasSymbol ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 		var webpackError = hasSymbol ? Symbol("webpack error") : "__webpack_error__";
/******/ 		
/******/ 		var resolveQueue = (queue) => {
/******/ 			if(queue && queue.d < 1) {
/******/ 				queue.d = 1;
/******/ 				queue.forEach((fn) => (fn.r--));
/******/ 				queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 			}
/******/ 		}
/******/ 		var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 			if(dep !== null && typeof dep === "object") {
/******/ 		
/******/ 				if(dep[webpackQueues]) return dep;
/******/ 				if(dep.then) {
/******/ 					var queue = [];
/******/ 					queue.d = 0;
/******/ 					dep.then((r) => {
/******/ 						obj[webpackExports] = r;
/******/ 						resolveQueue(queue);
/******/ 					}, (e) => {
/******/ 						obj[webpackError] = e;
/******/ 						resolveQueue(queue);
/******/ 					});
/******/ 					var obj = {};
/******/ 		
/******/ 					obj[webpackQueues] = (fn) => (fn(queue));
/******/ 					return obj;
/******/ 				}
/******/ 			}
/******/ 			var ret = {};
/******/ 			ret[webpackQueues] = x => {};
/******/ 			ret[webpackExports] = dep;
/******/ 			return ret;
/******/ 		}));
/******/ 		__webpack_require__.a = (module, body, hasAwait) => {
/******/ 			var queue;
/******/ 			hasAwait && ((queue = []).d = -1);
/******/ 			var depQueues = new Set();
/******/ 			var exports = module.exports;
/******/ 			var currentDeps;
/******/ 			var outerResolve;
/******/ 			var reject;
/******/ 			var promise = new Promise((resolve, rej) => {
/******/ 				reject = rej;
/******/ 				outerResolve = resolve;
/******/ 			});
/******/ 			promise[webpackExports] = exports;
/******/ 			promise[webpackQueues] = (fn) => (queue && fn(queue), depQueues.forEach(fn), promise["catch"](x => {}));
/******/ 			module.exports = promise;
/******/ 			var handle = (deps) => {
/******/ 				currentDeps = wrapDeps(deps);
/******/ 				var fn;
/******/ 				var getResult = () => (currentDeps.map((d) => {
/******/ 		
/******/ 					if(d[webpackError]) throw d[webpackError];
/******/ 					return d[webpackExports];
/******/ 				}))
/******/ 				var promise = new Promise((resolve) => {
/******/ 					fn = () => (resolve(getResult));
/******/ 					fn.r = 0;
/******/ 					var fnQueue = (q) => (q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))));
/******/ 					currentDeps.map((dep) => (dep[webpackQueues](fnQueue)));
/******/ 				});
/******/ 				return fn.r ? promise : getResult();
/******/ 			}
/******/ 			var done = (err) => ((err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue))
/******/ 			body(handle, done);
/******/ 			queue && queue.d < 0 && (queue.d = 0);
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
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".output.js";
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
/******/ 	/* webpack/runtime/require chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "loaded", otherwise not loaded yet
/******/ 		var installedChunks = {
/******/ 			0: 1
/******/ 		};
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		var installChunk = (chunk) => {
/******/ 			var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			for(var i = 0; i < chunkIds.length; i++)
/******/ 				installedChunks[chunkIds[i]] = 1;
/******/ 		
/******/ 		};
/******/ 		
/******/ 		// require() chunk loading for javascript
/******/ 		__webpack_require__.f.require = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					var installedChunk = require("./" + __webpack_require__.u(chunkId));
/******/ 					if (!installedChunks[chunkId]) {
/******/ 						installChunk(installedChunk);
/******/ 					}
/******/ 				} else installedChunks[chunkId] = 1;
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no external install chunk
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
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
asset output.js 17.4 KiB [emitted] (name: main)
asset 1.output.js 803 bytes [emitted]
asset 2.output.js 803 bytes [emitted]
chunk (runtime: main) output.js (main) 1.66 KiB (javascript) 4.21 KiB (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 640 bytes [dependent] 9 modules
  runtime modules 4.21 KiB 7 modules
  ./example.js 1.03 KiB [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: main) 1.output.js 20 bytes [rendered]
  > ./routes/a.js virtual:routes 1:32-55
  ./routes/a.js 20 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    import() ./routes/a.js virtual:routes 1:32-55
chunk (runtime: main) 2.output.js 20 bytes [rendered]
  > ./routes/b.js virtual:routes 2:9-32
  ./routes/b.js 20 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    import() ./routes/b.js virtual:routes 2:9-32
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 2.55 KiB [emitted] [minimized] (name: main)
asset 263.output.js 118 bytes [emitted] [minimized]
asset 722.output.js 118 bytes [emitted] [minimized]
chunk (runtime: main) 263.output.js 20 bytes [rendered]
  > ./routes/a.js virtual:routes 1:32-55
  ./routes/a.js 20 bytes [built] [code generated]
    [exports: default]
    import() ./routes/a.js virtual:routes 1:32-55
chunk (runtime: main) 722.output.js 20 bytes [rendered]
  > ./routes/b.js virtual:routes 2:9-32
  ./routes/b.js 20 bytes [built] [code generated]
    [exports: default]
    import() ./routes/b.js virtual:routes 2:9-32
chunk (runtime: main) output.js (main) 1.66 KiB (javascript) 4.21 KiB (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 640 bytes [dependent] 9 modules
  runtime modules 4.21 KiB 7 modules
  ./example.js 1.03 KiB [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
