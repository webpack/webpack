# example.js

``` javascript
console.log(require("./cup1.coffee"));
```

# cup1.coffee

``` coffee-script
module.exports =
	cool: "stuff"
	answer: 42
	external: require "./cup2.coffee"
	again: require "./cup2.coffee"
```

# cup2.coffee

``` coffee-script
console.log "yeah coffee-script"

module.exports = 42
```

# js/output.js

``` javascript
/******/(function(modules) {
/******/	var installedModules = {};
/******/	function require(moduleId) {
/******/		if(typeof moduleId !== "number") throw new Error("Cannot find module '"+moduleId+"'");
/******/		if(installedModules[moduleId])
/******/			return installedModules[moduleId].exports;
/******/		var module = installedModules[moduleId] = {
/******/			exports: {}
/******/		};
/******/		modules[moduleId](module, module.exports, require);
/******/		return module.exports;
/******/	}
/******/	require.ensure = function(chunkId, callback) {
/******/		callback(require);
/******/	};
/******/	return require(0);
/******/})
/******/({
/******/0: function(module, exports, require) {

require(/* __webpack_console */1).log(require(/* ./cup1.coffee */2));

/******/},
/******/
/******/1: function(module, exports, require) {

var console = window.console;
exports.log = (console && console.log) || function() {};
exports.info = (console && console.info) || function() {};
exports.error = (console && console.error) || function() {};
exports.warn = (console && console.warn) || function() {};
exports.dir = (console && console.dir) || function() {};
exports.time = (console && console.time) || function(label) {
	times[label] = Date.now();
};
exports.timeEnd = (console && console.timeEnd) || function() {
	var duration = Date.now() - times[label];
	exports.log('%s: %dms', label, duration);
};
exports.trace = (console && console.trace) || function() {};
exports.assert = (console && console.assert) || function() {};

/******/},
/******/
/******/2: function(module, exports, require) {

(function() {

  module.exports = {
    cool: "stuff",
    answer: 42,
    external: require(/* ./cup2.coffee */3),
    again: require(/* ./cup2.coffee */3)
  };

}).call(this);


/******/},
/******/
/******/3: function(module, exports, require) {

(function() {

  require(/* __webpack_console */1).log("yeah coffee-script");

  module.exports = 42;

}).call(this);


/******/},
/******/
/******/})
```

# Info

## Uncompressed

```
Chunks: 1
Modules: 4
Modules including duplicates: 4
Modules pre chunk: 4
Modules first chunk: 4
     output.js:     2002 characters
output.js
    0 [...]\examples\coffee-script\example.js
       main
    1 [...]\buildin\__webpack_console.js
       require (1x) from [...]\examples\coffee-script\example.js
       require (1x) from [...]\examples\coffee-script\cup2.coffee
    2 [...]\node_modules\coffee-loader.js![...]\examples\coffee-script\cup1.coffee
       require (1x) from [...]\examples\coffee-script\example.js
    3 [...]\node_modules\coffee-loader.js![...]\examples\coffee-script\cup2.coffee
       require (2x) from [...]\examples\coffee-script\cup1.coffee
```

## Minimized (uglify-js, no zip)

```
Chunks: 1
Modules: 4
Modules including duplicates: 4
Modules pre chunk: 4
Modules first chunk: 4
     output.js:      868 characters
output.js
    0 [...]\examples\coffee-script\example.js
       main
    1 [...]\buildin\__webpack_console.js
       require (1x) from [...]\examples\coffee-script\example.js
       require (1x) from [...]\examples\coffee-script\cup2.coffee
    2 [...]\node_modules\coffee-loader.js![...]\examples\coffee-script\cup1.coffee
       require (1x) from [...]\examples\coffee-script\example.js
    3 [...]\node_modules\coffee-loader.js![...]\examples\coffee-script\cup2.coffee
       require (2x) from [...]\examples\coffee-script\cup1.coffee
```