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
!function(e){function r(r){for(var n,o,i=r[0],c=r[1],s=r[2],p=0,f=[];p<i.length;p++)o=i[p],u[o]&&f.push(u[o][0]),u[o]=0;for(n in c)Object.prototype.hasOwnProperty.call(c,n)&&(e[n]=c[n]);for(l&&l(r);f.length;)f.shift()();return a.push.apply(a,s||[]),t()}function t(){for(var e,r=0;r<a.length;r++){for(var t=a[r],o=!0,i=1;i<t.length;i++){var c=t[i];0!==u[c]&&(o=!1)}o&&(a.splice(r--,1),e=n(n.s=t[0]))}return e}function n(r){if(o[r])return o[r].exports;var t=o[r]={i:r,l:!1,exports:{}};return e[r].call(t.exports,t,t.exports,n),t.l=!0,t.exports}var o={},u={2:0},a=[];n.e=function(e){var r=[],t=u[e];if(0!==t)if(t)r.push(t[2]);else{var o=new Promise(function(r,n){t=u[e]=[r,n]});r.push(t[2]=o);var a=document.getElementsByTagName("head")[0],i=document.createElement("script");i.charset="utf-8",i.timeout=12e4,n.nc&&i.setAttribute("nonce",n.nc),i.src=n.p+""+({}[e]||e)+".[chunkhash].js";var c=setTimeout(function(){s({type:"timeout",target:i})},12e4);i.onerror=i.onload=s;function s(r){i.onerror=i.onload=null,clearTimeout(c);var t=u[e];if(0!==t){if(t){var n=r&&("load"===r.type?"missing":r.type),o=r&&r.target&&r.target.src,a=new Error("Loading chunk "+e+" failed.\n("+n+": "+o+")");a.type=n,a.request=o,t[1](a)}u[e]=void 0}}a.appendChild(i)}return Promise.all(r)},n.m=e,n.c=o,n.d=function(e,r,t){n.o(e,r)||Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:t})},n.r=function(e){Object.defineProperty(e,"__esModule",{value:!0})},n.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(r,"a",r),r},n.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},n.p="dist/",n.oe=function(e){throw console.error(e),e};var i=window.webpackJsonp=window.webpackJsonp||[],c=i.push.bind(i);i.push=r,i=i.slice();for(var s=0;s<i.length;s++)r(i[s]);var l=c;t()}([]);
</script>

<script src="dist/main.[chunkhash].js"></script>

</body>
</html>
```

# dist/runtime~main.[chunkhash].js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1]
/******/ 		var executeModules = data[2];
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fullfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fullfilled = false;
/******/ 			}
/******/ 			if(fullfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		3: 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
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
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		var promises = [];
/******/
/******/
/******/ 		// JSONP chunk loading for javascript
/******/
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData !== 0) { // 0 means "already installed".
/******/
/******/ 			// a Promise means "currently loading".
/******/ 			if(installedChunkData) {
/******/ 				promises.push(installedChunkData[2]);
/******/ 			} else {
/******/ 				// setup Promise in chunk cache
/******/ 				var promise = new Promise(function(resolve, reject) {
/******/ 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 				});
/******/ 				promises.push(installedChunkData[2] = promise);
/******/
/******/ 				// start chunk loading
/******/ 				var head = document.getElementsByTagName('head')[0];
/******/ 				var script = document.createElement('script');
/******/
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120000;
/******/
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = __webpack_require__.p + "" + ({}[chunkId]||chunkId) + ".[chunkhash].js";
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				function onScriptComplete(event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				head.appendChild(script);
/******/ 			}
/******/ 		}
/******/ 		return Promise.all(promises);
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// run deferred modules from other chunks
/******/ 	checkDeferredModules();
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([]);
```

# dist/main.[chunkhash].js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

// some module
__webpack_require__.e(/*! import() */ 1).then(function() { var module = __webpack_require__(/*! ./async1 */ 1); return typeof module === "object" && module && module.__esModule ? module : { /* fake namespace object */ "default": module }; });
__webpack_require__.e(/*! import() */ 2).then(function() { var module = __webpack_require__(/*! ./async2 */ 2); return typeof module === "object" && module && module.__esModule ? module : { /* fake namespace object */ "default": module }; });


/***/ })
],[[0,3]]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
                    Asset       Size  Chunks             Chunk Names
        main.[chunkhash].js  768 bytes       0  [emitted]  main
           1.[chunkhash].js  270 bytes       1  [emitted]  
           2.[chunkhash].js  264 bytes       2  [emitted]  
runtime~main.[chunkhash].js   7.49 KiB       3  [emitted]  runtime~main
Entrypoint main = runtime~main.[chunkhash].js main.[chunkhash].js
chunk    {0} main.[chunkhash].js (main) 58 bytes ={3}= >{1}< >{2}< [initial] [rendered]
    > ./example main
    [0] ./example.js 58 bytes {0} [built]
        single entry ./example  main
chunk    {1} 1.[chunkhash].js 29 bytes <{0}> <{3}> [rendered]
    > ./async1 [0] ./example.js 2:0-18
    [1] ./async1.js 29 bytes {1} [built]
        import() ./async1 [0] ./example.js 2:0-18
chunk    {2} 2.[chunkhash].js 29 bytes <{0}> <{3}> [rendered]
    > ./async2 [0] ./example.js 3:0-18
    [2] ./async2.js 29 bytes {2} [built]
        import() ./async2 [0] ./example.js 3:0-18
chunk    {3} runtime~main.[chunkhash].js (runtime~main) 0 bytes ={0}= >{1}< >{2}< [entry] [rendered]
    > ./example main
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
                    Asset       Size  Chunks             Chunk Names
           0.[chunkhash].js   77 bytes       0  [emitted]  
           1.[chunkhash].js   78 bytes       1  [emitted]  
runtime~main.[chunkhash].js   1.76 KiB       2  [emitted]  runtime~main
        main.[chunkhash].js  269 bytes       3  [emitted]  main
Entrypoint main = runtime~main.[chunkhash].js main.[chunkhash].js
chunk    {0} 0.[chunkhash].js 29 bytes <{2}> <{3}> [rendered]
    > ./async2 [0] ./example.js 3:0-18
    [1] ./async2.js 29 bytes {0} [built]
        import() ./async2 [0] ./example.js 3:0-18
chunk    {1} 1.[chunkhash].js 29 bytes <{2}> <{3}> [rendered]
    > ./async1 [0] ./example.js 2:0-18
    [2] ./async1.js 29 bytes {1} [built]
        import() ./async1 [0] ./example.js 2:0-18
chunk    {2} runtime~main.[chunkhash].js (runtime~main) 0 bytes ={3}= >{0}< >{1}< [entry] [rendered]
    > ./example main
chunk    {3} main.[chunkhash].js (main) 58 bytes ={2}= >{0}< >{1}< [initial] [rendered]
    > ./example main
    [0] ./example.js 58 bytes {3} [built]
        single entry ./example  main
```
