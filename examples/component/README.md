
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
(function(modules) { // webpackBootstrap
// The module cache
var installedModules = {};

// The require function
function require(moduleId) {
	// Check if module is in cache
	if(installedModules[moduleId])
		return installedModules[moduleId].exports;
	
	// Create a new module (and put it into the cache)
	var module = installedModules[moduleId] = {
		exports: {},
		id: moduleId,
		loaded: false
	};
	
	// Execute the module function
	modules[moduleId].call(null, module, module.exports, require);
	
	// Flag the module as loaded
	module.loaded = true;
	
	// Return the exports of the module
	return module.exports;
}

require.e = function requireEnsure(_, callback) {
	callback.call(null, require);
};
require.modules = modules;
require.cache = installedModules;


// Load entry module and return exports
return require(0);
})
/************************************************************************/
({
// __webpack_public_path__

c: "",
/***/ 0:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, require) {

console.log(require(/*! a-component */ 1));
console.log(require(/*! b-component */ 9));
console.log(require(/*! c-component */ 7));


/***/ },

/***/ 1:
/*!***************************************************!*\
  !*** ./component/webpack-a-component (component) ***!
  \***************************************************/
/***/ function(module, exports, require) {

require(/*! (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./style.css */ 4);
module.exports = require(/*! ./index.js */ 6);

/***/ },

/***/ 2:
/*!********************************************************************************************************************************************!*\
  !*** (webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css ***!
  \********************************************************************************************************************************************/
/***/ function(module, exports, require) {

module.exports =
	".a-component {\n\tdisplay: inline;\n\tbackground: url("+require(/*! ./image.png */ 5)+") repeat;\n}";

/***/ },

/***/ 3:
/*!****************************************************************************************************************!*\
  !*** (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js ***!
  \****************************************************************************************************************/
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

/***/ 4:
/*!*****************************************************************************************************************************************************************************************************************************************!*\
  !*** (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css ***!
  \*****************************************************************************************************************************************************************************************************************************************/
/***/ function(module, exports, require) {

require(/*! (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js */ 3)(require(/*! !(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css */ 2))

/***/ },

/***/ 5:
/*!*************************************************!*\
  !*** ./component/webpack-a-component/image.png ***!
  \*************************************************/
/***/ function(module, exports, require) {

module.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAOCAIAAABGj2DjAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACNSURBVChTlZC7FQAREEWFylCKEoS6EalBKNWZEoR2zrLrWbO/Gzjjc9/MIep/upNS8t63+pXukCAE33ON4/vgdo3j+6zvkNuLBybn409MDo4UY9Ra09q2CD9bCIFkQkpZSumnB8PBwZRSzbHWthNkODiYc45qY8zZBBP52Yicc692MPHqfPm6q4N5PLVunPxwQxP50QkAAAAASUVORK5CYII="

/***/ },

/***/ 6:
/*!************************************************!*\
  !*** ./component/webpack-a-component/index.js ***!
  \************************************************/
/***/ function(module, exports, require) {

module.exports = "A";

/***/ },

/***/ 7:
/*!***************************************************!*\
  !*** ./component/webpack-c-component (component) ***!
  \***************************************************/
/***/ function(module, exports, require) {

module.exports = require(/*! ./main.js */ 8);

/***/ },

/***/ 8:
/*!***********************************************!*\
  !*** ./component/webpack-c-component/main.js ***!
  \***********************************************/
/***/ function(module, exports, require) {

module.exports = "C" + require(/*! a-component */ 1);

/***/ },

/***/ 9:
/*!**********************************************!*\
  !*** ./my-component/b-component (component) ***!
  \**********************************************/
/***/ function(module, exports, require) {

module.exports = require(/*! ./main.js */ 10);

/***/ },

/***/ 10:
/*!******************************************!*\
  !*** ./my-component/b-component/main.js ***!
  \******************************************/
/***/ function(module, exports, require) {

module.exports = "B";

/***/ }
})
```

# Info

## Uncompressed

```
Hash: 90defdf491ebab80d48bd42ea1f7c17d
Version: webpack 0.10.0-beta1
Time: 124ms
    Asset  Size  Chunks  Chunk Names
output.js  6167       0  main       
chunk    {0} output.js (main) 1981
    [0] ./example.js 111 [built] {0}
    [1] ./component/webpack-a-component (component) 328 [built] {0}
        cjs require a-component [0] ./example.js 1:12-34
        cjs require a-component [8] ./component/webpack-c-component/main.js 1:23-45
    [2] (webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 113 [built] {0}
        cjs require !!(webpack)/~\component-webpack-plugin\node_modules\css-loader\index.js!.\component\webpack-a-component\style.css [4] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 1:148-433
    [3] (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js 458 [built] {0}
        cjs require !(webpack)/~\component-webpack-plugin\node_modules\style-loader\addStyle.js [4] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 1:0-147
    [4] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 434 [built] {0}
        cjs require !(webpack)/~\component-webpack-plugin\node_modules\style-loader\index.js!(webpack)/~\component-webpack-plugin\node_modules\css-loader\index.js!./style.css [1] ./component/webpack-a-component (component) 1:0-287
    [5] ./component/webpack-a-component/image.png 373 [built] {0}
        cjs require ./image.png [2] (webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 2:58-80
    [6] ./component/webpack-a-component/index.js 21 [built] {0}
        cjs require ./index.js [1] ./component/webpack-a-component (component) 2:17-38
    [7] ./component/webpack-c-component (component) 38 [built] {0}
        cjs require c-component [0] ./example.js 3:12-34
    [8] ./component/webpack-c-component/main.js 46 [built] {0}
        cjs require ./main.js [7] ./component/webpack-c-component (component) 1:17-37
    [9] ./my-component/b-component (component) 38 [built] {0}
        cjs require b-component [0] ./example.js 2:12-34
   [10] ./my-component/b-component/main.js 21 [built] {0}
        cjs require ./main.js [9] ./my-component/b-component (component) 1:17-37
```

## Minimized (uglify-js, no zip)

```
Hash: 347d579347a144b45a78b34863b12b79
Version: webpack 0.10.0-beta1
Time: 466ms
    Asset  Size  Chunks  Chunk Names
output.js  1243       0  main       
chunk    {0} output.js (main) 1960
    [0] ./example.js 111 [built] {0}
    [1] ./component/webpack-a-component (component) 328 [built] {0}
        cjs require a-component [0] ./example.js 1:12-34
        cjs require a-component [8] ./component/webpack-c-component/main.js 1:23-45
    [2] (webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 92 [built] {0}
        cjs require !!(webpack)/~\component-webpack-plugin\node_modules\css-loader\index.js!.\component\webpack-a-component\style.css [4] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 1:148-433
    [3] (webpack)/~/component-webpack-plugin/~/style-loader/addStyle.js 458 [built] {0}
        cjs require !(webpack)/~\component-webpack-plugin\node_modules\style-loader\addStyle.js [4] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 1:0-147
    [4] (webpack)/~/component-webpack-plugin/~/style-loader!(webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 434 [built] {0}
        cjs require !(webpack)/~\component-webpack-plugin\node_modules\style-loader\index.js!(webpack)/~\component-webpack-plugin\node_modules\css-loader\index.js!./style.css [1] ./component/webpack-a-component (component) 1:0-287
    [5] ./component/webpack-a-component/image.png 373 [built] {0}
        cjs require ./image.png [2] (webpack)/~/component-webpack-plugin/~/css-loader!./component/webpack-a-component/style.css 2:47-69
    [6] ./component/webpack-a-component/index.js 21 [built] {0}
        cjs require ./index.js [1] ./component/webpack-a-component (component) 2:17-38
    [7] ./component/webpack-c-component (component) 38 [built] {0}
        cjs require c-component [0] ./example.js 3:12-34
    [8] ./component/webpack-c-component/main.js 46 [built] {0}
        cjs require ./main.js [7] ./component/webpack-c-component (component) 1:17-37
    [9] ./my-component/b-component (component) 38 [built] {0}
        cjs require b-component [0] ./example.js 2:12-34
   [10] ./my-component/b-component/main.js 21 [built] {0}
        cjs require ./main.js [9] ./my-component/b-component (component) 1:17-37
```