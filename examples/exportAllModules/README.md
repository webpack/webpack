Demonstrates the usage of the `output.exportAllModules` configuration. 

Two files; `a.js` and `b.js` are bundled in one entry to `bundle.js`.

The configuration option makes sure that all externals from all modules are exported from the bundle.

# a.js

``` javascript
exports.A = "a"
```

# b.js

``` javascript
exports.B = "b"
```
# webpack.config.js

``` javascript
var path = require("path");
module.exports = {
	entry: {
		bundle: ["./a", "./b"]
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js",
		exportAllModules: true
	}
}
```

# js/bundle.js

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
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

exports.A = "a"

/***/ },
/* 1 */
/***/ function(module, exports) {

exports.B = "b"

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

var export0 = __webpack_require__(0)
for(var i in Object.keys(export0)) {
	module.exports[Object.keys(export0)[i]] = export0[Object.keys(export0)[i]]
};
var export1 = __webpack_require__(1)
for(var i in Object.keys(export1)) {
	module.exports[Object.keys(export1)[i]] = export1[Object.keys(export1)[i]]
};


/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: e56f95c1a381be3b34ad
Version: webpack 2.1.0-beta.20
Time: 53ms
    Asset    Size  Chunks             Chunk Names
bundle.js  2.9 kB       0  [emitted]  bundle
   [0] ./a.js 15 bytes {0} [built]
   [1] ./b.js 15 bytes {0} [built]
   [2] multi bundle 40 bytes {0} [built]
```