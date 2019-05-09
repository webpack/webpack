# example.js

This example illustrates how to filter the ContextModule results of `import()` statements. only `.js` files that don't
end in `.noimport.js` within the `templates` folder will be bundled.

```javascript
async function getTemplate(templateName) {
	try {
		let template = await import(
			/* webpackInclude: /\.js$/ */
			/* webpackExclude: /\.noimport\.js$/ */
			`./templates/${templateName}`
		);
		console.log(template);
	} catch(err) {
		console.error(err);
		return new Error(err);
	}
}

getTemplate("foo");
getTemplate("bar");
getTemplate("baz");
getTemplate("foo.noimport");
getTemplate("bar.noimport");
getTemplate("baz.noimport");
```

# templates/

- foo.js
- foo.noimport.js
- baz.js
- foo.noimport.js
- bar.js
- foo.noimport.js

All templates are of this pattern:

```javascript
var foo = "foo";

export default foo;
```

# dist/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

```javascript
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
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
```

</details>

```javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

async function getTemplate(templateName) {
	try {
		let template = await __webpack_require__(1)(`./${templateName}`);
		console.log(template);
	} catch(err) {
		console.error(err);
		return new Error(err);
	}
}

getTemplate("foo");
getTemplate("bar");
getTemplate("baz");
getTemplate("foo.noimport");
getTemplate("bar.noimport");
getTemplate("baz.noimport");



/***/ }),
/* 1 */
/*!******************************************************************************************!*\
  !*** ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ***!
  \******************************************************************************************/
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module__webpack_require__, __webpack_require__.e,  */
/***/ (function(module, __unusedexports, __webpack_require__) {

var map = {
	"./bar": [
		2,
		398
	],
	"./bar.js": [
		2,
		398
	],
	"./baz": [
		3,
		544
	],
	"./baz.js": [
		3,
		544
	],
	"./foo": [
		4,
		718
	],
	"./foo.js": [
		4,
		718
	]
};
function webpackAsyncContext(req) {
	if(!Object.prototype.hasOwnProperty.call(map, req)) {
		return Promise.resolve().then(function() {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}

	var ids = map[req], id = ids[0];
	return __webpack_require__.e(ids[1]).then(function() {
		return __webpack_require__(id);
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.id = 1;
module.exports = webpackAsyncContext;

/***/ })
/******/ ],
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
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".output.js";
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
/******/ 			179: 0
/******/ 		};
/******/ 		
/******/ 		
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
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
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
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
        Asset       Size  Chunks             Chunk Names
398.output.js  646 bytes   {398}  [emitted]
544.output.js  646 bytes   {544}  [emitted]
718.output.js  646 bytes   {718}  [emitted]
    output.js   9.21 KiB   {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 597 bytes (javascript) 3.92 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [0] ./example.js 437 bytes {179} [built]
     [used exports unknown]
     entry ./example.js main
 [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object 160 bytes {179} [optional] [built]
     [used exports unknown]
     import() context lazy ./templates [0] ./example.js 3:23-7:3
     + 5 hidden chunk modules
chunk {398} 398.output.js 38 bytes [rendered]
    > ./bar [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar
    > ./bar.js [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar.js
 [2] ./templates/bar.js 38 bytes {398} [optional] [built]
     [exports: default]
     [used exports unknown]
     context element ./bar [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar
     context element ./bar.js [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar.js
chunk {544} 544.output.js 38 bytes [rendered]
    > ./baz [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz
    > ./baz.js [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz.js
 [3] ./templates/baz.js 38 bytes {544} [optional] [built]
     [exports: default]
     [used exports unknown]
     context element ./baz [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz
     context element ./baz.js [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz.js
chunk {718} 718.output.js 38 bytes [rendered]
    > ./foo [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo
    > ./foo.js [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo.js
 [4] ./templates/foo.js 38 bytes {718} [optional] [built]
     [exports: default]
     [used exports unknown]
     context element ./foo [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo
     context element ./foo.js [1] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo.js
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
        Asset       Size  Chunks             Chunk Names
398.output.js  119 bytes   {398}  [emitted]
544.output.js  119 bytes   {544}  [emitted]
718.output.js  119 bytes   {718}  [emitted]
    output.js   2.14 KiB   {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 597 bytes (javascript) 3.92 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [144] ./example.js 437 bytes {179} [built]
       entry ./example.js main
 [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object 160 bytes {179} [optional] [built]
       import() context lazy ./templates [144] ./example.js 3:23-7:3
     + 5 hidden chunk modules
chunk {398} 398.output.js 38 bytes [rendered]
    > ./bar [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar
    > ./bar.js [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar.js
 [398] ./templates/bar.js 38 bytes {398} [optional] [built]
       [exports: default]
       context element ./bar [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar
       context element ./bar.js [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar.js
chunk {544} 544.output.js 38 bytes [rendered]
    > ./baz [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz
    > ./baz.js [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz.js
 [544] ./templates/baz.js 38 bytes {544} [optional] [built]
       [exports: default]
       context element ./baz [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz
       context element ./baz.js [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz.js
chunk {718} 718.output.js 38 bytes [rendered]
    > ./foo [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo
    > ./foo.js [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo.js
 [718] ./templates/foo.js 38 bytes {718} [optional] [built]
       [exports: default]
       context element ./foo [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo
       context element ./foo.js [389] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo.js
```
