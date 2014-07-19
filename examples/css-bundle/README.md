
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
				loaders: [
					ExtractTextPlugin.loader({ remove: true }),
					"css-loader"
				]
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
Hash: 954e72d5ec1de4b4dc80
Version: webpack 1.3.2-beta2
Time: 95ms
                               Asset  Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
                           style.css    69          [emitted]  
                           output.js  1809       0  [emitted]  main
chunk    {0} output.js (main) 64 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 23 {0} [built]
    [1] ./style.css 41 {0} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
Child extract-text-webpack-plugin:
    Hash: ac8625c3bf3709b4c609
    Version: webpack 1.3.2-beta2
                                   Asset  Size  Chunks             Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\style.css 163 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 82 {0} [built]
        [1] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:32-54
```

## Minimized (uglify-js, no zip)

```
Hash: 3abfd6ec08d4cc31f089
Version: webpack 1.3.2-beta2
Time: 136ms
                               Asset  Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
                           style.css    61          [emitted]  
                           output.js   240       0  [emitted]  main
chunk    {0} output.js (main) 64 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 23 {0} [built]
    [1] ./style.css 41 {0} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
Child extract-text-webpack-plugin:
    Hash: efab1621ec9e016b9f16
    Version: webpack 1.3.2-beta2
                                   Asset  Size  Chunks             Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\style.css 150 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 69 {0} [built]
        [1] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:24-46
```