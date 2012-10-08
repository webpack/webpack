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

/******/ /* WEBPACK FREE VAR INJECTION */ (function(console) {
// Polyfill require for node.js usage of loaders
require = require("../../require-polyfill")(require.valueOf());

// use our loader
console.dir(require(/* ./loader!./file */3));

// use buildin json loader
console.dir(require(/* ./test.json */2)); // default by extension
console.dir(require(/* json!./test.json */2)); // manual
/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/* __webpack_console */1)))

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

/*** .\loader.js!.\file.js ***/

exports.answer = 42;
exports.foo = "bar";

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
Hash: 847d13b98159af41faccdda862ec3e8d
Compile Time: 53ms
Chunks: 1
Modules: 4
Modules including duplicates: 4
Modules first chunk: 4
main   output.js:     2342 chars/bytes 

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0       336  .\example.js
       main
    1       516  (webpack)\buildin\__webpack_console.js
       require (3x) from .\example.js
    2        36  (webpack)\~\json-loader!.\test.json
       require (1x) from .\example.js
       require (1x) from .\example.js
    3        41  .\loader.js!.\file.js
       require (1x) from .\example.js
ERROR: Cannot find module '../../require-polyfill'
 Error: Module "../../require-polyfill" not found in context "."
  Error: Non of this files exists: C:\Users\Sokrates\Eigene Repos\node_modules\webpack\require-polyfill, C:\Users\Sokrates\Eigene Repos\node_modules\webpack\require-polyfill.webpack.js, C:\Users\Sokrates\Eigene Repos\node_modules\webpack\require-polyfill.web.js, C:\Users\Sokrates\Eigene Repos\node_modules\webpack\require-polyfill.js
 @ .\example.js (line 2, column 17)
```