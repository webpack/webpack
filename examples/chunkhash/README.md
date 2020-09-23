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
			!function(){"use strict";var e,n={},r={};function t(e){if(r[e])return r[e].exports;var o=r[e]={exports:{}};return n[e](o,o.exports,t),o.exports}t.m=n,t.t=function(e,n){if(1&n&&(e=this(e)),8&n)return e;if(4&n&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);t.r(r);var o={};if(2&n&&"object"==typeof e&&e)for(var u in e)o[u]=function(n){return e[n]}.bind(null,u);return o.default=function(){return e},t.d(r,o),r},t.d=function(e,n){for(var r in n)t.o(n,r)&&!t.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:n[r]})},t.f={},t.e=function(e){return Promise.all(Object.keys(t.f).reduce((function(n,r){return t.f[r](e,n),n}),[]))},t.u=function(e){return e+".[chunkhash].js"},t.o=function(e,n){return Object.prototype.hasOwnProperty.call(e,n)},e={},t.l=function(n,r,o){if(e[n])e[n].push(r);else{var u,i;if(void 0!==o)for(var f=document.getElementsByTagName("script"),a=0;a<f.length;a++){var c=f[a];if(c.getAttribute("src")==n){u=c;break}}u||(i=!0,(u=document.createElement("script")).charset="utf-8",u.timeout=120,t.nc&&u.setAttribute("nonce",t.nc),u.src=n),e[n]=[r];var l=function(r,t){u.onerror=u.onload=null,clearTimeout(s);var o=e[n];if(delete e[n],u.parentNode&&u.parentNode.removeChild(u),o&&o.forEach((function(e){return e(t)})),r)return r(t)},s=setTimeout(l.bind(null,void 0,{type:"timeout",target:u}),12e4);u.onerror=l.bind(null,u.onerror),u.onload=l.bind(null,u.onload),i&&document.head.appendChild(u)}},t.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},t.p="dist/",function(){var e={303:0},n=[];t.f.j=function(n,r){var o=t.o(e,n)?e[n]:void 0;if(0!==o)if(o)r.push(o[2]);else{var u=new Promise((function(r,t){o=e[n]=[r,t]}));r.push(o[2]=u);var i=t.p+t.u(n),f=new Error;t.l(i,(function(r){if(t.o(e,n)&&(0!==(o=e[n])&&(e[n]=void 0),o)){var u=r&&("load"===r.type?"missing":r.type),i=r&&r.target&&r.target.src;f.message="Loading chunk "+n+" failed.\n("+u+": "+i+")",f.name="ChunkLoadError",f.type=u,f.request=i,o[1](f)}}),"chunk-"+n)}};var r=function(){};function o(){for(var r,o=0;o<n.length;o++){for(var u=n[o],i=!0,f=1;f<u.length;f++){var a=u[f];0!==e[a]&&(i=!1)}i&&(n.splice(o--,1),r=t(t.s=u[0]))}return 0===n.length&&(t.x(),t.x=function(){}),r}t.x=function(){t.x=function(){},i=i.slice();for(var e=0;e<i.length;e++)u(i[e]);return(r=o)()};var u=function(o){for(var u,i,a=o[0],c=o[1],l=o[2],s=o[3],d=0,p=[];d<a.length;d++)i=a[d],t.o(e,i)&&e[i]&&p.push(e[i][0]),e[i]=0;for(u in c)t.o(c,u)&&(t.m[u]=c[u]);for(l&&l(t),f(o);p.length;)p.shift()();return s&&n.push.apply(n,s),r()},i=self.webpackChunk=self.webpackChunk||[],f=i.push.bind(i);i.push=u}(),t.x()}();
		</script>

		<script src="dist/main.[chunkhash].js"></script>
	</body>
</html>
```

# dist/runtime~main.[chunkhash].js

```javascript
/******/ (function() { // webpackBootstrap
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
/******/ 			var def = {};
/******/ 			if(mode & 2 && typeof value == 'object' && value) {
/******/ 				for(var key in value) def[key] = function(key) { return value[key]; }.bind(null, key);
/******/ 			}
/******/ 			def['default'] = function() { return value; };
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = function(chunkId) {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".[chunkhash].js";
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	!function() {
/******/ 		var inProgress = {};
/******/ 		// data-webpack is not used as build has no uniqueName
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = function(url, done, key) {
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
/******/ 			var onScriptComplete = function(prev, event) {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach(function(fn) { return fn(event); });
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			;
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
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
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	!function() {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			1: 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 		
/******/ 		];
/******/ 		__webpack_require__.f.j = function(chunkId, promises) {
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
/******/ 							var promise = new Promise(function(resolve, reject) {
/******/ 								installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 							});
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = function(event) {
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
/******/ 		var checkDeferredModules = function() {
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
/******/ 			if(deferredModules.length === 0) {
/******/ 				__webpack_require__.x();
/******/ 				__webpack_require__.x = function() {
/******/ 		
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = function() {
/******/ 			// reset startup function so it can be called again when more startup code is added
/******/ 			__webpack_require__.x = function() {
/******/ 		
/******/ 			}
/******/ 			chunkLoadingGlobal = chunkLoadingGlobal.slice();
/******/ 			for(var i = 0; i < chunkLoadingGlobal.length; i++) webpackJsonpCallback(chunkLoadingGlobal[i]);
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = function(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var runtime = data[2];
/******/ 			var executeModules = data[3];
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
/******/ 			parentChunkLoadingFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 			// add entry modules from loaded chunk to deferred list
/******/ 			if(executeModules) deferredModules.push.apply(deferredModules, executeModules);
/******/ 		
/******/ 			// run deferred modules when all chunks ready
/******/ 			return checkDeferredModules();
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk"] = self["webpackChunk"] || [];
/******/ 		var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback;
/******/ 	}();
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// run startup
/******/ 	return __webpack_require__.x();
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
/***/ (function(__unused_webpack_module, __unused_webpack_exports, __webpack_require__) {

// some module
__webpack_require__.e(/*! import() */ 2).then(__webpack_require__.t.bind(__webpack_require__, /*! ./async1 */ 1, 7));
__webpack_require__.e(/*! import() */ 3).then(__webpack_require__.t.bind(__webpack_require__, /*! ./async2 */ 2, 7));


/***/ })
],
0,[[0,1]]]);
```

# Info

## Unoptimized

```
asset runtime~main.[chunkhash].js 12.1 KiB [emitted] (name: runtime~main)
asset main.[chunkhash].js 655 bytes [emitted] (name: main)
asset 2.[chunkhash].js 290 bytes [emitted]
asset 3.[chunkhash].js 284 bytes [emitted]
Entrypoint main 12.8 KiB = runtime~main.[chunkhash].js 12.1 KiB main.[chunkhash].js 655 bytes
chunk main.[chunkhash].js (main) 55 bytes [initial] [rendered]
  > ./example main
  ./example.js 55 bytes [built] [code generated]
    [used exports unknown]
    entry ./example main
chunk runtime~main.[chunkhash].js (runtime~main) 7.47 KiB [entry] [rendered]
  > ./example main
  runtime modules 7.47 KiB 9 modules
chunk 2.[chunkhash].js 28 bytes [rendered]
  > ./async1 ./example.js 2:0-18
  ./async1.js 28 bytes [built] [code generated]
    [used exports unknown]
    import() ./async1 ./example.js 2:0-18
chunk 3.[chunkhash].js 28 bytes [rendered]
  > ./async2 ./example.js 3:0-18
  ./async2.js 28 bytes [built] [code generated]
    [used exports unknown]
    import() ./async2 ./example.js 3:0-18
webpack 5.0.0-rc.0 compiled successfully
```

## Production mode

```
asset runtime~main.[chunkhash].js 2.64 KiB [emitted] [minimized] (name: runtime~main)
asset main.[chunkhash].js 159 bytes [emitted] [minimized] (name: main)
asset 114.[chunkhash].js 75 bytes [emitted] [minimized]
asset 172.[chunkhash].js 75 bytes [emitted] [minimized]
Entrypoint main 2.8 KiB = runtime~main.[chunkhash].js 2.64 KiB main.[chunkhash].js 159 bytes
chunk (runtime: runtime~main) 114.[chunkhash].js 28 bytes [rendered]
  > ./async1 ./example.js 2:0-18
  ./async1.js 28 bytes [built] [code generated]
    [used exports unknown]
    import() ./async1 ./example.js 2:0-18
chunk (runtime: runtime~main) 172.[chunkhash].js 28 bytes [rendered]
  > ./async2 ./example.js 3:0-18
  ./async2.js 28 bytes [built] [code generated]
    [used exports unknown]
    import() ./async2 ./example.js 3:0-18
chunk (runtime: runtime~main) main.[chunkhash].js (main) 55 bytes [initial] [rendered]
  > ./example main
  ./example.js 55 bytes [built] [code generated]
    [no exports used]
    entry ./example main
chunk (runtime: runtime~main) runtime~main.[chunkhash].js (runtime~main) 7.47 KiB [entry] [rendered]
  > ./example main
  runtime modules 7.47 KiB 9 modules
webpack 5.0.0-rc.0 compiled successfully
```
