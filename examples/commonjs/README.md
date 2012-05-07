
# example.js

``` javascript
var inc = require('./increment').increment;
var a = 1;
inc(a); // 2
```

# increment.js

``` javascript
var add = require('./math').add;
exports.increment = function(val) {
    return add(val, 1);
};
```

# math.coffee

``` javascript
exports.add = function() {
    var sum = 0, i = 0, args = arguments, l = args.length;
    while (i < l) {
        sum += args[i++];
    }
    return sum;
};
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

var inc = require(/* ./increment */1).increment;
var a = 1;
inc(a); // 2

/******/},
/******/
/******/1: function(module, exports, require) {

var add = require(/* ./math */2).add;
exports.increment = function(val) {
    return add(val, 1);
};

/******/},
/******/
/******/2: function(module, exports, require) {

exports.add = function() {
    var sum = 0, i = 0, args = arguments, l = args.length;
    while (i < l) {
        sum += args[i++];
    }
    return sum;
};

/******/},
/******/
/******/})
```

# Info

## Uncompressed

```
Hash: fd525ff3a1f70cdfbaa4f2003c62cef1
Chunks: 1
Modules: 3
Modules including duplicates: 3
Modules pre chunk: 3
Modules first chunk: 3
   output.js:     1200 characters

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0        74  .\example.js
       main
    1       103  .\increment.js
       require (1x) from .\example.js
    2       162  .\math.js
       require (1x) from .\increment.js
```

## Minimized (uglify-js, no zip)

```
Hash: fd525ff3a1f70cdfbaa4f2003c62cef1
Chunks: 1
Modules: 3
Modules including duplicates: 3
Modules pre chunk: 3
Modules first chunk: 3
   output.js:      461 characters

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0        39  .\example.js
       main
    1        69  .\increment.js
       require (1x) from .\example.js
    2        87  .\math.js
       require (1x) from .\increment.js
```