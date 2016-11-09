# example.js

``` javascript
var a = require("a");

require.ensure(["b"], function(require) {
	// a named chunk
	var c = require("c");
}, "my own chunk");

require.ensure(["b"], function(require) {
	// another chunk with the same name
	var d = require("d");
}, "my own chunk");

require.ensure([], function(require) {
	// the same again
}, "my own chunk");

require.ensure(["b"], function(require) {
	// chunk without name
	var d = require("d");
});
```


# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, callbacks = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, __webpack_require__);

/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		0:0
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
/******/ 	__webpack_require__.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, __webpack_require__);

/******/ 		// an array means "currently loading".
/******/ 		if(installedChunks[chunkId] !== undefined) {
/******/ 			installedChunks[chunkId].push(callback);
/******/ 		} else {
/******/ 			// start chunk loading
/******/ 			installedChunks[chunkId] = [callback];
/******/ 			var head = document.getElementsByTagName('head')[0];
/******/ 			var script = document.createElement('script');
/******/ 			script.type = 'text/javascript';
/******/ 			script.charset = 'utf-8';
/******/ 			script.async = true;

/******/ 			script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var a = __webpack_require__(/*! a */ 1);

	__webpack_require__.e/* nsure */(1/*! my own chunk */, function(require) {
		// a named chunk
		var c = __webpack_require__(/*! c */ 3);
	});

	__webpack_require__.e/* nsure */(1/*! my own chunk */, function(require) {
		// another chunk with the same name
		var d = __webpack_require__(/*! d */ 4);
	});

	__webpack_require__.e/* nsure */(1/*! my own chunk */, function(require) {
		// the same again
	});

	__webpack_require__.e/* nsure */(2, function(require) {
		// chunk without name
		var d = __webpack_require__(/*! d */ 4);
	});


/***/ },
/* 1 */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports) {

	// module a

/***/ }
/******/ ]);
```

# js/1.output.js

``` javascript
webpackJsonp([1,2],[
/* 0 */,
/* 1 */,
/* 2 */
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports) {

	// module b

/***/ },
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

# js/2.output.js

``` javascript
webpackJsonp([2],[
/* 0 */,
/* 1 */,
/* 2 */
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports) {

	// module b

/***/ },
/* 3 */,
/* 4 */
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports) {

	// module d

/***/ }
]);
```

# Info

## Uncompressed

```
Hash: 66115f67bc0d0bf491a2
Version: webpack 1.9.10
Time: 85ms
      Asset       Size  Chunks             Chunk Names
  output.js    4.38 kB       0  [emitted]  main
1.output.js  434 bytes    1, 2  [emitted]  my own chunk
2.output.js  310 bytes       2  [emitted]  
chunk    {0} output.js (main) 452 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 441 bytes {0} [built]
    [1] ./~/a.js 11 bytes {0} [built]
        cjs require a [0] ./example.js 1:8-20
chunk    {1} 1.output.js (my own chunk) 33 bytes {0} [rendered]
    > my own chunk [0] ./example.js 3:0-6:18
    > my own chunk [0] ./example.js 8:0-11:18
    > my own chunk [0] ./example.js 13:0-15:18
    [2] ./~/b.js 11 bytes {1} {2} [built]
        require.ensure item b [0] ./example.js 3:0-6:18
        require.ensure item b [0] ./example.js 8:0-11:18
        require.ensure item b [0] ./example.js 17:0-20:2
    [3] ./~/c.js 11 bytes {1} [built]
        cjs require c [0] ./example.js 5:9-21
    [4] ./~/d.js 11 bytes {1} {2} [built]
        cjs require d [0] ./example.js 10:9-21
        cjs require d [0] ./example.js 19:9-21
chunk    {2} 2.output.js 22 bytes {0} [rendered]
    > [0] ./example.js 17:0-20:2
    [2] ./~/b.js 11 bytes {1} {2} [built]
        require.ensure item b [0] ./example.js 3:0-6:18
        require.ensure item b [0] ./example.js 8:0-11:18
        require.ensure item b [0] ./example.js 17:0-20:2
    [4] ./~/d.js 11 bytes {1} {2} [built]
        cjs require d [0] ./example.js 10:9-21
        cjs require d [0] ./example.js 19:9-21
```

## Minimized (uglify-js, no zip)

```
Hash: 7fc113f6466bdbf67434
Version: webpack 1.9.10
Time: 229ms
      Asset       Size  Chunks             Chunk Names
0.output.js   72 bytes    0, 1  [emitted]  my own chunk
1.output.js   53 bytes       1  [emitted]  
  output.js  834 bytes       2  [emitted]  main
chunk    {0} 0.output.js (my own chunk) 33 bytes {2} [rendered]
    > my own chunk [0] ./example.js 3:0-6:18
    > my own chunk [0] ./example.js 8:0-11:18
    > my own chunk [0] ./example.js 13:0-15:18
    [1] ./~/b.js 11 bytes {0} {1} [built]
        require.ensure item b [0] ./example.js 3:0-6:18
        require.ensure item b [0] ./example.js 8:0-11:18
        require.ensure item b [0] ./example.js 17:0-20:2
    [2] ./~/d.js 11 bytes {0} {1} [built]
        cjs require d [0] ./example.js 10:9-21
        cjs require d [0] ./example.js 19:9-21
    [4] ./~/c.js 11 bytes {0} [built]
        cjs require c [0] ./example.js 5:9-21
chunk    {1} 1.output.js 22 bytes {2} [rendered]
    > [0] ./example.js 17:0-20:2
    [1] ./~/b.js 11 bytes {0} {1} [built]
        require.ensure item b [0] ./example.js 3:0-6:18
        require.ensure item b [0] ./example.js 8:0-11:18
        require.ensure item b [0] ./example.js 17:0-20:2
    [2] ./~/d.js 11 bytes {0} {1} [built]
        cjs require d [0] ./example.js 10:9-21
        cjs require d [0] ./example.js 19:9-21
chunk    {2} output.js (main) 452 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 441 bytes {2} [built]
    [3] ./~/a.js 11 bytes {2} [built]
        cjs require a [0] ./example.js 1:8-20

WARNING in output.js from UglifyJs
Side effects in initialization of unused variable c [./example.js:5,0]
Side effects in initialization of unused variable d [./example.js:10,0]
Side effects in initialization of unused variable d [./example.js:19,0]
Side effects in initialization of unused variable a [./example.js:1,0]
```
