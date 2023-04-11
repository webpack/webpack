This example is an generic project of source-maps.

# example.coffee

```coffeescript
# Taken from http://coffeescript.org/

# Objects:
math =
  root:   Math.sqrt
  square: square
  cube:   (x) -> x * square x

# Splats:
race = (winner, runners...) ->
  print winner, runners
```

# webpack.config.js

```javascript
module.exports = env => ({
	mode: env,
	entry: "./example.coffee",
	devtool: env === "development" ? "cheap-eval-source-map" : "source-map",
	module: {
		rules: [{ test: /\.coffee$/, use: "coffee-loader" }]
	}
});
```

# Generated source-maps

## development mode

```javascript
/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/*!************************!*\
  !*** ./example.coffee ***!
  \************************/
// Taken from http://coffeescript.org/

// Objects:
var math, race;

math = {
  root: Math.sqrt,
  square: square,
  cube: function(x) {
    return x * square(x);
  }
};

// Splats:
race = function(winner, ...runners) {
  return print(winner, runners);
};

/******/ })()
;
//# sourceMappingURL=main.js.map
```

## production mode

```javascript
Math.sqrt,square;
//# sourceMappingURL=main.js.map
```

```javascript
{"version":3,"file":"main.js","mappings":"AAIUA,KAAKC,KACLC","sources":["webpack:///./example.coffee"],"sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"names":["Math","sqrt","square"],"sourceRoot":""}
```

# webpack output

```
asset main.js 533 bytes [emitted] (name: main) 1 related asset
chunk (runtime: main) main.js (main) 256 bytes [entry] [rendered]
  > ./example.coffee main
  ./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.coffee main
webpack 5.78.0 compiled successfully
```
