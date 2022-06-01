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
@import "https://fonts.googleapis.com/css?family=Open+Sans" screen;
@import "https://unpkg.com/jquery-ui@1.13.1/themes/base/draggable.css" supports(touch-action: none);
@import url( "style3.css" ) layer( base ) supports( font-weight: bold ) screen and (min-width: 1024px);

@layer base, special;

body {
	background: green;
	font-family: "Open Sans";
}

@layer special {
  .item {
    color: rebeccapurple;
  }
}

@layer base {
  .item {
    color: black;
    border: 5px solid black;
    font-size: 1.3em;
    padding: .5em;
  }
}
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 3:
/*!*************************!*\
  !*** ./images/file.png ***!
  \*************************/
/*! default exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.p, module, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__.p + "89a353e9c515885abd8e.png";

/***/ }),

/***/ 5:
/*!****************************************************************************************************************!*\
  !*** https://fonts.gstatic.com/s/opensans/v29/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.ttf ***!
  \****************************************************************************************************************/
/*! default exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.p, module, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__.p + "8b49cef9eef7a6b1c4cb.ttf";

/***/ })

/******/ 	});
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
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
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
/******/ 		var installedChunks = {};
/******/ 		
/******/ 		var uniqueName = "app";
/******/ 		var loadCssChunkData = (target, link, chunkId) => {
/******/ 			var data, token = "", token2, exports = {}, exportsWithId = [], exportsWithDashes = [], i = 0, cc = 1;
/******/ 			try { if(!link) link = loadStylesheet(chunkId); data = link.sheet.cssRules; data = data[data.length - 1].style; } catch(e) { data = getComputedStyle(document.head); }
/******/ 			data = data.getPropertyValue("--webpack-" + uniqueName + "-" + chunkId);
/******/ 			if(!data) return [];
/******/ 			for(; cc; i++) {
/******/ 				cc = data.charCodeAt(i);
/******/ 				if(cc == 40) { token2 = token; token = ""; }
/******/ 				else if(cc == 41) { exports[token2.replace(/^_/, "")] = token.replace(/^_/, ""); token = ""; }
/******/ 				else if(cc == 47 || cc == 37) { token = token.replace(/^_/, ""); exports[token] = token; exportsWithId.push(token); if(cc == 37) exportsWithDashes.push(token); token = ""; }
/******/ 				else if(!cc || cc == 44) { token = token.replace(/^_/, ""); exportsWithId.forEach((x) => (exports[x] = uniqueName + "-" + token + "-" + exports[x])); exportsWithDashes.forEach((x) => (exports[x] = "--" + exports[x])); __webpack_require__.r(exports); target[token] = ((exports, module) => {
/******/ 					module.exports = exports;
/******/ 				}).bind(null, exports); token = ""; exports = {}; exportsWithId.length = 0; }
/******/ 				else if(cc == 92) { token += data[++i] }
/******/ 				else { token += data[i]; }
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		
/******/ 		}
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
/******/ 				link.setAttribute("data-webpack", uniqueName + ":" + key);
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
/******/ 			needAttach && document.head.appendChild(link);
/******/ 			return link;
/******/ 		};
/******/ 		loadCssChunkData(__webpack_require__.m, 0, 0);
/******/ 		
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
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading css chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									} else {
/******/ 										loadCssChunkData(__webpack_require__.m, link, chunkId);
/******/ 										installedChunkData[0]();
/******/ 									}
/******/ 								}
/******/ 							}
/******/ 						};
/******/ 						var link = loadStylesheet(chunkId, url, loadingEnded);
/******/ 					} else installedChunks[chunkId] = 0;
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
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
/******/ 						if(0 == chunkId) {
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
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.e, __webpack_require__.* */
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _style_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./style.css */ 1);
/* harmony import */ var _style2_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./style2.css */ 8);
/* harmony import */ var _style_module_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./style.module.css */ 9);



__webpack_require__.e(/*! import() */ 1).then(__webpack_require__.bind(__webpack_require__, /*! ./lazy-style.css */ 10));

document.getElementsByTagName("main")[0].className = _style_module_css__WEBPACK_IMPORTED_MODULE_2__.main;

})();

/******/ })()
;
```

# dist/output.css

```javascript
.img {
	width: 150px;
	height: 150px;
	background: url(89a353e9c515885abd8e.png);
}


@media screen {
	@font-face {
	  font-family: 'Open Sans';
	  font-style: normal;
	  font-weight: 400;
	  font-stretch: normal;
	  src: url(8b49cef9eef7a6b1c4cb.ttf) format('truetype');
	}
}

@supports(touch-action: none) {
	/*!
	 * jQuery UI Draggable 1.13.1
	 * http://jqueryui.com
	 *
	 * Copyright jQuery Foundation and other contributors
	 * Released under the MIT license.
	 * http://jquery.org/license
	 */
	.ui-draggable-handle {
		-ms-touch-action: none;
		touch-action: none;
	}
}

@layer base {
	@supports(font-weight: bold) {
		@media screen and (min-width: 1024px) {
			body {
				font-weight: bold;
				text-decoration: underline;
			}
		}
	}
}

@layer base, special;

body {
	background: green;
	font-family: "Open Sans";
}

@layer special {
  .item {
    color: rebeccapurple;
  }
}

@layer base {
  .item {
    color: black;
    border: 5px solid black;
    font-size: 1.3em;
    padding: .5em;
  }
}

body {
	background: red;
}

:root {
	--app-9-large: 72px;
}

.app-9-main {
	font-size: var(--app-9-large);
	color: darkblue;
}

@media (min-width: 1024px) {
	.app-9-main {
		color: green;
	}
}

@supports (display: grid) {
	.app-9-main {
		display: grid
	}
}

head{--webpack-app-0:_2,_4,_6,_7,_1,_8,large%main/_9;}
```

## production

```javascript
.img {
	width: 150px;
	height: 150px;
	background: url(89a353e9c515885abd8e.png);
}


@media screen {
	@font-face {
	  font-family: 'Open Sans';
	  font-style: normal;
	  font-weight: 400;
	  font-stretch: normal;
	  src: url(8b49cef9eef7a6b1c4cb.ttf) format('truetype');
	}
}

@supports(touch-action: none) {
	/*!
	 * jQuery UI Draggable 1.13.1
	 * http://jqueryui.com
	 *
	 * Copyright jQuery Foundation and other contributors
	 * Released under the MIT license.
	 * http://jquery.org/license
	 */
	.ui-draggable-handle {
		-ms-touch-action: none;
		touch-action: none;
	}
}

@layer base {
	@supports(font-weight: bold) {
		@media screen and (min-width: 1024px) {
			body {
				font-weight: bold;
				text-decoration: underline;
			}
		}
	}
}

@layer base, special;

body {
	background: green;
	font-family: "Open Sans";
}

@layer special {
  .item {
    color: rebeccapurple;
  }
}

@layer base {
  .item {
    color: black;
    border: 5px solid black;
    font-size: 1.3em;
    padding: .5em;
  }
}

body {
	background: red;
}

:root {
	--app-491-b: 72px;
}

.app-491-D {
	font-size: var(--app-491-b);
	color: darkblue;
}

@media (min-width: 1024px) {
	.app-491-D {
		color: green;
	}
}

@supports (display: grid) {
	.app-491-D {
		display: grid
	}
}

head{--webpack-app-179:_431,_572,_863,_252,_258,_268,b%D/_491;}
```

# dist/1.output.css

```javascript
body {
	color: blue;
}

head{--webpack-app-1:_10;}
```

# Info

## Unoptimized

```
assets by info 45.2 KiB [immutable]
  asset 8b49cef9eef7a6b1c4cb.ttf 30.6 KiB [emitted] [immutable] [from: https://fonts.gstatic.com/s/opensans/v29/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.ttf] (auxiliary name: main)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: images/file.png] (auxiliary name: main)
assets by chunk 18.4 KiB (name: main)
  asset output.js 17.1 KiB [emitted] (name: main)
  asset output.css 1.29 KiB [emitted] (name: main)
asset 1.output.css 50 bytes [emitted]
Entrypoint main 18.4 KiB (45.2 KiB) = output.js 17.1 KiB output.css 1.29 KiB 2 auxiliary assets
chunk (runtime: main) output.js, output.css (main) 260 bytes (javascript) 1.39 KiB (css) 45.2 KiB (asset) 10 KiB (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 84 bytes (javascript) 45.2 KiB (asset) 1.39 KiB (css) [dependent] 9 modules
  runtime modules 10 KiB 9 modules
  ./example.js 176 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: main) 1.output.css 23 bytes
  > ./lazy-style.css ./example.js 4:0-26
  ./lazy-style.css 23 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    import() ./lazy-style.css ./example.js 4:0-26
webpack 5.79.0 compiled successfully
```

## Production mode

```
assets by info 45.2 KiB [immutable]
  asset 8b49cef9eef7a6b1c4cb.ttf 30.6 KiB [emitted] [immutable] [from: https://fonts.gstatic.com/s/opensans/v29/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.ttf] (auxiliary name: main)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: images/file.png] (auxiliary name: main)
assets by chunk 5.22 KiB (name: main)
  asset output.js 3.94 KiB [emitted] [minimized] (name: main)
  asset output.css 1.29 KiB [emitted] (name: main)
asset 159.output.css 53 bytes [emitted]
Entrypoint main 5.22 KiB (45.2 KiB) = output.js 3.94 KiB output.css 1.29 KiB 2 auxiliary assets
chunk (runtime: main) 159.output.css 23 bytes
  > ./lazy-style.css ./example.js 4:0-26
  ./lazy-style.css 23 bytes [built] [code generated]
    [no exports]
    import() ./lazy-style.css ./example.js 4:0-26
chunk (runtime: main) output.js, output.css (main) 260 bytes (javascript) 1.39 KiB (css) 45.2 KiB (asset) 10 KiB (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 84 bytes (javascript) 45.2 KiB (asset) 1.39 KiB (css) [dependent] 9 modules
  runtime modules 10 KiB 9 modules
  ./example.js 176 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack 5.79.0 compiled successfully
```
