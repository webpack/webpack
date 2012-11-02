# example.js

``` javascript
// CommonJs-style requires
var commonjs1 = require("./commonjs");
var amd1 = require("./amd");

// AMD-style requires (with all webpack features)
require([
	"./commonjs", "./amd",
	"../require.context/templates/"+amd1+".js",
	Math.random() < 0.5 ? "./commonjs" : "./amd"],
	function(commonjs2, amd2, template, randModule) {
		// Do something with it...
	}
);
```

# amd.js

``` javascript
// AMD Module Format
define(
	"app/amd",
	["./commonjs"],
	function(commonjs1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = require("./commonjs");
		// Do something...
		return 456;
	}
);
```

# commonjs.js

``` javascript
// CommonJs Module Format
module.exports = 123;

// but you can use amd.style requires
require(
	["./amd"],
	function(amd1) {
		var amd2 = require("./amd");
	}
);
```


# js/output.js

``` javascript
/******/(function(document, undefined) {
/******/	return function(modules) {
/******/		var installedModules = {}, installedChunks = {0:1};
/******/		function require(moduleId) {
/******/			if(typeof moduleId !== "number") throw new Error("Cannot find module '"+moduleId+"'");
/******/			if(installedModules[moduleId])
/******/				return installedModules[moduleId].exports;
/******/			var module = installedModules[moduleId] = {
/******/				exports: {},
/******/				id: moduleId,
/******/				loaded: false
/******/			};
/******/			modules[moduleId](module, module.exports, require);
/******/			module.loaded = true;
/******/			return module.exports;
/******/		}
/******/		require.e = function(chunkId, callback) {
/******/			if(installedChunks[chunkId] === 1) return callback(require);
/******/			if(installedChunks[chunkId] !== undefined)
/******/				installedChunks[chunkId].push(callback);
/******/			else {
/******/				installedChunks[chunkId] = [callback];
/******/				var head = document.getElementsByTagName('head')[0];
/******/				var script = document.createElement('script');
/******/				script.type = 'text/javascript';
/******/				script.charset = 'utf-8';
/******/				script.src = modules.c+chunkId+modules.a;
/******/				head.appendChild(script);
/******/			}
/******/		};
/******/		require.modules = modules;
/******/		require.cache = installedModules;
/******/		window[modules.b] = function(chunkId, moreModules) {
/******/			for(var moduleId in moreModules)
/******/				modules[moduleId] = moreModules[moduleId];
/******/			var callbacks = installedChunks[chunkId];
/******/			installedChunks[chunkId] = 1;
/******/			for(var i = 0; i < callbacks.length; i++)
/******/				callbacks[i](require);
/******/		};
/******/		return require(0);
/******/	}
/******/})(document)
/******/({a:".output.js",b:"webpackJsonp",c:"",
/******/0: function(module, exports, require) {

/*** .\example.js ***/

/******/ /* WEBPACK FREE VAR INJECTION */ (function(require) {
// CommonJs-style requires
var commonjs1 = require(/* ./commonjs */2);
var amd1 = require(/* ./amd */1);

// AMD-style requires (with all webpack features)
require(1, function() { return [
	require(/* ./commonjs */2), require(/* ./amd */1),
	require(/* ../require.context/templates */6)("./"+amd1+".js"),
	Math.random() < 0.5 ? require(/* ./commonjs */2) : require(/* ./amd */1)]},
	function(commonjs2, amd2, template, randModule) {
		// Do something with it...
	}
);
/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/* __webpack_amd_require */3)))

/******/},
/******/
/******/1: function(module, exports, require) {

/*** .\amd.js ***/

/******/ /* WEBPACK FREE VAR INJECTION */ (function(define) {
// AMD Module Format
define(
	/* app/amd */0,
	[require(/* ./commonjs */2)],
	function(commonjs1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = require(/* ./commonjs */2);
		// Do something...
		return 456;
	}
);
/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/* __webpack_amd_define */4)(module)))

/******/},
/******/
/******/2: function(module, exports, require) {

/*** .\commonjs.js ***/

/******/ /* WEBPACK FREE VAR INJECTION */ (function(require) {
// CommonJs Module Format
module.exports = 123;

// but you can use amd.style requires
require(
	0, function() { return [require(/* ./amd */1)]},
	function(amd1) {
		var amd2 = require(/* ./amd */1);
	}
);
/******/ /* WEBPACK FREE VAR INJECTION */ }(require(/* __webpack_amd_require */3)))

/******/},
/******/
/******/3: function(module, exports, require) {

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
amdRequire.amd = require(/* ./__webpack_options_amd.loader.js!./__webpack_options_amd.loader.js */5);
amdRequire.config = function() {/* config is ignored, use webpack options */};
module.exports = amdRequire;


/******/},
/******/
/******/4: function(module, exports, require) {

/*** (webpack)\buildin\__webpack_amd_define.js ***/

var amdRequire = require(/* ./__webpack_amd_require */3);
module.exports = function(module) {
	function define(id, dependencies, factory) {
		if(typeof id != "number") {
			factory = dependencies;
			dependencies = id;
			id = null;
		}
		if(!factory) {
			factory = dependencies;
			dependencies = [amdRequire, module.exports, module];
		}
		var result = typeof factory == "function" ? factory.apply(null, dependencies) : factory;
		if(result !== undefined)
			module.exports = result;
		return module.exports;
	}
	define.amd = amdRequire.amd;
	return define;
}

/******/},
/******/
/******/5: function(module, exports, require) {

/*** (webpack)\buildin\__webpack_options_amd.loader.js!(webpack)\buildin\__webpack_options_amd.loader.js ***/

/* empty to return {} */

/******/}
/******/})
```

# js/1.output.js

``` javascript
/******/webpackJsonp(1,{
/******/6: function(module, exports, require) {

/*** (webpack)\examples\require.context\templates ***/

/***/	var map = {"./a.js":7,"./b.js":8,"./c.js":9};
/***/	exports = module.exports = function(name) {
/***/		return require(exports.id(name) || name)
/***/	};
/***/	exports.id = function(name) {
/***/		return map[name] || map[name+".js"];
/***/	};
/***/	exports.keys = function() {
/***/		return Object.keys(map);
/***/	};

/******/},
/******/
/******/7: function(module, exports, require) {

/*** (webpack)\examples\require.context\templates\a.js ***/

module.exports = function() {
	return "This text was generated by template A";
}

/******/},
/******/
/******/8: function(module, exports, require) {

/*** (webpack)\examples\require.context\templates\b.js ***/

module.exports = function() {
	return "This text was generated by template B";
}

/******/},
/******/
/******/9: function(module, exports, require) {

/*** (webpack)\examples\require.context\templates\c.js ***/

module.exports = function() {
	return "This text was generated by template C";
}

/******/}
/******/})
```

# Info

## Uncompressed

```
Hash: 3872a8625fcbd6c38f747d2f3e6913be
Compile Time: 50ms
Chunks: 2
Modules: 10
Modules including duplicates: 10
Modules first chunk: 6
main     output.js:     5094 chars/bytes
       1.output.js:     1116 chars/bytes

 <id>    <size>  <filename>
       <reason> from <filename>
output.js
    0       479  .\example.js
       main
    1       242  .\amd.js
       require (3x) from .\example.js
       async require (2x) from .\commonjs.js
    2       214  .\commonjs.js
       require (3x) from .\example.js
       require (2x) from .\amd.js
    3       518  (webpack)\buildin\__webpack_amd_require.js
       require (1x) from .\example.js
       require (1x) from .\commonjs.js
       require (1x) from (webpack)\buildin\__webpack_amd_define.js
    4       581  (webpack)\buildin\__webpack_amd_define.js
       require (1x) from .\amd.js
    5        24  (webpack)\buildin\__webpack_options_amd.loader.js!(webpack)\buildin\__webpack_options_amd.loader.js
       require (1x) from (webpack)\buildin\__webpack_amd_require.js
1.output.js
    6       322  [context] (webpack)\examples\require.context\templates
       async context from .\example.js
    7        82  (webpack)\examples\require.context\templates\a.js
       async context from .\example.js
    8        82  (webpack)\examples\require.context\templates\b.js
       async context from .\example.js
    9        82  (webpack)\examples\require.context\templates\c.js
       async context from .\example.js
```

## Graph

![webpack-graph](http://webpack.github.com/webpack/examples/mixed/graph.svg)
