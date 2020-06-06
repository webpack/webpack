This example shows how to create an explicit vendor chunk as well as a common chunk for code shared among entry points. In this example, we have 3 entry points: `pageA`, `pageB`, and `pageC`. Those entry points share some of the same utility modules, but not others. This configuration will pull out any modules common to at least 2 bundles and place it in the `common` bundle instead, all while keeping the specified vendor libraries in their own bundle by themselves.

To better understand, here are the entry points and which utility modules they depend on:

- `pageA`
  - `utility1`
  - `utility2`
- `pageB`
  - `utility2`
  - `utility3`
- `pageC`
  - `utility2`
  - `utility3`

Given this configuration, webpack will produce the following bundles:

- `vendor`
  - webpack runtime
  - `vendor1`
  - `vendor2`
- `common`
  - `utility2`
  - `utility3`
- `pageA`
  - `pageA`
  - `utility1`
- `pageB`
  - `pageB`
- `pageC`
  - `pageC`

With this bundle configuration, you would load your third party libraries, then your common application code, then your page-specific application code.

# webpack.config.js

```javascript
var path = require("path");

module.exports = {
	// mode: "development" || "production",
	entry: {
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	optimization: {
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				commons: {
					chunks: "initial",
					minChunks: 2,
					maxInitialRequests: 5, // The default limit is too small to showcase the effect
					minSize: 0 // This is example is too small to create commons chunks
				},
				vendor: {
					test: /node_modules/,
					chunks: "initial",
					name: "vendor",
					priority: 10,
					enforce: true
				}
			}
		}
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	}
};
```

# dist/vendor.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["vendor"],{

/***/ 1:
/*!*********************************!*\
  !*** ./node_modules/vendor1.js ***!
  \*********************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "vendor1";

/***/ }),

/***/ 5:
/*!*********************************!*\
  !*** ./node_modules/vendor2.js ***!
  \*********************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "vendor2";

/***/ })

}]);
```

# dist/commons-utility2_js.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["commons-utility2_js"],{

/***/ 3:
/*!*********************!*\
  !*** ./utility2.js ***!
  \*********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "utility2";

/***/ })

}]);
```

# dist/commons-utility3_js.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["commons-utility3_js"],{

/***/ 6:
/*!*********************!*\
  !*** ./utility3.js ***!
  \*********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "utility3";

/***/ })

}]);
```

# dist/pageA.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var vendor1 = __webpack_require__(/*! vendor1 */ 1);
var utility1 = __webpack_require__(/*! ./utility1 */ 2);
var utility2 = __webpack_require__(/*! ./utility2 */ 3);

module.exports = "pageA";


/***/ }),
/* 1 */,
/* 2 */
/*!*********************!*\
  !*** ./utility1.js ***!
  \*********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "utility1";

/***/ })
/******/ 	]);
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
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"pageA": 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[0,"vendor","commons-utility2_js"]
/******/ 		];
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
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
/******/ 			if(deferredModules.length === 0) {
/******/ 				__webpack_require__.x();
/******/ 				__webpack_require__.x = () => {
/******/ 		
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = () => {
/******/ 			// reset startup function so it can be called again when more startup code is added
/******/ 			__webpack_require__.x = () => {
/******/ 		
/******/ 			}
/******/ 			jsonpArray = jsonpArray.slice();
/******/ 			for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var executeModules = data[2];
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
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	})();
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

# dist/pageB.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 4:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var vendor2 = __webpack_require__(/*! vendor2 */ 5);
var utility2 = __webpack_require__(/*! ./utility2 */ 3);
var utility3 = __webpack_require__(/*! ./utility3 */ 6);

module.exports = "pageB";


/***/ })

/******/ 	});
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
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"pageB": 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[4,"vendor","commons-utility2_js","commons-utility3_js"]
/******/ 		];
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
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
/******/ 			if(deferredModules.length === 0) {
/******/ 				__webpack_require__.x();
/******/ 				__webpack_require__.x = () => {
/******/ 		
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = () => {
/******/ 			// reset startup function so it can be called again when more startup code is added
/******/ 			__webpack_require__.x = () => {
/******/ 		
/******/ 			}
/******/ 			jsonpArray = jsonpArray.slice();
/******/ 			for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var executeModules = data[2];
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
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	})();
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

# dist/pageC.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 7:
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var utility2 = __webpack_require__(/*! ./utility2 */ 3);
var utility3 = __webpack_require__(/*! ./utility3 */ 6);

module.exports = "pageC";

/***/ })

/******/ 	});
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
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"pageC": 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[7,"commons-utility2_js","commons-utility3_js"]
/******/ 		];
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
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
/******/ 			if(deferredModules.length === 0) {
/******/ 				__webpack_require__.x();
/******/ 				__webpack_require__.x = () => {
/******/ 		
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = () => {
/******/ 			// reset startup function so it can be called again when more startup code is added
/******/ 			__webpack_require__.x = () => {
/******/ 		
/******/ 			}
/******/ 			jsonpArray = jsonpArray.slice();
/******/ 			for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var executeModules = data[2];
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
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	})();
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

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
                 Asset       Size
commons-utility2_js.js  402 bytes  [emitted]  [id hint: commons]
commons-utility3_js.js  402 bytes  [emitted]  [id hint: commons]
              pageA.js   5.99 KiB  [emitted]  [name: pageA]
              pageB.js   5.71 KiB  [emitted]  [name: pageB]
              pageC.js   5.64 KiB  [emitted]  [name: pageC]
             vendor.js  769 bytes  [emitted]  [name: vendor] [id hint: vendor]
Entrypoint pageA = vendor.js commons-utility2_js.js pageA.js
Entrypoint pageB = vendor.js commons-utility2_js.js commons-utility3_js.js pageB.js
Entrypoint pageC = commons-utility2_js.js commons-utility3_js.js pageC.js
chunk commons-utility2_js.js (id hint: commons) 28 bytes [initial] [rendered] split chunk (cache group: commons)
    > ./pageA pageA
    > ./pageB pageB
    > ./pageC pageC
 ./utility2.js 28 bytes [built]
     cjs require ./utility2 ./pageA.js 3:15-36
     cjs require ./utility2 ./pageB.js 2:15-36
     cjs require ./utility2 ./pageC.js 1:15-36
     cjs self exports reference ./utility2.js 1:0-14
chunk commons-utility3_js.js (id hint: commons) 28 bytes [initial] [rendered] split chunk (cache group: commons)
    > ./pageB pageB
    > ./pageC pageC
 ./utility3.js 28 bytes [built]
     cjs require ./utility3 ./pageB.js 3:15-36
     cjs require ./utility3 ./pageC.js 2:15-36
     cjs self exports reference ./utility3.js 1:0-14
chunk pageA.js (pageA) 165 bytes (javascript) 2.63 KiB (runtime) [entry] [rendered]
    > ./pageA pageA
 ./pageA.js 137 bytes [built]
     cjs self exports reference ./pageA.js 5:0-14
     entry ./pageA pageA
 ./utility1.js 28 bytes [built]
     cjs require ./utility1 ./pageA.js 2:15-36
     cjs self exports reference ./utility1.js 1:0-14
     + 2 hidden chunk modules
chunk pageB.js (pageB) 137 bytes (javascript) 2.65 KiB (runtime) [entry] [rendered]
    > ./pageB pageB
 ./pageB.js 137 bytes [built]
     cjs self exports reference ./pageB.js 5:0-14
     entry ./pageB pageB
     + 2 hidden chunk modules
chunk pageC.js (pageC) 102 bytes (javascript) 2.64 KiB (runtime) [entry] [rendered]
    > ./pageC pageC
 ./pageC.js 102 bytes [built]
     cjs self exports reference ./pageC.js 4:0-14
     entry ./pageC pageC
     + 2 hidden chunk modules
chunk vendor.js (vendor) (id hint: vendor) 54 bytes [initial] [rendered] split chunk (cache group: vendor) (name: vendor)
    > ./pageA pageA
    > ./pageB pageB
 ./node_modules/vendor1.js 27 bytes [built]
     cjs self exports reference ./node_modules/vendor1.js 1:0-14
     cjs require vendor1 ./pageA.js 1:14-32
 ./node_modules/vendor2.js 27 bytes [built]
     cjs self exports reference ./node_modules/vendor2.js 1:0-14
     cjs require vendor2 ./pageB.js 1:14-32
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
                 Asset       Size
commons-utility2_js.js  110 bytes  [emitted]  [id hint: commons]
commons-utility3_js.js  110 bytes  [emitted]  [id hint: commons]
              pageA.js  938 bytes  [emitted]  [name: pageA]
              pageB.js  930 bytes  [emitted]  [name: pageB]
              pageC.js  914 bytes  [emitted]  [name: pageC]
             vendor.js  125 bytes  [emitted]  [name: vendor] [id hint: vendor]
Entrypoint pageA = vendor.js commons-utility2_js.js pageA.js
Entrypoint pageB = vendor.js commons-utility2_js.js commons-utility3_js.js pageB.js
Entrypoint pageC = commons-utility2_js.js commons-utility3_js.js pageC.js
chunk commons-utility2_js.js (id hint: commons) 28 bytes [initial] [rendered] split chunk (cache group: commons)
    > ./pageA pageA
    > ./pageB pageB
    > ./pageC pageC
 ./utility2.js 28 bytes [built]
     cjs require ./utility2 ./pageA.js 3:15-36
     cjs require ./utility2 ./pageB.js 2:15-36
     cjs require ./utility2 ./pageC.js 1:15-36
     cjs self exports reference ./utility2.js 1:0-14
chunk commons-utility3_js.js (id hint: commons) 28 bytes [initial] [rendered] split chunk (cache group: commons)
    > ./pageB pageB
    > ./pageC pageC
 ./utility3.js 28 bytes [built]
     cjs require ./utility3 ./pageB.js 3:15-36
     cjs require ./utility3 ./pageC.js 2:15-36
     cjs self exports reference ./utility3.js 1:0-14
chunk pageA.js (pageA) 165 bytes (javascript) 2.63 KiB (runtime) [entry] [rendered]
    > ./pageA pageA
 ./pageA.js 137 bytes [built]
     cjs self exports reference ./pageA.js 5:0-14
     entry ./pageA pageA
 ./utility1.js 28 bytes [built]
     cjs require ./utility1 ./pageA.js 2:15-36
     cjs self exports reference ./utility1.js 1:0-14
     + 2 hidden chunk modules
chunk pageB.js (pageB) 137 bytes (javascript) 2.65 KiB (runtime) [entry] [rendered]
    > ./pageB pageB
 ./pageB.js 137 bytes [built]
     cjs self exports reference ./pageB.js 5:0-14
     entry ./pageB pageB
     + 2 hidden chunk modules
chunk pageC.js (pageC) 102 bytes (javascript) 2.64 KiB (runtime) [entry] [rendered]
    > ./pageC pageC
 ./pageC.js 102 bytes [built]
     cjs self exports reference ./pageC.js 4:0-14
     entry ./pageC pageC
     + 2 hidden chunk modules
chunk vendor.js (vendor) (id hint: vendor) 54 bytes [initial] [rendered] split chunk (cache group: vendor) (name: vendor)
    > ./pageA pageA
    > ./pageB pageB
 ./node_modules/vendor1.js 27 bytes [built]
     cjs self exports reference ./node_modules/vendor1.js 1:0-14
     cjs require vendor1 ./pageA.js 1:14-32
 ./node_modules/vendor2.js 27 bytes [built]
     cjs self exports reference ./node_modules/vendor2.js 1:0-14
     cjs require vendor2 ./pageB.js 1:14-32
```
