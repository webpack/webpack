

# example.js

``` javascript
require(["./a", "./b", "./c"], function(a, b, c) {});

require.ensure(["./a"], function(require) {
	require("./b");
	require("./d");
});

require.ensure(["./a", "./e"], function(require) {
	require("./a");
	require.ensure(["./b"], function(require) {
		require("./f");
	});
	require.ensure(["./b"], function(require) {
		require("./g");
	});
});
```

# webpack.config.js

``` javascript
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");

module.exports = {
	plugins: [
		new CommonsChunkPlugin({
			name: "main",
			async: "async1"
		}),
		new CommonsChunkPlugin({
			name: "main",
			async: "async2",
			minChunks: 2
		}),
		new CommonsChunkPlugin({
			async: true
		}),
	]
};
```

# js/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules, executeModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [], result;
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
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules, executeModules);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		7: 0
/******/ 	};
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
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData === 0) {
/******/ 			return new Promise(function(resolve) { resolve(); });
/******/ 		}
/******/
/******/ 		// a Promise means "currently loading".
/******/ 		if(installedChunkData) {
/******/ 			return installedChunkData[2];
/******/ 		}
/******/
/******/ 		// setup Promise in chunk cache
/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		installedChunkData[2] = promise;
/******/
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;
/******/
/******/ 		if (__webpack_require__.nc) {
/******/ 			script.setAttribute("nonce", __webpack_require__.nc);
/******/ 		}
/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 		var timeout = setTimeout(onScriptComplete, 120000);
/******/ 		script.onerror = script.onload = onScriptComplete;
/******/ 		function onScriptComplete() {
/******/ 			// avoid mem leaks in IE.
/******/ 			script.onerror = script.onload = null;
/******/ 			clearTimeout(timeout);
/******/ 			var chunk = installedChunks[chunkId];
/******/ 			if(chunk !== 0) {
/******/ 				if(chunk) {
/******/ 					chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				}
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};
/******/ 		head.appendChild(script);
/******/
/******/ 		return promise;
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
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ({

/***/ 2:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

Promise.all/* require */([__webpack_require__.e(4), __webpack_require__.e(0), __webpack_require__.e(1)]).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./a */ 0), __webpack_require__(/*! ./b */ 1), __webpack_require__(/*! ./c */ 3)]; (function(a, b, c) {}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}).catch(__webpack_require__.oe);

Promise.all/* require.ensure */([__webpack_require__.e(3), __webpack_require__.e(0), __webpack_require__.e(1)]).then((function(require) {
	__webpack_require__(/*! ./b */ 1);
	__webpack_require__(/*! ./d */ 4);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

Promise.all/* require.ensure */([__webpack_require__.e(2), __webpack_require__.e(1)]).then((function(require) {
	__webpack_require__(/*! ./a */ 0);
	Promise.all/* require.ensure */([__webpack_require__.e(6), __webpack_require__.e(0)]).then((function(require) {
		__webpack_require__(/*! ./f */ 6);
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
	Promise.all/* require.ensure */([__webpack_require__.e(5), __webpack_require__.e(0)]).then((function(require) {
		__webpack_require__(/*! ./g */ 7);
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);


/***/ })

/******/ });
```

# Info

## Uncompressed

```
Hash: 37a3748d37b36bc162d0
Version: webpack 3.5.1
      Asset       Size  Chunks             Chunk Names
0.output.js  221 bytes       0  [emitted]  async2
1.output.js  212 bytes       1  [emitted]  async1
2.output.js  215 bytes       2  [emitted]  
3.output.js  215 bytes       3  [emitted]  
4.output.js  215 bytes       4  [emitted]  
5.output.js  215 bytes       5  [emitted]  
6.output.js  215 bytes       6  [emitted]  
  output.js    7.22 kB       7  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js (async2) 21 bytes {2} {7} [rendered]
    > async commons duplicate [2] ./example.js 1:0-52
    > async commons duplicate [2] ./example.js 3:0-6:2
    > async commons duplicate [2] ./example.js 10:1-12:3
    > async commons duplicate [2] ./example.js 13:1-15:3
    [1] ./b.js 21 bytes {0} [built]
        amd require ./b [2] ./example.js 1:0-52
        cjs require ./b [2] ./example.js 4:1-15
        require.ensure item ./b [2] ./example.js 10:1-12:3
        require.ensure item ./b [2] ./example.js 13:1-15:3
chunk    {1} 1.output.js (async1) 21 bytes {7} [rendered]
    > async commons [2] ./example.js 1:0-52
    > async commons [2] ./example.js 3:0-6:2
    > async commons [2] ./example.js 8:0-16:2
    [0] ./a.js 21 bytes {1} [built]
        amd require ./a [2] ./example.js 1:0-52
        require.ensure item ./a [2] ./example.js 3:0-6:2
        require.ensure item ./a [2] ./example.js 8:0-16:2
        cjs require ./a [2] ./example.js 9:1-15
chunk    {2} 2.output.js 21 bytes {7} [rendered]
    > [2] ./example.js 8:0-16:2
    [5] ./e.js 21 bytes {2} [built]
        require.ensure item ./e [2] ./example.js 8:0-16:2
chunk    {3} 3.output.js 21 bytes {7} [rendered]
    > [2] ./example.js 3:0-6:2
    [4] ./d.js 21 bytes {3} [built]
        cjs require ./d [2] ./example.js 5:1-15
chunk    {4} 4.output.js 21 bytes {7} [rendered]
    > [2] ./example.js 1:0-52
    [3] ./c.js 21 bytes {4} [built]
        amd require ./c [2] ./example.js 1:0-52
chunk    {5} 5.output.js 21 bytes {2} [rendered]
    > [2] ./example.js 13:1-15:3
    [7] ./g.js 21 bytes {5} [built]
        cjs require ./g [2] ./example.js 14:2-16
chunk    {6} 6.output.js 21 bytes {2} [rendered]
    > [2] ./example.js 10:1-12:3
    [6] ./f.js 21 bytes {6} [built]
        cjs require ./f [2] ./example.js 11:2-16
chunk    {7} output.js (main) 362 bytes [entry] [rendered]
    > main [2] ./example.js 
    [2] ./example.js 362 bytes {7} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 37a3748d37b36bc162d0
Version: webpack 3.5.1
      Asset      Size  Chunks             Chunk Names
0.output.js  50 bytes       0  [emitted]  async2
1.output.js  49 bytes       1  [emitted]  async1
2.output.js  51 bytes       2  [emitted]  
3.output.js  51 bytes       3  [emitted]  
4.output.js  51 bytes       4  [emitted]  
5.output.js  51 bytes       5  [emitted]  
6.output.js  51 bytes       6  [emitted]  
  output.js   1.79 kB       7  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js (async2) 21 bytes {2} {7} [rendered]
    > async commons duplicate [2] ./example.js 1:0-52
    > async commons duplicate [2] ./example.js 3:0-6:2
    > async commons duplicate [2] ./example.js 10:1-12:3
    > async commons duplicate [2] ./example.js 13:1-15:3
    [1] ./b.js 21 bytes {0} [built]
        amd require ./b [2] ./example.js 1:0-52
        cjs require ./b [2] ./example.js 4:1-15
        require.ensure item ./b [2] ./example.js 10:1-12:3
        require.ensure item ./b [2] ./example.js 13:1-15:3
chunk    {1} 1.output.js (async1) 21 bytes {7} [rendered]
    > async commons [2] ./example.js 1:0-52
    > async commons [2] ./example.js 3:0-6:2
    > async commons [2] ./example.js 8:0-16:2
    [0] ./a.js 21 bytes {1} [built]
        amd require ./a [2] ./example.js 1:0-52
        require.ensure item ./a [2] ./example.js 3:0-6:2
        require.ensure item ./a [2] ./example.js 8:0-16:2
        cjs require ./a [2] ./example.js 9:1-15
chunk    {2} 2.output.js 21 bytes {7} [rendered]
    > [2] ./example.js 8:0-16:2
    [5] ./e.js 21 bytes {2} [built]
        require.ensure item ./e [2] ./example.js 8:0-16:2
chunk    {3} 3.output.js 21 bytes {7} [rendered]
    > [2] ./example.js 3:0-6:2
    [4] ./d.js 21 bytes {3} [built]
        cjs require ./d [2] ./example.js 5:1-15
chunk    {4} 4.output.js 21 bytes {7} [rendered]
    > [2] ./example.js 1:0-52
    [3] ./c.js 21 bytes {4} [built]
        amd require ./c [2] ./example.js 1:0-52
chunk    {5} 5.output.js 21 bytes {2} [rendered]
    > [2] ./example.js 13:1-15:3
    [7] ./g.js 21 bytes {5} [built]
        cjs require ./g [2] ./example.js 14:2-16
chunk    {6} 6.output.js 21 bytes {2} [rendered]
    > [2] ./example.js 10:1-12:3
    [6] ./f.js 21 bytes {6} [built]
        cjs require ./f [2] ./example.js 11:2-16
chunk    {7} output.js (main) 362 bytes [entry] [rendered]
    > main [2] ./example.js 
    [2] ./example.js 362 bytes {7} [built]
```
