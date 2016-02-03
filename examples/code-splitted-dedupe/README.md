
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
/******/ 			var _m = moreModules[moduleId];

/******/ 			// Check if module is deduplicated
/******/ 			switch(typeof _m) {
/******/ 			case "object":
/******/ 				// Module can be created from a template
/******/ 				modules[moduleId] = (function(_m) {
/******/ 					var args = _m.slice(1), templateId = _m[0];
/******/ 					return function (a,b,c) {
/******/ 						modules[templateId].apply(this, [a,b,c].concat(args));
/******/ 					};
/******/ 				}(_m));
/******/ 				break;
/******/ 			case "function":
/******/ 				// Normal module
/******/ 				modules[moduleId] = _m;
/******/ 				break;
/******/ 			default:
/******/ 				// Module is a copy of another module
/******/ 				modules[moduleId] = modules[_m];
/******/ 				break;
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(resolves.length)
/******/ 			resolves.shift()();

/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		3: 0
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
/******/ ((function(modules) {
	// Check all modules for deduplicated modules
	for(var i in modules) {
		if(Object.prototype.hasOwnProperty.call(modules, i)) {
			switch(typeof modules[i]) {
			case "function": break;
			case "object":
				// Module can be created from a template
				modules[i] = (function(_m) {
					var args = _m.slice(1), fn = modules[_m[0]];
					return function (a,b,c) {
						fn.apply(this, [a,b,c].concat(args));
					};
				}(modules[i]));
				break;
			default:
				// Module is a copy of another module
				modules[i] = modules[modules[i]];
				break;
			}
		}
	}
	return modules;
}({

/***/ 2:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	// index.js and x.js can be deduplicated
	__webpack_require__.e/* require */(0).then(function() {[__webpack_require__(/*! ../dedupe/a */ 0), __webpack_require__(/*! bundle?lazy!../dedupe/b */ 3)];}).catch(function(err) { __webpack_require__.oe(err); });

	// index.js and x.js cannot be deduplicated
	__webpack_require__.e/* require */(2).then(function() {[__webpack_require__(/*! ../dedupe/a */ 0)];}).catch(function(err) { __webpack_require__.oe(err); });
	__webpack_require__.e/* require */(1).then(function() {[__webpack_require__(/*! ../dedupe/b */ 1)];}).catch(function(err) { __webpack_require__.oe(err); });


/***/ }

/******/ })));
```

# js/0.js

``` javascript
webpackJsonp([0,2],[
/* 0 */
/*!****************************!*\
  !*** ../dedupe/a/index.js ***!
  \****************************/
[9, 5, 6],
/* 1 */,
/* 2 */,
/* 3 */
/*!***********************************************************!*\
  !*** (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js ***!
  \***********************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = function(cb) {
		__webpack_require__.e/* nsure */(4).then(function(require) {
			cb(__webpack_require__(/*! !./index.js */ 1));
		}.bind(null, __webpack_require__)).catch(function(err) { __webpack_require__.oe(err); });
	}

/***/ },
/* 4 */
/*!**********************!*\
  !*** ../dedupe/z.js ***!
  \**********************/
/***/ function(module, exports) {

	module.exports = {"this is": "z"};

/***/ },
/* 5 */
/*!************************!*\
  !*** ../dedupe/a/x.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "x"};

/***/ },
/* 6 */
/*!************************!*\
  !*** ../dedupe/a/y.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "y", "but in": "a"};

/***/ },
/* 7 */,
/* 8 */,
/* 9 */
/*!***********************************!*\
  !*** template of 0 referencing 4 ***!
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

# js/1.js

``` javascript
webpackJsonp([1,4],[
/* 0 */,
/* 1 */
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
/* 6 */,
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

# js/2.js

``` javascript
webpackJsonp([2],[
/* 0 */
/*!****************************!*\
  !*** ../dedupe/a/index.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
		x: __webpack_require__(/*! ./x */ 5),
		y: __webpack_require__(/*! ./y */ 6),
		z: __webpack_require__(/*! ../z */ 4)
	}

/***/ },
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
/* 5 */
/*!************************!*\
  !*** ../dedupe/a/x.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "x"};

/***/ },
/* 6 */
/*!************************!*\
  !*** ../dedupe/a/y.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "y", "but in": "a"};

/***/ }
]);
```

# js/4.js

``` javascript
webpackJsonp([4],{

/***/ 1:
/*!****************************!*\
  !*** ../dedupe/b/index.js ***!
  \****************************/
[9, 7, 8],

/***/ 7:
/*!************************!*\
  !*** ../dedupe/b/x.js ***!
  \************************/
5,

/***/ 8:
/*!************************!*\
  !*** ../dedupe/b/y.js ***!
  \************************/
/***/ function(module, exports) {

	module.exports = {"this is": "y", "but in": "b"};

/***/ }

});
```

# Info

## Uncompressed

```
Hash: 16906a1f14360b9ac9e8
Version: webpack 2.0.6-beta
Time: 151ms
    Asset       Size  Chunks             Chunk Names
     0.js    1.71 kB    0, 2  [emitted]  
     1.js  933 bytes    1, 4  [emitted]  
     2.js  913 bytes       2  [emitted]  
output.js    6.15 kB       3  [emitted]  main
     4.js  441 bytes       4  [emitted]  
chunk    {0} 0.js 394 bytes {3} [rendered]
    > [2] ./example.js 2:0-51
    [0] ../dedupe/a/index.js 84 bytes {0} {2} [built]
        amd require ../dedupe/a [2] ./example.js 2:0-51
        amd require ../dedupe/a [2] ./example.js 5:0-24
    [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 109 bytes {0} [built]
        amd require bundle?lazy!../dedupe/b [2] ./example.js 2:0-51
    [4] ../dedupe/z.js 34 bytes {0} {1} {2} [built]
        cjs require ../z [0] ../dedupe/a/index.js 4:4-19
        cjs require ../z [1] ../dedupe/b/index.js 4:4-19
    [5] ../dedupe/a/x.js 34 bytes {0} {2} [built]
        cjs require ./x [0] ../dedupe/a/index.js 2:4-18
    [6] ../dedupe/a/y.js 49 bytes {0} {2} [built]
        cjs require ./y [0] ../dedupe/a/index.js 3:4-18
    [9] template of 0 referencing 4 84 bytes {0} [not cacheable] [built]
        template 4 [0] ../dedupe/a/index.js
        template 4 [1] ../dedupe/b/index.js
chunk    {1} 1.js 201 bytes {3} [rendered]
    > [2] ./example.js 6:0-24
    [1] ../dedupe/b/index.js 84 bytes {1} {4} [built]
        amd require ../dedupe/b [2] ./example.js 6:0-24
        cjs require !!./index.js [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-28
    [4] ../dedupe/z.js 34 bytes {0} {1} {2} [built]
        cjs require ../z [0] ../dedupe/a/index.js 4:4-19
        cjs require ../z [1] ../dedupe/b/index.js 4:4-19
    [7] ../dedupe/b/x.js 34 bytes {1} {4} [built]
        cjs require ./x [1] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 bytes {1} {4} [built]
        cjs require ./y [1] ../dedupe/b/index.js 3:4-18
chunk    {2} 2.js 201 bytes {3} [rendered]
    > [2] ./example.js 5:0-24
    [0] ../dedupe/a/index.js 84 bytes {0} {2} [built]
        amd require ../dedupe/a [2] ./example.js 2:0-51
        amd require ../dedupe/a [2] ./example.js 5:0-24
    [4] ../dedupe/z.js 34 bytes {0} {1} {2} [built]
        cjs require ../z [0] ../dedupe/a/index.js 4:4-19
        cjs require ../z [1] ../dedupe/b/index.js 4:4-19
    [5] ../dedupe/a/x.js 34 bytes {0} {2} [built]
        cjs require ./x [0] ../dedupe/a/index.js 2:4-18
    [6] ../dedupe/a/y.js 49 bytes {0} {2} [built]
        cjs require ./y [0] ../dedupe/a/index.js 3:4-18
chunk    {3} output.js (main) 197 bytes [rendered]
    > main [2] ./example.js 
    [2] ./example.js 197 bytes {3} [built]
chunk    {4} 4.js 167 bytes {0} [rendered]
    > [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 2:1-4:3
    [1] ../dedupe/b/index.js 84 bytes {1} {4} [built]
        amd require ../dedupe/b [2] ./example.js 6:0-24
        cjs require !!./index.js [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-28
    [7] ../dedupe/b/x.js 34 bytes {1} {4} [built]
        cjs require ./x [1] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 bytes {1} {4} [built]
        cjs require ./y [1] ../dedupe/b/index.js 3:4-18
```

## Minimized (uglify-js, no zip)

```
Hash: 16906a1f14360b9ac9e8
Version: webpack 2.0.6-beta
Time: 402ms
    Asset       Size  Chunks             Chunk Names
     0.js  342 bytes    0, 2  [emitted]  
     1.js  213 bytes    1, 4  [emitted]  
     2.js  209 bytes       2  [emitted]  
output.js    1.62 kB       3  [emitted]  main
     4.js   90 bytes       4  [emitted]  
chunk    {0} 0.js 394 bytes {3} [rendered]
    > [2] ./example.js 2:0-51
    [0] ../dedupe/a/index.js 84 bytes {0} {2} [built]
        amd require ../dedupe/a [2] ./example.js 2:0-51
        amd require ../dedupe/a [2] ./example.js 5:0-24
    [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 109 bytes {0} [built]
        amd require bundle?lazy!../dedupe/b [2] ./example.js 2:0-51
    [4] ../dedupe/z.js 34 bytes {0} {1} {2} [built]
        cjs require ../z [0] ../dedupe/a/index.js 4:4-19
        cjs require ../z [1] ../dedupe/b/index.js 4:4-19
    [5] ../dedupe/a/x.js 34 bytes {0} {2} [built]
        cjs require ./x [0] ../dedupe/a/index.js 2:4-18
    [6] ../dedupe/a/y.js 49 bytes {0} {2} [built]
        cjs require ./y [0] ../dedupe/a/index.js 3:4-18
    [9] template of 0 referencing 4 84 bytes {0} [not cacheable] [built]
        template 4 [0] ../dedupe/a/index.js
        template 4 [1] ../dedupe/b/index.js
chunk    {1} 1.js 201 bytes {3} [rendered]
    > [2] ./example.js 6:0-24
    [1] ../dedupe/b/index.js 84 bytes {1} {4} [built]
        amd require ../dedupe/b [2] ./example.js 6:0-24
        cjs require !!./index.js [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-28
    [4] ../dedupe/z.js 34 bytes {0} {1} {2} [built]
        cjs require ../z [0] ../dedupe/a/index.js 4:4-19
        cjs require ../z [1] ../dedupe/b/index.js 4:4-19
    [7] ../dedupe/b/x.js 34 bytes {1} {4} [built]
        cjs require ./x [1] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 bytes {1} {4} [built]
        cjs require ./y [1] ../dedupe/b/index.js 3:4-18
chunk    {2} 2.js 201 bytes {3} [rendered]
    > [2] ./example.js 5:0-24
    [0] ../dedupe/a/index.js 84 bytes {0} {2} [built]
        amd require ../dedupe/a [2] ./example.js 2:0-51
        amd require ../dedupe/a [2] ./example.js 5:0-24
    [4] ../dedupe/z.js 34 bytes {0} {1} {2} [built]
        cjs require ../z [0] ../dedupe/a/index.js 4:4-19
        cjs require ../z [1] ../dedupe/b/index.js 4:4-19
    [5] ../dedupe/a/x.js 34 bytes {0} {2} [built]
        cjs require ./x [0] ../dedupe/a/index.js 2:4-18
    [6] ../dedupe/a/y.js 49 bytes {0} {2} [built]
        cjs require ./y [0] ../dedupe/a/index.js 3:4-18
chunk    {3} output.js (main) 197 bytes [rendered]
    > main [2] ./example.js 
    [2] ./example.js 197 bytes {3} [built]
chunk    {4} 4.js 167 bytes {0} [rendered]
    > [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 2:1-4:3
    [1] ../dedupe/b/index.js 84 bytes {1} {4} [built]
        amd require ../dedupe/b [2] ./example.js 6:0-24
        cjs require !!./index.js [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-28
    [7] ../dedupe/b/x.js 34 bytes {1} {4} [built]
        cjs require ./x [1] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 bytes {1} {4} [built]
        cjs require ./y [1] ../dedupe/b/index.js 3:4-18
```