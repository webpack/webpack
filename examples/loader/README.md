# example.js

```javascript
// use our loader
console.dir(require("./loader!./file"));

// use built-in css loader
console.dir(require("./test.css")); // default by extension
console.dir(require("!css-loader!./test.css")); // manual
```

# file.js

```javascript
exports.foo = "bar";
```

# loader.js

```javascript
module.exports = function(content) {
	return "exports.answer = 42;\n" + content;
}
```

# test.css

```css
.some-class {
	color: hotpink;
}
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!*****************************!*\
  !*** ./loader.js!./file.js ***!
  \*****************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

exports.answer = 42;
exports.foo = "bar";

/***/ }),
/* 2 */
/*!****************************************************************!*\
  !*** (webpack)/node_modules/css-loader/dist/cjs.js!./test.css ***!
  \****************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__, module, __webpack_exports__ */
/***/ ((module, exports, __webpack_require__) => {

exports = module.exports = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/api.js */ 3)(false);
// Module
exports.push([module.i, ".some-class {\n\tcolor: hotpink;\n}\n", ""]);


/***/ }),
/* 3 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/css-loader/dist/runtime/api.js ***!
  \*************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";


/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
// eslint-disable-next-line func-names
module.exports = function (useSourceMap) {
  var list = []; // return the list of modules as css string

  list.toString = function toString() {
    return this.map(function (item) {
      var content = cssWithMappingToString(item, useSourceMap);

      if (item[2]) {
        return "@media ".concat(item[2], "{").concat(content, "}");
      }

      return content;
    }).join('');
  }; // import a list of modules into the list
  // eslint-disable-next-line func-names


  list.i = function (modules, mediaQuery) {
    if (typeof modules === 'string') {
      // eslint-disable-next-line no-param-reassign
      modules = [[null, modules, '']];
    }

    var alreadyImportedModules = {};

    for (var i = 0; i < this.length; i++) {
      // eslint-disable-next-line prefer-destructuring
      var id = this[i][0];

      if (id != null) {
        alreadyImportedModules[id] = true;
      }
    }

    for (var _i = 0; _i < modules.length; _i++) {
      var item = modules[_i]; // skip already imported module
      // this implementation is not 100% perfect for weird media query combinations
      // when a module is imported multiple times with different media queries.
      // I hope this will never occur (Hey this way we have smaller bundles)

      if (item[0] == null || !alreadyImportedModules[item[0]]) {
        if (mediaQuery && !item[2]) {
          item[2] = mediaQuery;
        } else if (mediaQuery) {
          item[2] = "(".concat(item[2], ") and (").concat(mediaQuery, ")");
        }

        list.push(item);
      }
    }
  };

  return list;
};

function cssWithMappingToString(item, useSourceMap) {
  var content = item[1] || ''; // eslint-disable-next-line prefer-destructuring

  var cssMapping = item[3];

  if (!cssMapping) {
    return content;
  }

  if (useSourceMap && typeof btoa === 'function') {
    var sourceMapping = toComment(cssMapping);
    var sourceURLs = cssMapping.sources.map(function (source) {
      return "/*# sourceURL=".concat(cssMapping.sourceRoot).concat(source, " */");
    });
    return [content].concat(sourceURLs).concat([sourceMapping]).join('\n');
  }

  return [content].join('\n');
} // Adapted from convert-source-map (MIT)


function toComment(sourceMap) {
  // eslint-disable-next-line no-undef
  var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
  var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
  return "/*# ".concat(data, " */");
}

/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
```

</details>

``` js
!function() {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__ */
// use our loader
console.dir(__webpack_require__(/*! ./loader!./file */ 1));

// use built-in css loader
console.dir(__webpack_require__(/*! ./test.css */ 2)); // default by extension
console.dir(__webpack_require__(/*! css-loader!./test.css */ 2)); // manual

}();
/******/ })()
;
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
Version: webpack 5.0.0-beta.6
    Asset      Size
output.js  5.46 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 3.03 KiB [entry] [rendered]
    > ./example.js main
 (webpack)/node_modules/css-loader/dist/cjs.js!./test.css 178 bytes [built]
     [used exports unknown]
     cjs require ./test.css ./example.js 5:12-33
     cjs require !css-loader!./test.css ./example.js 6:12-45
 (webpack)/node_modules/css-loader/dist/runtime/api.js 2.61 KiB [built]
     [used exports unknown]
     cjs require ../../node_modules/css-loader/dist/runtime/api.js (webpack)/node_modules/css-loader/dist/cjs.js!./test.css 1:27-87
 ./example.js 204 bytes [built]
     [used exports unknown]
     entry ./example.js main
 ./loader.js!./file.js 41 bytes [built]
     [used exports unknown]
     cjs require ./loader!./file ./example.js 2:12-38
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset      Size
output.js  1.18 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 3.03 KiB [entry] [rendered]
    > ./example.js main
 (webpack)/node_modules/css-loader/dist/cjs.js!./test.css 178 bytes [built]
     cjs require ./test.css ./example.js 5:12-33
     cjs require !css-loader!./test.css ./example.js 6:12-45
 (webpack)/node_modules/css-loader/dist/runtime/api.js 2.61 KiB [built]
     cjs require ../../node_modules/css-loader/dist/runtime/api.js (webpack)/node_modules/css-loader/dist/cjs.js!./test.css 1:27-87
 ./example.js 204 bytes [built]
     [no exports used]
     entry ./example.js main
 ./loader.js!./file.js 41 bytes [built]
     cjs require ./loader!./file ./example.js 2:12-38
```
