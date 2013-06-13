
# example.js

``` javascript
var a = require("./a");
var b = require("./b");
a.x !== b.x;
a.y !== b.y;
```

# a/index.js

``` javascript
module.exports = {
	x: require("./x"),
	y: require("./y"),
	z: require("../z")
}
```

# a/x.js

``` javascript
module.exports = {"this is": "x"};
```

# a/y.js

``` javascript
module.exports = {"this is": "y", "but in": "a"};
```

# b/index.js

``` javascript
module.exports = {
	x: require("./x"),
	y: require("./y"),
	z: require("../z")
}
```

# b/x.js

``` javascript
module.exports = {"this is": "x"};
```

# b/y.js

``` javascript
module.exports = {"this is": "y", "but in": "b"};
```

# z.js

``` javascript
module.exports = {"this is": "z"};
```

# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
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
/******/ 		modules[moduleId].call(null, module, module.exports, require);
/******/ 		
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 		
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// The bundle contains no chunks. A empty chunk loading function.
/******/ 	require.e = function requireEnsure(_, callback) {
/******/ 		callback.call(null, require);
/******/ 	};
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	require.modules = modules;
/******/ 	
/******/ 	// expose the module cache
/******/ 	require.cache = installedModules;
/******/ 	
/******/ 	
/******/ 	// Load entry module and return exports
/******/ 	return require(0);
/******/ })
/************************************************************************/
/******/ ((function(modules) {
	for(var i in modules) {
		switch(typeof modules[i]) {
		case "number":
			modules[i] = modules[modules[i]];
			break;
		case "object":
			modules[i] = (function(_m) {
				var args = _m.slice(1), fn = modules[_m[0]];
				return function (a,b,c) {
					fn.apply(null, [a,b,c].concat(args));
				};
			}(modules[i]));
		}
	}
	return modules;
}({
/******/ // __webpack_public_path__
/******/ c: "",

/***/ 0:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, require) {

	var a = require(/*! ./a */ 2);
	var b = require(/*! ./b */ 5);
	a.x !== b.x;
	a.y !== b.y;

/***/ },

/***/ 1:
/*!**************!*\
  !*** ./z.js ***!
  \**************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "z"};

/***/ },

/***/ 2:
[8, 3, 4],

/***/ 3:
/*!****************!*\
  !*** ./a/x.js ***!
  \****************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "x"};

/***/ },

/***/ 4:
/*!****************!*\
  !*** ./a/y.js ***!
  \****************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "y", "but in": "a"};

/***/ },

/***/ 5:
[8, 6, 7],

/***/ 6:
3,

/***/ 7:
/*!****************!*\
  !*** ./b/y.js ***!
  \****************/
/***/ function(module, exports, require) {

	module.exports = {"this is": "y", "but in": "b"};

/***/ },

/***/ 8:
/*!********!*\
  !***  ***!
  \********/
/***/ function(module, exports, require, __webpack_module_template_argument_0__, __webpack_module_template_argument_1__) {

	module.exports = {
		x: require(__webpack_module_template_argument_0__),
		y: require(__webpack_module_template_argument_1__),
		z: require(/*! ../z */ 1)
	}

/***/ }
/******/ })))
```

# Info

## Uncompressed

```
Hash: 4afc9f4631bed4b86de9
Version: webpack 0.10.0-beta20
Time: 42ms
    Asset  Size  Chunks             Chunk Names
output.js  3223       0  [emitted]  main       
chunk    {0} output.js (main) 513 [rendered]
    [0] ./example.js 73 {0} [built]
    [1] ./z.js 34 {0} [built]
        cjs require ../z [2] ./a/index.js 4:4-19
        cjs require ../z [5] ./b/index.js 4:4-19
    [2] ./a/index.js 80 {0} [built]
        cjs require ./a [0] ./example.js 1:8-22
    [3] ./a/x.js 34 {0} [built]
        cjs require ./x [2] ./a/index.js 2:4-18
    [4] ./a/y.js 49 {0} [built]
        cjs require ./y [2] ./a/index.js 3:4-18
    [5] ./b/index.js 80 {0} [built]
        cjs require ./b [0] ./example.js 2:8-22
    [6] ./b/x.js 34 {0} [built]
        cjs require ./x [5] ./b/index.js 2:4-18
    [7] ./b/y.js 49 {0} [built]
        cjs require ./y [5] ./b/index.js 3:4-18
    [8]  80 {0} [not cacheable] [built]
        template 1 [2] ./a/index.js
        template 1 [5] ./b/index.js
```

## Minimized (uglify-js, no zip)

```
Hash: 4afc9f4631bed4b86de9
Version: webpack 0.10.0-beta20
Time: 98ms
    Asset  Size  Chunks             Chunk Names
output.js   776       0  [emitted]  main       
chunk    {0} output.js (main) 513 [rendered]
    [0] ./example.js 73 {0} [built]
    [1] ./z.js 34 {0} [built]
        cjs require ../z [2] ./a/index.js 4:4-19
        cjs require ../z [5] ./b/index.js 4:4-19
    [2] ./a/index.js 80 {0} [built]
        cjs require ./a [0] ./example.js 1:8-22
    [3] ./a/x.js 34 {0} [built]
        cjs require ./x [2] ./a/index.js 2:4-18
    [4] ./a/y.js 49 {0} [built]
        cjs require ./y [2] ./a/index.js 3:4-18
    [5] ./b/index.js 80 {0} [built]
        cjs require ./b [0] ./example.js 2:8-22
    [6] ./b/x.js 34 {0} [built]
        cjs require ./x [5] ./b/index.js 2:4-18
    [7] ./b/y.js 49 {0} [built]
        cjs require ./y [5] ./b/index.js 3:4-18
    [8]  80 {0} [not cacheable] [built]
        template 1 [2] ./a/index.js
        template 1 [5] ./b/index.js
```