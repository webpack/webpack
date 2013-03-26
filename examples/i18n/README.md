
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

console.log("Hallo Welt");
console.log("Missing Text");

/***/ }
})
```

# Info

## Uncompressed

```
Hash: a738ac89a403e736beace631044222a3
Version: webpack 0.10.0-beta1
Time: 20ms
    Asset  Size  Chunks  Chunk Names
output.js  1139       0  main       
chunk    {0} output.js (main) 64
    [0] ./example.js 64 [built] {0}

ERROR in ./example.js
Missing localization: Missing Text
```

## Minimized (uglify-js, no zip)

```
Hash: a738ac89a403e736beace631044222a3
Version: webpack 0.10.0-beta1
Time: 61ms
    Asset  Size  Chunks  Chunk Names
output.js   308       0  main       
chunk    {0} output.js (main) 64
    [0] ./example.js 64 [built] {0}

ERROR in ./example.js
Missing localization: Missing Text
```