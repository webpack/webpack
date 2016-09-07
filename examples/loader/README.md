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

<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>
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

/******/ 	// define getter function for harmory exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		Object.defineProperty(exports, name, {
/******/ 			configurable: false,
/******/ 			enumerable: true,
/******/ 			get: getter
/******/ 		});
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!*******************************************!*\
  !*** (webpack)/~/json-loader!./test.json ***!
  \*******************************************/
/***/ function(module, exports) {

module.exports = {
	"foobar": 1234
};

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!*****************************!*\
  !*** ./loader.js!./file.js ***!
  \*****************************/
/***/ function(module, exports) {

exports.answer = 42;
exports.foo = "bar";

/***/ },
/* 2 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

// use our loader
console.dir(__webpack_require__(/*! ./loader!./file */ 1));

// use buildin json loader
console.dir(__webpack_require__(/*! ./test.json */ 0)); // default by extension
console.dir(__webpack_require__(/*! json!./test.json */ 0)); // manual

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
Hash: 2847840b31f5517b4ca1
Version: webpack 2.1.0-beta.22
Time: 200ms
    Asset     Size  Chunks             Chunk Names
output.js  3.39 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 283 bytes [entry] [rendered]
    > main [2] ./example.js 
    [0] (webpack)/~/json-loader!./test.json 37 bytes {0} [built]
        cjs require !json!./test.json [2] ./example.js 6:12-40
        cjs require ./test.json [2] ./example.js 5:12-34
    [1] ./loader.js!./file.js 41 bytes {0} [built]
        cjs require ./loader!./file [2] ./example.js 2:12-38
    [2] ./example.js 205 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 2847840b31f5517b4ca1
Version: webpack 2.1.0-beta.22
Time: 437ms
    Asset       Size  Chunks             Chunk Names
output.js  641 bytes       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 283 bytes [entry] [rendered]
    > main [2] ./example.js 
    [0] (webpack)/~/json-loader!./test.json 37 bytes {0} [built]
        cjs require !json!./test.json [2] ./example.js 6:12-40
        cjs require ./test.json [2] ./example.js 5:12-34
    [1] ./loader.js!./file.js 41 bytes {0} [built]
        cjs require ./loader!./file [2] ./example.js 2:12-38
    [2] ./example.js 205 bytes {0} [built]
```
