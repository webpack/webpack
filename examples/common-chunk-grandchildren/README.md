This example illustrates how common modules from deep ancestors of an entry point can be split into a separate common chunk

* `pageA` and `pageB` are dynamically required
* `pageC` and `pageA` both require the `reusableComponent`
* `pageB` dynamically requires `PageC`

You can see that webpack outputs five files/chunks:

* `output.js` is the entry chunk and contains
  * the module system
  * chunk loading logic
  * the entry point `example.js`
* `0.output.js` is an additional chunk
  * module `reusableComponent`
* `1.output.js` is an additional chunk
  * module `pageB`
* `2.output.js` is an additional chunk
  * module `pageA`
* `3.output.js` is an additional chunk
  * module `pageC`


# example.js

``` javascript
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

``` javascript
var reusableComponent = require("./reusableComponent");

module.exports = function() {
	console.log("Page A");
	reusableComponent();
};
```

# pageB.js

``` javascript
module.exports = function() {
	console.log("Page B");
	require.ensure([], ()=>{
		const page = require("./pageC");
		page();
	});
};
```

# pageC.js

``` javascript
var reusableComponent = require("./reusableComponent");

module.exports = function() {
	console.log("Page C");
	reusableComponent();
};
```

# reusableComponent.js

``` javascript
module.exports = function() {
	console.log("reusable Component");
};
```

# webpack.config.js

``` javascript
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
/*! runtime requirements: __webpack_require__.e, __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

var main = function() {
	console.log("Main class");
	Promise.all(/*! require.ensure */[__webpack_require__.e(596), __webpack_require__.e(953)]).then((() => {
		const page = __webpack_require__(/*! ./pageA */ 1);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
	__webpack_require__.e(/*! require.ensure */ 954).then((() => {
		const page = __webpack_require__(/*! ./pageB */ 3);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};

main();


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


# dist/596.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[596],{

/***/ 2:
/*!******************************!*\
  !*** ./reusableComponent.js ***!
  \******************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = function() {
	console.log("reusable Component");
};


/***/ })

}]);
```

# dist/912.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[912],{

/***/ 4:
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, module */
/***/ (function(module, __unusedexports, __webpack_require__) {

var reusableComponent = __webpack_require__(/*! ./reusableComponent */ 2);

module.exports = function() {
	console.log("Page C");
	reusableComponent();
};


/***/ })

}]);
```

# dist/953.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[953],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, module */
/***/ (function(module, __unusedexports, __webpack_require__) {

var reusableComponent = __webpack_require__(/*! ./reusableComponent */ 2);

module.exports = function() {
	console.log("Page A");
	reusableComponent();
};


/***/ })
]]);
```

# dist/954.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[954],{

/***/ 3:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__.e, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = function() {
	console.log("Page B");
	Promise.all(/*! require.ensure */[__webpack_require__.e(596), __webpack_require__.e(912)]).then((()=>{
		const page = __webpack_require__(/*! ./pageC */ 4);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};


/***/ })

}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
        Asset       Size  Chunks             Chunk Names
596.output.js  366 bytes   {596}  [emitted]
912.output.js  475 bytes   {912}  [emitted]
953.output.js  481 bytes   {953}  [emitted]
954.output.js  636 bytes   {954}  [emitted]
    output.js   7.42 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 220 bytes (javascript) 3.55 KiB (runtime) >{596}< >{953}< >{954}< [entry] [rendered]
    > ./example.js main
 [0] ./example.js 220 bytes {404} [built]
     [used exports unknown]
     entry ./example.js main
     + 4 hidden chunk modules
chunk {596} 596.output.js 69 bytes <{404}> <{954}> ={912}= ={953}= [rendered] split chunk (cache group: default)
    > [0] ./example.js 3:1-6:3
    > [3] ./pageB.js 3:1-6:3
 [2] ./reusableComponent.js 69 bytes {596} [built]
     [used exports unknown]
     cjs require ./reusableComponent [1] ./pageA.js 1:24-54
     cjs require ./reusableComponent [4] ./pageC.js 1:24-54
chunk {912} 912.output.js 136 bytes <{954}> ={596}= [rendered]
    > [3] ./pageB.js 3:1-6:3
 [4] ./pageC.js 136 bytes {912} [built]
     [used exports unknown]
     cjs require ./pageC [3] ./pageB.js 4:15-33
chunk {953} 953.output.js 136 bytes <{404}> ={596}= [rendered]
    > [0] ./example.js 3:1-6:3
 [1] ./pageA.js 136 bytes {953} [built]
     [used exports unknown]
     cjs require ./pageA [0] ./example.js 4:15-33
chunk {954} 954.output.js 133 bytes <{404}> >{596}< >{912}< [rendered]
    > [0] ./example.js 7:1-10:3
 [3] ./pageB.js 133 bytes {954} [built]
     [used exports unknown]
     cjs require ./pageB [0] ./example.js 8:15-33
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
        Asset       Size  Chunks             Chunk Names
596.output.js  135 bytes   {596}  [emitted]
912.output.js  144 bytes   {912}  [emitted]
953.output.js  144 bytes   {953}  [emitted]
954.output.js  208 bytes   {954}  [emitted]
    output.js    1.5 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 220 bytes (javascript) 3.55 KiB (runtime) >{596}< >{953}< >{954}< [entry] [rendered]
    > ./example.js main
 [275] ./example.js 220 bytes {404} [built]
       entry ./example.js main
     + 4 hidden chunk modules
chunk {596} 596.output.js 69 bytes <{404}> <{954}> ={912}= ={953}= [rendered] split chunk (cache group: default)
    > [275] ./example.js 3:1-6:3
    > [954] ./pageB.js 3:1-6:3
 [596] ./reusableComponent.js 69 bytes {596} [built]
       cjs require ./reusableComponent [912] ./pageC.js 1:24-54
       cjs require ./reusableComponent [953] ./pageA.js 1:24-54
chunk {912} 912.output.js 136 bytes <{954}> ={596}= [rendered]
    > [954] ./pageB.js 3:1-6:3
 [912] ./pageC.js 136 bytes {912} [built]
       cjs require ./pageC [954] ./pageB.js 4:15-33
chunk {953} 953.output.js 136 bytes <{404}> ={596}= [rendered]
    > [275] ./example.js 3:1-6:3
 [953] ./pageA.js 136 bytes {953} [built]
       cjs require ./pageA [275] ./example.js 4:15-33
chunk {954} 954.output.js 133 bytes <{404}> >{596}< >{912}< [rendered]
    > [275] ./example.js 7:1-10:3
 [954] ./pageB.js 133 bytes {954} [built]
       cjs require ./pageB [275] ./example.js 8:15-33
```
