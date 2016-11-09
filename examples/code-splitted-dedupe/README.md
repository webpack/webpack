
# example.js

``` javascript
// index.js and x.js can be deduplicated
require(["../dedupe/a", "bundle?lazy!../dedupe/b"]);

// index.js and x.js cannot be deduplicated
require(["../dedupe/a"]);
require(["../dedupe/b"]);
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
/******/ 			var _m = moreModules[moduleId];

/******/ 			// Check if module is deduplicated
/******/ 			switch(typeof _m) {
/******/ 			case "number":
/******/ 				// Module is a copy of another module
/******/ 				modules[moduleId] = modules[_m];
/******/ 				break;
/******/ 			case "object":
/******/ 				// Module can be created from a template
/******/ 				modules[moduleId] = (function(_m) {
/******/ 					var args = _m.slice(1), templateId = _m[0];
/******/ 					return function (a,b,c) {
/******/ 						modules[templateId].apply(this, [a,b,c].concat(args));
/******/ 					};
/******/ 				}(_m));
/******/ 				break;
/******/ 			default:
/******/ 				// Normal module
/******/ 				modules[moduleId] = _m;
/******/ 			}
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
/******/ ((function(modules) {
	// Check all modules for deduplicated modules
	for(var i in modules) {
		if(Object.prototype.hasOwnProperty.call(modules, i)) {
			switch(typeof modules[i]) {
			case "number":
				// Module is a copy of another module
				modules[i] = modules[modules[i]];
				break;
			case "object":
				// Module can be created from a template
				modules[i] = (function(_m) {
					var args = _m.slice(1), fn = modules[_m[0]];
					return function (a,b,c) {
						fn.apply(null, [a,b,c].concat(args));
					};
				}(modules[i]));
			}
		}
	}
	return modules;
}([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	// index.js and x.js can be deduplicated
	__webpack_require__.e/* require */(1, function() {[__webpack_require__(/*! ../dedupe/a */ 1), __webpack_require__(/*! bundle?lazy!../dedupe/b */ 5)];});

	// index.js and x.js cannot be deduplicated
	__webpack_require__.e/* require */(3, function() {[__webpack_require__(/*! ../dedupe/a */ 1)];});
	__webpack_require__.e/* require */(4, function() {[__webpack_require__(/*! ../dedupe/b */ 6)];});


/***/ }
/******/ ])));
```

# js/1.output.js

``` javascript
webpackJsonp([1,3],[
/* 0 */,
/* 1 */
/*!****************************!*\
  !*** ../dedupe/a/index.js ***!
  \****************************/
[9, 2, 3],
/* 2 */
/*!************************!*\
  !*** ../dedupe/a/x.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "x"};

/***/ },
/* 3 */
/*!************************!*\
  !*** ../dedupe/a/y.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "y", "but in": "a"};

/***/ },
/* 4 */
/*!**********************!*\
  !*** ../dedupe/z.js ***!
  \**********************/
/***/ function(module, exports) {

	module.exports = {"this is": "z"};

/***/ },
/* 5 */
/*!***********************************************************!*\
  !*** (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js ***!
  \***********************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = function(cb) {
		__webpack_require__.e/* nsure */(2, function(require) {
			cb(__webpack_require__(/*! !./index.js */ 6));
		});
	}

/***/ },
/* 6 */,
/* 7 */,
/* 8 */,
/* 9 */
/*!***********************************!*\
  !*** template of 1 referencing 4 ***!
  \***********************************/
/***/ function(module, exports, __webpack_require__, __webpack_module_template_argument_0__, __webpack_module_template_argument_1__) {

	module.exports = {
		x: __webpack_require__(__webpack_module_template_argument_0__),
		y: __webpack_require__(__webpack_module_template_argument_1__),
		z: __webpack_require__(/*! ../z */ 4)
	}

/***/ }
]);
```

# js/2.output.js

``` javascript
webpackJsonp([2],{

/***/ 6:
/*!****************************!*\
  !*** ../dedupe/b/index.js ***!
  \****************************/
[9, 7, 8],

/***/ 7:
/*!************************!*\
  !*** ../dedupe/b/x.js ***!
  \************************/
2,

/***/ 8:
/*!************************!*\
  !*** ../dedupe/b/y.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "y", "but in": "b"};

/***/ }

});
```

# js/3.output.js

``` javascript
webpackJsonp([3],[
/* 0 */,
/* 1 */
/*!****************************!*\
  !*** ../dedupe/a/index.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
		x: __webpack_require__(/*! ./x */ 2),
		y: __webpack_require__(/*! ./y */ 3),
		z: __webpack_require__(/*! ../z */ 4)
	}

/***/ },
/* 2 */
/*!************************!*\
  !*** ../dedupe/a/x.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "x"};

/***/ },
/* 3 */
/*!************************!*\
  !*** ../dedupe/a/y.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "y", "but in": "a"};

/***/ },
/* 4 */
/*!**********************!*\
  !*** ../dedupe/z.js ***!
  \**********************/
/***/ function(module, exports) {

	module.exports = {"this is": "z"};

/***/ }
]);
```

# js/4.output.js

``` javascript
webpackJsonp([4,2],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/*!**********************!*\
  !*** ../dedupe/z.js ***!
  \**********************/
/***/ function(module, exports) {

	module.exports = {"this is": "z"};

/***/ },
/* 5 */,
/* 6 */
/*!****************************!*\
  !*** ../dedupe/b/index.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
		x: __webpack_require__(/*! ./x */ 7),
		y: __webpack_require__(/*! ./y */ 8),
		z: __webpack_require__(/*! ../z */ 4)
	}

/***/ },
/* 7 */
/*!************************!*\
  !*** ../dedupe/b/x.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "x"};

/***/ },
/* 8 */
/*!************************!*\
  !*** ../dedupe/b/y.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "y", "but in": "b"};

/***/ }
]);
```

# Info

## Uncompressed

```
Hash: 04b9ded65bfb8f87f0a0
Version: webpack 1.9.10
Time: 116ms
      Asset       Size  Chunks             Chunk Names
  output.js    5.33 kB       0  [emitted]  main
1.output.js    1.61 kB    1, 3  [emitted]  
2.output.js  441 bytes       2  [emitted]  
3.output.js  895 bytes       3  [emitted]  
4.output.js  933 bytes    4, 2  [emitted]  
chunk    {0} output.js (main) 197 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 197 bytes {0} [built]
chunk    {1} 1.output.js 394 bytes {0} [rendered]
    > [0] ./example.js 2:0-51
    [1] ../dedupe/a/index.js 84 bytes {1} {3} [built]
        amd require ../dedupe/a [0] ./example.js 2:0-51
        amd require ../dedupe/a [0] ./example.js 5:0-24
    [2] ../dedupe/a/x.js 34 bytes {1} {3} [built]
        cjs require ./x [1] ../dedupe/a/index.js 2:4-18
    [3] ../dedupe/a/y.js 49 bytes {1} {3} [built]
        cjs require ./y [1] ../dedupe/a/index.js 3:4-18
    [4] ../dedupe/z.js 34 bytes {1} {3} {4} [built]
        cjs require ../z [1] ../dedupe/a/index.js 4:4-19
        cjs require ../z [6] ../dedupe/b/index.js 4:4-19
    [5] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 109 bytes {1} [built]
        amd require bundle?lazy!../dedupe/b [0] ./example.js 2:0-51
    [9] template of 1 referencing 4 84 bytes {1} [not cacheable] [built]
        template 4 [1] ../dedupe/a/index.js
        template 4 [6] ../dedupe/b/index.js
chunk    {2} 2.output.js 167 bytes {1} [rendered]
    > [5] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 2:1-4:3
    [6] ../dedupe/b/index.js 84 bytes {2} {4} [built]
        amd require ../dedupe/b [0] ./example.js 6:0-24
        cjs require !!./index.js [5] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-28
    [7] ../dedupe/b/x.js 34 bytes {2} {4} [built]
        cjs require ./x [6] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 bytes {2} {4} [built]
        cjs require ./y [6] ../dedupe/b/index.js 3:4-18
chunk    {3} 3.output.js 201 bytes {0} [rendered]
    > [0] ./example.js 5:0-24
    [1] ../dedupe/a/index.js 84 bytes {1} {3} [built]
        amd require ../dedupe/a [0] ./example.js 2:0-51
        amd require ../dedupe/a [0] ./example.js 5:0-24
    [2] ../dedupe/a/x.js 34 bytes {1} {3} [built]
        cjs require ./x [1] ../dedupe/a/index.js 2:4-18
    [3] ../dedupe/a/y.js 49 bytes {1} {3} [built]
        cjs require ./y [1] ../dedupe/a/index.js 3:4-18
    [4] ../dedupe/z.js 34 bytes {1} {3} {4} [built]
        cjs require ../z [1] ../dedupe/a/index.js 4:4-19
        cjs require ../z [6] ../dedupe/b/index.js 4:4-19
chunk    {4} 4.output.js 201 bytes {0} [rendered]
    > [0] ./example.js 6:0-24
    [4] ../dedupe/z.js 34 bytes {1} {3} {4} [built]
        cjs require ../z [1] ../dedupe/a/index.js 4:4-19
        cjs require ../z [6] ../dedupe/b/index.js 4:4-19
    [6] ../dedupe/b/index.js 84 bytes {2} {4} [built]
        amd require ../dedupe/b [0] ./example.js 6:0-24
        cjs require !!./index.js [5] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-28
    [7] ../dedupe/b/x.js 34 bytes {2} {4} [built]
        cjs require ./x [6] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 bytes {2} {4} [built]
        cjs require ./y [6] ../dedupe/b/index.js 3:4-18
```

## Minimized (uglify-js, no zip)

```
Hash: d5d4e99e565dec321575
Version: webpack 1.9.10
Time: 377ms
      Asset       Size  Chunks             Chunk Names
0.output.js  292 bytes    0, 2  [emitted]  
1.output.js  212 bytes    1, 4  [emitted]  
2.output.js  207 bytes       2  [emitted]  
  output.js    1.24 kB       3  [emitted]  main
4.output.js   89 bytes       4  [emitted]  
chunk    {0} 0.output.js 394 bytes {3} [rendered]
    > [0] ./example.js 2:0-51
    [1] ../dedupe/z.js 34 bytes {0} {1} {2} [built]
        cjs require ../z [2] ../dedupe/a/index.js 4:4-19
        cjs require ../z [5] ../dedupe/b/index.js 4:4-19
    [2] ../dedupe/a/index.js 84 bytes {0} {2} [built]
        amd require ../dedupe/a [0] ./example.js 2:0-51
        amd require ../dedupe/a [0] ./example.js 5:0-24
    [3] ../dedupe/a/x.js 34 bytes {0} {2} [built]
        cjs require ./x [2] ../dedupe/a/index.js 2:4-18
    [4] ../dedupe/a/y.js 49 bytes {0} {2} [built]
        cjs require ./y [2] ../dedupe/a/index.js 3:4-18
    [8] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 109 bytes {0} [built]
        amd require bundle?lazy!../dedupe/b [0] ./example.js 2:0-51
    [9] template of 2 referencing 1 84 bytes {0} [not cacheable] [built]
        template 1 [2] ../dedupe/a/index.js
        template 1 [5] ../dedupe/b/index.js
chunk    {1} 1.output.js 201 bytes {3} [rendered]
    > [0] ./example.js 6:0-24
    [1] ../dedupe/z.js 34 bytes {0} {1} {2} [built]
        cjs require ../z [2] ../dedupe/a/index.js 4:4-19
        cjs require ../z [5] ../dedupe/b/index.js 4:4-19
    [5] ../dedupe/b/index.js 84 bytes {1} {4} [built]
        amd require ../dedupe/b [0] ./example.js 6:0-24
        cjs require !!./index.js [8] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-28
    [6] ../dedupe/b/x.js 34 bytes {1} {4} [built]
        cjs require ./x [5] ../dedupe/b/index.js 2:4-18
    [7] ../dedupe/b/y.js 49 bytes {1} {4} [built]
        cjs require ./y [5] ../dedupe/b/index.js 3:4-18
chunk    {2} 2.output.js 201 bytes {3} [rendered]
    > [0] ./example.js 5:0-24
    [1] ../dedupe/z.js 34 bytes {0} {1} {2} [built]
        cjs require ../z [2] ../dedupe/a/index.js 4:4-19
        cjs require ../z [5] ../dedupe/b/index.js 4:4-19
    [2] ../dedupe/a/index.js 84 bytes {0} {2} [built]
        amd require ../dedupe/a [0] ./example.js 2:0-51
        amd require ../dedupe/a [0] ./example.js 5:0-24
    [3] ../dedupe/a/x.js 34 bytes {0} {2} [built]
        cjs require ./x [2] ../dedupe/a/index.js 2:4-18
    [4] ../dedupe/a/y.js 49 bytes {0} {2} [built]
        cjs require ./y [2] ../dedupe/a/index.js 3:4-18
chunk    {3} output.js (main) 197 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 197 bytes {3} [built]
chunk    {4} 4.output.js 167 bytes {0} [rendered]
    > [8] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 2:1-4:3
    [5] ../dedupe/b/index.js 84 bytes {1} {4} [built]
        amd require ../dedupe/b [0] ./example.js 6:0-24
        cjs require !!./index.js [8] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-28
    [6] ../dedupe/b/x.js 34 bytes {1} {4} [built]
        cjs require ./x [5] ../dedupe/b/index.js 2:4-18
    [7] ../dedupe/b/y.js 49 bytes {1} {4} [built]
        cjs require ./y [5] ../dedupe/b/index.js 3:4-18
```