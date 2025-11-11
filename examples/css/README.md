# example.js

```javascript
import "./style.css";
import "./style2.css";
import { main } from "./style.module.css";
import("./lazy-style.css");

document.getElementsByTagName("main")[0].className = main;
```

# style.css

```javascript
@import "style-imported.css";
@import "https://fonts.googleapis.com/css?family=Open+Sans";

body {
	background: green;
	font-family: "Open Sans";
}
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!***********************!*\
  !*** css ./style.css ***!
  \***********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: has css modules */
/***/ (() => {



/***/ }),
/* 2 */,
/* 3 */,
/* 4 */,
/* 5 */
/*!************************!*\
  !*** css ./style2.css ***!
  \************************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: has css modules */
/***/ (() => {



/***/ }),
/* 6 */
/*!******************************!*\
  !*** css ./style.module.css ***!
  \******************************/
/*! namespace exports */
/*! export large [provided] [no usage info] [missing usage info prevents renaming] */
/*! export main [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, module, has css modules, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

__webpack_require__.r(module.exports = {
	"large": "--app-6-large",
	"main": "app-6-main"
});

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
/******/ 	/* webpack/runtime/get css chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.k = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".output.css";
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
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		var dataWebpackPrefix = "app:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
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
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
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
/******/ 	/* webpack/runtime/css loading */
/******/ 	(() => {
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			0: 0
/******/ 		};
/******/ 		
/******/ 		var uniqueName = "app";
/******/ 		var loadingAttribute = "data-webpack-loading";
/******/ 		var loadStylesheet = (chunkId, url, done) => {
/******/ 			var link, needAttach, key = "chunk-" + chunkId;
/******/ 		
/******/ 			var links = document.getElementsByTagName("link");
/******/ 			for(var i = 0; i < links.length; i++) {
/******/ 				var l = links[i];
/******/ 				if(l.rel == "stylesheet" && (l.href == url || l.getAttribute("href") == url || l.getAttribute("data-webpack") == uniqueName + ":" + key)) { link = l; break; }
/******/ 			}
/******/ 			if(!done) return link;
/******/ 		
/******/ 			if(!link) {
/******/ 				needAttach = true;
/******/ 				link = document.createElement('link');
/******/ 				link.charset = 'utf-8';
/******/ 				if (__webpack_require__.nc) {
/******/ 					link.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				link.setAttribute("data-webpack", uniqueName + ":" + key);
/******/ 		
/******/ 				link.setAttribute(loadingAttribute, 1);
/******/ 				link.rel = "stylesheet";
/******/ 				link.href = url;
/******/ 			}
/******/ 			var onLinkComplete = (prev, event) => {
/******/ 				link.onerror = link.onload = null;
/******/ 				link.removeAttribute(loadingAttribute);
/******/ 				clearTimeout(timeout);
/******/ 				if(event && event.type != "load") link.parentNode.removeChild(link)
/******/ 				done(event);
/******/ 				if(prev) return prev(event);
/******/ 			};
/******/ 			if(link.getAttribute(loadingAttribute)) {
/******/ 				var timeout = setTimeout(onLinkComplete.bind(null, undefined, { type: 'timeout', target: link }), 120000);
/******/ 				link.onerror = onLinkComplete.bind(null, link.onerror);
/******/ 				link.onload = onLinkComplete.bind(null, link.onload);
/******/ 			} else onLinkComplete(undefined, { type: 'load', target: link });
/******/ 		
/******/ 		
/******/ 			needAttach && document.head.appendChild(link);
/******/ 			return link;
/******/ 		};
/******/ 		__webpack_require__.f.css = (chunkId, promises) => {
/******/ 			// css chunk loading
/******/ 			var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[2]);
/******/ 				} else {
/******/ 					if(true) { // all chunks have CSS
/******/ 						// setup Promise in chunk cache
/******/ 						var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 						promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 						// start chunk loading
/******/ 						var url = __webpack_require__.p + __webpack_require__.k(chunkId);
/******/ 						// create error before stack unwound to get useful stacktrace later
/******/ 						var error = new Error();
/******/ 						var loadingEnded = (event) => {
/******/ 							if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 								installedChunkData = installedChunks[chunkId];
/******/ 								if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 								if(installedChunkData) {
/******/ 									if(event.type !== "load") {
/******/ 										var errorType = event && event.type;
/******/ 										var realHref = event && event.target && event.target.href;
/******/ 										error.message = 'Loading css chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realHref + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realHref;
/******/ 										installedChunkData[1](error);
/******/ 									} else {
/******/ 										installedChunks[chunkId] = 0;
/******/ 										installedChunkData[0]();
/******/ 									}
/******/ 								}
/******/ 							}
/******/ 						};
/******/ 		
/******/ 							loadStylesheet(chunkId, url, loadingEnded);
/******/ 					} else installedChunks[chunkId] = 0;
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		// no hmr
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			0: 0
/******/ 		};
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
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
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
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
/******/ 						}
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
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkapp"] = self["webpackChunkapp"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.e, __webpack_require__.* */
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _style_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./style.css */ 1);
/* harmony import */ var _style2_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./style2.css */ 5);
/* harmony import */ var _style_module_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./style.module.css */ 6);



__webpack_require__.e(/*! import() */ 1).then(__webpack_require__.bind(__webpack_require__, /*! ./lazy-style.css */ 7));

document.getElementsByTagName("main")[0].className = _style_module_css__WEBPACK_IMPORTED_MODULE_2__.main;

})();

/******/ })()
;
```

# dist/output.css

```javascript
/*!********************************************************************!*\
  !*** external "https://fonts.googleapis.com/css?family=Open+Sans" ***!
  \********************************************************************/
@import url("https://fonts.googleapis.com/css?family=Open+Sans");
/*!********************************!*\
  !*** css ./style-imported.css ***!
  \********************************/
.img {
	width: 150px;
	height: 150px;
	background: url(dist/89a353e9c515885abd8e.png);
}

/*!***********************!*\
  !*** css ./style.css ***!
  \***********************/

body {
	background: green;
	font-family: "Open Sans";
}

/*!************************!*\
  !*** css ./style2.css ***!
  \************************/
body {
	background: red;
}

/*!******************************!*\
  !*** css ./style.module.css ***!
  \******************************/
:root {
	--app-6-large: 72px;
}

.app-6-main {
	font-size: var(--app-6-large);
	color: darkblue;
}

@media (min-width: 1024px) {
	.app-6-main {
		color: green;
	}
}

@supports (display: grid) {
	.app-6-main {
		display: grid
	}
}
```

## production

```javascript
@import url("https://fonts.googleapis.com/css?family=Open+Sans");
.img {
	width: 150px;
	height: 150px;
	background: url(dist/89a353e9c515885abd8e.png);
}


body {
	background: green;
	font-family: "Open Sans";
}

body {
	background: red;
}

:root {
	--app-235-a: 72px;
}

.app-235-i {
	font-size: var(--app-235-a);
	color: darkblue;
}

@media (min-width: 1024px) {
	.app-235-i {
		color: green;
	}
}

@supports (display: grid) {
	.app-235-i {
		display: grid
	}
}
```

# dist/1.output.css

```javascript
/*!****************************!*\
  !*** css ./lazy-style.css ***!
  \****************************/
body {
	color: blue;
}
```

# Info

## Unoptimized

```
assets by path *.js 16.2 KiB
  asset output.js 15.9 KiB [emitted] (name: main)
  asset 1.output.js 343 bytes [emitted]
assets by path *.css 1.19 KiB
  asset output.css 1.06 KiB [emitted] (name: main)
  asset 1.output.css 125 bytes [emitted]
asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: images/file.png] (auxiliary name: main)
Entrypoint main 16.9 KiB (14.6 KiB) = output.js 15.9 KiB output.css 1.06 KiB 1 auxiliary asset
chunk (runtime: main) output.js, output.css (main) 265 bytes (javascript) 454 bytes (css) 14.6 KiB (asset) 42 bytes (css-url) 42 bytes (css-import) 8.8 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 8.8 KiB 9 modules
  dependent modules 14.6 KiB (asset) 42 bytes (css-url) 454 bytes (css) 89 bytes (javascript) 42 bytes (css-import) [dependent] 6 modules
  ./example.js 176 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: main) 1.output.js, 1.output.css 1 bytes (javascript) 23 bytes (css) [rendered]
  > ./lazy-style.css ./example.js 4:0-26
  css ./lazy-style.css 1 bytes (javascript) 23 bytes (css) [built] [code generated]
    [no exports]
    [used exports unknown]
    import() ./lazy-style.css ./example.js 4:0-26
webpack X.X.X compiled successfully
```

## Production mode

```
assets by path *.js 3.23 KiB
  asset output.js 3.14 KiB [emitted] [minimized] (name: main)
  asset 822.output.js 88 bytes [emitted] [minimized]
assets by path *.css 490 bytes
  asset output.css 466 bytes [emitted] (name: main)
  asset 822.output.css 24 bytes [emitted]
asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: images/file.png] (auxiliary name: main)
Entrypoint main 3.6 KiB (14.6 KiB) = output.js 3.14 KiB output.css 466 bytes 1 auxiliary asset
chunk (runtime: main) output.js, output.css (main) 299 bytes (javascript) 454 bytes (css) 14.6 KiB (asset) 42 bytes (css-url) 42 bytes (css-import) 8.53 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 8.53 KiB 8 modules
  dependent modules 14.6 KiB (asset) 42 bytes (css-url) 119 bytes (javascript) 279 bytes (css) 42 bytes (css-import) [dependent] 4 modules
  cacheable modules 180 bytes (javascript) 175 bytes (css)
    ./example.js + 2 modules 178 bytes [built] [code generated]
      [no exports]
      [no exports used]
      entry ./example.js main
    css ./style.css 1 bytes (javascript) 148 bytes (css) [built] [code generated]
      [no exports]
      [no exports used]
    css ./style2.css 1 bytes (javascript) 27 bytes (css) [built] [code generated]
      [no exports]
      [no exports used]
chunk (runtime: main) 822.output.js, 822.output.css 1 bytes (javascript) 23 bytes (css) [rendered]
  > ./lazy-style.css ./example.js 4:0-26
  css ./lazy-style.css 1 bytes (javascript) 23 bytes (css) [built] [code generated]
    [no exports]
    import() ./lazy-style.css ./example.js + 2 modules ./example.js 4:0-26
webpack X.X.X compiled successfully
```
