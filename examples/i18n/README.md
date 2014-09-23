This example uses the I18nPlugin in combination with the multi-compiler feature.

The `webpack.config.js` exports an array of all config combinations that should be compiled. In this example two different parameter for the I18nPlugin are used.

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
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
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
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
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
/******/ ])
```

# js/en.output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
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
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
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
/******/ ])
```

# Info

## Uncompressed

```
Hash: 11d340dd3b946937d5b60050649a7d8d87a49cc1
Version: webpack 1.4.3

WARNING in (de) ./example.js
Missing localization: Missing Text
Child en:
    Hash: 11d340dd3b946937d5b6
    Version: webpack 1.4.3
    Time: 52ms
           Asset  Size  Chunks             Chunk Names
    en.output.js  1634       0  [emitted]  main
    chunk    {0} en.output.js (main) 65 [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 {0} [built]
Child de:
    Hash: 0050649a7d8d87a49cc1
    Version: webpack 1.4.3
    Time: 39ms
           Asset  Size  Chunks             Chunk Names
    de.output.js  1633       0  [emitted]  main
    chunk    {0} de.output.js (main) 65 [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 {0} [built] [1 warning]
    
    WARNING in ./example.js
    Missing localization: Missing Text
```

## Minimized (uglify-js, no zip)

```
Hash: 502a1d019f9df5485748bfc253e0ca08f68d64cf
Version: webpack 1.4.3

WARNING in (de) ./example.js
Missing localization: Missing Text
Child en:
    Hash: 502a1d019f9df5485748
    Version: webpack 1.4.3
    Time: 104ms
           Asset  Size  Chunks             Chunk Names
    en.output.js   272       0  [emitted]  main
    chunk    {0} en.output.js (main) 65 [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 {0} [built]
Child de:
    Hash: bfc253e0ca08f68d64cf
    Version: webpack 1.4.3
    Time: 96ms
           Asset  Size  Chunks             Chunk Names
    de.output.js   271       0  [emitted]  main
    chunk    {0} de.output.js (main) 65 [rendered]
        > main [0] ./example.js 
        [0] ./example.js 65 {0} [built] [1 warning]
    
    WARNING in ./example.js
    Missing localization: Missing Text
```