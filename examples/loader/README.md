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

# dist/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

// use our loader
console.dir(__webpack_require__(/*! ./loader!./file */ 1));

// use buildin css loader
console.dir(__webpack_require__(/*! ./test.css */ 2)); // default by extension
console.dir(__webpack_require__(/*! css-loader!./test.css */ 2)); // manual


/***/ }),
/* 1 */
/*!*****************************!*\
  !*** ./loader.js!./file.js ***!
  \*****************************/
/*! no static exports found */
/*! runtime requirements: __webpack_exports__ */
/***/ (function(__unusedmodule, exports) {

exports.answer = 42;
exports.foo = "bar";

/***/ }),
/* 2 */
/*!****************************************************!*\
  !*** (webpack)/node_modules/css-loader!./test.css ***!
  \****************************************************/
/*! no static exports found */
/*! runtime requirements: __webpack_exports__, module, __webpack_require__ */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(/*! ../../node_modules/css-loader/lib/css-base.js */ 3)(false);
// imports


// module
exports.push([module.i, ".some-class {\n\tcolor: hotpink;\n}\n", ""]);

// exports


/***/ }),
/* 3 */
/*!*********************************************************!*\
  !*** (webpack)/node_modules/css-loader/lib/css-base.js ***!
  \*********************************************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function(useSourceMap) {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		return this.map(function (item) {
			var content = cssWithMappingToString(item, useSourceMap);
			if(item[2]) {
				return "@media " + item[2] + "{" + content + "}";
			} else {
				return content;
			}
		}).join("");
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

function cssWithMappingToString(item, useSourceMap) {
	var content = item[1] || '';
	var cssMapping = item[3];
	if (!cssMapping) {
		return content;
	}

	if (useSourceMap && typeof btoa === 'function') {
		var sourceMapping = toComment(cssMapping);
		var sourceURLs = cssMapping.sources.map(function (source) {
			return '/*# sourceURL=' + cssMapping.sourceRoot + source + ' */'
		});

		return [content].concat(sourceURLs).concat([sourceMapping]).join('\n');
	}

	return [content].join('\n');
}

// Adapted from convert-source-map (MIT)
function toComment(sourceMap) {
	// eslint-disable-next-line no-undef
	var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
	var data = 'sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64;

	return '/*# ' + data + ' */';
}


/***/ })
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

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset      Size  Chunks             Chunk Names
output.js  4.99 KiB     {0}  [emitted]  main
Entrypoint main = output.js
chunk {0} output.js (main) 2.64 KiB [entry] [rendered]
    > .\example.js main
 [0] ./example.js 204 bytes {0} [built]
     [used exports unknown]
     entry .\example.js main
 [1] ./loader.js!./file.js 41 bytes {0} [built]
     [used exports unknown]
     cjs require ./loader!./file [0] ./example.js 2:12-38
 [2] (webpack)/node_modules/css-loader!./test.css 199 bytes {0} [built]
     [used exports unknown]
     cjs require ./test.css [0] ./example.js 5:12-33
     cjs require !css-loader!./test.css [0] ./example.js 6:12-45
 [3] (webpack)/node_modules/css-loader/lib/css-base.js 2.21 KiB {0} [built]
     [used exports unknown]
     cjs require ../../node_modules/css-loader/lib/css-base.js [2] (webpack)/node_modules/css-loader!./test.css 1:27-83
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset      Size  Chunks             Chunk Names
output.js  1.18 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 2.64 KiB [entry] [rendered]
    > .\example.js main
  [49] (webpack)/node_modules/css-loader!./test.css 199 bytes {404} [built]
       cjs require ./test.css [275] ./example.js 5:12-33
       cjs require !css-loader!./test.css [275] ./example.js 6:12-45
 [214] (webpack)/node_modules/css-loader/lib/css-base.js 2.21 KiB {404} [built]
       cjs require ../../node_modules/css-loader/lib/css-base.js [49] (webpack)/node_modules/css-loader!./test.css 1:27-83
 [275] ./example.js 204 bytes {404} [built]
       entry .\example.js main
 [324] ./loader.js!./file.js 41 bytes {404} [built]
       cjs require ./loader!./file [275] ./example.js 2:12-38
```
