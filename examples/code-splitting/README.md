This example illustrates a very simple case of Code Splitting with `require.ensure`.

* `a` and `b` are required normally via CommonJS
* `c` is depdended through the `require.ensure` array.
  * This means: make it available, but don't execute it
  * webpack will load it on demand
* `b` and `d` are required via CommonJs in the `require.ensure` callback
  * webpack detects that these are in the on-demand-callback and
  * will load them on demand
  * webpacks optimizer can optimize `b` away
    * as it is already available through the parent chunks

You can see that webpack outputs two files/chunks:

* `output.js` is the entry chunk and contains
  * the module system
  * chunk loading logic
  * the entry point `example.js`
  * module `a`
  * module `b`
* `1.js` is an additional chunk (on demand loaded) and contains
  * module `c`
  * module `d`

You can see that chunks are loaded via JSONP. The additional chunks are pretty small and minimize well.

# example.js

``` javascript
var a = require("a");
var b = require("b");
require.ensure(["c"], function(require) {
    require("b").xyz();
    var d = require("d");
});
```


# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules, executeModule) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(resolves.length)
/******/ 			resolves.shift()();

/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		0: 0
/******/ 	};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}

/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return Promise.resolve()

/******/ 		// an Promise means "currently loading".
/******/ 		if(installedChunks[chunkId]) {
/******/ 			return installedChunks[chunkId][2];
/******/ 		}
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;

/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".js";
/******/ 		var timeout = setTimeout(onScriptComplete, 120000);
/******/ 		script.onerror = script.onload = onScriptComplete;
/******/ 		function onScriptComplete() {
/******/ 			// avoid mem leaks in IE.
/******/ 			script.onerror = script.onload = null;
/******/ 			clearTimeout(timeout);
/******/ 			var chunk = installedChunks[chunkId];
/******/ 			if(chunk !== 0) {
/******/ 				if(chunk) chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};
/******/ 		head.appendChild(script);

/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		return installedChunks[chunkId][2] = promise;
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { throw err; };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports) {

	// module b

/***/ },
/* 1 */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports) {

	// module a

/***/ },
/* 2 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var a = __webpack_require__(/*! a */ 1);
	var b = __webpack_require__(/*! b */ 0);
	__webpack_require__.e/* nsure */(1).then(function(require) {
	    __webpack_require__(/*! b */ 0).xyz();
	    var d = __webpack_require__(/*! d */ 4);
	}.bind(null, __webpack_require__)).catch(function(err) { __webpack_require__.oe(err); });

/***/ }
/******/ ]);
```

# js/1.js

``` javascript
webpackJsonp([1],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */
/*!****************!*\
  !*** ./~/c.js ***!
  \****************/
/***/ function(module, exports) {

	// module c

/***/ },
/* 4 */
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports) {

	// module d

/***/ }
]);
```

Minimized

``` javascript
webpackJsonp([1],[,,,function(n,c){},function(n,c){}]);
```

# Info

## Uncompressed

```
Hash: 8c4d77ac26f67744ad74
Version: webpack 2.0.6-beta
Time: 112ms
    Asset       Size  Chunks             Chunk Names
output.js    4.82 kB       0  [emitted]  main
     1.js  310 bytes       1  [emitted]  
chunk    {0} output.js (main) 166 bytes [rendered]
    > main [2] ./example.js 
    [0] ./~/b.js 11 bytes {0} [built]
        cjs require b [2] ./example.js 2:8-20
        cjs require b [2] ./example.js 4:4-16
    [1] ./~/a.js 11 bytes {0} [built]
        cjs require a [2] ./example.js 1:8-20
    [2] ./example.js 144 bytes {0} [built]
chunk    {1} 1.js 22 bytes {0} [rendered]
    > [2] ./example.js 3:0-6:2
    [3] ./~/c.js 11 bytes {1} [built]
        require.ensure item c [2] ./example.js 3:0-6:2
    [4] ./~/d.js 11 bytes {1} [built]
        cjs require d [2] ./example.js 5:12-24
```

## Minimized (uglify-js, no zip)

```
Hash: 8c4d77ac26f67744ad74
Version: webpack 2.0.6-beta
Time: 233ms
    Asset      Size  Chunks             Chunk Names
output.js   1.09 kB       0  [emitted]  main
     1.js  55 bytes       1  [emitted]  
chunk    {0} output.js (main) 166 bytes [rendered]
    > main [2] ./example.js 
    [0] ./~/b.js 11 bytes {0} [built]
        cjs require b [2] ./example.js 2:8-20
        cjs require b [2] ./example.js 4:4-16
    [1] ./~/a.js 11 bytes {0} [built]
        cjs require a [2] ./example.js 1:8-20
    [2] ./example.js 144 bytes {0} [built]
chunk    {1} 1.js 22 bytes {0} [rendered]
    > [2] ./example.js 3:0-6:2
    [3] ./~/c.js 11 bytes {1} [built]
        require.ensure item c [2] ./example.js 3:0-6:2
    [4] ./~/d.js 11 bytes {1} [built]
        cjs require d [2] ./example.js 5:12-24

WARNING in output.js from UglifyJs
Side effects in initialization of unused variable d [./example.js:5,0]
Side effects in initialization of unused variable a [./example.js:1,0]
Side effects in initialization of unused variable b [./example.js:2,0]
```
