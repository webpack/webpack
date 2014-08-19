This example demonstrates the usage of [component](https://github.com/component/component) built with webpack.

Components declare scripts and styles in a special `component.json` file. This file is handled by the plugin. In addition to that there is a different resolution algorithm for components.

You can see that the component-webpack-plugin handles these components including scripts, styles and other assets.

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
		"my-components"
	],
	"scripts": ["example.js"],
	"license": "MIT"
}
```

# components/webpack-a-component/component.json

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

# components/webpack-a-component/style.css

``` css
.a-component {
	display: inline;
	background: url(image.png) repeat;
}
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

	console.log(__webpack_require__(/*! a-component */ 1));
	console.log(__webpack_require__(/*! b-component */ 5));
	console.log(__webpack_require__(/*! c-component */ 3));


/***/ },
/* 1 */
/*!****************************************************!*\
  !*** ./components/webpack-a-component (component) ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./style.css */ 8);
	module.exports = __webpack_require__(/*! ./index.js */ 2);

/***/ },
/* 2 */
/*!*************************************************!*\
  !*** ./components/webpack-a-component/index.js ***!
  \*************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "A";

/***/ },
/* 3 */
/*!****************************************************!*\
  !*** ./components/webpack-c-component (component) ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(/*! ./main.js */ 4);

/***/ },
/* 4 */
/*!************************************************!*\
  !*** ./components/webpack-c-component/main.js ***!
  \************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "C" + __webpack_require__(/*! a-component */ 1) + __webpack_require__(/*! webpack-a-component */ 1);

/***/ },
/* 5 */
/*!***********************************************!*\
  !*** ./my-components/b-component (component) ***!
  \***********************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(/*! ./main.js */ 6);

/***/ },
/* 6 */
/*!*******************************************!*\
  !*** ./my-components/b-component/main.js ***!
  \*******************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "B";

/***/ },
/* 7 */
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
/* 8 */
/*!*****************************************************************************************************************************!*\
  !*** (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./components/webpack-a-component/style.css ***!
  \*****************************************************************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag
	__webpack_require__(/*! (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js */ 7)
		// The css code:
		(__webpack_require__(/*! !(webpack)/~/css-loader!./components/webpack-a-component/style.css */ 9))

/***/ },
/* 9 */
/*!*************************************************************************!*\
  !*** (webpack)/~/css-loader!./components/webpack-a-component/style.css ***!
  \*************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports =
		".a-component {\r\n\tdisplay: inline;\r\n\tbackground: url("+__webpack_require__(/*! ./image.png */ 10)+") repeat;\r\n}";

/***/ },
/* 10 */
/*!**************************************************!*\
  !*** ./components/webpack-a-component/image.png ***!
  \**************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAOCAIAAABGj2DjAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACNSURBVChTlZC7FQAREEWFylCKEoS6EalBKNWZEoR2zrLrWbO/Gzjjc9/MIep/upNS8t63+pXukCAE33ON4/vgdo3j+6zvkNuLBybn409MDo4UY9Ra09q2CD9bCIFkQkpZSumnB8PBwZRSzbHWthNkODiYc45qY8zZBBP52Yicc692MPHqfPm6q4N5PLVunPxwQxP50QkAAAAASUVORK5CYII="

/***/ }
/******/ ])
```

# Info

## Uncompressed

```
Hash: 23c15d6e636a4a90c6e8
Version: webpack 1.3.2-beta7
Time: 109ms
    Asset  Size  Chunks             Chunk Names
output.js  6224       0  [emitted]  main
chunk    {0} output.js (main) 1957 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 114 {0} [built]
    [1] ./components/webpack-a-component (component) 268 {0} [built]
        cjs require a-component [0] ./example.js 1:12-34
        cjs require a-component [4] ./components/webpack-c-component/main.js 1:23-45
        cjs require webpack-a-component [4] ./components/webpack-c-component/main.js 1:48-78
    [2] ./components/webpack-a-component/index.js 21 {0} [built]
        cjs require ./index.js [1] ./components/webpack-a-component (component) 2:17-38
    [3] ./components/webpack-c-component (component) 38 {0} [built]
        cjs require c-component [0] ./example.js 3:12-34
    [4] ./components/webpack-c-component/main.js 79 {0} [built]
        cjs require ./main.js [3] ./components/webpack-c-component (component) 1:17-37
    [5] ./my-components/b-component (component) 38 {0} [built]
        cjs require b-component [0] ./example.js 2:12-34
    [6] ./my-components/b-component/main.js 21 {0} [built]
        cjs require ./main.js [5] ./my-components/b-component (component) 1:17-37
    [7] (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js 458 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\addStyle.js [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./components/webpack-a-component/style.css 2:0-137
    [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./components/webpack-a-component/style.css 428 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\index.js!(webpack)\node_modules\css-loader\index.js!./style.css [1] ./components/webpack-a-component (component) 1:0-227
    [9] (webpack)/~/css-loader!./components/webpack-a-component/style.css 119 {0} [built]
        cjs require !!(webpack)\node_modules\css-loader\index.js!.\components\webpack-a-component\style.css [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./components/webpack-a-component/style.css 4:2-205
   [10] ./components/webpack-a-component/image.png 373 {0} [built]
        cjs require ./image.png [9] (webpack)/~/css-loader!./components/webpack-a-component/style.css 2:62-84
```

## Minimized (uglify-js, no zip)

```
Hash: 56813d2406e8f2fed405
Version: webpack 1.3.2-beta7
Time: 158ms
    Asset  Size  Chunks             Chunk Names
output.js  1190       0  [emitted]  main
chunk    {0} output.js (main) 1930 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 114 {0} [built]
    [1] ./components/webpack-a-component (component) 268 {0} [built]
        cjs require a-component [0] ./example.js 1:12-34
        cjs require a-component [4] ./components/webpack-c-component/main.js 1:23-45
        cjs require webpack-a-component [4] ./components/webpack-c-component/main.js 1:48-78
    [2] ./components/webpack-a-component/index.js 21 {0} [built]
        cjs require ./index.js [1] ./components/webpack-a-component (component) 2:17-38
    [3] ./components/webpack-c-component (component) 38 {0} [built]
        cjs require c-component [0] ./example.js 3:12-34
    [4] ./components/webpack-c-component/main.js 79 {0} [built]
        cjs require ./main.js [3] ./components/webpack-c-component (component) 1:17-37
    [5] ./my-components/b-component (component) 38 {0} [built]
        cjs require b-component [0] ./example.js 2:12-34
    [6] ./my-components/b-component/main.js 21 {0} [built]
        cjs require ./main.js [5] ./my-components/b-component (component) 1:17-37
    [7] (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js 458 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\addStyle.js [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./components/webpack-a-component/style.css 2:0-137
    [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./components/webpack-a-component/style.css 428 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\index.js!(webpack)\node_modules\css-loader\index.js!./style.css [1] ./components/webpack-a-component (component) 1:0-227
    [9] (webpack)/~/css-loader!./components/webpack-a-component/style.css 92 {0} [built]
        cjs require !!(webpack)\node_modules\css-loader\index.js!.\components\webpack-a-component\style.css [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./components/webpack-a-component/style.css 4:2-205
   [10] ./components/webpack-a-component/image.png 373 {0} [built]
        cjs require ./image.png [9] (webpack)/~/css-loader!./components/webpack-a-component/style.css 2:47-69
```