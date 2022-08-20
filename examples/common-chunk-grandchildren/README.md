This example illustrates how common modules from deep ancestors of an entry point can be split into a separate common chunk

- `pageA` and `pageB` are dynamically required
- `pageC` and `pageA` both require the `reusableComponent`
- `pageB` dynamically requires `PageC`

You can see that webpack outputs five files/chunks:

- `output.js` is the entry chunk and contains
  - the module system
  - chunk loading logic
  - the entry point `example.js`
- `0.output.js` is an additional chunk
  - module `reusableComponent`
- `1.output.js` is an additional chunk
  - module `pageB`
- `2.output.js` is an additional chunk
  - module `pageA`
- `3.output.js` is an additional chunk
  - module `pageC`

# example.js

```javascript
var main = function() {
	console.log("Main class");
	require.ensure([], () => {
		const page = require("./pageA");
		page();
	});
	require.ensure([], () => {
		const page = require("./pageB");
		page();
	});
};

main();
```

# pageA.js

```javascript
var reusableComponent = require("./reusableComponent");

module.exports = function() {
	console.log("Page A");
	reusableComponent();
};
```

# pageB.js

```javascript
module.exports = function() {
	console.log("Page B");
	require.ensure([], ()=>{
		const page = require("./pageC");
		page();
	});
};
```

# pageC.js

```javascript
var reusableComponent = require("./reusableComponent");

module.exports = function() {
	console.log("Page C");
	reusableComponent();
};
```

# reusableComponent.js

```javascript
module.exports = function() {
	console.log("reusable Component");
};
```

# webpack.config.js

```javascript
"use strict";
const path = require("path");

module.exports = {
	// mode: "development || "production",
	entry: {
		main: ["./example.js"]
	},
	optimization: {
		splitChunks: {
			minSize: 0 // This example is too small, in practice you can use the defaults
		},
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "output.js"
	}
};
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({});
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
/******/ 		// data-webpack is not used as build has no uniqueName
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
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
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
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
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
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
/******/ 			179: 0
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
/******/ 				installedChunks[chunkIds[i]] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk"] = self["webpackChunk"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
var __webpack_exports__ = {};
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__, __webpack_require__.e, __webpack_require__.* */
var main = function() {
	console.log("Main class");
	Promise.all(/*! require.ensure */[__webpack_require__.e(421), __webpack_require__.e(366)]).then((() => {
		const page = __webpack_require__(/*! ./pageA */ 1);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
	__webpack_require__.e(/*! require.ensure */ 588).then((() => {
		const page = __webpack_require__(/*! ./pageB */ 3);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};

main();

/******/ })()
;
```

# dist/366.output.js

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([[366],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module, __webpack_require__ */
/*! CommonJS bailout: module.exports is used directly at 3:0-14 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var reusableComponent = __webpack_require__(/*! ./reusableComponent */ 2);

module.exports = function() {
	console.log("Page A");
	reusableComponent();
};


/***/ })
]]);
```

# dist/588.output.js

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([[588],{

/***/ 3:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module, __webpack_require__, __webpack_require__.e, __webpack_require__.* */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = function() {
	console.log("Page B");
	Promise.all(/*! require.ensure */[__webpack_require__.e(421), __webpack_require__.e(145)]).then((()=>{
		const page = __webpack_require__(/*! ./pageC */ 4);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};


/***/ })

}]);
```

# dist/145.output.js

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([[145],{

/***/ 4:
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module, __webpack_require__ */
/*! CommonJS bailout: module.exports is used directly at 3:0-14 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var reusableComponent = __webpack_require__(/*! ./reusableComponent */ 2);

module.exports = function() {
	console.log("Page C");
	reusableComponent();
};


/***/ })

}]);
```

# dist/421.output.js

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([[421],{

/***/ 2:
/*!******************************!*\
  !*** ./reusableComponent.js ***!
  \******************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = function() {
	console.log("reusable Component");
};


/***/ })

}]);
```

# Info

## Unoptimized

```
asset output.js 9.11 KiB [emitted] (name: main)
asset 588.output.js 736 bytes [emitted]
asset 366.output.js 558 bytes [emitted]
asset 145.output.js 552 bytes [emitted]
asset 421.output.js 434 bytes [emitted]
chunk (runtime: main) 145.output.js 136 bytes [rendered]
  > ./pageB.js 3:1-6:3
  ./pageC.js 136 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./pageC ./pageB.js 4:15-33
    cjs self exports reference ./pageC.js 3:0-14
chunk (runtime: main) output.js (main) 220 bytes (javascript) 4.98 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 4.98 KiB 6 modules
  ./example.js 220 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: main) 366.output.js 136 bytes [rendered]
  > ./example.js 3:1-6:3
  ./pageA.js 136 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./pageA ./example.js 4:15-33
    cjs self exports reference ./pageA.js 3:0-14
chunk (runtime: main) 421.output.js 69 bytes [rendered] split chunk (cache group: default)
  > ./example.js 3:1-6:3
  > ./pageB.js 3:1-6:3
  ./reusableComponent.js 69 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./reusableComponent ./pageA.js 1:24-54
    cjs require ./reusableComponent ./pageC.js 1:24-54
    cjs self exports reference ./reusableComponent.js 1:0-14
chunk (runtime: main) 588.output.js 133 bytes [rendered]
  > ./example.js 7:1-10:3
  ./pageB.js 133 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./pageB ./example.js 8:15-33
    cjs self exports reference ./pageB.js 1:0-14
webpack 5.51.1 compiled successfully
```

## Production mode

```
asset output.js 1.8 KiB [emitted] [minimized] (name: main)
asset 588.output.js 198 bytes [emitted] [minimized]
asset 145.output.js 134 bytes [emitted] [minimized]
asset 366.output.js 134 bytes [emitted] [minimized]
asset 421.output.js 123 bytes [emitted] [minimized]
chunk (runtime: main) 145.output.js 136 bytes [rendered]
  > ./pageB.js 3:1-6:3
  ./pageC.js 136 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./pageC ./pageB.js 4:15-33
    cjs self exports reference ./pageC.js 3:0-14
chunk (runtime: main) output.js (main) 220 bytes (javascript) 4.98 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 4.98 KiB 6 modules
  ./example.js 220 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
chunk (runtime: main) 366.output.js 136 bytes [rendered]
  > ./example.js 3:1-6:3
  ./pageA.js 136 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./pageA ./example.js 4:15-33
    cjs self exports reference ./pageA.js 3:0-14
chunk (runtime: main) 421.output.js 69 bytes [rendered] split chunk (cache group: default)
  > ./example.js 3:1-6:3
  > ./pageB.js 3:1-6:3
  ./reusableComponent.js 69 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./reusableComponent ./pageA.js 1:24-54
    cjs require ./reusableComponent ./pageC.js 1:24-54
    cjs self exports reference ./reusableComponent.js 1:0-14
chunk (runtime: main) 588.output.js 133 bytes [rendered]
  > ./example.js 7:1-10:3
  ./pageB.js 133 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./pageB ./example.js 8:15-33
    cjs self exports reference ./pageB.js 1:0-14
webpack 5.51.1 compiled successfully
```
