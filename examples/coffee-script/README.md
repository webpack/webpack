
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

/******/ /* WEBPACK FREE VAR INJECTION */ (function(console) {
console.log(require(/* ./cup1.coffee */2));
/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/* __webpack_console */1)))

/******/},
/******/
/******/1: function(module, exports, require) {

var console = window.console;
module.exports = console;
for(var name in {log:1, info:1, error:1, warn:1, dir:1, trace:1, assert:1})
	if(!console[name])
		console[name] = function() {};
if(!console.time)
console.time = function(label) {
	times[label] = Date.now();
};
if(!console.timeEnd)
console.timeEnd = function() {
	var duration = Date.now() - times[label];
	console.log('%s: %dms', label, duration);
};

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

/******/ /* WEBPACK FREE VAR INJECTION */ (function(console) {
(function() {

  console.log("yeah coffee-script");

  module.exports = 42;

}).call(this);

/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/* __webpack_console */1)))

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
     output.js:     1968 characters
output.js
    0 .\example.js
       main
    1 (webpack)\buildin\__webpack_console.js
       require (1x) from .\example.js
       require (1x) from .\cup2.coffee
    2 (webpack)\node_modules\coffee-loader\index.js!.\cup1.coffee
       require (1x) from .\example.js
    3 (webpack)\node_modules\coffee-loader\index.js!.\cup2.coffee
       require (2x) from .\cup1.coffee
```

## Minimized (uglify-js, no zip)

```
Chunks: 1
Modules: 4
Modules including duplicates: 4
Modules pre chunk: 4
Modules first chunk: 4
     output.js:      784 characters
output.js
    0 .\example.js
       main
    1 (webpack)\buildin\__webpack_console.js
       require (1x) from .\example.js
       require (1x) from .\cup2.coffee
    2 (webpack)\node_modules\coffee-loader\index.js!.\cup1.coffee
       require (1x) from .\example.js
    3 (webpack)\node_modules\coffee-loader\index.js!.\cup2.coffee
       require (2x) from .\cup1.coffee
```