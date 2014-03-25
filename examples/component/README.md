
# example.js

``` javascript
console.log(require("a-component"));
console.log(require("b-component"));
console.log(require("c-component"));

```

# webpack.config.js

``` javascript
var ComponentPlugin = require("component-webpack-plugin");
module.exports = {
	module: {
		loaders: [
			{ test: /\.png$/, loader: "url-loader?limit=10000&minetype=image/png" }
		]
	},
	plugins: [
		new ComponentPlugin()
	]
}
```

# component.json

``` javascript
{
	"name": "component-webpack-example",
	"repo": "webpack/webpack",
	"version": "0.0.1",
	"dependencies": {
		"webpack/a-component": "*",
		"webpack/c-component": "*"
	},
	"local": [
		"b-component"
	],
	"paths": [
		"my-component"
	],
	"scripts": ["example.js"],
	"license": "MIT"
}
```

# component/webpack-a-component/component.json

``` javascript
{
	"name": "a-component",
	"repo": "webpack/a-component",
	"version": "0.0.1",
	"scripts": ["index.js"],
	"styles": ["style.css"],
	"images": ["image.png"],
	"license": "MIT"
}
```

# component/webpack-a-component/style.css

``` css
.a-component {
	display: inline;
	background: url(image.png) repeat;
}
```

# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
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

	console.log(__webpack_require__(/*! a-component */ 1));
	console.log(__webpack_require__(/*! b-component */ 5));
	console.log(__webpack_require__(/*! c-component */ 3));


/***/ },
/* 1 */
/*!***************************************************!*\
  !*** ./component/webpack-a-component (component) ***!
  \***************************************************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./style.css */ 9);
	module.exports = __webpack_require__(/*! ./index.js */ 2);

/***/ },
/* 2 */
/*!************************************************!*\
  !*** ./component/webpack-a-component/index.js ***!
  \************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "A";

/***/ },
/* 3 */
/*!***************************************************!*\
  !*** ./component/webpack-c-component (component) ***!
  \***************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(/*! ./main.js */ 4);

/***/ },
/* 4 */
/*!***********************************************!*\
  !*** ./component/webpack-c-component/main.js ***!
  \***********************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "C" + __webpack_require__(/*! a-component */ 1);

/***/ },
/* 5 */
/*!**********************************************!*\
  !*** ./my-component/b-component (component) ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(/*! ./main.js */ 6);

/***/ },
/* 6 */
/*!******************************************!*\
  !*** ./my-component/b-component/main.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "B";

/***/ },
/* 7 */
/*!***************************************************************************************************!*\
  !*** (webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css ***!
  \***************************************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports =
		".a-component {\r\n\tdisplay: inline;\r\n\tbackground: url("+__webpack_require__(/*! ./image.png */ 10)+") repeat;\r\n}";

/***/ },
/* 8 */
/*!***********************************************************************!*\
  !*** (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js ***!
  \***********************************************************************/
/***/ function(module, exports, __webpack_require__) {

	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	module.exports = function(cssCode) {
		var styleElement = document.createElement("style");
		styleElement.type = "text/css";
		if (styleElement.styleSheet) {
			styleElement.styleSheet.cssText = cssCode;
		} else {
			styleElement.appendChild(document.createTextNode(cssCode));
		}
		document.getElementsByTagName("head")[0].appendChild(styleElement);
	}

/***/ },
/* 9 */
/*!*******************************************************************************************************************************************************!*\
  !*** (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css ***!
  \*******************************************************************************************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag
	__webpack_require__(/*! (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js */ 8)
		// The css code:
		(__webpack_require__(/*! !(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css */ 7))

/***/ },
/* 10 */
/*!*************************************************!*\
  !*** ./component/webpack-a-component/image.png ***!
  \*************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAOCAIAAABGj2DjAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACNSURBVChTlZC7FQAREEWFylCKEoS6EalBKNWZEoR2zrLrWbO/Gzjjc9/MIep/upNS8t63+pXukCAE33ON4/vgdo3j+6zvkNuLBybn409MDo4UY9Ra09q2CD9bCIFkQkpZSumnB8PBwZRSzbHWthNkODiYc45qY8zZBBP52Yicc692MPHqfPm6q4N5PLVunPxwQxP50QkAAAAASUVORK5CYII="

/***/ }
/******/ ])
```

# Info

## Uncompressed

```
Hash: 56ea413a33d8cc459307
Version: webpack 1.1.0
Time: 166ms
    Asset  Size  Chunks             Chunk Names
output.js  6397       0  [emitted]  main       
chunk    {0} output.js (main) 2028 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 114 {0} [built]
    [1] ./component/webpack-a-component (component) 318 {0} [built]
        cjs require a-component [0] ./example.js 1:12-34
        cjs require a-component [4] ./component/webpack-c-component/main.js 1:23-45
    [2] ./component/webpack-a-component/index.js 21 {0} [built]
        cjs require ./index.js [1] ./component/webpack-a-component (component) 2:17-38
    [3] ./component/webpack-c-component (component) 38 {0} [built]
        cjs require c-component [0] ./example.js 3:12-34
    [4] ./component/webpack-c-component/main.js 46 {0} [built]
        cjs require ./main.js [3] ./component/webpack-c-component (component) 1:17-37
    [5] ./my-component/b-component (component) 38 {0} [built]
        cjs require b-component [0] ./example.js 2:12-34
    [6] ./my-component/b-component/main.js 21 {0} [built]
        cjs require ./main.js [5] ./my-component/b-component (component) 1:17-37
    [7] (webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 119 {0} [built]
        cjs require !!(webpack)\node_modules\component-webpack-plugin\node_modules\css-loader\index.js!.\component\webpack-a-component\style.css [9] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 4:2-254
    [8] (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js 458 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\addStyle.js [9] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 2:0-142
    [9] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 482 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\index.js!(webpack)\node_modules\component-webpack-plugin\node_modules\css-loader\index.js!./style.css [1] ./component/webpack-a-component (component) 1:0-277
   [10] ./component/webpack-a-component/image.png 373 {0} [built]
        cjs require ./image.png [7] (webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 2:62-84
```

## Minimized (uglify-js, no zip)

```
Hash: 154938d8f317c38b2249
Version: webpack 1.1.0
Time: 262ms
    Asset  Size  Chunks             Chunk Names
output.js  1185       0  [emitted]  main       
chunk    {0} output.js (main) 2001 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 114 {0} [built]
    [1] ./component/webpack-a-component (component) 318 {0} [built]
        cjs require a-component [0] ./example.js 1:12-34
        cjs require a-component [4] ./component/webpack-c-component/main.js 1:23-45
    [2] ./component/webpack-a-component/index.js 21 {0} [built]
        cjs require ./index.js [1] ./component/webpack-a-component (component) 2:17-38
    [3] ./component/webpack-c-component (component) 38 {0} [built]
        cjs require c-component [0] ./example.js 3:12-34
    [4] ./component/webpack-c-component/main.js 46 {0} [built]
        cjs require ./main.js [3] ./component/webpack-c-component (component) 1:17-37
    [5] ./my-component/b-component (component) 38 {0} [built]
        cjs require b-component [0] ./example.js 2:12-34
    [6] ./my-component/b-component/main.js 21 {0} [built]
        cjs require ./main.js [5] ./my-component/b-component (component) 1:17-37
    [7] (webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 92 {0} [built]
        cjs require !!(webpack)\node_modules\component-webpack-plugin\node_modules\css-loader\index.js!.\component\webpack-a-component\style.css [9] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 4:2-254
    [8] (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js 458 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\addStyle.js [9] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 2:0-142
    [9] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 482 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\index.js!(webpack)\node_modules\component-webpack-plugin\node_modules\css-loader\index.js!./style.css [1] ./component/webpack-a-component (component) 1:0-277
   [10] ./component/webpack-a-component/image.png 373 {0} [built]
        cjs require ./image.png [7] (webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 2:47-69
```