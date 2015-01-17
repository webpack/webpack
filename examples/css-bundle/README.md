
# example.js

``` javascript
require("./style.css");
```

# style.css

``` css
body {
	background: url(image.png);
}
```

# webpack.config.js

``` javascript
var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
	module: {
		loaders: [
			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract("css-loader")
			},
			{ test: /\.png$/, loader: "file-loader" }
		]
	},
	plugins: [
		new ExtractTextPlugin("style.css", { allChunks: true })
	]
};
```

# js/output.js

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

	__webpack_require__(/*! ./style.css */ 1);

/***/ },
/* 1 */
/*!*******************!*\
  !*** ./style.css ***!
  \*******************/
/***/ function(module, exports, __webpack_require__) {

	// removed by extract-text-webpack-plugin

/***/ }
/******/ ])
```

# js/style.css

``` css
body {
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
}
```

# Info

## Uncompressed

```
Hash: 964c893cb950ed2e3340
Version: webpack 1.5.0
Time: 166ms
                               Asset  Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
                           output.js  1809       0  [emitted]  main
                           style.css    69       0  [emitted]  main
chunk    {0} output.js, style.css (main) 64 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 23 {0} [built]
    [1] ./style.css 41 {0} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks             Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\style.css 633 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 200 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./style.css 1:27-101
        [2] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:56-78
```

## Minimized (uglify-js, no zip)

```
Hash: 773f1220b8a1a2d9560d
Version: webpack 1.5.0
Time: 184ms
                               Asset  Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
                           output.js   240       0  [emitted]  main
                           style.css    61       0  [emitted]  main
chunk    {0} output.js, style.css (main) 64 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 23 {0} [built]
    [1] ./style.css 41 {0} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks             Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\style.css 620 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 187 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./style.css 1:27-101
        [2] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:48-70
```