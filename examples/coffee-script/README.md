
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
/******/	require.e = function(chunkId, callback) {
/******/		callback(require);
/******/	};
/******/	require.modules = modules;
/******/	require.cache = installedModules;
/******/	return require(0);
/******/})
/******/({
/******/0: function(module, exports, require) {

/*** .\example.js ***/

/******/ /* WEBPACK FREE VAR INJECTION */ (function(console) {
console.log(require(/* ./cup1.coffee */3));
/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/* __webpack_console */1)))

/******/},
/******/
/******/1: function(module, exports, require) {

/*** (webpack)\buildin\__webpack_console.js ***/

var console = (function() { return this["console"] || this["window"].console || {} }());
module.exports = console;
for(var name in {log:1, info:1, error:1, warn:1, dir:1, trace:1, assert:1})
	if(!console[name])
		console[name] = function() {};
var times = {};
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

/*** (webpack)\~\coffee-loader!.\cup2.coffee ***/

/******/ /* WEBPACK FREE VAR INJECTION */ (function(console) {
(function() {

  console.log("yeah coffee-script");

  module.exports = 42;

}).call(this);

/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/* __webpack_console */1)))

/******/},
/******/
/******/3: function(module, exports, require) {

/*** (webpack)\~\coffee-loader!.\cup1.coffee ***/

(function() {

  module.exports = {
    cool: "stuff",
    answer: 42,
    external: require(/* ./cup2.coffee */2),
    again: require(/* ./cup2.coffee */2)
  };

}).call(this);


/******/},
/******/
/******/})
```

# Info

## Uncompressed

```
Hash: 6f847f3ae460f720cea4227c0a6befb2
Compile Time: 139ms
Chunks: 1
Modules: 4
Modules including duplicates: 4
Modules per chunk: 4
Modules first chunk: 4
   output.js:     2277 characters

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0        43  .\example.js
       main
    1       496  (webpack)\buildin\__webpack_console.js
       require (1x) from .\example.js
       require (1x) from .\cup2.coffee
    2        92  (webpack)\~\coffee-loader!.\cup2.coffee
       require (2x) from .\cup1.coffee
    3       178  (webpack)\~\coffee-loader!.\cup1.coffee
       require (1x) from .\example.js
```

## Minimized (uglify-js, no zip)

```
Hash: 59325c1d71d5ede2a056831707e21289
Compile Time: 206ms
Chunks: 1
Modules: 4
Modules including duplicates: 4
Modules per chunk: 4
Modules first chunk: 4
   output.js:      846 characters

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0        23  .\example.js
       main
    1       389  (webpack)\buildin\__webpack_console.js
       require (1x) from .\example.js
       require (1x) from .\cup2.coffee
    2        76  (webpack)\~\coffee-loader!.\cup2.coffee
       require (2x) from .\cup1.coffee
    3       101  (webpack)\~\coffee-loader!.\cup1.coffee
       require (1x) from .\example.js
```