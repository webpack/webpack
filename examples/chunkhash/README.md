A common challenge with combining `[chunkhash]` and Code Splitting is that the entry chunk includes the webpack runtime and with it the chunkhash mappings. This means it's always updated and the `[chunkhash]` is pretty useless, because this chunk won't be cached.

A very simple solution to this problem is to create another chunk which contains only the webpack runtime (including chunkhash map). This can be achieved with the `optimization.runtimeChunk` options. To avoid the additional request for another chunk, this pretty small chunk can be inlined into the HTML page.

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
var path = require("path");
module.exports = {
	// mode: "development || "production",
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
```

# index.html

```html
<html>
	<head> </head>
	<body>
		<!-- inlined minimized file "runtime~main.[chunkhash].js" -->
		<script>
			((e,r)=>{"use strict";var t={};function o(r){if(t[r])return t[r].exports;var n=t[r]={i:r,l:!1,exports:{}};return e[r](n,n.exports,o),n.l=!0,n.exports}o.m=e,function(e){e.f={},e.e=r=>Promise.all(Object.keys(e.f).reduce((t,o)=>(e.f[o](r,t),t),[])),e.t=function(r,t){if(1&t&&(r=this(r)),8&t)return r;if(4&t&&"object"==typeof r&&r&&r.__esModule)return r;var o=Object.create(null);if(e.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:r}),2&t&&"string"!=typeof r){var n={};for(const e in r)n[e]=()=>r[e];e.d(o,n)}return o},r=Object.prototype.hasOwnProperty,e.d=(e,t)=>{for(var o in t)r.call(t,o)&&!r.call(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:t[o]})},e.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},e.p="dist/",e.u=e=>e+".[chunkhash].js",function(){var r={303:0},t=[];e.f.j=(t,o)=>{var n=Object.prototype.hasOwnProperty.call(r,t)?r[t]:void 0;if(0!==n)if(n)o.push(n[2]);else{var a=new Promise((e,o)=>{n=r[t]=[e,o]});o.push(n[2]=a);var i,u=e.p+e.u(t),l=document.createElement("script");l.charset="utf-8",l.timeout=120,e.nc&&l.setAttribute("nonce",e.nc),l.src=u;var p=new Error;i=function(e){l.onerror=l.onload=null,clearTimeout(c);var o=(()=>{if(Object.prototype.hasOwnProperty.call(r,t)&&r[t])return r[t][1];0!==r[t]&&(r[t]=void 0)})();if(o){var n=e&&("load"===e.type?"missing":e.type),a=e&&e.target&&e.target.src;p.message="Loading chunk "+t+" failed.\n("+n+": "+a+")",p.name="ChunkLoadError",p.type=n,p.request=a,o(p)}};var c=setTimeout(function(){i({type:"timeout",target:l})},12e4);l.onerror=l.onload=i,document.head.appendChild(l)}};var o=()=>{};function n(){for(var o,n=0;n<t.length;n++){for(var a=t[n],i=!0,u=1;u<a.length;u++){var l=a[u];0!==r[l]&&(i=!1)}i&&(t.splice(n--,1),o=e(e.s=a[0]))}return o}function a(n){for(var a,i,u=n[0],l=n[1],c=n[2],s=n[3],f=0,d=[];f<u.length;f++)i=u[f],Object.prototype.hasOwnProperty.call(r,i)&&r[i]&&d.push(r[i][0]),r[i]=0;for(a in l)Object.prototype.hasOwnProperty.call(l,a)&&(e.m[a]=l[a]);for(s&&s(e),p&&p(n);d.length;)d.shift()();return c&&t.push.apply(t,c),o()}e.x=()=>(o=n)();var i=window.webpackJsonp=window.webpackJsonp||[],u=i.push.bind(i);i.push=a,i=i.slice();for(var l=0;l<i.length;l++)a(i[l]);var p=u}();var r}(o),o.x()})([]);
		</script>

		<script src="dist/main.[chunkhash].js"></script>
	</body>
</html>
```

# dist/runtime~main.[chunkhash].js

```javascript
/******/ ((modules, runtime) => { // webpackBootstrap
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
/******/ 		modules[moduleId](module, module.exports, __webpack_require__);
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
/******/
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run startup
/******/ 	return __webpack_require__.x();
/******/ })
/************************************************************************/
/******/ ([],
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
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	!function() {
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 			if(mode & 2 && typeof value != 'string') {
/******/ 				var def = {};
/******/ 				for(const key in value) def[key] = () => value[key];
/******/ 				__webpack_require__.d(ns, def);
/******/ 			}
/******/ 			return ns;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(hasOwnProperty.call(definition, key) && !hasOwnProperty.call(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
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
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".[chunkhash].js";
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
/******/ 			0: 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 		
/******/ 		];
/******/ 		
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = Object.prototype.hasOwnProperty.call(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
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
/******/ 							var loadingEnded = () => {
/******/ 								if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) return installedChunks[chunkId][1];
/******/ 								if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined;
/******/ 							};
/******/ 							var script = document.createElement('script');
/******/ 							var onScriptComplete;
/******/ 		
/******/ 							script.charset = 'utf-8';
/******/ 							script.timeout = 120;
/******/ 							if (__webpack_require__.nc) {
/******/ 								script.setAttribute("nonce", __webpack_require__.nc);
/******/ 							}
/******/ 							script.src = url;
/******/ 		
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							onScriptComplete = function (event) {
/******/ 								// avoid mem leaks in IE.
/******/ 								script.onerror = script.onload = null;
/******/ 								clearTimeout(timeout);
/******/ 								var reportError = loadingEnded();
/******/ 								if(reportError) {
/******/ 									var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 									var realSrc = event && event.target && event.target.src;
/******/ 									error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 									error.name = 'ChunkLoadError';
/******/ 									error.type = errorType;
/******/ 									error.request = realSrc;
/******/ 									reportError(error);
/******/ 								}
/******/ 							};
/******/ 							var timeout = setTimeout(function(){
/******/ 								onScriptComplete({ type: 'timeout', target: script });
/******/ 							}, 120000);
/******/ 							script.onerror = script.onload = onScriptComplete;
/******/ 							document.head.appendChild(script);
/******/ 						} else installedChunks[chunkId] = 0;
/******/ 		
/******/ 						// no HMR
/******/ 					}
/******/ 				}
/******/ 		
/******/ 				// no chunk preloading needed
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		var checkDeferredModules = () => {
/******/ 		
/******/ 		};
/******/ 		function checkDeferredModulesImpl() {
/******/ 			var result;
/******/ 			for(var i = 0; i < deferredModules.length; i++) {
/******/ 				var deferredModule = deferredModules[i];
/******/ 				var fulfilled = true;
/******/ 				for(var j = 1; j < deferredModule.length; j++) {
/******/ 					var depId = deferredModule[j];
/******/ 					if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferredModules.splice(i--, 1);
/******/ 					result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 				}
/******/ 			}
/******/ 			// no prefetch
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = () => {
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var executeModules = data[2];
/******/ 			var runtime = data[3];
/******/ 		
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
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
/******/ 			// add entry modules from loaded chunk to deferred list
/******/ 			if(executeModules) deferredModules.push.apply(deferredModules, executeModules);
/******/ 		
/******/ 			// run deferred modules when all chunks ready
/******/ 			return checkDeferredModules();
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		jsonpArray = jsonpArray.slice();
/******/ 		for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# dist/main.[chunkhash].js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__.e, __webpack_require__.t, __webpack_require__ */
/***/ ((__unusedmodule, __unusedexports, __webpack_require__) => {

// some module
__webpack_require__.e(/*! import() */ 2).then(__webpack_require__.t.bind(__webpack_require__, /*! ./async1 */ 1, 7));
__webpack_require__.e(/*! import() */ 3).then(__webpack_require__.t.bind(__webpack_require__, /*! ./async2 */ 2, 7));


/***/ })
],[[0,0]]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.30
                    Asset       Size  Chunks             Chunk Names
           2.[chunkhash].js  314 bytes     {2}  [emitted]
           3.[chunkhash].js  308 bytes     {3}  [emitted]
        main.[chunkhash].js  656 bytes     {1}  [emitted]  main
runtime~main.[chunkhash].js   10.6 KiB     {0}  [emitted]  runtime~main
Entrypoint main = runtime~main.[chunkhash].js main.[chunkhash].js
chunk {0} runtime~main.[chunkhash].js (runtime~main) 6.39 KiB [entry] [rendered]
    > ./example main
    7 chunk modules
chunk {1} main.[chunkhash].js (main) 55 bytes [initial] [rendered]
    > ./example main
 [0] ./example.js 55 bytes {1} [built]
     [used exports unknown]
     entry ./example main
chunk {2} 2.[chunkhash].js 28 bytes [rendered]
    > ./async1 [0] ./example.js 2:0-18
 [1] ./async1.js 28 bytes {2} [built]
     [used exports unknown]
     import() ./async1 [0] ./example.js 2:0-18
chunk {3} 3.[chunkhash].js 28 bytes [rendered]
    > ./async2 [0] ./example.js 3:0-18
 [2] ./async2.js 28 bytes {3} [built]
     [used exports unknown]
     import() ./async2 [0] ./example.js 3:0-18
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.30
                    Asset       Size  Chunks             Chunk Names
         114.[chunkhash].js   73 bytes   {114}  [emitted]
         172.[chunkhash].js   73 bytes   {172}  [emitted]
        main.[chunkhash].js  155 bytes   {179}  [emitted]  main
runtime~main.[chunkhash].js   2.26 KiB   {303}  [emitted]  runtime~main
Entrypoint main = runtime~main.[chunkhash].js main.[chunkhash].js
chunk {114} 114.[chunkhash].js 28 bytes [rendered]
    > ./async1 [144] ./example.js 2:0-18
 [114] ./async1.js 28 bytes {114} [built]
       import() ./async1 [144] ./example.js 2:0-18
chunk {172} 172.[chunkhash].js 28 bytes [rendered]
    > ./async2 [144] ./example.js 3:0-18
 [172] ./async2.js 28 bytes {172} [built]
       import() ./async2 [144] ./example.js 3:0-18
chunk {179} main.[chunkhash].js (main) 55 bytes [initial] [rendered]
    > ./example main
 [144] ./example.js 55 bytes {179} [built]
       entry ./example main
chunk {303} runtime~main.[chunkhash].js (runtime~main) 6.39 KiB [entry] [rendered]
    > ./example main
    7 chunk modules
```
