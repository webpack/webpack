A common challenge with combining `[chunkhash]` and Code Splitting is that the entry chunk includes the webpack runtime and with it the chunkhash mappings. This means it's always updated and the `[chunkhash]` is pretty useless because this chunk won't be cached.

A very simple solution to this problem is to create another chunk that contains only the webpack runtime (including chunkhash map). This can be achieved with `optimization.runtimeChunk` options. To avoid the additional request for another chunk, this pretty small chunk can be inlined into the HTML page.

The configuration required for this is:

- use `[chunkhash]` in `output.filename` (Note that this example doesn't do this because of the example generator infrastructure, but you should)
- use `[chunkhash]` in `output.chunkFilename` (Note that this example doesn't do this because of the example generator infrastructure, but you should)

# example.js

```javascript
// some module
import("./async1");
import("./async2");
```

# webpack.config.js

```javascript
"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	entry: {
		main: "./example"
	},
	optimization: {
		runtimeChunk: true
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].[chunkhash].js",
		chunkFilename: "[name].[chunkhash].js"
	}
};

module.exports = config;
```

# index.html

```html
<html>
	<head> </head>
	<body>
		<!-- inlined minimized file "runtime~main.[chunkhash].js" -->
		<script>
			(()=>{"use strict";var e,r,t,o,n={},a={};function i(e){var r=a[e];if(void 0!==r)return r.exports;var t=a[e]={exports:{}};return n[e](t,t.exports,i),t.exports}i.m=n,e=[],i.O=(r,t,o)=>{if(!t){for(var n=0;n<e.length;n++){let[t,o]=e[n];for(var a=!0,u=0;u<t.length;u++)i.O.j(t[u])?t.splice(u--,1):a=!1;if(a){e.splice(n--,1);var f=o();void 0!==f&&(r=f)}}return r}e.push([t,o])},t=Object.getPrototypeOf,i.t=function(e,o){if(1&o&&(e=this(e)),8&o)return e;if("object"==typeof e&&e){if(4&o&&e.__esModule)return e;if(16&o&&"function"==typeof e.then)return e}var n=Object.create(null);i.r(n);var a=Object.create(null);r=r||[null,t({}),t([]),t(t)];for(var u=2&o&&e;("object"==typeof u||"function"==typeof u)&&!~r.indexOf(u);u=t(u))Object.getOwnPropertyNames(u).forEach(r=>a[r]=()=>e[r]);return a.default=()=>e,i.d(n,a),n},i.d=(e,r)=>{for(var t in r)i.o(r,t)&&!i.o(e,t)&&Object.defineProperty(e,t,{enumerable:!0,get:r[t]})},i.f={},i.e=e=>{var r=[];return i.f.j(e,r),Promise.all(r)},i.u=e=>e+".[chunkhash].js",i.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),o={},i.l=(e,r,t,n)=>{if(o[e])o[e].push(r);else{var a,u;if(void 0!==t)for(var f=document.getElementsByTagName("script"),s=0;s<f.length;s++){var l=f[s];if(l.getAttribute("src")==e){a=l;break}}a||(u=!0,(a=document.createElement("script")).charset="utf-8",i.nc&&a.setAttribute("nonce",i.nc),a.src=e),o[e]=[r];var c=(r,t)=>{a.onerror=a.onload=null,clearTimeout(d);var n=o[e];if(delete o[e],a.parentNode?.removeChild(a),n?.forEach(e=>e(t)),r)return r(t)},d=setTimeout(c.bind(0,0,{type:"timeout",target:a}),12e4);a.onerror=c.bind(0,a.onerror),a.onload=c.bind(0,a.onload),u&&document.head.appendChild(a)}},i.r=e=>Object.defineProperties(e,{[Symbol.toStringTag]:{value:"Module"},__esModule:{value:!0}}),i.p="dist/",(()=>{var e={354:0};i.f.j=(r,t)=>{var o=i.o(e,r)?e[r]:void 0;if(0!==o)if(o)t.push(o[2]);else if(354!=r){var n=new Promise((t,n)=>o=e[r]=[t,n]);t.push(o[2]=n);var a=new Error;i.l(i.p+i.u(r),t=>{if(i.o(e,r)&&(0!==(o=e[r])&&(e[r]=void 0),o)){var n=t&&("load"===t.type?"missing":t.type),u=t?.target?.src;a.message="Loading chunk "+r+" failed.\n("+n+": "+u+")",a.name="ChunkLoadError",a.type=n,a.request=u,a.event=t,o[1](a)}},"chunk-"+r,r)}else e[r]=0},i.O.j=r=>0===e[r];var r=(r,t)=>{let[o,n,a]=t;var u,f;if(o.some(r=>0!==e[r])){for(u in n)i.o(n,u)&&(i.m[u]=n[u]);if(a)var s=a(i)}for(f of(r&&r(t),o))i.o(e,f)&&e[f]&&e[f][0](),e[f]=0;return i.O(s)},t=self.webpackChunk;Array.isArray(t)||(t=self.webpackChunk=[]),t.forEach(r.bind(0,0)),t.push=r.bind(0,t.push.bind(t))})()})();
		</script>

		<script src="dist/main.[chunkhash].js"></script>
	</body>
</html>
```

# dist/runtime~main.[chunkhash].js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
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
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn) => {
/******/ 			if(chunkIds) {
/******/ 				deferred.push([chunkIds, fn]);
/******/ 				return;
/******/ 			}
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				let [chunkIds, fn] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if (__webpack_require__.O.j(chunkIds[j])) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf;
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			var def = Object.create(null);
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; (typeof current == 'object' || typeof current == 'function') && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	// define getter/value functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	__webpack_require__.f = {};
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = (chunkId) => {
/******/ 		var promises = [];
/******/ 		__webpack_require__.f.j(chunkId, promises);
/******/ 		return Promise.all(promises);
/******/ 	};
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	// This function allow to reference async chunks
/******/ 	__webpack_require__.u = (chunkId) => (chunkId + ".[chunkhash].js");
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop));
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
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 		
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
/******/ 				script.parentNode?.removeChild(script);
/******/ 				doneFns?.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			var timeout = setTimeout(onScriptComplete.bind(0, 0, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(0, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(0, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => (Object.defineProperties(exports, { [Symbol.toStringTag]: { value: 'Module' }, __esModule: { value: true } }));
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	__webpack_require__.p = "dist/";
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			1: 0
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
/******/ 						if(1 != chunkId) {
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event?.target?.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										error.event = event;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(__webpack_require__.p + __webpack_require__.u(chunkId), loadingEnded, "chunk-" + chunkId, chunkId);
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
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			let [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(chunkId of chunkIds) {
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk"];
/******/ 		if(!Array.isArray(chunkLoadingGlobal)) chunkLoadingGlobal = self["webpackChunk"] = [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(0, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(0, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	
/******/ 	
/******/ })()
;
```

# dist/main.[chunkhash].js

```javascript
(Array.isArray(self["webpackChunk"]) ? self["webpackChunk"] : (self["webpackChunk"] = [])).push([[0],[
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__.e, __webpack_require__.t, __webpack_require__.* */
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

// some module
__webpack_require__.e(/*! import() */ 2).then(() => (__webpack_require__.t(/*! ./async1 */ 1, 23)));
__webpack_require__.e(/*! import() */ 3).then(() => (__webpack_require__.t(/*! ./async2 */ 2, 23)));


/***/ })
],
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
```

# Info

## Unoptimized

```
asset runtime~main.[chunkhash].js 11.1 KiB [emitted] (name: runtime~main)
asset main.[chunkhash].js 852 bytes [emitted] (name: main)
asset 2.[chunkhash].js 324 bytes [emitted]
asset 3.[chunkhash].js 306 bytes [emitted]
Entrypoint main 11.9 KiB = runtime~main.[chunkhash].js 11.1 KiB main.[chunkhash].js 852 bytes
chunk (runtime: runtime~main) main.[chunkhash].js (main) 55 bytes [initial] [rendered]
  > ./example main
  ./example.js 55 bytes [built] [code generated]
    [used exports unknown]
    entry ./example main
chunk (runtime: runtime~main) runtime~main.[chunkhash].js (runtime~main) 6.92 KiB [entry] [rendered]
  > ./example main
  runtime modules 6.92 KiB 10 modules
chunk (runtime: runtime~main) 2.[chunkhash].js 28 bytes [rendered]
  > ./async1 ./example.js 2:0-18
  ./async1.js 28 bytes [built] [code generated]
    [used exports unknown]
    import() ./async1 ./example.js 2:0-18
chunk (runtime: runtime~main) 3.[chunkhash].js 28 bytes [rendered]
  > ./async2 ./example.js 3:0-18
  ./async2.js 28 bytes [built] [code generated]
    [used exports unknown]
    import() ./async2 ./example.js 3:0-18
webpack X.X.X compiled successfully
```

## Production mode

```
asset runtime~main.[chunkhash].js 2.46 KiB [emitted] [minimized] (name: runtime~main)
asset main.[chunkhash].js 174 bytes [emitted] [minimized] (name: main)
asset 471.[chunkhash].js 98 bytes [emitted] [minimized]
asset 18.[chunkhash].js 96 bytes [emitted] [minimized]
Entrypoint main 2.63 KiB = runtime~main.[chunkhash].js 2.46 KiB main.[chunkhash].js 174 bytes
chunk (runtime: runtime~main) 18.[chunkhash].js 28 bytes [rendered]
  > ./async1 ./example.js 2:0-18
  ./async1.js 28 bytes [built] [code generated]
    [used exports unknown]
    import() ./async1 ./example.js 2:0-18
chunk (runtime: runtime~main) runtime~main.[chunkhash].js (runtime~main) 6.92 KiB [entry] [rendered]
  > ./example main
  runtime modules 6.92 KiB 10 modules
chunk (runtime: runtime~main) 471.[chunkhash].js 28 bytes [rendered]
  > ./async2 ./example.js 3:0-18
  ./async2.js 28 bytes [built] [code generated]
    [used exports unknown]
    import() ./async2 ./example.js 3:0-18
chunk (runtime: runtime~main) main.[chunkhash].js (main) 55 bytes [initial] [rendered]
  > ./example main
  ./example.js 55 bytes [built] [code generated]
    [no exports used]
    entry ./example main
webpack X.X.X compiled successfully
```
