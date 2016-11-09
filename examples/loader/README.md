# example.js

``` javascript
// use our loader
console.dir(require("./loader!./file"));

// use buildin json loader
console.dir(require("./test.json")); // default by extension
console.dir(require("!json!./test.json")); // manual
```

# file.js

``` javascript
exports.foo = "bar";
```

# loader.js

``` javascript
module.exports = function(content) {
	return "exports.answer = 42;\n" + content;
}
```

# test.json

``` javascript
{
	"foobar": 1234
}
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
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	// use our loader
	console.dir(__webpack_require__(/*! ./loader!./file */ 1));

	// use buildin json loader
	console.dir(__webpack_require__(/*! ./test.json */ 2)); // default by extension
	console.dir(__webpack_require__(/*! json!./test.json */ 2)); // manual

/***/ },
/* 1 */
/*!*****************************!*\
  !*** ./loader.js!./file.js ***!
  \*****************************/
/***/ function(module, exports) {

	exports.answer = 42;
	exports.foo = "bar";

/***/ },
/* 2 */
/*!*******************************************!*\
  !*** (webpack)/~/json-loader!./test.json ***!
  \*******************************************/
/***/ function(module, exports) {

	module.exports = {
		"foobar": 1234
	}

/***/ }
/******/ ]);
```

# Console output

Prints in node.js (`enhanced-require example.js`) and in browser:

```
{ answer: 42, foo: 'bar' }
{ foobar: 1234 }
{ foobar: 1234 }
```

# Info

## Uncompressed

```
Hash: b7795109258519c88313
Version: webpack 1.9.10
Time: 106ms
    Asset     Size  Chunks             Chunk Names
output.js  2.19 kB       0  [emitted]  main
chunk    {0} output.js (main) 282 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 205 bytes {0} [built]
    [1] ./loader.js!./file.js 41 bytes {0} [not cacheable] [built]
        cjs require ./loader!./file [0] ./example.js 2:12-38
    [2] (webpack)/~/json-loader!./test.json 36 bytes {0} [built]
        cjs require !json!./test.json [0] ./example.js 6:12-40
        cjs require ./test.json [0] ./example.js 5:12-34
```

## Minimized (uglify-js, no zip)

```
Hash: 8ae83d82089bb36260e9
Version: webpack 1.9.10
Time: 252ms
    Asset       Size  Chunks             Chunk Names
output.js  354 bytes       0  [emitted]  main
chunk    {0} output.js (main) 282 bytes [rendered]
    > main [0] ./example.js 
    [0] ./example.js 205 bytes {0} [built]
    [1] (webpack)/~/json-loader!./test.json 36 bytes {0} [built]
        cjs require !json!./test.json [0] ./example.js 6:12-40
        cjs require ./test.json [0] ./example.js 5:12-34
    [2] ./loader.js!./file.js 41 bytes {0} [not cacheable] [built]
        cjs require ./loader!./file [0] ./example.js 2:12-38
```
