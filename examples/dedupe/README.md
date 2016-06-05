
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
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 7);
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
}([
/* 0 */
/*!**************!*\
  !*** ./z.js ***!
  \**************/
/***/ function(module, exports) {

	module.exports = {"this is": "z"};

/***/ },
/* 1 */
/*!********************!*\
  !*** ./a/index.js ***!
  \********************/
[8, 3, 4],
/* 2 */
/*!********************!*\
  !*** ./b/index.js ***!
  \********************/
[8, 5, 6],
/* 3 */
/*!****************!*\
  !*** ./a/x.js ***!
  \****************/
/***/ function(module, exports) {

	module.exports = {"this is": "x"};

/***/ },
/* 4 */
/*!****************!*\
  !*** ./a/y.js ***!
  \****************/
/***/ function(module, exports) {

	module.exports = {"this is": "y", "but in": "a"};

/***/ },
/* 5 */
/*!****************!*\
  !*** ./b/x.js ***!
  \****************/
3,
/* 6 */
/*!****************!*\
  !*** ./b/y.js ***!
  \****************/
/***/ function(module, exports) {

	module.exports = {"this is": "y", "but in": "b"};

/***/ },
/* 7 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var a = __webpack_require__(/*! ./a */ 1);
	var b = __webpack_require__(/*! ./b */ 2);
	a.x !== b.x;
	a.y !== b.y;

/***/ },
/* 8 */
/*!***********************************!*\
  !*** template of 1 referencing 0 ***!
  \***********************************/
/***/ function(module, exports, __webpack_require__, __webpack_module_template_argument_0__, __webpack_module_template_argument_1__) {

	module.exports = {
		x: __webpack_require__(__webpack_module_template_argument_0__),
		y: __webpack_require__(__webpack_module_template_argument_1__),
		z: __webpack_require__(/*! ../z */ 0)
	}

/***/ }
/******/ ])));
```

# Info

## Uncompressed

```
Hash: 1472bad5b49955010453
Version: webpack 2.1.0-beta.11
Time: 82ms
    Asset     Size  Chunks             Chunk Names
output.js  3.76 kB       0  [emitted]  main
chunk    {0} output.js (main) 528 bytes [rendered]
    > main [7] ./example.js 
    [0] ./z.js 34 bytes {0} [built]
        cjs require ../z [1] ./a/index.js 4:4-19
        cjs require ../z [2] ./b/index.js 4:4-19
    [1] ./a/index.js 84 bytes {0} [built]
        cjs require ./a [7] ./example.js 1:8-22
    [2] ./b/index.js 84 bytes {0} [built]
        cjs require ./b [7] ./example.js 2:8-22
    [3] ./a/x.js 34 bytes {0} [built]
        cjs require ./x [1] ./a/index.js 2:4-18
    [4] ./a/y.js 49 bytes {0} [built]
        cjs require ./y [1] ./a/index.js 3:4-18
    [5] ./b/x.js 34 bytes {0} [built]
        cjs require ./x [2] ./b/index.js 2:4-18
    [6] ./b/y.js 49 bytes {0} [built]
        cjs require ./y [2] ./b/index.js 3:4-18
    [7] ./example.js 76 bytes {0} [built]
    [8] template of 1 referencing 0 84 bytes {0} [not cacheable] [built]
        template 0 [1] ./a/index.js
        template 0 [2] ./b/index.js
```

## Minimized (uglify-js, no zip)

```
Hash: 1472bad5b49955010453
Version: webpack 2.1.0-beta.11
Time: 146ms
    Asset       Size  Chunks             Chunk Names
output.js  812 bytes       0  [emitted]  main
chunk    {0} output.js (main) 528 bytes [rendered]
    > main [7] ./example.js 
    [0] ./z.js 34 bytes {0} [built]
        cjs require ../z [1] ./a/index.js 4:4-19
        cjs require ../z [2] ./b/index.js 4:4-19
    [1] ./a/index.js 84 bytes {0} [built]
        cjs require ./a [7] ./example.js 1:8-22
    [2] ./b/index.js 84 bytes {0} [built]
        cjs require ./b [7] ./example.js 2:8-22
    [3] ./a/x.js 34 bytes {0} [built]
        cjs require ./x [1] ./a/index.js 2:4-18
    [4] ./a/y.js 49 bytes {0} [built]
        cjs require ./y [1] ./a/index.js 3:4-18
    [5] ./b/x.js 34 bytes {0} [built]
        cjs require ./x [2] ./b/index.js 2:4-18
    [6] ./b/y.js 49 bytes {0} [built]
        cjs require ./y [2] ./b/index.js 3:4-18
    [7] ./example.js 76 bytes {0} [built]
    [8] template of 1 referencing 0 84 bytes {0} [not cacheable] [built]
        template 0 [1] ./a/index.js
        template 0 [2] ./b/index.js
```