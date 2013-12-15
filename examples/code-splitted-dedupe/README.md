
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
/******/ 	
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		0:0
/******/ 	};
/******/ 	
/******/ 	// The require function
/******/ 	function require(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/ 		
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/ 		
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, require);
/******/ 		
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 		
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	require.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, require);
/******/ 		
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
/******/ 			script.src = require.p + "" + chunkId + ".output.js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	require.modules = modules;
/******/ 	
/******/ 	// expose the module cache
/******/ 	require.cache = installedModules;
/******/ 	
/******/ 	// __webpack_public_path__
/******/ 	require.p = "";
/******/ 	
/******/ 	// install a JSONP callback for chunk loading
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, callbacks = [];
/******/ 		while(chunkIds.length) {
/******/ 			chunkId = chunkIds.shift();
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			var _m = moreModules[moduleId];
/******/ 			
/******/ 			// Check if module is deduplicated
/******/ 			switch(typeof _m) {
/******/ 			case "number":
/******/ 				// Module is a copy of another module
/******/ 				modules[moduleId] = modules[_m];
/******/ 				break;
/******/ 			case "object":
/******/ 				// Module can be created from a template
/******/ 				modules[moduleId] = (function(_m) {
/******/ 					var args = _m.slice(1), fn = modules[_m[0]];
/******/ 					return function (a,b,c) {
/******/ 						fn.apply(this, [a,b,c].concat(args));
/******/ 					};
/******/ 				}(_m));
/******/ 				break;
/******/ 			default:
/******/ 				// Normal module
/******/ 				modules[moduleId] = _m;
/******/ 			}
/******/ 		}
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, require);
/******/ 	};
/******/ 	
/******/ 	// Load entry module and return exports
/******/ 	return require(0);
/******/ })
/************************************************************************/
/******/ ((function(modules) {
	// Check all modules for deduplicated modules
	for(var i in modules) {
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
	return modules;
}([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, require) {

	// index.js and x.js can be deduplicated
	require.e/* require */(1, function(require) {[(require(/*! ../dedupe/a */ 1)), (require(/*! bundle?lazy!../dedupe/b */ 3))];});

	// index.js and x.js cannot be deduplicated
	require.e/* require */(3, function(require) {[(require(/*! ../dedupe/a */ 1))];});
	require.e/* require */(2, function(require) {[(require(/*! ../dedupe/b */ 2))];});


/***/ }
/******/ ])))
```

# js/1.output.js

``` javascript
webpackJsonp([1,3],[
/* 0 */,
/* 1 */
[9, 5, 6],
/* 2 */,
/* 3 */
/*!****************************************************************************************************!*\
  !*** (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js ***!
  \****************************************************************************************************/
/***/ function(module, exports, require) {

	module.exports = function(cb) {
		require.e/*nsure*/(4, function(require) {
			cb(require(/*! !../dedupe/b/index.js */ 2));
		});
	}

/***/ },
/* 4 */
/*!**********************!*\
  !*** ../dedupe/z.js ***!
  \**********************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "z"};

/***/ },
/* 5 */
/*!************************!*\
  !*** ../dedupe/a/x.js ***!
  \************************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "x"};

/***/ },
/* 6 */
/*!************************!*\
  !*** ../dedupe/a/y.js ***!
  \************************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "y", "but in": "a"};

/***/ },
/* 7 */,
/* 8 */,
/* 9 */
/*!***********************************!*\
  !*** template of 1 referencing 4 ***!
  \***********************************/
/***/ function(module, exports, require, __webpack_module_template_argument_0__, __webpack_module_template_argument_1__) {

	module.exports = {
		x: require(__webpack_module_template_argument_0__),
		y: require(__webpack_module_template_argument_1__),
		z: require(/*! ../z */ 4)
	}

/***/ }
])
```

# js/2.output.js

``` javascript
webpackJsonp([2,4],[
/* 0 */,
/* 1 */,
/* 2 */
/*!****************************!*\
  !*** ../dedupe/b/index.js ***!
  \****************************/
/***/ function(module, exports, require) {

	module.exports = {
		x: require(/*! ./x */ 7),
		y: require(/*! ./y */ 8),
		z: require(/*! ../z */ 4)
	}

/***/ },
/* 3 */,
/* 4 */
/*!**********************!*\
  !*** ../dedupe/z.js ***!
  \**********************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "z"};

/***/ },
/* 5 */,
/* 6 */,
/* 7 */
/*!************************!*\
  !*** ../dedupe/b/x.js ***!
  \************************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "x"};

/***/ },
/* 8 */
/*!************************!*\
  !*** ../dedupe/b/y.js ***!
  \************************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "y", "but in": "b"};

/***/ }
])
```

# js/3.output.js

``` javascript
webpackJsonp([3],[
/* 0 */,
/* 1 */
/*!****************************!*\
  !*** ../dedupe/a/index.js ***!
  \****************************/
/***/ function(module, exports, require) {

	module.exports = {
		x: require(/*! ./x */ 5),
		y: require(/*! ./y */ 6),
		z: require(/*! ../z */ 4)
	}

/***/ },
/* 2 */,
/* 3 */,
/* 4 */
/*!**********************!*\
  !*** ../dedupe/z.js ***!
  \**********************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "z"};

/***/ },
/* 5 */
/*!************************!*\
  !*** ../dedupe/a/x.js ***!
  \************************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "x"};

/***/ },
/* 6 */
/*!************************!*\
  !*** ../dedupe/a/y.js ***!
  \************************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "y", "but in": "a"};

/***/ }
])
```

# js/4.output.js

``` javascript
webpackJsonp([4],{

/***/ 2:
[9, 7, 8],

/***/ 7:
5,

/***/ 8:
/*!************************!*\
  !*** ../dedupe/b/y.js ***!
  \************************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "y", "but in": "b"};

/***/ }

})
```

# Info

## Uncompressed

```
Hash: 4348fc3315b090ade366
Version: webpack 0.11.14
Time: 83ms
      Asset  Size  Chunks             Chunk Names
  output.js  5034       0  [emitted]  main       
1.output.js  1587    1, 3  [emitted]             
2.output.js   911    2, 4  [emitted]             
3.output.js   891       3  [emitted]             
4.output.js   259       4  [emitted]             
chunk    {0} output.js (main) 197 [rendered]
    [0] ./example.js 197 {0} [built]
chunk    {1} 1.output.js 492 {0} [rendered]
    [1] ../dedupe/a/index.js 84 {1} {3} [built]
        amd require ../dedupe/a [0] ./example.js 2:0-51
        amd require ../dedupe/a [0] ./example.js 5:0-24
    [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 207 {1} [built]
        amd require bundle?lazy!../dedupe/b [0] ./example.js 2:0-51
    [4] ../dedupe/z.js 34 {1} {2} {3} [built]
        cjs require ../z [1] ../dedupe/a/index.js 4:4-19
        cjs require ../z [2] ../dedupe/b/index.js 4:4-19
    [5] ../dedupe/a/x.js 34 {1} {3} [built]
        cjs require ./x [1] ../dedupe/a/index.js 2:4-18
    [6] ../dedupe/a/y.js 49 {1} {3} [built]
        cjs require ./y [1] ../dedupe/a/index.js 3:4-18
    [9] template of 1 referencing 4 84 {1} [not cacheable] [built]
        template 4 [1] ../dedupe/a/index.js
        template 4 [2] ../dedupe/b/index.js
chunk    {2} 2.output.js 201 {0} [rendered]
    [2] ../dedupe/b/index.js 84 {2} {4} [built]
        amd require ../dedupe/b [0] ./example.js 6:0-24
        cjs require !!(webpack)\examples\dedupe\b\index.js [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-126
    [4] ../dedupe/z.js 34 {1} {2} {3} [built]
        cjs require ../z [1] ../dedupe/a/index.js 4:4-19
        cjs require ../z [2] ../dedupe/b/index.js 4:4-19
    [7] ../dedupe/b/x.js 34 {2} {4} [built]
        cjs require ./x [2] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 {2} {4} [built]
        cjs require ./y [2] ../dedupe/b/index.js 3:4-18
chunk    {3} 3.output.js 201 {0} [rendered]
    [1] ../dedupe/a/index.js 84 {1} {3} [built]
        amd require ../dedupe/a [0] ./example.js 2:0-51
        amd require ../dedupe/a [0] ./example.js 5:0-24
    [4] ../dedupe/z.js 34 {1} {2} {3} [built]
        cjs require ../z [1] ../dedupe/a/index.js 4:4-19
        cjs require ../z [2] ../dedupe/b/index.js 4:4-19
    [5] ../dedupe/a/x.js 34 {1} {3} [built]
        cjs require ./x [1] ../dedupe/a/index.js 2:4-18
    [6] ../dedupe/a/y.js 49 {1} {3} [built]
        cjs require ./y [1] ../dedupe/a/index.js 3:4-18
chunk    {4} 4.output.js 167 {1} [rendered]
    [2] ../dedupe/b/index.js 84 {2} {4} [built]
        amd require ../dedupe/b [0] ./example.js 6:0-24
        cjs require !!(webpack)\examples\dedupe\b\index.js [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-126
    [7] ../dedupe/b/x.js 34 {2} {4} [built]
        cjs require ./x [2] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 {2} {4} [built]
        cjs require ./y [2] ../dedupe/b/index.js 3:4-18
```

## Minimized (uglify-js, no zip)

```
Hash: 9092d3c15f6e51b1d0fe
Version: webpack 0.11.14
Time: 244ms
      Asset  Size  Chunks             Chunk Names
  output.js  1155       0  [emitted]  main       
1.output.js   286    1, 3  [emitted]             
2.output.js   207    2, 4  [emitted]             
3.output.js   203       3  [emitted]             
4.output.js    88       4  [emitted]             
chunk    {0} output.js (main) 197 [rendered]
    [0] ./example.js 197 {0} [built]
chunk    {1} 1.output.js 492 {0} [rendered]
    [1] ../dedupe/a/index.js 84 {1} {3} [built]
        amd require ../dedupe/a [0] ./example.js 2:0-51
        amd require ../dedupe/a [0] ./example.js 5:0-24
    [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 207 {1} [built]
        amd require bundle?lazy!../dedupe/b [0] ./example.js 2:0-51
    [4] ../dedupe/z.js 34 {1} {2} {3} [built]
        cjs require ../z [1] ../dedupe/a/index.js 4:4-19
        cjs require ../z [2] ../dedupe/b/index.js 4:4-19
    [5] ../dedupe/a/x.js 34 {1} {3} [built]
        cjs require ./x [1] ../dedupe/a/index.js 2:4-18
    [6] ../dedupe/a/y.js 49 {1} {3} [built]
        cjs require ./y [1] ../dedupe/a/index.js 3:4-18
    [9] template of 1 referencing 4 84 {1} [not cacheable] [built]
        template 4 [1] ../dedupe/a/index.js
        template 4 [2] ../dedupe/b/index.js
chunk    {2} 2.output.js 201 {0} [rendered]
    [2] ../dedupe/b/index.js 84 {2} {4} [built]
        amd require ../dedupe/b [0] ./example.js 6:0-24
        cjs require !!(webpack)\examples\dedupe\b\index.js [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-126
    [4] ../dedupe/z.js 34 {1} {2} {3} [built]
        cjs require ../z [1] ../dedupe/a/index.js 4:4-19
        cjs require ../z [2] ../dedupe/b/index.js 4:4-19
    [7] ../dedupe/b/x.js 34 {2} {4} [built]
        cjs require ./x [2] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 {2} {4} [built]
        cjs require ./y [2] ../dedupe/b/index.js 3:4-18
chunk    {3} 3.output.js 201 {0} [rendered]
    [1] ../dedupe/a/index.js 84 {1} {3} [built]
        amd require ../dedupe/a [0] ./example.js 2:0-51
        amd require ../dedupe/a [0] ./example.js 5:0-24
    [4] ../dedupe/z.js 34 {1} {2} {3} [built]
        cjs require ../z [1] ../dedupe/a/index.js 4:4-19
        cjs require ../z [2] ../dedupe/b/index.js 4:4-19
    [5] ../dedupe/a/x.js 34 {1} {3} [built]
        cjs require ./x [1] ../dedupe/a/index.js 2:4-18
    [6] ../dedupe/a/y.js 49 {1} {3} [built]
        cjs require ./y [1] ../dedupe/a/index.js 3:4-18
chunk    {4} 4.output.js 167 {1} [rendered]
    [2] ../dedupe/b/index.js 84 {2} {4} [built]
        amd require ../dedupe/b [0] ./example.js 6:0-24
        cjs require !!(webpack)\examples\dedupe\b\index.js [3] (webpack)/~/bundle-loader?lazy!../dedupe/b/index.js 3:5-126
    [7] ../dedupe/b/x.js 34 {2} {4} [built]
        cjs require ./x [2] ../dedupe/b/index.js 2:4-18
    [8] ../dedupe/b/y.js 49 {2} {4} [built]
        cjs require ./y [2] ../dedupe/b/index.js 3:4-18
```