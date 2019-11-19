Let's use `await` at top level in a module `db-connection.js`.
This makes sense since the connection to the DB need to established before the module is usable.

# db-connection.js

```javascript
const connectToDB = async url => {
	await new Promise(r => setTimeout(r, 1000));
};

// This is a top-level-await
await connectToDB("my-sql://example.com");

export const dbCall = async data => {
	// This is a normal await, because it's in an async function
	await new Promise(r => setTimeout(r, 100));
	return "fake data";
};

export const close = () => {
	console.log("closes the DB connection");
};
```

But `db-connection.js` is no longer a normal module now.
It's an **async module** now.
Async modules have a different evaluation semantics.
While normal modules evaluate in a synchronous way, async modules evaluate in an asynchronous way.

Async modules can't imported with a normal `import`.
They need to be imported with `import await`.

The main reason for this is to make the using module aware of the different evaluation semantics.

Using `import await` in a module also makes the module an async module.
You can see it as form of top-level-await, but it's a bit different because imports hoist, so does `import await`.
All `import`s and `import await`s hoist and are evaluated in parallel.

`import await` doesn't affect tree shaking negatively.
Here the `close` function is never used and will be removed from the output bundle in production mode.

# UserApi.js

```javascript
import await { dbCall } from "./db-connection.js";

export const createUser = async name => {
	command = `CREATE USER ${name}`;
	// This is a normal await, because it's in an async function
	await dbCall({ command });
}
```

Now it looks like that this pattern will continue and will infect all using modules as async modules.

Yes, this is kind of true and makes sense.
All these modules have their evaluation semantics changed to be async.

But you as developer don't want this.
You want to break the chain at a point in your module graph where it makes sense.
Luckily there is a nice way to break the chain.

You can use `import("./UserApi.js")` to import the module instead of `import await`.
As this returns a Promise it can be awaited to wait for module evaluation (including top-level-awaits) and handle failures.

Handling failures is an important point here.
When using top-level-await there are more ways that a module evaluation can fail now.
In this example connecting to the DB may fail.

# Actions.js

```javascript
// import() doesn't care about whether a module is an async module or not
const UserApi = import("./UserApi.js");

export const CreateUserAction = async name => {
	// These are normal awaits, because they are in an async function
	const { createUser } = await UserApi;
	await createUser(name);
};

// You can place import() where you like
// Placing it at top-level will start loading and evaluating on
//   module evaluation.
//   see CreateUserAction above
//   Here: Connecting to the DB starts when the application starts
// Placing it inside of an (async) function will start loading
//   and evaluating when the function is called for the first time
//   which basically makes it lazy-loaded.
//   see AlternativeCreateUserAction below
//   Here: Connecting to the DB starts when AlternativeCreateUserAction
//         is called
export const AlternativeCreateUserAction = async name => {
	const { createUser } = await import("./UserApi.js");
	await createUser(name);
};

// Note: Using await import() at top-level doesn't make much sense
//       except in rare cases. It will import modules sequencially.
```

As `Actions.js` doesn't use any top-level-await nor `import await` it's not an async module.
It's a normal module and can be used via `import`.

# example.js

```javascript
import { CreateUserAction } from "./Actions.js";

await CreateUserAction("John");
```

Note that you may `import await` from a normal module too.
This is legal, but mostly unneeded.
`import await` may also been seen by developers as hint that this dependency does some async actions and may delay evaluation.

As guideline you should prevent your application entry point to become an async module when compiling for web targets.
Doing async actions at application bootstrap will delay your application startup and may be negative for UX.
Use `import()` to do async action on demand or in background and use spinners or other indicators to inform the user about background actions.

When compiling for other targets like node.js, electron or WebWorkers, it may be fine that your entry point becomes an async module.

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, module, __webpack_require__.* */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

module.exports = (async () => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _Actions_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Actions.js */ 1);


await (0,_Actions_js__WEBPACK_IMPORTED_MODULE_0__.CreateUserAction)("John");

return __webpack_exports__;
})();

/***/ }),
/* 1 */
/*!********************!*\
  !*** ./Actions.js ***!
  \********************/
/*! export AlternativeCreateUserAction [provided] [no usage info] [missing usage info prevents renaming] */
/*! export CreateUserAction [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.r, __webpack_require__.e, __webpack_require__, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CreateUserAction": () => /* binding */ CreateUserAction,
/* harmony export */   "AlternativeCreateUserAction": () => /* binding */ AlternativeCreateUserAction
/* harmony export */ });
// import() doesn't care about whether a module is an async module or not
const UserApi = __webpack_require__.e(/*! import() */ 497).then(__webpack_require__.bind(null, /*! ./UserApi.js */ 2));

const CreateUserAction = async name => {
	// These are normal awaits, because they are in an async function
	const { createUser } = await UserApi;
	await createUser(name);
};

// You can place import() where you like
// Placing it at top-level will start loading and evaluating on
//   module evaluation.
//   see CreateUserAction above
//   Here: Connecting to the DB starts when the application starts
// Placing it inside of an (async) function will start loading
//   and evaluating when the function is called for the first time
//   which basically makes it lazy-loaded.
//   see AlternativeCreateUserAction below
//   Here: Connecting to the DB starts when AlternativeCreateUserAction
//         is called
const AlternativeCreateUserAction = async name => {
	const { createUser } = await __webpack_require__.e(/*! import() */ 497).then(__webpack_require__.bind(null, /*! ./UserApi.js */ 2));
	await createUser(name);
};

// Note: Using await import() at top-level doesn't make much sense
//       except in rare cases. It will import modules sequencially.


/***/ })
/******/ 	]);
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
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
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
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".output.js";
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
/******/ 								if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) return installedChunkData[1];
/******/ 								}
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
/******/ 								onScriptComplete = function() {};
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
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/************************************************************************/
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__(0);
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ })()
;
```

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
/*! runtime requirements: __webpack_require__, __webpack_exports__, __webpack_require__.d, __webpack_require__.r, module, __webpack_require__.* */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
module.exports = (async () => {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createUser": () => /* binding */ createUser
/* harmony export */ });
/* harmony import */ var _db_connection_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./db-connection.js */ 3);
_db_connection_js__WEBPACK_IMPORTED_MODULE_0__ = await Promise.resolve(_db_connection_js__WEBPACK_IMPORTED_MODULE_0__);


const createUser = async name => {
	command = `CREATE USER ${name}`;
	// This is a normal await, because it's in an async function
	await (0,_db_connection_js__WEBPACK_IMPORTED_MODULE_0__.dbCall)({ command });
}

return __webpack_exports__;
})();

/***/ }),
/* 3 */
/*!**************************!*\
  !*** ./db-connection.js ***!
  \**************************/
/*! export close [provided] [no usage info] [missing usage info prevents renaming] */
/*! export dbCall [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.r, module, __webpack_require__.* */
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
module.exports = (async () => {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "dbCall": () => /* binding */ dbCall,
/* harmony export */   "close": () => /* binding */ close
/* harmony export */ });
const connectToDB = async url => {
	await new Promise(r => setTimeout(r, 1000));
};

// This is a top-level-await
await connectToDB("my-sql://example.com");

const dbCall = async data => {
	// This is a normal await, because it's in an async function
	await new Promise(r => setTimeout(r, 100));
	return "fake data";
};

const close = () => {
	console.log("closes the DB connection");
};

return __webpack_exports__;
})();

/***/ })
]]);
```

## in production mode:

```javascript
(window.webpackJsonp=window.webpackJsonp||[]).push([[497],{497:(a,e,s)=>{"use strict";a.exports=(async()=>{s.r(e),s.d(e,{createUser:()=>t});var a=s(447);a=await Promise.resolve(a);const t=async e=>{command=`CREATE USER ${e}`,await(0,a.D)({command})};return e})()},447:(a,e,s)=>{"use strict";a.exports=(async()=>{s.d(e,{D:()=>a});await(async a=>{await new Promise(a=>setTimeout(a,1e3))})();const a=async a=>(await new Promise(a=>setTimeout(a,100)),"fake data");return e})()}}]);
```

# Info

## Unoptimized

```
Hash: [1mb9ba1fd84ace416de17b[39m[22m
Version: webpack [1m5.0.0-beta.6[39m[22m
Time: [1m81[39m[22mms
        [1mAsset[39m[22m      [1mSize[39m[22m
[1m[32m497.output.js[39m[22m  2.48 KiB  [1m[32m[emitted][39m[22m
    [1m[32moutput.js[39m[22m  11.3 KiB  [1m[32m[emitted][39m[22m  [name: main]
Entrypoint [1mmain[39m[22m = [1m[32moutput.js[39m[22m
chunk [1m[32moutput.js[39m[22m (main) 1.17 KiB (javascript) 4.85 KiB (runtime) [1m[33m[entry][39m[22m [1m[32m[rendered][39m[22m
    > ./example.js [1m[39m[22m main
 [1m./Actions.js[39m[22m 1.09 KiB [1m[32m[built][39m[22m
     [1m[36m[exports: AlternativeCreateUserAction, CreateUserAction][39m[22m
     [1m[36m[used exports unknown][39m[22m
     harmony side effect evaluation [1m[36m./Actions.js[39m[22m [1m[35m./example.js[39m[22m 1:0-48 [1m[36m[39m[22m
     harmony import specifier [1m[36m./Actions.js[39m[22m [1m[35m./example.js[39m[22m 3:6-22 [1m[36m[39m[22m
 [1m./example.js[39m[22m 82 bytes [1m[32m[built][39m[22m
     [1m[36m[no exports][39m[22m
     [1m[36m[used exports unknown][39m[22m
     entry [1m[36m./example.js[39m[22m [1m[35mnull[39m[22m main [1m[36m[39m[22m
     + 6 hidden chunk modules
chunk [1m[32m497.output.js[39m[22m 622 bytes [1m[32m[rendered][39m[22m
    > ./UserApi.js [1m./Actions.js[39m[22m 22:30-52
    > ./UserApi.js [1m./Actions.js[39m[22m 2:16-38
 [1m./UserApi.js[39m[22m 220 bytes [1m[32m[built][39m[22m
     [1m[36m[exports: createUser][39m[22m
     [1m[36m[used exports unknown][39m[22m
     import() [1m[36m./UserApi.js[39m[22m [1m[35m./Actions.js[39m[22m 2:16-38 [1m[36m[39m[22m
     import() [1m[36m./UserApi.js[39m[22m [1m[35m./Actions.js[39m[22m 22:30-52 [1m[36m[39m[22m
 [1m./db-connection.js[39m[22m 402 bytes [1m[32m[built][39m[22m
     [1m[36m[exports: close, dbCall][39m[22m
     [1m[36m[used exports unknown][39m[22m
     harmony side effect evaluation [1m[36m./db-connection.js[39m[22m [1m[35m./UserApi.js[39m[22m 1:0-50 [1m[36m[39m[22m
     harmony import specifier [1m[36m./db-connection.js[39m[22m [1m[35m./UserApi.js[39m[22m 6:7-13 [1m[36m[39m[22m
```

## Production mode

```
Hash: [1m0e7a3e674a6d2316f26a[39m[22m
Version: webpack [1m5.0.0-beta.6[39m[22m
Time: [1m404[39m[22mms
        [1mAsset[39m[22m       [1mSize[39m[22m
[1m[32m497.output.js[39m[22m  477 bytes  [1m[32m[emitted][39m[22m
    [1m[32moutput.js[39m[22m   1.94 KiB  [1m[32m[emitted][39m[22m  [name: main]
Entrypoint [1mmain[39m[22m = [1m[32moutput.js[39m[22m
chunk [1m[32moutput.js[39m[22m (main) 1.17 KiB (javascript) 4.85 KiB (runtime) [1m[33m[entry][39m[22m [1m[32m[rendered][39m[22m
    > ./example.js [1m[39m[22m main
 [1m./Actions.js[39m[22m 1.09 KiB [1m[32m[built][39m[22m
     [1m[36m[exports: AlternativeCreateUserAction, CreateUserAction][39m[22m
     [1m[36m[only some exports used: CreateUserAction][39m[22m
     harmony side effect evaluation [1m[36m./Actions.js[39m[22m [1m[35m./example.js[39m[22m 1:0-48 [1m[36m[39m[22m
     harmony import specifier [1m[36m./Actions.js[39m[22m [1m[35m./example.js[39m[22m 3:6-22 [1m[36m[39m[22m
 [1m./example.js[39m[22m 82 bytes [1m[32m[built][39m[22m
     [1m[36m[no exports][39m[22m
     [1m[36m[no exports used][39m[22m
     entry [1m[36m./example.js[39m[22m [1m[35mnull[39m[22m main [1m[36m[39m[22m
     + 6 hidden chunk modules
chunk [1m[32m497.output.js[39m[22m 622 bytes [1m[32m[rendered][39m[22m
    > ./UserApi.js [1m./Actions.js[39m[22m 22:30-52
    > ./UserApi.js [1m./Actions.js[39m[22m 2:16-38
 [1m./UserApi.js[39m[22m 220 bytes [1m[32m[built][39m[22m
     [1m[36m[exports: createUser][39m[22m
     import() [1m[36m./UserApi.js[39m[22m [1m[35m./Actions.js[39m[22m 2:16-38 [1m[36m[39m[22m
     import() [1m[36m./UserApi.js[39m[22m [1m[35m./Actions.js[39m[22m 22:30-52 [1m[36m[39m[22m
 [1m./db-connection.js[39m[22m 402 bytes [1m[32m[built][39m[22m
     [1m[36m[exports: close, dbCall][39m[22m
     [1m[36m[only some exports used: dbCall][39m[22m
     harmony side effect evaluation [1m[36m./db-connection.js[39m[22m [1m[35m./UserApi.js[39m[22m 1:0-50 [1m[36m[39m[22m
     harmony import specifier [1m[36m./db-connection.js[39m[22m [1m[35m./UserApi.js[39m[22m 6:7-13 [1m[36m[39m[22m
```
