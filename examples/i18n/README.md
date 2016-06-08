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

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
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

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
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
Hash: 8376e07a0433da19dc73e2c5e5181623bc3405eb
Version: webpack 2.1.0-beta.11
Child en:
    Hash: 8376e07a0433da19dc73
    Version: webpack 2.1.0-beta.11
    Time: 51ms
           Asset     Size  Chunks             Chunk Names
    en.output.js  1.71 kB       0  [emitted]  main
    chunk    {0} en.output.js (main) 65 bytes [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 bytes {0} [built]
Child de:
    Hash: e2c5e5181623bc3405eb
    Version: webpack 2.1.0-beta.11
    Time: 42ms
           Asset     Size  Chunks             Chunk Names
    de.output.js  1.71 kB       0  [emitted]  main
    chunk    {0} de.output.js (main) 65 bytes [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 bytes {0} [built] [1 warning]
    
    WARNING in ./example.js
    Missing localization: Missing Text
```

## Minimized (uglify-js, no zip)

```
Hash: 8376e07a0433da19dc73e2c5e5181623bc3405eb
Version: webpack 2.1.0-beta.11
Child en:
    Hash: 8376e07a0433da19dc73
    Version: webpack 2.1.0-beta.11
    Time: 124ms
           Asset       Size  Chunks             Chunk Names
    en.output.js  296 bytes       0  [emitted]  main
    chunk    {0} en.output.js (main) 65 bytes [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 bytes {0} [built]
Child de:
    Hash: e2c5e5181623bc3405eb
    Version: webpack 2.1.0-beta.11
    Time: 113ms
           Asset       Size  Chunks             Chunk Names
    de.output.js  295 bytes       0  [emitted]  main
    chunk    {0} de.output.js (main) 65 bytes [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 bytes {0} [built] [1 warning]
    
    WARNING in ./example.js
    Missing localization: Missing Text
```