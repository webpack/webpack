# webpack.config.js

```javascript
/** @type {import("../../").Configuration} */
module.exports = {
	entry: {
		page: {
			import: "./page.js",
			layer: "server",
			library: {
				type: "commonjs-module",
				export: "default"
			}
		}
	},
	target: "node",
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js"
	},
	module: {
		parser: {
			javascript: {
				entries: {
					CLIENT: {
						entryOptions: {
							name: "client",
							layer: "client",
							chunkLoading: "jsonp",
							chunkFormat: "array-push",
							initialChunkFilename: "client/[name].js",
							chunkFilename: "client/[name].js"
						},
						return: "files"
					},
					CLIENT_MODERN: {
						entryOptions: {
							name: "modern",
							layer: "modern",
							chunkLoading: "jsonp",
							chunkFormat: "array-push",
							initialChunkFilename: "client/modern-[name].js",
							chunkFilename: "client/modern-[name].js"
						},
						return: "files"
					},
					API: {
						entryOptions: {
							layer: "server",
							chunkLoading: "require",
							chunkFormat: "commonjs",
							runtime: "api-runtime",
							library: {
								type: "commonjs-module",
								export: "default"
							}
						},
						byArguments: (info, request, name) => ({
							entryOptions: {
								name: `api/${name}`
							},
							value: `/${name}`
						})
					}
				}
			}
		}
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				merge: {
					name: "merged",
					test: /helper/,
					layer: "server",
					enforce: true
				}
			}
		}
	},
	externals: {
		byLayer: {
			server: {
				react: "react"
			}
		}
	},
	experiments: {
		topLevelAwait: true,
		layers: true,
		asyncEntries: true
	}
};
```

# page.js

```javascript
import { log } from "./helper";

const urls = CLIENT("./client.js");
const modernUrls = CLIENT_MODERN("./client.js");

const head = [
	...urls.map(href =>
		href.endsWith(".js")
			? `<script nomodule src="${href}">`
			: href.endsWith(".css")
			? `<link href="${href}">`
			: ""
	),
	...modernUrls.map(href => `<script type="module" src="${href}">`)
].join("");

export default () => {
	log("Generating page");
	return `<html><head>${head}</head></html>`;
};
```

# client.js

```javascript
import { log } from "./helper.js";

log(await import("./callTextApi.js"));

fetch(API("./trackUser.js", "analytics/track")).catch(() => {});

export {};

document.addEventListener("load", () => {
	if (__webpack_layer__ === "modern") {
		navigator.serviceWorker.register(
			/* webpackEntryOptions: { filename: "client/sw.js" } */
			new URL("./sw.js", import.meta.url)
		);
	}
	if (__webpack_layer__ === "client") {
		navigator.serviceWorker.register(
			/* webpackEntryOptions: { filename: "client/modern-sw.js" } */
			new URL("./sw.js", import.meta.url)
		);
	}
});
```

# callTextApi.js

```javascript
const url = API("./getText.js", "getText");

const res = await fetch(url);
export default await res.text();
```

# getText.js

```javascript
import { log } from "./helper";

export default () => {
	log("api called");
	return "Hello World";
};
```

# dist/page.js

```javascript
module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!*****************!*\
  !*** ./page.js ***!
  \*****************/
/*! namespace exports */
/*! export default [provided] [used in page] [usage prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.r, __webpack_require__.u, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => __WEBPACK_DEFAULT_EXPORT__
/* harmony export */ });
/* harmony import */ var _helper__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./helper */ 1);


const urls = /* async entry files */ [3].map(__webpack_require__.u);
const modernUrls = /* async entry files */ [5].map(__webpack_require__.u);

const head = [
	...urls.map(href =>
		href.endsWith(".js")
			? `<script nomodule src="${href}">`
			: href.endsWith(".css")
			? `<link href="${href}">`
			: ""
	),
	...modernUrls.map(href => `<script type="module" src="${href}">`)
].join("");

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
	(0,_helper__WEBPACK_IMPORTED_MODULE_0__.log)("Generating page");
	return `<html><head>${head}</head></html>`;
});


/***/ }),
/* 1 */
/*!*******************!*\
  !*** ./helper.js ***!
  \*******************/
/*! namespace exports */
/*! export log [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "log": () => /* binding */ log
/* harmony export */ });
function log(msg) {
	console.log(msg);
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
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames not based on template
/******/ 			if (chunkId === 3) return "client/client.js";
/******/ 			// return url for filenames based on template
/******/ 			return "client/modern-" + "modern" + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
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
/************************************************************************/
```

</details>

``` js
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })()
.default;
```

# dist/client/client.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */,
/* 2 */
/*!*******************!*\
  !*** ./client.js ***!
  \*******************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, module, __webpack_require__.e, __webpack_require__.p, __webpack_require__.b, __webpack_require__.u, __webpack_require__.* */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

module.exports = (async () => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _helper_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./helper.js */ 3);


(0,_helper_js__WEBPACK_IMPORTED_MODULE_0__.log)(await __webpack_require__.e(/*! import() */ 9).then(__webpack_require__.bind(__webpack_require__, /*! ./callTextApi.js */ 6)));

fetch("/analytics/track").catch(() => {});



document.addEventListener("load", () => {
	if (false) {}
	if (true) {
		navigator.serviceWorker.register(
			/* webpackEntryOptions: { filename: "client/modern-sw.js" } */
			new URL(/* worker import */ __webpack_require__.p + __webpack_require__.u(7), __webpack_require__.b)
		);
	}
});

return __webpack_exports__;
})();

/***/ }),
/* 3 */
/*!*******************!*\
  !*** ./helper.js ***!
  \*******************/
/*! namespace exports */
/*! export log [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "log": () => /* binding */ log
/* harmony export */ });
function log(msg) {
	console.log(msg);
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
/******/ 			// return url for filenames not based on template
/******/ 			if (chunkId === 9) return "client/9.js";
/******/ 			if (chunkId === 7) return "client/modern-sw.js";
/******/ 			// return url for filenames based on template
/******/ 			return "" + {"1":"api/analytics/track","2":"api/getText"}[chunkId] + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		// data-webpack is not used as build has no uniqueName
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => fn(event));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			;
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
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
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = document.baseURI || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			3: 0
/******/ 		};
/******/ 		
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => {
/******/ 								installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 							});
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId);
/******/ 						} else installedChunks[chunkId] = 0;
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = global["webpackChunk"] = global["webpackChunk"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 		
/******/ 		// no deferred startup
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__(2);
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ })()
;
```

# dist/api/getText.js

```javascript
module.exports =
(() => {
var exports = {};
exports.id = 2;
exports.ids = [2];
exports.modules = {

/***/ 11:
/*!********************!*\
  !*** ./getText.js ***!
  \********************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => __WEBPACK_DEFAULT_EXPORT__
/* harmony export */ });
/* harmony import */ var _helper__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./helper */ 1);


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
	(0,_helper__WEBPACK_IMPORTED_MODULE_0__.log)("api called");
	return "Hello World";
});


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../api-runtime.js");
__webpack_require__.C(exports);
return __webpack_require__.X([4], 11);
})().default;
```

# Info

## Unoptimized

```
assets by path client/*.js 31.4 KiB
  asset client/client.js 11.6 KiB [emitted] (name: client)
  asset client/modern-modern.js 11.6 KiB [emitted] (name: modern)
  asset client/modern-sw.js 3.19 KiB [emitted]
  asset client/sw.js 3.19 KiB [emitted]
  asset client/modern-10.js 948 bytes [emitted]
  asset client/9.js 946 bytes [emitted]
assets by path *.js 10.5 KiB
  asset page.js 4.96 KiB [emitted] (name: page)
  asset api-runtime.js 4.8 KiB [emitted] (name: api-runtime)
  asset merged.js 765 bytes [emitted] (name: merged) (id hint: merge)
assets by path api/ 2.4 KiB
  asset api/getText.js 1.2 KiB [emitted] (name: api/getText)
  asset api/analytics/track.js 1.2 KiB [emitted] (name: api/analytics/track)
chunk (runtime: api-runtime) api-runtime.js (api-runtime) [chunk format commonjs] 2.05 KiB [entry] [rendered]
  > ./client.js 5:6-46
  > ./client.js 5:6-46
  > ./callTextApi.js 1:12-42
  > ./callTextApi.js 1:12-42
  runtime modules 2.05 KiB 7 modules
chunk (runtime: api-runtime) api/analytics/track.js (api/analytics/track) [chunk format commonjs] 94 bytes [rendered]
  > ./client.js 5:6-46
  > ./client.js 5:6-46
  ./trackUser.js (in server) 94 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    async entry ./trackUser.js ./client.js 5:6-46
    async entry ./trackUser.js ./client.js 5:6-46
chunk (runtime: api-runtime) api/getText.js (api/getText) [chunk format commonjs] 102 bytes [rendered]
  > ./callTextApi.js 1:12-42
  > ./callTextApi.js 1:12-42
  ./getText.js (in server) 102 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    async entry ./getText.js ./callTextApi.js 1:12-42
    async entry ./getText.js ./callTextApi.js 1:12-42
chunk (runtime: ./page.js|server|3:13-34) client/client.js (client) [chunk format array-push] 617 bytes (javascript) 5.77 KiB (runtime) [entry] [rendered]
  > ./page.js 3:13-34
  runtime modules 5.77 KiB 8 modules
  dependent modules 48 bytes [dependent] 1 module
  ./client.js (in client) 569 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    async entry ./client.js ./page.js 3:13-34
chunk (runtime: api-runtime) merged.js (merged) (id hint: merge) [chunk format commonjs] 48 bytes [rendered] split chunk (cache group: merge) (name: merged)
  > ./client.js 5:6-46
  > ./client.js 5:6-46
  > ./callTextApi.js 1:12-42
  > ./callTextApi.js 1:12-42
  ./helper.js (in server) 48 bytes [built] [code generated]
    [exports: log]
    [used exports unknown]
    harmony side effect evaluation ./helper ./getText.js 1:0-31
    harmony import specifier ./helper ./getText.js 4:1-4
    harmony side effect evaluation ./helper ./page.js 1:0-31
    harmony import specifier ./helper ./page.js 18:1-4
    harmony side effect evaluation ./helper ./trackUser.js 1:0-31
    harmony import specifier ./helper ./trackUser.js 4:1-4
chunk (runtime: ./page.js|server|4:19-47) client/modern-modern.js (modern) [chunk format array-push] 617 bytes (javascript) 5.77 KiB (runtime) [entry] [rendered]
  > ./page.js 4:19-47
  runtime modules 5.77 KiB 8 modules
  dependent modules 48 bytes [dependent] 1 module
  ./client.js (in modern) 569 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    async entry ./client.js ./page.js 4:19-47
chunk (runtime: page) page.js (page) 509 bytes (javascript) 948 bytes (runtime) [entry] [rendered]
  > ./page.js page
  runtime modules 948 bytes 4 modules
  dependent modules 48 bytes [dependent] 1 module
  ./page.js (in server) 461 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    entry ./page.js page
    used as library export
chunk (runtime: ./client.js|client|17:2-20:3) client/modern-sw.js 112 bytes (javascript) 668 bytes (runtime) [entry] [rendered]
  > ./client.js 17:2-20:3
  runtime modules 668 bytes 3 modules
  dependent modules 48 bytes [dependent] 1 module
  ./sw.js (in client) 64 bytes [built] [code generated]
    [used exports unknown]
    new Worker() ./sw.js ./client.js 17:2-20:3
chunk (runtime: ./client.js|modern|11:2-14:3) client/sw.js 112 bytes (javascript) 668 bytes (runtime) [entry] [rendered]
  > ./client.js 11:2-14:3
  runtime modules 668 bytes 3 modules
  dependent modules 48 bytes [dependent] 1 module
  ./sw.js (in modern) 64 bytes [built] [code generated]
    [used exports unknown]
    new Worker() ./sw.js ./client.js 11:2-14:3
chunk (runtime: ./page.js|server|3:13-34) client/9.js [chunk format array-push] 108 bytes [rendered]
  > ./callTextApi.js ./client.js 3:10-36
  ./callTextApi.js (in client) 108 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    import() ./callTextApi.js ./client.js 3:10-36
chunk (runtime: ./page.js|server|4:19-47) client/modern-10.js [chunk format array-push] 108 bytes [rendered]
  > ./callTextApi.js ./client.js 3:10-36
  ./callTextApi.js (in modern) 108 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    import() ./callTextApi.js ./client.js 3:10-36
webpack 5.11.1 compiled successfully
```

## Production mode

```
assets by path client/*.js 6.2 KiB
  asset client/modern-modern.js 2.35 KiB [emitted] [minimized] (name: modern)
  asset client/client.js 2.34 KiB [emitted] [minimized] (name: client)
  asset client/modern-sw.js 583 bytes [emitted] [minimized]
  asset client/sw.js 583 bytes [emitted] [minimized]
  asset client/945.js 192 bytes [emitted] [minimized]
  asset client/modern-935.js 192 bytes [emitted] [minimized]
assets by path *.js 1.59 KiB
  asset api-runtime.js 780 bytes [emitted] [minimized] (name: api-runtime)
  asset page.js 727 bytes [emitted] [minimized] (name: page)
  asset merged.js 125 bytes [emitted] [minimized] (name: merged) (id hint: merge)
assets by path api/ 492 bytes
  asset api/analytics/track.js 247 bytes [emitted] [minimized] (name: api/analytics/track)
  asset api/getText.js 245 bytes [emitted] [minimized] (name: api/getText)
chunk (runtime: ./page.js|server|3:13-34) client/client.js (client) [chunk format array-push] 617 bytes (javascript) 5.78 KiB (runtime) [entry] [rendered]
  > ./page.js 3:13-34
  runtime modules 5.78 KiB 8 modules
  dependent modules 48 bytes [dependent] 1 module
  ./client.js (in client) 569 bytes [built] [code generated]
    [no exports]
    async entry ./client.js ./page.js + 1 modules ./page.js 3:13-34
chunk (runtime: ./client.js|modern|11:2-14:3) client/sw.js 112 bytes (javascript) 668 bytes (runtime) [entry] [rendered]
  > ./client.js 11:2-14:3
  runtime modules 668 bytes 3 modules
  dependent modules 48 bytes [dependent] 1 module
  ./sw.js (in modern) 64 bytes [built] [code generated]
    [no exports used]
    new Worker() ./sw.js ./client.js 11:2-14:3
chunk (runtime: api-runtime) api-runtime.js (api-runtime) [chunk format commonjs] 2.06 KiB [entry] [rendered]
  > ./client.js 5:6-46
  > ./client.js 5:6-46
  > ./callTextApi.js 1:12-42
  > ./callTextApi.js 1:12-42
  runtime modules 2.06 KiB 7 modules
chunk (runtime: ./page.js|server|4:19-47) client/modern-modern.js (modern) [chunk format array-push] 617 bytes (javascript) 5.78 KiB (runtime) [entry] [rendered]
  > ./page.js 4:19-47
  runtime modules 5.78 KiB 8 modules
  dependent modules 48 bytes [dependent] 1 module
  ./client.js (in modern) 569 bytes [built] [code generated]
    [no exports]
    async entry ./client.js ./page.js + 1 modules ./page.js 4:19-47
chunk (runtime: api-runtime) api/analytics/track.js (api/analytics/track) [chunk format commonjs] 94 bytes [rendered]
  > ./client.js 5:6-46
  > ./client.js 5:6-46
  ./trackUser.js (in server) 94 bytes [built] [code generated]
    [exports: default]
    async entry ./trackUser.js ./client.js 5:6-46
    async entry ./trackUser.js ./client.js 5:6-46
chunk (runtime: api-runtime) api/getText.js (api/getText) [chunk format commonjs] 102 bytes [rendered]
  > ./callTextApi.js 1:12-42
  > ./callTextApi.js 1:12-42
  ./getText.js (in server) 102 bytes [built] [code generated]
    [exports: default]
    async entry ./getText.js ./callTextApi.js 1:12-42
    async entry ./getText.js ./callTextApi.js 1:12-42
chunk (runtime: ./client.js|client|17:2-20:3) client/modern-sw.js 112 bytes (javascript) 668 bytes (runtime) [entry] [rendered]
  > ./client.js 17:2-20:3
  runtime modules 668 bytes 3 modules
  dependent modules 48 bytes [dependent] 1 module
  ./sw.js (in client) 64 bytes [built] [code generated]
    [no exports used]
    new Worker() ./sw.js ./client.js 17:2-20:3
chunk (runtime: api-runtime) merged.js (merged) (id hint: merge) [chunk format commonjs] 48 bytes [rendered] split chunk (cache group: merge) (name: merged)
  > ./client.js 5:6-46
  > ./client.js 5:6-46
  > ./callTextApi.js 1:12-42
  > ./callTextApi.js 1:12-42
  ./helper.js (in server) 48 bytes [built] [code generated]
    [exports: log]
    [all exports used]
    [inactive] harmony side effect evaluation ./helper ./getText.js 1:0-31
    harmony import specifier ./helper ./getText.js 4:1-4
    [inactive] harmony side effect evaluation ./helper ./trackUser.js 1:0-31
    harmony import specifier ./helper ./trackUser.js 4:1-4
chunk (runtime: page) page.js (page) 509 bytes (javascript) 675 bytes (runtime) [entry] [rendered]
  > ./page.js page
  runtime modules 675 bytes 3 modules
  ./page.js + 1 modules (in server) 509 bytes [built] [code generated]
    [exports: default]
    [all exports used]
    entry ./page.js page
    used as library export
chunk (runtime: ./page.js|server|4:19-47) client/modern-935.js [chunk format array-push] 108 bytes [rendered]
  > ./callTextApi.js ./client.js 3:10-36
  ./callTextApi.js (in modern) 108 bytes [built] [code generated]
    [exports: default]
    import() ./callTextApi.js ./client.js 3:10-36
chunk (runtime: ./page.js|server|3:13-34) client/945.js [chunk format array-push] 108 bytes [rendered]
  > ./callTextApi.js ./client.js 3:10-36
  ./callTextApi.js (in client) 108 bytes [built] [code generated]
    [exports: default]
    import() ./callTextApi.js ./client.js 3:10-36
webpack 5.11.1 compiled successfully
```
