This example illustrates how common modules from deep ancestors of an entry point can be split into a separate common chunk

- `pageA` and `pageB` are dynamically required
- `pageC` and `pageA` both require the `reusableComponent`
- `pageB` dynamically requires `PageC`

You can see that webpack outputs five files/chunks:

- `output.js` is the entry chunk and contains
  - the module system
  - chunk loading logic
  - the entry point `example.js`
- `0.output.js` is an additional chunk
  - module `reusableComponent`
- `1.output.js` is an additional chunk
  - module `pageB`
- `2.output.js` is an additional chunk
  - module `pageA`
- `3.output.js` is an additional chunk
  - module `pageC`

# example.js

```javascript
var main = function() {
	console.log("Main class");
	require.ensure([], () => {
		const page = require("./pageA");
		page();
	});
	require.ensure([], () => {
		const page = require("./pageB");
		page();
	});
};

main();
```

# pageA.js

```javascript
var reusableComponent = require("./reusableComponent");

module.exports = function() {
	console.log("Page A");
	reusableComponent();
};
```

# pageB.js

```javascript
module.exports = function() {
	console.log("Page B");
	require.ensure([], ()=>{
		const page = require("./pageC");
		page();
	});
};
```

# pageC.js

```javascript
var reusableComponent = require("./reusableComponent");

module.exports = function() {
	console.log("Page C");
	reusableComponent();
};
```

# reusableComponent.js

```javascript
module.exports = function() {
	console.log("reusable Component");
};
```

# webpack.config.js

```javascript
"use strict";
const path = require("path");

module.exports = {
	// mode: "development || "production",
	entry: {
		main: ["./example.js"]
	},
	optimization: {
		splitChunks: {
			minSize: 0 // This example is too small, in practice you can use the defaults
		},
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "output.js"
	}
};
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
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
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".output.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			179: 0
/******/ 		};
/******/ 		
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
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
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
/******/ 							onScriptComplete = (event) => {
/******/ 								onScriptComplete = () => {
/******/ 		
/******/ 								}
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
/******/ 							}
/******/ 							;
/******/ 							var timeout = setTimeout(() => {
/******/ 								onScriptComplete({ type: 'timeout', target: script })
/******/ 							}, 120000);
/******/ 							script.onerror = script.onload = onScriptComplete;
/******/ 							document.head.appendChild(script);
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
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
/******/ 			var runtime = data[3];
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
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_require__.e, __webpack_require__.* */
var main = function() {
	console.log("Main class");
	Promise.all(/*! require.ensure */[__webpack_require__.e(421), __webpack_require__.e(366)]).then((() => {
		const page = __webpack_require__(/*! ./pageA */ 1);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
	__webpack_require__.e(/*! require.ensure */ 588).then((() => {
		const page = __webpack_require__(/*! ./pageB */ 3);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};

main();

/******/ })()
;
```

# dist/366.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[366],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var reusableComponent = __webpack_require__(/*! ./reusableComponent */ 2);

module.exports = function() {
	console.log("Page A");
	reusableComponent();
};


/***/ })
]]);
```

# dist/588.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[588],{

/***/ 3:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__, __webpack_require__.e, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = function() {
	console.log("Page B");
	Promise.all(/*! require.ensure */[__webpack_require__.e(421), __webpack_require__.e(145)]).then((()=>{
		const page = __webpack_require__(/*! ./pageC */ 4);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};


/***/ })

}]);
```

# dist/145.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[145],{

/***/ 4:
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var reusableComponent = __webpack_require__(/*! ./reusableComponent */ 2);

module.exports = function() {
	console.log("Page C");
	reusableComponent();
};


/***/ })

}]);
```

# dist/421.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[421],{

/***/ 2:
/*!******************************!*\
  !*** ./reusableComponent.js ***!
  \******************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = function() {
	console.log("reusable Component");
};


/***/ })

}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
        Asset       Size
145.output.js  570 bytes  [emitted]
366.output.js  576 bytes  [emitted]
421.output.js  452 bytes  [emitted]
588.output.js  754 bytes  [emitted]
    output.js   8.11 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk 145.output.js 136 bytes [rendered]
    > ./pageB.js 3:1-6:3
 ./pageC.js 136 bytes [built]
     cjs require ./pageC ./pageB.js 4:15-33
     cjs self exports reference ./pageC.js 3:0-14
chunk output.js (main) 220 bytes (javascript) 4.19 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 220 bytes [built]
     [no exports used]
     entry ./example.js main
     + 5 hidden chunk modules
chunk 366.output.js 136 bytes [rendered]
    > ./example.js 3:1-6:3
 ./pageA.js 136 bytes [built]
     cjs require ./pageA ./example.js 4:15-33
     cjs self exports reference ./pageA.js 3:0-14
chunk 421.output.js 69 bytes [rendered] split chunk (cache group: default)
    > ./example.js 3:1-6:3
    > ./pageB.js 3:1-6:3
 ./reusableComponent.js 69 bytes [built]
     cjs require ./reusableComponent ./pageA.js 1:24-54
     cjs require ./reusableComponent ./pageC.js 1:24-54
     cjs self exports reference ./reusableComponent.js 1:0-14
chunk 588.output.js 133 bytes [rendered]
    > ./example.js 7:1-10:3
 ./pageB.js 133 bytes [built]
     cjs require ./pageB ./example.js 8:15-33
     cjs self exports reference ./pageB.js 1:0-14
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
        Asset       Size
145.output.js  138 bytes  [emitted]
366.output.js  138 bytes  [emitted]
421.output.js  127 bytes  [emitted]
588.output.js  202 bytes  [emitted]
    output.js   1.42 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk 145.output.js 136 bytes [rendered]
    > ./pageB.js 3:1-6:3
 ./pageC.js 136 bytes [built]
     cjs require ./pageC ./pageB.js 4:15-33
     cjs self exports reference ./pageC.js 3:0-14
chunk output.js (main) 220 bytes (javascript) 4.19 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 220 bytes [built]
     [no exports used]
     entry ./example.js main
     + 5 hidden chunk modules
chunk 366.output.js 136 bytes [rendered]
    > ./example.js 3:1-6:3
 ./pageA.js 136 bytes [built]
     cjs require ./pageA ./example.js 4:15-33
     cjs self exports reference ./pageA.js 3:0-14
chunk 421.output.js 69 bytes [rendered] split chunk (cache group: default)
    > ./example.js 3:1-6:3
    > ./pageB.js 3:1-6:3
 ./reusableComponent.js 69 bytes [built]
     cjs require ./reusableComponent ./pageA.js 1:24-54
     cjs require ./reusableComponent ./pageC.js 1:24-54
     cjs self exports reference ./reusableComponent.js 1:0-14
chunk 588.output.js 133 bytes [rendered]
    > ./example.js 7:1-10:3
 ./pageB.js 133 bytes [built]
     cjs require ./pageB ./example.js 8:15-33
     cjs self exports reference ./pageB.js 1:0-14
```
