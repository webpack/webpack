# example.js

```javascript
import { CreateUserAction } from "./Actions.js";

(async ()=> {
	await CreateUserAction("John");
})();
```

# Actions.js

```javascript
const UserApi = import("./UserApi.js");

export const CreateUserAction = async name => {
	const { createUser } = await UserApi;
	await createUser(name);
};
```

# UserApi.js

```javascript
import await { dbCall } from "./db-connection.js";

export const createUser = async name => {
	command = `CREATE USER ${name}`;
	await dbCall({ command });
}
```

# db-connection.js

```javascript
const connectToDB = async url => {
	await new Promise(r => setTimeout(r, 1000));
}

await connectToDB("my-sql://example.com");

export const dbCall = async data => {
	await new Promise(r => setTimeout(r, 100));
	return "fake data";
}
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
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__ */
/***/ (function(__unused__webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _Actions_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Actions.js */ 1);


(async ()=> {
	await Object(_Actions_js__WEBPACK_IMPORTED_MODULE_0__["CreateUserAction"])("John");
})();


/***/ }),
/* 1 */
/*!********************!*\
  !*** ./Actions.js ***!
  \********************/
/*! export CreateUserAction [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__.e, __webpack_require__ */
/***/ (function(__unused__webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CreateUserAction", function() { return CreateUserAction; });
const UserApi = __webpack_require__.e(/*! import() */ 497).then(__webpack_require__.bind(null, /*! ./UserApi.js */ 2));

const CreateUserAction = async name => {
	const { createUser } = await UserApi;
	await createUser(name);
};


/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
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
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
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
/******/ 					if(true) { // all chunks have JS
/******/ 						// setup Promise in chunk cache
/******/ 						var promise = new Promise(function(resolve, reject) {
/******/ 							installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 						});
/******/ 						promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 						// start chunk loading
/******/ 						var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 						var loadingEnded = function() { if(installedChunks[chunkId]) return installedChunks[chunkId][1]; if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined; };
/******/ 						var script = document.createElement('script');
/******/ 						var onScriptComplete;
/******/ 		
/******/ 						script.charset = 'utf-8';
/******/ 						script.timeout = 120;
/******/ 						if (__webpack_require__.nc) {
/******/ 							script.setAttribute("nonce", __webpack_require__.nc);
/******/ 						}
/******/ 						script.src = url;
/******/ 		
/******/ 						// create error before stack unwound to get useful stacktrace later
/******/ 						var error = new Error();
/******/ 						onScriptComplete = function (event) {
/******/ 							// avoid mem leaks in IE.
/******/ 							script.onerror = script.onload = null;
/******/ 							clearTimeout(timeout);
/******/ 							var reportError = loadingEnded();
/******/ 							if(reportError) {
/******/ 								var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 								var realSrc = event && event.target && event.target.src;
/******/ 								error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 								error.type = errorType;
/******/ 								error.request = realSrc;
/******/ 								reportError(error);
/******/ 							}
/******/ 						};
/******/ 						var timeout = setTimeout(function(){
/******/ 							onScriptComplete({ type: 'timeout', target: script });
/******/ 						}, 120000);
/******/ 						script.onerror = script.onload = onScriptComplete;
/******/ 						document.head.appendChild(script);
/******/ 					} else installedChunks[chunkId] = 0;
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
/******/ 		// no deferred startup or startup prefetching
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


# dist/497.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[497],[
/* 0 */,
/* 1 */,
/* 2 */
/*!********************!*\
  !*** ./UserApi.js ***!
  \********************/
/*! export createUser [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, module, __webpack_require__, __webpack_require__.d */
/***/ (function(__webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _db_connection_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./db-connection.js */ 3);
__webpack_module__.exports = Promise.all([_db_connection_js__WEBPACK_IMPORTED_MODULE_0__]).then(async function([_db_connection_js__WEBPACK_IMPORTED_MODULE_0__]) {
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "createUser", function() { return createUser; });


const createUser = async name => {
	command = `CREATE USER ${name}`;
	await Object(_db_connection_js__WEBPACK_IMPORTED_MODULE_0__["dbCall"])({ command });
}
return __webpack_exports__;
});


/***/ }),
/* 3 */
/*!**************************!*\
  !*** ./db-connection.js ***!
  \**************************/
/*! export dbCall [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, module, __webpack_require__.d, __webpack_require__ */
/***/ (function(__webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_module__.exports = (async function() {
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dbCall", function() { return dbCall; });
const connectToDB = async url => {
	await new Promise(r => setTimeout(r, 1000));
}

await connectToDB("my-sql://example.com");

const dbCall = async data => {
	await new Promise(r => setTimeout(r, 100));
	return "fake data";
}
return __webpack_exports__;
})();


/***/ })
]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.13
        Asset      Size  Chunks             Chunk Names
497.output.js  2.09 KiB   {497}  [emitted]
    output.js  9.59 KiB   {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 259 bytes (javascript) 4.42 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [0] ./example.js 103 bytes {179} [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 [1] ./Actions.js 156 bytes {179} [built]
     [exports: CreateUserAction]
     [used exports unknown]
     harmony side effect evaluation ./Actions.js [0] ./example.js 1:0-48
     harmony import specifier ./Actions.js [0] ./example.js 4:7-23
     + 6 hidden chunk modules
chunk {497} 497.output.js 392 bytes [rendered]
    > ./UserApi.js [1] ./Actions.js 1:16-38
 [2] ./UserApi.js 158 bytes {497} [built]
     [exports: createUser]
     [used exports unknown]
     import() ./UserApi.js [1] ./Actions.js 1:16-38
 [3] ./db-connection.js 234 bytes {497} [built]
     [exports: dbCall]
     [used exports unknown]
     harmony side effect evaluation ./db-connection.js [2] ./UserApi.js 1:0-50
     harmony import specifier ./db-connection.js [2] ./UserApi.js 5:7-13
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.13
        Asset       Size  Chunks             Chunk Names
497.output.js  539 bytes   {497}  [emitted]
    output.js   1.78 KiB   {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 259 bytes (javascript) 4.42 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [978] ./example.js + 1 modules 259 bytes {179} [built]
       [no exports]
       entry ./example.js main
     + 6 hidden chunk modules
chunk {497} 497.output.js 392 bytes [rendered]
    > ./UserApi.js ./Actions.js 1:16-38
 [447] ./db-connection.js 234 bytes {497} [built]
       [exports: dbCall]
       [all exports used]
       harmony side effect evaluation ./db-connection.js [497] ./UserApi.js 1:0-50
       harmony import specifier ./db-connection.js [497] ./UserApi.js 5:7-13
 [497] ./UserApi.js 158 bytes {497} [built]
       [exports: createUser]
       import() ./UserApi.js [978] ./example.js + 1 modules ./Actions.js 1:16-38
```
