
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

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*******************!*\
  !*** ./style.css ***!
  \*******************/
/***/ function(module, exports) {

	// removed by extract-text-webpack-plugin

/***/ },
/* 1 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! ./style.css */ 0);

/***/ }
/******/ ]);
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
Hash: efccfc86a9d3318458a7
Version: webpack 2.0.6-beta
Time: 745ms
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                           output.js    1.73 kB       0  [emitted]  main
                           style.css   69 bytes       0  [emitted]  main
chunk    {0} output.js, style.css (main) 64 bytes [rendered]
    > main [1] ./example.js 
    [0] ./style.css 41 bytes {0} [built]
        cjs require ./style.css [1] ./example.js 1:0-22
    [1] ./example.js 23 bytes {0} [built]
Child extract-text-webpack-plugin:
                                   Asset       Size  Chunks             Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
    chunk    {0} extract-text-webpack-plugin-output-filename 1.81 kB [rendered]
        > [2] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [1] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 6:58-80
        [2] (webpack)/~/css-loader!./style.css 224 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 6f441b96253266f73216
Version: webpack 2.0.6-beta
Time: 905ms
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                           output.js  247 bytes       0  [emitted]  main
                           style.css   61 bytes       0  [emitted]  main
chunk    {0} output.js, style.css (main) 64 bytes [rendered]
    > main [1] ./example.js 
    [0] ./style.css 41 bytes {0} [built]
        cjs require ./style.css [1] ./example.js 1:0-22
    [1] ./example.js 23 bytes {0} [built]
Child extract-text-webpack-plugin:
                                   Asset       Size  Chunks             Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
    chunk    {0} extract-text-webpack-plugin-output-filename 1.8 kB [rendered]
        > [2] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [1] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 6:50-72
        [2] (webpack)/~/css-loader!./style.css 211 bytes {0} [built]
```