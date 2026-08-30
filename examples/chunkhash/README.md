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
			(()=>{"use strict";var e={};const t={};function o(r){const n=t[r];if(void 0!==n)return n.exports;const i=t[r]={exports:{}};return e[r](i,i.exports,o),i.exports}o.m=e,(()=>{const e=[];o.O=(t,r,n,i)=>{if(r){i=i||0;for(var s=e.length;s>0&&e[s-1][2]>i;s--)e[s]=e[s-1];return void(e[s]=[r,n,i])}let c=1/0;for(s=0;s<e.length;s++){let[r,n,i]=e[s],u=!0;for(var l=0;l<r.length;l++)1&i&&!(c>=i)||!Object.keys(o.O).every(e=>o.O[e](r[l]))?(u=!1,i<c&&(c=i)):r.splice(l--,1);if(u){e.splice(s--,1);const o=n();void 0!==o&&(t=o)}}return t}})(),(()=>{const e=Object.getPrototypeOf;let t;o.t=function(r,n){if(1&n&&(r=this(r)),8&n)return r;if("object"==typeof r&&r){if(4&n&&r.__esModule)return r;if(16&n&&"function"==typeof r.then)return r}const i=Object.create(null);o.r(i);const s={};t=t||[null,e({}),e([]),e(e)];for(var c=2&n&&r;("object"==typeof c||"function"==typeof c)&&!~t.indexOf(c);c=e(c))Object.getOwnPropertyNames(c).forEach(e=>s[e]=()=>r[e]);return s.default=()=>r,o.d(i,s),i}})(),o.d=(e,t)=>{for(var r in t)o.o(t,r)&&!o.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},o.f={},o.e=e=>Promise.all(Object.keys(o.f).reduce((t,r)=>(o.f[r](e,t),t),[])),o.u=e=>e+".[chunkhash].js",o.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),(()=>{const e={};o.l=(t,r,n,i)=>{if(e[t])return void e[t].push(r);let s,c;if(void 0!==n){const e=document.getElementsByTagName("script");for(var l=0;l<e.length;l++){const o=e[l];if(o.getAttribute("src")==t){s=o;break}}}s||(c=!0,s=document.createElement("script"),s.charset="utf-8",o.nc&&s.setAttribute("nonce",o.nc),s.src=t),e[t]=[r];const u=(o,r)=>{s.onerror=s.onload=null,clearTimeout(f);const n=e[t];if(delete e[t],s.parentNode?.removeChild(s),n?.forEach(e=>e(r)),o)return o(r)},f=setTimeout(u.bind(null,void 0,{type:"timeout",target:s}),12e4);s.onerror=u.bind(null,s.onerror),s.onload=u.bind(null,s.onload),c&&document.head.appendChild(s)}})(),o.r=e=>{Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.p="dist/",(()=>{const e={354:0};o.f.j=(t,r)=>{let n=o.o(e,t)?e[t]:void 0;if(0!==n)if(n)r.push(n[2]);else if(354!=t){const i=new Promise((o,r)=>n=e[t]=[o,r]);r.push(n[2]=i);const s=new Error,c=r=>{if(o.o(e,t)&&(n=e[t],0!==n&&(e[t]=void 0),n)){const e=r&&("load"===r.type?"missing":r.type),o=r&&r.target&&r.target.src;s.message="Loading chunk "+t+" failed.\n("+e+": "+o+")",s.name="ChunkLoadError",s.type=e,s.request=o,s.event=r,n[1](s)}};o.l(o.p+o.u(t),c,"chunk-"+t,t)}else e[t]=0},o.O.j=t=>0===e[t];const t=(t,r)=>{let[n,i,s]=r;var c,l,u=0;if(n.some(t=>0!==e[t])){for(c in i)o.o(i,c)&&(o.m[c]=i[c]);if(s)var f=s(o)}for(t&&t(r);u<n.length;u++)l=n[u],o.o(e,l)&&e[l]&&e[l][0](),e[l]=0;return o.O(f)},r=self.webpackChunk=self.webpackChunk||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})()})();
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
/******/ 		const deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			let notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				let [chunkIds, fn, priority] = deferred[i];
/******/ 				let fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if (((priority & 1) === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					const r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		const getProto = Object.getPrototypeOf;
/******/ 		let leafPrototypes;
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
/******/ 			const ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			const def = {};
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
/******/ 		return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 			__webpack_require__.f[key](chunkId, promises);
/******/ 			return promises;
/******/ 		}, []));
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
/******/ 		const inProgress = {};
/******/ 		// data-webpack is not used as build has no uniqueName
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			let script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				const scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					const s = scripts[i];
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
/******/ 			const onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				const doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode?.removeChild(script);
/******/ 				doneFns?.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			const timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
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
/******/ 		const installedChunks = {
/******/ 			1: 0
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				let installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(1 != chunkId) {
/******/ 							// setup Promise in chunk cache
/******/ 							const promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							const error = new Error();
/******/ 							const loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										const errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										const realSrc = event && event.target && event.target.src;
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
/******/ 		const webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			let [chunkIds, moreModules, runtime] = data;
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
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		const chunkLoadingGlobal = self["webpackChunk"] = self["webpackChunk"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
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
(self["webpackChunk"] = self["webpackChunk"] || []).push([[0],[
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
asset runtime~main.[chunkhash].js 11.7 KiB [emitted] (name: runtime~main)
asset main.[chunkhash].js 813 bytes [emitted] (name: main)
asset 2.[chunkhash].js 285 bytes [emitted]
asset 3.[chunkhash].js 267 bytes [emitted]
Entrypoint main 12.5 KiB = runtime~main.[chunkhash].js 11.7 KiB main.[chunkhash].js 813 bytes
chunk (runtime: runtime~main) main.[chunkhash].js (main) 55 bytes [initial] [rendered]
  > ./example main
  ./example.js 55 bytes [built] [code generated]
    [used exports unknown]
    entry ./example main
chunk (runtime: runtime~main) runtime~main.[chunkhash].js (runtime~main) 7.41 KiB [entry] [rendered]
  > ./example main
  runtime modules 7.41 KiB 10 modules
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
asset runtime~main.[chunkhash].js 2.74 KiB [emitted] [minimized] (name: runtime~main)
asset main.[chunkhash].js 142 bytes [emitted] [minimized] (name: main)
asset 471.[chunkhash].js 66 bytes [emitted] [minimized]
asset 18.[chunkhash].js 64 bytes [emitted] [minimized]
Entrypoint main 2.88 KiB = runtime~main.[chunkhash].js 2.74 KiB main.[chunkhash].js 142 bytes
chunk (runtime: runtime~main) 18.[chunkhash].js 28 bytes [rendered]
  > ./async1 ./example.js 2:0-18
  ./async1.js 28 bytes [built] [code generated]
    [used exports unknown]
    import() ./async1 ./example.js 2:0-18
chunk (runtime: runtime~main) runtime~main.[chunkhash].js (runtime~main) 7.42 KiB [entry] [rendered]
  > ./example main
  runtime modules 7.42 KiB 10 modules
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
