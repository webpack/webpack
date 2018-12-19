A common challenge with combining `[chunkhash]` and Code Splitting is that the entry chunk includes the webpack runtime and with it the chunkhash mappings. This means it's always updated and the `[chunkhash]` is pretty useless, because this chunk won't be cached.

A very simple solution to this problem is to create another chunk which contains only the webpack runtime (including chunkhash map). This can be achieved with the `optimization.runtimeChunk` options. To avoid the additional request for another chunk, this pretty small chunk can be inlined into the HTML page.

The configuration required for this is:

* use `[chunkhash]` in `output.filename` (Note that this example doesn't do this because of the example generator infrastructure, but you should)
* use `[chunkhash]` in `output.chunkFilename` (Note that this example doesn't do this because of the example generator infrastructure, but you should)

# example.js

``` javascript
// some module
import("./async1");
import("./async2");
```

# webpack.config.js

``` javascript
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

``` html
<html>
<head>
</head>
<body>

<!-- inlined minimized file "runtime~main.[chunkhash].js" -->
<script>
!function(e,t){"use strict";var r={};function n(t){if(r[t])return r[t].exports;var o=r[t]={i:t,l:!1,exports:{}};return e[t].call(o.exports,o,o.exports,n),o.l=!0,o.exports}n.m=e,function(e){e.f={},e.e=function(t){return Promise.all(Object.keys(e.f).reduce(function(r,n){return e.f[n](t,r),r},[]))},e.t=function(t,r){if(1&r&&(t=this(t)),8&r)return t;if(4&r&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(e.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&r&&"string"!=typeof t)for(var o in t)e.d(n,o,function(e){return t[e]}.bind(null,o));return n},t=Object.prototype.hasOwnProperty,e.d=function(e,r,n){t.call(e,r)||Object.defineProperty(e,r,{enumerable:!0,get:n})},e.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},e.p="dist/",e.u=function(e){return e+".[chunkhash].js"},function(){var t={127:0},r=[];e.f.j=function(r,n){var o=t[r];if(0!==o)if(o)n.push(o[2]);else{var u=new Promise(function(e,n){o=t[r]=[e,n]});n.push(o[2]=u);var i,a=e.p+e.u(r),c=document.createElement("script");c.charset="utf-8",c.timeout=120,e.nc&&c.setAttribute("nonce",e.nc),c.src=a,i=function(e){c.onerror=c.onload=null,clearTimeout(f);var n=function(){if(t[r])return t[r][1];0!==t[r]&&(t[r]=void 0)}();if(n){var o=e&&("load"===e.type?"missing":e.type),u=e&&e.target&&e.target.src,i=new Error("Loading chunk "+r+" failed.\n("+o+": "+u+")");i.type=o,i.request=u,n(i)}};var f=setTimeout(function(){i({type:"timeout",target:c})},12e4);c.onerror=c.onload=i,document.head.appendChild(c)}};var n=function(){};function o(){for(var n,o=0;o<r.length;o++){for(var u=r[o],i=!0,a=1;a<u.length;a++){var c=u[a];0!==t[c]&&(i=!1)}i&&(r.splice(o--,1),n=e(e.s=u[0]))}return n}function u(o){for(var u,i,a=o[0],c=o[1],l=o[2],s=o[3],p=0,d=[];p<a.length;p++)i=a[p],t[i]&&d.push(t[i][0]),t[i]=0;for(u in c)Object.prototype.hasOwnProperty.call(c,u)&&(e.m[u]=c[u]);for(s&&s(e),f&&f(o);d.length;)d.shift()();return l&&r.push.apply(r,l),n()}e.x=function(){return(n=o)()};var i=window.webpackJsonp=window.webpackJsonp||[],a=i.push.bind(i);i.push=u,i=i.slice();for(var c=0;c<i.length;c++)u(i[c]);var f=a}();var t}(n),n.x()}([]);
</script>

<script src="dist/main.[chunkhash].js"></script>

</body>
</html>
```

# dist/runtime~main.[chunkhash].js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules, runtime) { // webpackBootstrap
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
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
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
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run modules when ready
/******/ 	return __webpack_require__.x();
/******/ })
/************************************************************************/
```

</details>

``` javascript
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
/******/ 		__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) { __webpack_require__.f[key](chunkId, promises); return promises; }, []));
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
/******/ 			if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 			return ns;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getter */
/******/ 	!function() {
/******/ 		// define getter function for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = function(exports, name, getter) {
/******/ 			if(!hasOwnProperty.call(exports, name)) {
/******/ 				Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 			}
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
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		__webpack_require__.u = function(chunkId) {
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
/******/ 		__webpack_require__.f.j = function(chunkId, promises) {
/******/ 			// JSONP chunk loading for javascript
/******/ 			var installedChunkData = installedChunks[chunkId];
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[2]);
/******/ 				} else {
/******/ 					// setup Promise in chunk cache
/******/ 					var promise = new Promise(function(resolve, reject) {
/******/ 						installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 					});
/******/ 					promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 					// start chunk loading
/******/ 					var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 					var loadingEnded = function() { if(installedChunks[chunkId]) return installedChunks[chunkId][1]; if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined; };
/******/ 					var script = document.createElement('script');
/******/ 					var onScriptComplete;
/******/ 		
/******/ 					script.charset = 'utf-8';
/******/ 					script.timeout = 120;
/******/ 					if (__webpack_require__.nc) {
/******/ 						script.setAttribute("nonce", __webpack_require__.nc);
/******/ 					}
/******/ 					script.src = url;
/******/ 		
/******/ 					onScriptComplete = function (event) {
/******/ 						// avoid mem leaks in IE.
/******/ 						script.onerror = script.onload = null;
/******/ 						clearTimeout(timeout);
/******/ 						var reportError = loadingEnded();
/******/ 						if(reportError) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							reportError(error);
/******/ 						}
/******/ 					};
/******/ 					var timeout = setTimeout(function(){
/******/ 						onScriptComplete({ type: 'timeout', target: script });
/******/ 					}, 120000);
/******/ 					script.onerror = script.onload = onScriptComplete;
/******/ 					document.head.appendChild(script);
/******/ 		
/******/ 					// no HMR
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			// no chunk preloading needed
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		var checkDeferredModules = function() {};
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
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = function() {
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
/******/ 				if(installedChunks[chunkId]) {
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

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__.e, __webpack_require__.t, __webpack_require__, __webpack_require__.d, __webpack_require__.r */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

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
Version: webpack 5.0.0-next
                    Asset       Size  Chunks             Chunk Names
           2.[chunkhash].js  284 bytes     {2}  [emitted]
           3.[chunkhash].js  278 bytes     {3}  [emitted]
        main.[chunkhash].js  672 bytes     {1}  [emitted]  main
runtime~main.[chunkhash].js   9.76 KiB     {0}  [emitted]  runtime~main
Entrypoint main = runtime~main.[chunkhash].js main.[chunkhash].js
chunk {0} runtime~main.[chunkhash].js (runtime~main) 5.75 KiB ={1}= >{2}< >{3}< [entry] [rendered]
    > ./example main
    7 chunk modules
chunk {1} main.[chunkhash].js (main) 55 bytes ={0}= >{2}< >{3}< [initial] [rendered]
    > ./example main
 [0] ./example.js 55 bytes {1} [built]
     [used exports unknown]
     entry ./example main
chunk {2} 2.[chunkhash].js 28 bytes <{0}> <{1}> [rendered]
    > ./async1 [0] ./example.js 2:0-18
 [1] ./async1.js 28 bytes {2} [built]
     [used exports unknown]
     import() ./async1 [0] ./example.js 2:0-18
chunk {3} 3.[chunkhash].js 28 bytes <{0}> <{1}> [rendered]
    > ./async2 [0] ./example.js 3:0-18
 [2] ./async2.js 28 bytes {3} [built]
     [used exports unknown]
     import() ./async2 [0] ./example.js 3:0-18
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
                    Asset       Size  Chunks             Chunk Names
         919.[chunkhash].js   79 bytes   {919}  [emitted]
         991.[chunkhash].js   79 bytes   {991}  [emitted]
        main.[chunkhash].js  161 bytes   {404}  [emitted]  main
runtime~main.[chunkhash].js   2.19 KiB   {127}  [emitted]  runtime~main
Entrypoint main = runtime~main.[chunkhash].js main.[chunkhash].js
chunk {127} runtime~main.[chunkhash].js (runtime~main) 5.75 KiB ={404}= >{919}< >{991}< [entry] [rendered]
    > ./example main
    7 chunk modules
chunk {404} main.[chunkhash].js (main) 55 bytes ={127}= >{919}< >{991}< [initial] [rendered]
    > ./example main
 [275] ./example.js 55 bytes {404} [built]
       entry ./example main
chunk {919} 919.[chunkhash].js 28 bytes <{127}> <{404}> [rendered]
    > ./async2 [275] ./example.js 3:0-18
 [919] ./async2.js 28 bytes {919} [built]
       import() ./async2 [275] ./example.js 3:0-18
chunk {991} 991.[chunkhash].js 28 bytes <{127}> <{404}> [rendered]
    > ./async1 [275] ./example.js 2:0-18
 [991] ./async1.js 28 bytes {991} [built]
       import() ./async1 [275] ./example.js 2:0-18
```
