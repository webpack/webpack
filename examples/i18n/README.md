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
	"en": null,
	"de": require("./de.json")
};
module.exports = Object.keys(languages).map(function(language) {
	return {
		name: language,
		entry: "./example",
		output: {
			path: path.join(__dirname, "js"),
			filename: language + ".output.js"
		},
		plugins: [
			new I18nPlugin(
				languages[language]
			)
		]
	};
});
```

# de.json

``` javascript
{
	"Hello World": "Hallo Welt"
}
```

# js/de.output.js

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
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

console.log("Hallo Welt");
console.log("Missing Text");

/***/ }
/******/ ]);
```

# js/en.output.js

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
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

console.log("Hello World");
console.log("Missing Text");

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: b61d16621736c97f557e52b4d8e68140f1345ef8
Version: webpack 2.2.0-rc.2
Child en:
    Hash: b61d16621736c97f557e
    Version: webpack 2.2.0-rc.2
           Asset     Size  Chunks             Chunk Names
    en.output.js  2.72 kB       0  [emitted]  main
    Entrypoint main = en.output.js
    chunk    {0} en.output.js (main) 65 bytes [entry] [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 bytes {0} [built]
Child de:
    Hash: 52b4d8e68140f1345ef8
    Version: webpack 2.2.0-rc.2
           Asset     Size  Chunks             Chunk Names
    de.output.js  2.72 kB       0  [emitted]  main
    Entrypoint main = de.output.js
    chunk    {0} de.output.js (main) 65 bytes [entry] [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 bytes {0} [built] [1 warning]
    
    WARNING in ./example.js
    Missing localization: Missing Text
```

## Minimized (uglify-js, no zip)

```
Hash: b61d16621736c97f557e52b4d8e68140f1345ef8
Version: webpack 2.2.0-rc.2
Child en:
    Hash: b61d16621736c97f557e
    Version: webpack 2.2.0-rc.2
           Asset       Size  Chunks             Chunk Names
    en.output.js  571 bytes       0  [emitted]  main
    Entrypoint main = en.output.js
    chunk    {0} en.output.js (main) 65 bytes [entry] [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 bytes {0} [built]
Child de:
    Hash: 52b4d8e68140f1345ef8
    Version: webpack 2.2.0-rc.2
           Asset       Size  Chunks             Chunk Names
    de.output.js  570 bytes       0  [emitted]  main
    Entrypoint main = de.output.js
    chunk    {0} de.output.js (main) 65 bytes [entry] [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 bytes {0} [built] [1 warning]
    
    WARNING in ./example.js
    Missing localization: Missing Text
```