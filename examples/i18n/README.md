
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
/******/ (function webpackBootstrap(modules) {
/******/ 	var installedModules = {};
/******/ 	function require(moduleId) {
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/ 		modules[moduleId].call(null, module, module.exports, require);
/******/ 		module.loaded = true;
/******/ 		return module.exports;
/******/ 	}
/******/ 	require.e = function requireEnsure(chunkId, callback) {
/******/ 		callback.call(null, require);
/******/ 	};
/******/ 	require.modules = modules;
/******/ 	require.cache = installedModules;
/******/ 	return require(0);
/******/ })({
/******/ c: "",

/***/ 0:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, require) {

	console.log("Hallo Welt");
	console.log("Missing Text");

/***/ }
/******/ })

```

# Info

## Uncompressed

```
Hash: 6eb19a8e6a58c779abfd201110649331
Time: 19ms
    Asset  Size  Chunks  Chunk Names
output.js   989       0  main       
chunk    {0} output.js (main) 64
    [0] ./example.js 64 [built] {0}

WARNING in ./example.js
Missing localization: Missing Text
```

## Minimized (uglify-js, no zip)

```
Hash: 6eb19a8e6a58c779abfd201110649331
Time: 57ms
    Asset  Size  Chunks  Chunk Names
output.js   308       0  main       
chunk    {0} output.js (main) 64
    [0] ./example.js 64 [built] {0}

WARNING in ./example.js
Missing localization: Missing Text
```