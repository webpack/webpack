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
/*! default exports */
/*! export answer [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! export foo [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

exports.answer = 42;
exports.foo = "bar";

/***/ }),
/* 2 */
/*!************************************************************!*\
  !*** ../../node_modules/css-loader/dist/cjs.js!./test.css ***!
  \************************************************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_exports__, module, __webpack_require__, module.id */
/***/ ((module, exports, __webpack_require__) => {

// Imports
var ___CSS_LOADER_API_IMPORT___ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/api.js */ 3);
exports = ___CSS_LOADER_API_IMPORT___(false);
// Module
exports.push([module.id, ".some-class {\n\tcolor: hotpink;\n}\n", ""]);
// Exports
module.exports = exports;


/***/ }),
/* 3 */
/*!*********************************************************!*\
  !*** ../../node_modules/css-loader/dist/runtime/api.js ***!
  \*********************************************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
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
        return "@media ".concat(item[2], " {").concat(content, "}");
      }

      return content;
    }).join('');
  }; // import a list of modules into the list
  // eslint-disable-next-line func-names


  list.i = function (modules, mediaQuery, dedupe) {
    if (typeof modules === 'string') {
      // eslint-disable-next-line no-param-reassign
      modules = [[null, modules, '']];
    }

    var alreadyImportedModules = {};

    if (dedupe) {
      for (var i = 0; i < this.length; i++) {
        // eslint-disable-next-line prefer-destructuring
        var id = this[i][0];

        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }

    for (var _i = 0; _i < modules.length; _i++) {
      var item = [].concat(modules[_i]);

      if (dedupe && alreadyImportedModules[item[0]]) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (mediaQuery) {
        if (!item[2]) {
          item[2] = mediaQuery;
        } else {
          item[2] = "".concat(mediaQuery, " and ").concat(item[2]);
        }
      }

      list.push(item);
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
      return "/*# sourceURL=".concat(cssMapping.sourceRoot || '').concat(source, " */");
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
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
```

</details>

``` js
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [unused] */
/*! runtime requirements: __webpack_require__ */
// use our loader
console.dir(__webpack_require__(/*! ./loader!./file */ 1));

// use built-in css loader
console.dir(__webpack_require__(/*! ./test.css */ 2)); // default by extension
console.dir(__webpack_require__(/*! !css-loader!./test.css */ 2)); // manual

})();

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
Version: webpack 5.0.0-beta.16
    Asset      Size
output.js  5.66 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 2.96 KiB [entry] [rendered]
    > ./example.js main
 ../../node_modules/css-loader/dist/cjs.js!./test.css 272 bytes [built]
     cjs require ./test.css ./example.js 5:12-33
     cjs require !css-loader!./test.css ./example.js 6:12-45
     cjs self exports reference ../../node_modules/css-loader/dist/cjs.js!./test.css 3:0-7
     cjs self exports reference ../../node_modules/css-loader/dist/cjs.js!./test.css 5:0-7
     cjs self exports reference ../../node_modules/css-loader/dist/cjs.js!./test.css 7:0-14
     cjs self exports reference ../../node_modules/css-loader/dist/cjs.js!./test.css 7:17-24
 ../../node_modules/css-loader/dist/runtime/api.js 2.46 KiB [built]
     cjs require ../../node_modules/css-loader/dist/runtime/api.js ../../node_modules/css-loader/dist/cjs.js!./test.css 2:34-94
     cjs self exports reference ../../node_modules/css-loader/dist/runtime/api.js 9:0-14
 ./example.js 205 bytes [built]
     [no exports used]
     entry ./example.js main
 ./loader.js!./file.js 41 bytes [built]
     [exports: answer, foo]
     cjs require ./loader!./file ./example.js 2:12-38
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
    Asset      Size
output.js  1.18 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 2.96 KiB [entry] [rendered]
    > ./example.js main
 ../../node_modules/css-loader/dist/cjs.js!./test.css 272 bytes [built]
     cjs require ./test.css ./example.js 5:12-33
     cjs require !css-loader!./test.css ./example.js 6:12-45
     cjs self exports reference ../../node_modules/css-loader/dist/cjs.js!./test.css 3:0-7
     cjs self exports reference ../../node_modules/css-loader/dist/cjs.js!./test.css 5:0-7
     cjs self exports reference ../../node_modules/css-loader/dist/cjs.js!./test.css 7:0-14
     cjs self exports reference ../../node_modules/css-loader/dist/cjs.js!./test.css 7:17-24
 ../../node_modules/css-loader/dist/runtime/api.js 2.46 KiB [built]
     cjs require ../../node_modules/css-loader/dist/runtime/api.js ../../node_modules/css-loader/dist/cjs.js!./test.css 2:34-94
     cjs self exports reference ../../node_modules/css-loader/dist/runtime/api.js 9:0-14
 ./example.js 205 bytes [built]
     [no exports used]
     entry ./example.js main
 ./loader.js!./file.js 41 bytes [built]
     [exports: answer, foo]
     cjs require ./loader!./file ./example.js 2:12-38
```
