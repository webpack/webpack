# Dll scope hoisting

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

This example demonstrates the usage of `entryOnly` option in combination with module concatenation / scope hoisting.

By default `DllPlugin` exposes all the modules referenced in the bundle as separate entries.
The manifest includes the individual modules available for use by `DllReferencePlugin`.
Since all the modules are being accounted for, this prevents advanced optimizations such as tree shaking.

The `entryOnly` flag tells `DllPlugin` to only expose the modules which are configured as entry points;
this affects both the manifest and the resulting bundle.
Since some of the modules are no longer included in the "public contract" of the Dll,
they can be optimized by merging (concatenating) multiple modules together or removing unused code.
This allows to take advantage of tree shaking (scope hoisting and dead code removal) optimizations.

In this example only `example.js` module is exposed, since it's the entry point.
Modules `a.js` and `b.js` are concatenated into `example.js`.
Module `cjs.js` is left as is, since it's in CommonJS format.

The manifest includes `example.js` as the only exposed module and lists the exports as `["a","b","c"]`
from the corresponding modules `a.js`, `b.js` and `cjs.js`. None of the other modules are exposed.

Also see [tree shaking](https://github.com/webpack/webpack/tree/master/examples/harmony-unused)
and [scope hoisting example](https://github.com/webpack/webpack/tree/master/examples/scope-hoisting).


# example.js

``` javascript
export { a, b } from "./a";
export { c } from "./cjs";
```

# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");

module.exports = {
	// mode: "development" || "production",
	entry: {
		dll: ["./example"]
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js",
		library: "[name]_[hash]"
	},
	optimization: {
		concatenateModules: true // this is enabled by default in production mode
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "dist", "[name]-manifest.json"),
			name: "[name]_[hash]",
			entryOnly: true
		})
	]
};
```

# dist/dll.js

``` javascript
var dll_fab903421b38e3c46fd9 =
```
<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` js
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
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
```

</details>

``` js
/******/ ([
/* 0 */
/*!***************!*\
  !*** dll dll ***!
  \***************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, module */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!********************************!*\
  !*** ./example.js + 2 modules ***!
  \********************************/
/*! exports provided: a, b, c */
/*! runtime requirements: __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.t, __webpack_require__.n, __webpack_require__ */
/*! ModuleConcatenation bailout: Cannot concat with ./cjs.js (<- Module is not an ECMAScript module) */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";

// CONCATENATED MODULE: ./b.js
// module b
function b() {
	return "b";
}

// CONCATENATED MODULE: ./a.js
// module a
var a = "a";


// EXTERNAL MODULE: ./cjs.js
var cjs = __webpack_require__(2);

// CONCATENATED MODULE: ./example.js
/* concated harmony reexport */ __webpack_require__.d(__webpack_exports__, "a", function() { return a; });
/* concated harmony reexport */ __webpack_require__.d(__webpack_exports__, "b", function() { return b; });
/* concated harmony reexport */ __webpack_require__.d(__webpack_exports__, "c", function() { return cjs["c"]; });




/***/ }),
/* 2 */
/*!****************!*\
  !*** ./cjs.js ***!
  \****************/
/*! no static exports found */
/*! runtime requirements: __webpack_exports__ */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(__unusedmodule, exports) {

// module cjs (commonjs)
exports.c = "c";


/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getter */
/******/ 	!function() {
/******/ 		// define getter function for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = function(exports, name, getter) {
/******/ 			if(!hasOwnProperty.call(exports, name)) {
/******/ 				Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	!function() {
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 			if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 			return ns;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function getDefault() { return module['default']; } :
/******/ 				function getModuleExports() { return module; };
/******/ 			__webpack_require__.d(getter, 'a', getter);
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# dist/dll-manifest.json

``` javascript
{"name":"dll_fab903421b38e3c46fd9","content":{"./example.js":{"id":1,"buildMeta":{"exportsType":"namespace","providedExports":["a","b","c"]}}}}
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
 Asset      Size  Chunks             Chunk Names
dll.js  5.45 KiB     {0}  [emitted]  dll
Entrypoint dll = dll.js
chunk {0} dll.js (dll) 216 bytes (javascript) 1.57 KiB (runtime) [entry] [rendered]
    > dll
 [0] dll dll 12 bytes {0} [built]
     [used exports unknown]
     dll entry
 [1] ./example.js + 2 modules 162 bytes {0} [built]
     [exports: a, b, c]
     [used exports unknown]
     entry ./example [0] dll dll dll[0]
 [2] ./cjs.js 42 bytes {0} [built]
     [used exports unknown]
     harmony side effect evaluation ./cjs [1] ./example.js + 2 modules 2:0-26
     harmony export imported specifier ./cjs [1] ./example.js + 2 modules 2:0-26
     + 4 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
 Asset      Size  Chunks             Chunk Names
dll.js  1.15 KiB   {144}  [emitted]  dll
Entrypoint dll = dll.js
chunk {144} dll.js (dll) 216 bytes (javascript) 1.57 KiB (runtime) [entry] [rendered]
    > dll
 [348] ./example.js + 2 modules 162 bytes {144} [built]
       [exports: a, b, c]
       entry ./example [980] dll dll dll[0]
 [480] ./cjs.js 42 bytes {144} [built]
       [only some exports used: c]
       harmony side effect evaluation ./cjs [348] ./example.js + 2 modules 2:0-26
       harmony export imported specifier ./cjs [348] ./example.js + 2 modules 2:0-26
 [980] dll dll 12 bytes {144} [built]
       dll entry
     + 4 hidden chunk modules
```
