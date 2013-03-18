# example.js

``` javascript
require: "./increment";
var a = 1;
increment(a); // 2
```

# increment.js

``` javascript
require: "./math";
exports: function increment(val) {
    return add(val, 1);
};
```

# math.js

``` javascript
exports: function add() {
    var sum = 0, i = 0, args = arguments, l = args.length;
    while (i < l) {
        sum += args[i++];
    }
    return sum;
};
```

# js/output.js

``` javascript
/******/ (function webpackBootstrap(modules) {
/******/ 	var installedModules = {};
/******/ 	function require(moduleId) {
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/ 		modules[moduleId].call(null, module, module.exports, require);
/******/ 		module.loaded = true;
/******/ 		return module.exports;
/******/ 	}
/******/ 	require.e = function requireEnsure(chunkId, callback) {
/******/ 		callback.call(null, require);
/******/ 	};
/******/ 	require.modules = modules;
/******/ 	require.cache = installedModules;
/******/ 	return require(0);
/******/ })({
/******/ c: "",

/***/ 0:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, require) {

	var __WEBPACK_LABELED_MODULE__1 = require(/*! ./increment */ 1), increment = __WEBPACK_LABELED_MODULE__1.increment;
	var a = 1;
	increment(a); // 2

/***/ },

/***/ 1:
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/***/ function(module, exports, require) {

	var __WEBPACK_LABELED_MODULE__2 = require(/*! ./math */ 2), add = __WEBPACK_LABELED_MODULE__2.add;
	exports: exports["increment"] = function increment(val) {
	    return add(val, 1);
	};

/***/ },

/***/ 2:
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/***/ function(module, exports, require) {

	exports: exports["add"] = function add() {
	    var sum = 0, i = 0, args = arguments, l = args.length;
	    while (i < l) {
	        sum += args[i++];
	    }
	    return sum;
	};

/***/ }
/******/ })

```

The remaining labels are removed while minimizing.

# Info

## Uncompressed

```
Hash: 77a9971b44e556189b1ad3d848f5ea9c
Time: 30ms
    Asset  Size  Chunks  Chunk Names
output.js  1727       0  main       
chunk    {0} output.js (main) 299
    [0] ./example.js 55 [built] {0}
    [1] ./increment.js 83 [built] {0}
        labeled require ./increment [0] ./example.js 1:0-23
    [2] ./math.js 161 [built] {0}
        labeled require ./math [1] ./increment.js 1:0-18
```

## Minimized (uglify-js, no zip)

```
Hash: 77a9971b44e556189b1ad3d848f5ea9c
Time: 82ms
    Asset  Size  Chunks  Chunk Names
output.js   468       0  main       
chunk    {0} output.js (main) 299
    [0] ./example.js 55 [built] {0}
    [1] ./increment.js 83 [built] {0}
        labeled require ./increment [0] ./example.js 1:0-23
    [2] ./math.js 161 [built] {0}
        labeled require ./math [1] ./increment.js 1:0-18
```