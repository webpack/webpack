
# example.js

``` javascript
console.log(__("Hello World"));
console.log(__("Missing Text"));
```

# webpack.config.js

``` javascript
var I18nPlugin = require("i18n-webpack-plugin");
module.exports = {
	plugins: [
		new I18nPlugin(
			require("./de.json") // or pass null to use defaults
		)
	]
}
```

> I recommend to use `new I18nPlugin(null)` for development
> and write a small script that generates bundles for every language

# de.json

``` javascript
{
	"Hello World": "Hallo Welt"
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
/******/ 	function require(moduleId) {
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
/******/ 		modules[moduleId].call(module.exports, module, module.exports, require);
/******/ 		
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 		
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// The bundle contains no chunks. A empty chunk loading function.
/******/ 	require.e = function requireEnsure(_, callback) {
/******/ 		callback.call(null, this);
/******/ 	};
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

	console.log("Hallo Welt");
	console.log("Missing Text");

/***/ }
/******/ ])
```

# Info

## Uncompressed

```
Hash: aacf76cf7c567530eab4
Version: webpack 1.0.0-beta2
Time: 41ms
    Asset  Size  Chunks             Chunk Names
output.js  1782       0  [emitted]  main       
chunk    {0} output.js (main) 64 [rendered]
    [0] ./example.js 64 {0} [built] [1 warning]

WARNING in ./example.js
Missing localization: Missing Text
```

## Minimized (uglify-js, no zip)

```
Hash: 745ba28ffea7e8be49cd
Version: webpack 1.0.0-beta2
Time: 100ms
    Asset  Size  Chunks             Chunk Names
output.js   318       0  [emitted]  main       
chunk    {0} output.js (main) 64 [rendered]
    [0] ./example.js 64 {0} [built] [1 warning]

WARNING in ./example.js
Missing localization: Missing Text
```