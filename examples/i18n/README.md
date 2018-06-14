This example uses the I18nPlugin in combination with the multi-compiler feature.

The `webpack.config.js` exports an array of all config combinations that should be compiled. In this example two different parameters for the I18nPlugin are used.

The I18nPlugin replaces every occurrence of the i18n function `__(...)` with a const string. i. e. `__("Hello World")` with `"Hello World"` resp. `"Hallo Welt"`.


# example.js

``` javascript
console.log(__("Hello World"));
console.log(__("Missing Text"));
```

# webpack.config.js

``` javascript
var path = require("path");
var I18nPlugin = require("i18n-webpack-plugin");
var languages = {
	en: null,
	de: require("./de.json")
};
module.exports = Object.keys(languages).map(function(language) {
	return {
		name: language,
		// mode: "development || "production",
		entry: "./example",
		output: {
			path: path.join(__dirname, "dist"),
			filename: language + ".output.js"
		},
		plugins: [new I18nPlugin(languages[language])]
	};
});
```

# de.json

``` javascript
{
	"Hello World": "Hallo Welt"
}
```

# dist/de.output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
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
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
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
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
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
/***/ (function(module, exports, __webpack_require__) {

console.log("Hallo Welt");
console.log("Missing Text");

/***/ })
/******/ ]);
```

# dist/en.output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
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
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
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
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

console.log("Hello World");
console.log("Missing Text");

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
Child en:
    Hash: 0a1b2c3d4e5f6a7b8c9d
           Asset     Size  Chunks             Chunk Names
    en.output.js  2.8 KiB       0  [emitted]  main
    Entrypoint main = en.output.js
    chunk    {0} en.output.js (main) 65 bytes [entry] [rendered]
        > ./example main
     [0] ./example.js 65 bytes {0} [built]
         single entry ./example  main
Child de:
    Hash: 0a1b2c3d4e5f6a7b8c9d
           Asset     Size  Chunks             Chunk Names
    de.output.js  2.8 KiB       0  [emitted]  main
    Entrypoint main = de.output.js
    chunk    {0} de.output.js (main) 65 bytes [entry] [rendered]
        > ./example main
     [0] ./example.js 65 bytes {0} [built] [1 warning]
         single entry ./example  main
    
    WARNING in ./example.js
    Missing localization: Missing Text
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
Child en:
    Hash: 0a1b2c3d4e5f6a7b8c9d
           Asset       Size  Chunks             Chunk Names
    en.output.js  606 bytes       0  [emitted]  main
    Entrypoint main = en.output.js
    chunk    {0} en.output.js (main) 65 bytes [entry] [rendered]
        > ./example main
     [0] ./example.js 65 bytes {0} [built]
         single entry ./example  main
Child de:
    Hash: 0a1b2c3d4e5f6a7b8c9d
           Asset       Size  Chunks             Chunk Names
    de.output.js  605 bytes       0  [emitted]  main
    Entrypoint main = de.output.js
    chunk    {0} de.output.js (main) 65 bytes [entry] [rendered]
        > ./example main
     [0] ./example.js 65 bytes {0} [built] [1 warning]
         single entry ./example  main
    
    WARNING in ./example.js
    Missing localization: Missing Text
```