# example.js

``` javascript
// Polyfill require for node.js usage of loaders
require = require("enhanced-require")(module);

// use our loader
console.dir(require("./loader!./file"));

// use buildin json loader
console.dir(require("./test.json")); // default by extension
console.dir(require("json!./test.json")); // manual
```

# file.js

``` javascript
exports.foo = "bar";
```

# loader.js

``` javascript
module.exports = function(content) {
	return "exports.answer = 42;\n" + content;
}
```

# test.json

``` javascript
{
	"foobar": 1234
}
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
/******/			exports: {},
/******/			id: moduleId,
/******/			loaded: false
/******/		};
/******/		modules[moduleId](module, module.exports, require);
/******/		module.loaded = true;
/******/		return module.exports;
/******/	}
/******/	require.e = function(chunkId, callback) {
/******/		callback(require);
/******/	};
/******/	require.modules = modules;
/******/	require.cache = installedModules;
/******/	return require(0);
/******/})
/******/({c:"",
/******/0: function(module, exports, require) {

/*** .\example.js ***/

/******/ /* WEBPACK FREE VAR INJECTION */ (function(module,console) {
// Polyfill require for node.js usage of loaders
require = require(/* enhanced-require */3)(module);

// use our loader
console.dir(require(/* ./loader!./file */7));

// use buildin json loader
console.dir(require(/* ./test.json */2)); // default by extension
console.dir(require(/* json!./test.json */2)); // manual
/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/* __webpack_module */5)(module),require(/* __webpack_console */1)))

/******/},
/******/
/******/1: function(module, exports, require) {

/*** (webpack)\buildin\__webpack_console.js ***/

var console = (function() { return this["console"] || (this["window"] && this["window"].console) || {} }());
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

/*** (webpack)\~\json-loader!.\test.json ***/

module.exports = {
	"foobar": 1234
}

/******/},
/******/
/******/3: function(module, exports, require) {

/*** C:\Users\Sokrates\Eigene Repos\~\enhanced-require\lib\require.webpack.js ***/

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function() {
	return require(/* __webpack_amd_require */4);
}

/******/},
/******/
/******/4: function(module, exports, require) {

/*** (webpack)\buildin\__webpack_amd_require.js ***/

var req = require.valueOf();
function amdRequire(chunk, requiresFn, fn) {
	if(!requiresFn) {
		// commonjs
		return req(chunk);
	}
	req.e(chunk, function() {
		var modules = requiresFn();
		if(fn)
			return fn.apply(null, modules);
	});
}
for(var name in req)
	amdRequire[name] = req[name];
amdRequire.amd = require(/* ./__webpack_options_amd.loader.js!./__webpack_options_amd.loader.js */6);
amdRequire.config = function() {/* config is ignored, use webpack options */};
module.exports = amdRequire;


/******/},
/******/
/******/5: function(module, exports, require) {

/*** (webpack)\buildin\__webpack_module.js ***/

module.exports = function(module) {
	if(!module.webpackPolyfill) {
		module.deprecate = function() {};
		module.paths = [];
		// module.parent = undefined by default
		module.children = [];
		module.webpackPolyfill = 1;
	}
	return module;
}


/******/},
/******/
/******/6: function(module, exports, require) {

/*** (webpack)\buildin\__webpack_options_amd.loader.js!(webpack)\buildin\__webpack_options_amd.loader.js ***/

/* empty to return {} */

/******/},
/******/
/******/7: function(module, exports, require) {

/*** .\loader.js!.\file.js ***/

exports.answer = 42;
exports.foo = "bar";

/******/}
/******/})
```

# Console output

Prints in node.js (`node example.js`) and in browser:

```
{ answer: 42, foo: 'bar' }
{ foobar: 1234 }
{ foobar: 1234 }
```

# Info

## Uncompressed

```
Hash: 3d8baf386d1b33530021b2545124dfa5
Compile Time: 73ms
Chunks: 1
Modules: 8
Modules including duplicates: 8
Modules first chunk: 8
main   output.js:     3927 chars/bytes

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0       324  .\example.js
       main
    1       516  (webpack)\buildin\__webpack_console.js
       require (3x) from .\example.js
    2        36  (webpack)\~\json-loader!.\test.json
       require (1x) from .\example.js
       require (1x) from .\example.js
    3       184  C:\Users\Sokrates\Eigene Repos\~\enhanced-require\lib\require.webpack.js
       require (1x) from .\example.js
    4       518  (webpack)\buildin\__webpack_amd_require.js
       require (1x) from C:\Users\Sokrates\Eigene Repos\~\enhanced-require\lib\require.webpack.js
    5       251  (webpack)\buildin\__webpack_module.js
       require (1x) from .\example.js
    6        24  (webpack)\buildin\__webpack_options_amd.loader.js!(webpack)\buildin\__webpack_options_amd.loader.js
       require (1x) from (webpack)\buildin\__webpack_amd_require.js
    7        41  .\loader.js!.\file.js
       require (1x) from .\example.js
```