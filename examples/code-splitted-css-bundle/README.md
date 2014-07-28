
# example.js

``` javascript
require("./style.css");
require(["./chunk"]);
```

# style.css

``` css
body {
	background: url(image.png);
}
```

# chunk.js

``` javascript
require("./style2.css");
```

# style2.css

``` css
.xyz {
	background: url(image2.png);
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
				loader: ExtractTextPlugin.extract("style-loader", "css-loader")
			},
			{ test: /\.png$/, loader: "file-loader" }
		]
	},
	plugins: [
		new ExtractTextPlugin("style.css")
	]
};
```

# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, callbacks = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, __webpack_require__);
/******/
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		1:0
/******/ 	};
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
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, __webpack_require__);
/******/
/******/ 		// an array means "currently loading".
/******/ 		if(installedChunks[chunkId] !== undefined) {
/******/ 			installedChunks[chunkId].push(callback);
/******/ 		} else {
/******/ 			// start chunk loading
/******/ 			installedChunks[chunkId] = [callback];
/******/ 			var head = document.getElementsByTagName('head')[0];
/******/ 			var script = document.createElement('script');
/******/ 			script.type = 'text/javascript';
/******/ 			script.charset = 'utf-8';
/******/ 			script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};
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
	__webpack_require__.e/* require */(0, function(__webpack_require__) {[__webpack_require__(/*! ./chunk */ 3)];});


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

# js/0.output.js

``` javascript
webpackJsonp([0],[
/* 0 */,
/* 1 */,
/* 2 */
/*!********************!*\
  !*** ./style2.css ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag
	var dispose = __webpack_require__(/*! (webpack)/~/style-loader/addStyle.js */ 6)
		// The css code:
		(__webpack_require__(/*! !(webpack)/~/css-loader!./style2.css */ 4))
	if(false) {
		module.hot.accept();
		module.hot.dispose(dispose);
	}

/***/ },
/* 3 */
/*!******************!*\
  !*** ./chunk.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! ./style2.css */ 2);


/***/ },
/* 4 */
/*!*******************************************!*\
  !*** (webpack)/~/css-loader!./style2.css ***!
  \*******************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports =
		".xyz {\r\n\tbackground: url("+__webpack_require__(/*! ./image2.png */ 5)+");\r\n}\r\n";

/***/ },
/* 5 */
/*!********************!*\
  !*** ./image2.png ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__.p + "ce21cbdd9b894e6af794813eb3fdaf60.png"

/***/ }
]);
```

# js/style.css

``` javascript
body {
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
}
```

# Info

## Uncompressed

```
Hash: 16bad7466ac50f139f21
Version: webpack 1.3.2-beta8
Time: 128ms
                               Asset  Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
                           style.css    71          [emitted]  
                         0.output.js  1252       0  [emitted]  
                           output.js  4080       1  [emitted]  main
chunk    {0} 0.output.js 650 {1} [rendered]
    > [0] ./example.js 2:0-20
    [2] ./style2.css 456 {0} [built]
        cjs require ./style2.css [3] ./chunk.js 1:0-23
    [3] ./chunk.js 26 {0} [built]
        amd require ./chunk [0] ./example.js 2:0-20
    [4] (webpack)/~/css-loader!./style2.css 87 {0} [built]
        cjs require !!(webpack)\node_modules\css-loader\index.js!.\style2.css [2] ./style2.css 4:2-188
    [5] ./image2.png 81 {0} [built]
        cjs require ./image2.png [4] (webpack)/~/css-loader!./style2.css 2:32-55
chunk    {1} output.js (main) 89 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 48 {1} [built]
    [1] ./style.css 41 {1} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks       Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\style.css 167 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 86 {0} [built]
        [1] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:32-54
```

## Minimized (uglify-js, no zip)

```
Hash: a1cb30e2febe8a9ad8eb
Version: webpack 1.3.2-beta8
Time: 209ms
                               Asset  Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
                           style.css    61          [emitted]  
                         0.output.js   202       0  [emitted]  
                           output.js   749       1  [emitted]  main
chunk    {0} 0.output.js 633 {1} [rendered]
    > [0] ./example.js 2:0-20
    [2] ./style2.css 456 {0} [built]
        cjs require ./style2.css [3] ./chunk.js 1:0-23
    [3] ./chunk.js 26 {0} [built]
        amd require ./chunk [0] ./example.js 2:0-20
    [4] (webpack)/~/css-loader!./style2.css 70 {0} [built]
        cjs require !!(webpack)\node_modules\css-loader\index.js!.\style2.css [2] ./style2.css 4:2-188
    [5] ./image2.png 81 {0} [built]
        cjs require ./image2.png [4] (webpack)/~/css-loader!./style2.css 2:24-47
chunk    {1} output.js (main) 89 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 48 {1} [built]
    [1] ./style.css 41 {1} [built]
        cjs require ./style.css [0] ./example.js 1:0-22

WARNING in 0.output.js from UglifyJs
Condition always false [(webpack)/~/extract-text-webpack-plugin/loader.js?{"omit":1,"extract":true,"remove":true}!(webpack)/~/style-loader!(webpack)/~/css-loader!./style2.css:5,0]
Dropping unreachable code [(webpack)/~/extract-text-webpack-plugin/loader.js?{"omit":1,"extract":true,"remove":true}!(webpack)/~/style-loader!(webpack)/~/css-loader!./style2.css:6,0]
Side effects in initialization of unused variable dispose [(webpack)/~/extract-text-webpack-plugin/loader.js?{"omit":1,"extract":true,"remove":true}!(webpack)/~/style-loader!(webpack)/~/css-loader!./style2.css:2,0]
Child extract-text-webpack-plugin:
                                   Asset  Size  Chunks       Chunk Names
    ce21cbdd9b894e6af794813eb3fdaf60.png   119               
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)\node_modules\css-loader\index.js!.\style.css 150 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 69 {0} [built]
        [1] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:24-46
```