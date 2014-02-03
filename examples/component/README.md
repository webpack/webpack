
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
/******/ 	// shortcut for better minimizing
/******/ 	var exports = "exports";
/******/ 	
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// The require function
/******/ 	function require(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId][exports];
/******/ 		
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/ 		
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module[exports], module, module[exports], require);
/******/ 		
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 		
/******/ 		// Return the exports of the module
/******/ 		return module[exports];
/******/ 	}
/******/ 	
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	require.modules = modules;
/******/ 	
/******/ 	// expose the module cache
/******/ 	require.cache = installedModules;
/******/ 	
/******/ 	// __webpack_public_path__
/******/ 	require.p = "js/";
/******/ 	
/******/ 	
/******/ 	// Load entry module and return exports
/******/ 	return require(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, require) {

	console.log(require(/*! a-component */ 1));
	console.log(require(/*! b-component */ 5));
	console.log(require(/*! c-component */ 3));


/***/ },
/* 1 */
/*!***************************************************!*\
  !*** ./component/webpack-a-component (component) ***!
  \***************************************************/
/***/ function(module, exports, require) {

	require(/*! (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./style.css */ 8);
	module.exports = require(/*! ./index.js */ 2);

/***/ },
/* 2 */
/*!************************************************!*\
  !*** ./component/webpack-a-component/index.js ***!
  \************************************************/
/***/ function(module, exports, require) {

	module.exports = "A";

/***/ },
/* 3 */
/*!***************************************************!*\
  !*** ./component/webpack-c-component (component) ***!
  \***************************************************/
/***/ function(module, exports, require) {

	module.exports = require(/*! ./main.js */ 4);

/***/ },
/* 4 */
/*!***********************************************!*\
  !*** ./component/webpack-c-component/main.js ***!
  \***********************************************/
/***/ function(module, exports, require) {

	module.exports = "C" + require(/*! a-component */ 1);

/***/ },
/* 5 */
/*!**********************************************!*\
  !*** ./my-component/b-component (component) ***!
  \**********************************************/
/***/ function(module, exports, require) {

	module.exports = require(/*! ./main.js */ 6);

/***/ },
/* 6 */
/*!******************************************!*\
  !*** ./my-component/b-component/main.js ***!
  \******************************************/
/***/ function(module, exports, require) {

	module.exports = "B";

/***/ },
/* 7 */
/*!***********************************************************************!*\
  !*** (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js ***!
  \***********************************************************************/
/***/ function(module, exports, require) {

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
/*!****************************************************************************************************************************!*\
  !*** (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./component/webpack-a-component/style.css ***!
  \****************************************************************************************************************************/
/***/ function(module, exports, require) {

	// style-loader: Adds some css to the DOM by adding a <style> tag
	require(/*! (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js */ 7)
		// The css code:
		(require(/*! !(webpack)/~/css-loader!./component/webpack-a-component/style.css */ 9))

/***/ },
/* 9 */
/*!************************************************************************!*\
  !*** (webpack)/~/css-loader!./component/webpack-a-component/style.css ***!
  \************************************************************************/
/***/ function(module, exports, require) {

	module.exports =
		".a-component {\r\n\tdisplay: inline;\r\n\tbackground: url("+require(/*! ./image.png */ 10)+") repeat;\r\n}";

/***/ },
/* 10 */
/*!*************************************************!*\
  !*** ./component/webpack-a-component/image.png ***!
  \*************************************************/
/***/ function(module, exports, require) {

	module.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAOCAIAAABGj2DjAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACNSURBVChTlZC7FQAREEWFylCKEoS6EalBKNWZEoR2zrLrWbO/Gzjjc9/MIep/upNS8t63+pXukCAE33ON4/vgdo3j+6zvkNuLBybn409MDo4UY9Ra09q2CD9bCIFkQkpZSumnB8PBwZRSzbHWthNkODiYc45qY8zZBBP52Yicc692MPHqfPm6q4N5PLVunPxwQxP50QkAAAAASUVORK5CYII="

/***/ }
/******/ ])
```

# Info

## Uncompressed

```
Hash: 4053dc5307d47a5e1c7d
Version: webpack 1.0.0-rc1
Time: 164ms
    Asset  Size  Chunks             Chunk Names
output.js  5938       0  [emitted]  main       
chunk    {0} output.js (main) 1948 [rendered]
    > main [0] ./example.js
    [0] ./example.js 114 {0} [built]
    [1] ./component/webpack-a-component (component) 278 {0} [built]
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
    [7] (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js 458 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\addStyle.js [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./component/webpack-a-component/style.css 2:0-142
    [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./component/webpack-a-component/style.css 442 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\index.js!(webpack)\node_modules\css-loader\index.js!./style.css [1] ./component/webpack-a-component (component) 1:0-237
    [9] (webpack)/~/css-loader!./component/webpack-a-component/style.css 119 {0} [built]
        cjs require !!(webpack)\node_modules\css-loader\index.js!.\component\webpack-a-component\style.css [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./component/webpack-a-component/style.css 4:2-214
   [10] ./component/webpack-a-component/image.png 373 {0} [built]
        cjs require ./image.png [9] (webpack)/~/css-loader!./component/webpack-a-component/style.css 2:62-84
```

## Minimized (uglify-js, no zip)

```
Hash: f3bcd87b1b45637bb5fb
Version: webpack 1.0.0-rc1
Time: 252ms
    Asset  Size  Chunks             Chunk Names
output.js  1187       0  [emitted]  main       
chunk    {0} output.js (main) 1921 [rendered]
    > main [0] ./example.js
    [0] ./example.js 114 {0} [built]
    [1] ./component/webpack-a-component (component) 278 {0} [built]
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
    [7] (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js 458 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\addStyle.js [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./component/webpack-a-component/style.css 2:0-142
    [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./component/webpack-a-component/style.css 442 {0} [built]
        cjs require !(webpack)\node_modules\component-webpack-plugin\node_modules\style-loader\index.js!(webpack)\node_modules\css-loader\index.js!./style.css [1] ./component/webpack-a-component (component) 1:0-237
    [9] (webpack)/~/css-loader!./component/webpack-a-component/style.css 92 {0} [built]
        cjs require !!(webpack)\node_modules\css-loader\index.js!.\component\webpack-a-component\style.css [8] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/css-loader!./component/webpack-a-component/style.css 4:2-214
   [10] ./component/webpack-a-component/image.png 373 {0} [built]
        cjs require ./image.png [9] (webpack)/~/css-loader!./component/webpack-a-component/style.css 2:47-69
```