# example.js

``` javascript
// Polyfill require for node.js usage of loaders
require = require("../../require-polyfill")(require.valueOf());

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
module.exports = function(contents, options, callback) {

	if(contents.length !== 1)
		throw new Error("loader takes exactly one file as parameter");

	if(callback) {
		// compile for web
		callback(null /* no error */,
			"exports.answer = 42;\n" +
			contents[0]);
	} else {
		// execute for node.js
		var Module = require("module");
		var m = new Module(options.request);
		m.exports.answer = 42;
		m._compile(contents[0], options.filename);
		return m.exports;
	}

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

// Polyfill require for node.js usage of loaders
require = require(/* ../../require-polyfill */3)(require.valueOf());

// use our loader
require(/* __webpack_console */1).dir(require(/* ./loader!./file */2));

// use buildin json loader
require(/* __webpack_console */1).dir(require(/* ./test.json */4)); // default by extension
require(/* __webpack_console */1).dir(require(/* json!./test.json */4)); // manual

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

exports.answer = 42;
exports.foo = "bar";

/******/},
/******/
/******/3: function(module, exports, require) {

// No polyfill needed when compiled with webpack
module.exports = function(r){return r}

/******/},
/******/
/******/4: function(module, exports, require) {

module.exports = {"foobar":1234}

/******/},
/******/
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
Chunks: 1
Modules: 5
Modules including duplicates: 5
Modules pre chunk: 5
Modules first chunk: 5
     output.js:     2279 characters
output.js
    0 [...]\examples\loader\example.js
       main
    1 [...]\buildin\__webpack_console.js
       require (3x) from [...]\examples\loader\example.js
    2 [...]\examples\loader\loader.js![...]\examples\loader\file.js
       require (1x) from [...]\examples\loader\example.js
    3 [...]\require-polyfill.web.js
       require (1x) from [...]\examples\loader\example.js
    4 [...]\node_modules\json-loader.js![...]\examples\loader\test.json
       require (1x) from [...]\examples\loader\example.js
       require (1x) from [...]\examples\loader\example.js
```