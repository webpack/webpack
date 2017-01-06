# example.js

``` javascript
// use our loader
console.dir(require("./loader!./file"));

// use buildin css loader
console.dir(require("./test.css")); // default by extension
console.dir(require("!css-loader!./test.css")); // manual
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

# test.css

``` css
.some-class {
	color: hotpink;
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

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
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
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!*****************************************!*\
  !*** (webpack)/~/css-loader!./test.css ***!
  \*****************************************/
/***/ function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(/*! ./../../~/css-loader/lib/css-base.js */ 2)();
// imports


// module
exports.push([module.i, ".some-class {\r\n\tcolor: hotpink;\r\n}\r\n", ""]);

// exports


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
/*!**********************************************!*\
  !*** (webpack)/~/css-loader/lib/css-base.js ***!
  \**********************************************/
/***/ function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function() {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		var result = [];
		for(var i = 0; i < this.length; i++) {
			var item = this[i];
			if(item[2]) {
				result.push("@media " + item[2] + "{" + item[1] + "}");
			} else {
				result.push(item[1]);
			}
		}
		return result.join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};


/***/ },
/* 3 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

// use our loader
console.dir(__webpack_require__(/*! ./loader!./file */ 1));

// use buildin css loader
console.dir(__webpack_require__(/*! ./test.css */ 0)); // default by extension
console.dir(__webpack_require__(/*! css-loader!./test.css */ 0)); // manual


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
Hash: 197d528d54679c3ef22f
Version: webpack 2.2.0-rc.2
    Asset     Size  Chunks             Chunk Names
output.js  5.43 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 1.96 kB [entry] [rendered]
    > main [3] ./example.js 
    [0] (webpack)/~/css-loader!./test.css 202 bytes {0} [built]
        cjs require !css-loader!./test.css [3] ./example.js 6:12-45
        cjs require ./test.css [3] ./example.js 5:12-33
    [1] ./loader.js!./file.js 41 bytes {0} [built]
        cjs require ./loader!./file [3] ./example.js 2:12-38
    [2] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
        cjs require ./../../node_modules/css-loader/lib/css-base.js [0] (webpack)/~/css-loader!./test.css 1:27-85
    [3] ./example.js 210 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 73ca0b614fa918a99453
Version: webpack 2.2.0-rc.2
    Asset     Size  Chunks             Chunk Names
output.js  1.16 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 1.94 kB [entry] [rendered]
    > main [3] ./example.js 
    [0] (webpack)/~/css-loader!./test.css 185 bytes {0} [built]
        cjs require !css-loader!./test.css [3] ./example.js 6:12-45
        cjs require ./test.css [3] ./example.js 5:12-33
    [1] ./loader.js!./file.js 41 bytes {0} [built]
        cjs require ./loader!./file [3] ./example.js 2:12-38
    [2] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
        cjs require ./../../node_modules/css-loader/lib/css-base.js [0] (webpack)/~/css-loader!./test.css 1:27-85
    [3] ./example.js 210 bytes {0} [built]
```
