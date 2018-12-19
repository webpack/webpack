# example.js

This example illustrates how to leverage the `import()` syntax to create ContextModules which are separated into separate chunks for each module in the `./templates` folder.

``` javascript
async function getTemplate(templateName) {
	try {
		let template = await import(`./templates/${templateName}`);
		console.log(template);
	} catch(err) {
		console.error("template error");
		return new Error(err);
	}
}

getTemplate("foo");
getTemplate("bar");
getTemplate("baz");
```

# templates/

* foo.js
* baz.js
* bar.js

All templates are of this pattern:

``` javascript
var foo = "foo";

export default foo;
```

# dist/output.js

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
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

async function getTemplate(templateName) {
	try {
		let template = await __webpack_require__(1)(`./${templateName}`);
		console.log(template);
	} catch(err) {
		console.error("template error");
		return new Error(err);
	}
}

getTemplate("foo");
getTemplate("bar");
getTemplate("baz");




/***/ }),
/* 1 */
/*!**************************************************!*\
  !*** ./templates lazy ^\.\/.*$ namespace object ***!
  \**************************************************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__, __webpack_require__.e */
/***/ (function(module, __unusedexports, __webpack_require__) {

var map = {
	"./bar": [
		2,
		920
	],
	"./bar.js": [
		2,
		920
	],
	"./baz": [
		3,
		374
	],
	"./baz.js": [
		3,
		374
	],
	"./foo": [
		4,
		457
	],
	"./foo.js": [
		4,
		457
	]
};
function webpackAsyncContext(req) {
	var ids = map[req];
	if(!ids) {
		return Promise.resolve().then(function() {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}
	return __webpack_require__.e(ids[1]).then(function() {
		var id = ids[0];
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
/******/ 		__webpack_require__.u = function(chunkId) {
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
/******/ 			404: 0
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
Version: webpack 5.0.0-next
        Asset       Size  Chunks             Chunk Names
374.output.js  539 bytes   {374}  [emitted]
457.output.js  539 bytes   {457}  [emitted]
920.output.js  539 bytes   {920}  [emitted]
    output.js   8.66 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {374} 374.output.js 38 bytes <{404}> [rendered]
    > ./baz [1] ./templates lazy ^\.\/.*$ namespace object ./baz
    > ./baz.js [1] ./templates lazy ^\.\/.*$ namespace object ./baz.js
 [3] ./templates/baz.js 38 bytes {374} [optional] [built]
     [exports: default]
     [used exports unknown]
     context element ./baz [1] ./templates lazy ^\.\/.*$ namespace object ./baz
     context element ./baz.js [1] ./templates lazy ^\.\/.*$ namespace object ./baz.js
chunk {404} output.js (main) 441 bytes (javascript) 3.82 KiB (runtime) >{374}< >{457}< >{920}< [entry] [rendered]
    > .\example.js main
 [0] ./example.js 281 bytes {404} [built]
     [used exports unknown]
     entry .\example.js main
 [1] ./templates lazy ^\.\/.*$ namespace object 160 bytes {404} [optional] [built]
     [used exports unknown]
     import() context lazy ./templates [0] ./example.js 3:23-60
     + 5 hidden chunk modules
chunk {457} 457.output.js 38 bytes <{404}> [rendered]
    > ./foo [1] ./templates lazy ^\.\/.*$ namespace object ./foo
    > ./foo.js [1] ./templates lazy ^\.\/.*$ namespace object ./foo.js
 [4] ./templates/foo.js 38 bytes {457} [optional] [built]
     [exports: default]
     [used exports unknown]
     context element ./foo [1] ./templates lazy ^\.\/.*$ namespace object ./foo
     context element ./foo.js [1] ./templates lazy ^\.\/.*$ namespace object ./foo.js
chunk {920} 920.output.js 38 bytes <{404}> [rendered]
    > ./bar [1] ./templates lazy ^\.\/.*$ namespace object ./bar
    > ./bar.js [1] ./templates lazy ^\.\/.*$ namespace object ./bar.js
 [2] ./templates/bar.js 38 bytes {920} [optional] [built]
     [exports: default]
     [used exports unknown]
     context element ./bar [1] ./templates lazy ^\.\/.*$ namespace object ./bar
     context element ./bar.js [1] ./templates lazy ^\.\/.*$ namespace object ./bar.js
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
        Asset       Size  Chunks             Chunk Names
374.output.js  119 bytes   {374}  [emitted]
457.output.js  119 bytes   {457}  [emitted]
920.output.js  119 bytes   {920}  [emitted]
    output.js   2.06 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {374} 374.output.js 38 bytes <{404}> [rendered]
    > ./baz [305] ./templates lazy ^\.\/.*$ namespace object ./baz
    > ./baz.js [305] ./templates lazy ^\.\/.*$ namespace object ./baz.js
 [374] ./templates/baz.js 38 bytes {374} [optional] [built]
       [exports: default]
       context element ./baz [305] ./templates lazy ^\.\/.*$ namespace object ./baz
       context element ./baz.js [305] ./templates lazy ^\.\/.*$ namespace object ./baz.js
chunk {404} output.js (main) 441 bytes (javascript) 3.82 KiB (runtime) >{374}< >{457}< >{920}< [entry] [rendered]
    > .\example.js main
 [275] ./example.js 281 bytes {404} [built]
       entry .\example.js main
 [305] ./templates lazy ^\.\/.*$ namespace object 160 bytes {404} [optional] [built]
       import() context lazy ./templates [275] ./example.js 3:23-60
     + 5 hidden chunk modules
chunk {457} 457.output.js 38 bytes <{404}> [rendered]
    > ./foo [305] ./templates lazy ^\.\/.*$ namespace object ./foo
    > ./foo.js [305] ./templates lazy ^\.\/.*$ namespace object ./foo.js
 [457] ./templates/foo.js 38 bytes {457} [optional] [built]
       [exports: default]
       context element ./foo [305] ./templates lazy ^\.\/.*$ namespace object ./foo
       context element ./foo.js [305] ./templates lazy ^\.\/.*$ namespace object ./foo.js
chunk {920} 920.output.js 38 bytes <{404}> [rendered]
    > ./bar [305] ./templates lazy ^\.\/.*$ namespace object ./bar
    > ./bar.js [305] ./templates lazy ^\.\/.*$ namespace object ./bar.js
 [920] ./templates/bar.js 38 bytes {920} [optional] [built]
       [exports: default]
       context element ./bar [305] ./templates lazy ^\.\/.*$ namespace object ./bar
       context element ./bar.js [305] ./templates lazy ^\.\/.*$ namespace object ./bar.js
```
