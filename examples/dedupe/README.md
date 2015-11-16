
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

	var a = __webpack_require__(/*! ./a */ 1);
	var b = __webpack_require__(/*! ./b */ 5);
	a.x !== b.x;
	a.y !== b.y;

/***/ },
/* 1 */
/*!********************!*\
  !*** ./a/index.js ***!
  \********************/
[8, 2, 3],
/* 2 */
/*!****************!*\
  !*** ./a/x.js ***!
  \****************/
/***/ function(module, exports) {

	module.exports = {"this is": "x"};

/***/ },
/* 3 */
/*!****************!*\
  !*** ./a/y.js ***!
  \****************/
/***/ function(module, exports) {

	module.exports = {"this is": "y", "but in": "a"};

/***/ },
/* 4 */
/*!**************!*\
  !*** ./z.js ***!
  \**************/
/***/ function(module, exports) {

	module.exports = {"this is": "z"};

/***/ },
/* 5 */
/*!********************!*\
  !*** ./b/index.js ***!
  \********************/
[8, 6, 7],
/* 6 */
/*!****************!*\
  !*** ./b/x.js ***!
  \****************/
2,
/* 7 */
/*!****************!*\
  !*** ./b/y.js ***!
  \****************/
/***/ function(module, exports) {

	module.exports = {"this is": "y", "but in": "b"};

/***/ },
/* 8 */
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
/******/ ])));
```

# Info

## Uncompressed

```
Hash: 50871f02839c7de27639
Version: webpack 1.9.10
Time: 90ms
    Asset     Size  Chunks             Chunk Names
output.js  3.56 kB       0  [emitted]  main
chunk    {0} output.js (main) 528 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 76 bytes {0} [built]
    [1] ./a/index.js 84 bytes {0} [built]
        cjs require ./a [0] ./example.js 1:8-22
    [2] ./a/x.js 34 bytes {0} [built]
        cjs require ./x [1] ./a/index.js 2:4-18
    [3] ./a/y.js 49 bytes {0} [built]
        cjs require ./y [1] ./a/index.js 3:4-18
    [4] ./z.js 34 bytes {0} [built]
        cjs require ../z [1] ./a/index.js 4:4-19
        cjs require ../z [5] ./b/index.js 4:4-19
    [5] ./b/index.js 84 bytes {0} [built]
        cjs require ./b [0] ./example.js 2:8-22
    [6] ./b/x.js 34 bytes {0} [built]
        cjs require ./x [5] ./b/index.js 2:4-18
    [7] ./b/y.js 49 bytes {0} [built]
        cjs require ./y [5] ./b/index.js 3:4-18
    [8] template of 1 referencing 4 84 bytes {0} [not cacheable] [built]
        template 4 [1] ./a/index.js
        template 4 [5] ./b/index.js
```

## Minimized (uglify-js, no zip)

```
Hash: 8bc9bb7c8faa6927456d
Version: webpack 1.9.10
Time: 207ms
    Asset       Size  Chunks             Chunk Names
output.js  777 bytes       0  [emitted]  main
chunk    {0} output.js (main) 528 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 76 bytes {0} [built]
    [1] ./z.js 34 bytes {0} [built]
        cjs require ../z [2] ./a/index.js 4:4-19
        cjs require ../z [5] ./b/index.js 4:4-19
    [2] ./a/index.js 84 bytes {0} [built]
        cjs require ./a [0] ./example.js 1:8-22
    [3] ./a/x.js 34 bytes {0} [built]
        cjs require ./x [2] ./a/index.js 2:4-18
    [4] ./a/y.js 49 bytes {0} [built]
        cjs require ./y [2] ./a/index.js 3:4-18
    [5] ./b/index.js 84 bytes {0} [built]
        cjs require ./b [0] ./example.js 2:8-22
    [6] ./b/x.js 34 bytes {0} [built]
        cjs require ./x [5] ./b/index.js 2:4-18
    [7] ./b/y.js 49 bytes {0} [built]
        cjs require ./y [5] ./b/index.js 3:4-18
    [8] template of 2 referencing 1 84 bytes {0} [not cacheable] [built]
        template 1 [2] ./a/index.js
        template 1 [5] ./b/index.js
```