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

```javascript
export { a, b } from "./a";
export { c } from "./cjs";
```

# webpack.config.js

```javascript
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
		library: "[name]_[fullhash]"
	},
	optimization: {
		concatenateModules: true // this is enabled by default in production mode
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "dist", "[name]-manifest.json"),
			name: "[name]_[fullhash]",
			entryOnly: true
		})
	]
};
```

# dist/dll.js

```javascript
var dll_c2667a48ccf45ebf665f =
/******/ ((modules, runtime) => { // webpackBootstrap
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
/******/ 		modules[moduleId](module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!***************!*\
  !*** dll dll ***!
  \***************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__, module */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ ((module, __unusedexports, __webpack_require__) => {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!********************************!*\
  !*** ./example.js + 2 modules ***!
  \********************************/
/*! export a [provided] [no usage info] [missing usage info prevents renaming] */
/*! export b [provided] [no usage info] [missing usage info prevents renaming] */
/*! export c [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.t, __webpack_require__.n, __webpack_require__ */
/*! ModuleConcatenation bailout: Cannot concat with ./cjs.js (<- Module is not an ECMAScript module) */
/***/ ((__unusedmodule, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);

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
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": () => /* concated reexport __WEBPACK_MODULE_REFERENCE__1_5b2261225d_asiSafe__ */ a,
/* harmony export */   "b": () => /* concated reexport __WEBPACK_MODULE_REFERENCE__1_5b2262225d_asiSafe__ */ b,
/* harmony export */   "c": () => /* concated reexport __WEBPACK_MODULE_REFERENCE__2_5b2263225d_asiSafe__ */ cjs.c
/* harmony export */ });




/***/ }),
/* 2 */
/*!****************!*\
  !*** ./cjs.js ***!
  \****************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_exports__ */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ ((__unusedmodule, exports) => {

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
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(hasOwnProperty.call(definition, key) && !hasOwnProperty.call(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
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
/******/ 			if(mode & 2 && typeof value != 'string') {
/******/ 				var def = {};
/******/ 				for(const key in value) def[key] = () => value[key];
/******/ 				__webpack_require__.d(ns, def);
/******/ 			}
/******/ 			return ns;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# dist/dll-manifest.json

```javascript
{"name":"dll_c2667a48ccf45ebf665f","content":{"./example.js":{"id":1,"buildMeta":{"exportsType":"namespace","async":false},"exports":["a","b","c"]}}}
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.30
 Asset      Size  Chunks             Chunk Names
dll.js  6.08 KiB     {0}  [emitted]  dll
Entrypoint dll = dll.js
chunk {0} dll.js (dll) 216 bytes (javascript) 1.58 KiB (runtime) [entry] [rendered]
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
     harmony side effect evaluation ./cjs [1] ./example.js + 2 modules ./example.js 2:0-26
     harmony export imported specifier ./cjs [1] ./example.js + 2 modules ./example.js 2:0-26
     + 4 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.30
 Asset      Size  Chunks             Chunk Names
dll.js  1.01 KiB   {874}  [emitted]  dll
Entrypoint dll = dll.js
chunk {874} dll.js (dll) 216 bytes (javascript) 1.58 KiB (runtime) [entry] [rendered]
    > dll
 [312] dll dll 12 bytes {874} [built]
       dll entry
 [489] ./cjs.js 42 bytes {874} [built]
       [only some exports used: c]
       harmony side effect evaluation ./cjs [680] ./example.js + 2 modules ./example.js 2:0-26
       harmony export imported specifier ./cjs [680] ./example.js + 2 modules ./example.js 2:0-26
 [680] ./example.js + 2 modules 162 bytes {874} [built]
       [exports: a, b, c]
       entry ./example [312] dll dll dll[0]
     + 4 hidden chunk modules
```
