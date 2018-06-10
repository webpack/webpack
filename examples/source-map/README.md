This example demonstrates various types of source-maps.

# example.coffee

``` coffeescript
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

``` javascript
var path = require("path");

module.exports = [
	"cheap-eval-source-map",
	"cheap-module-eval-source-map",
	"cheap-module-source-map",
	"cheap-source-map",
	"eval",
	"eval-source-map",
	"hidden-source-map",
	"inline-source-map",
	"nosources-source-map",
	"source-map"
].map(devtool => ({
	mode: "development",
	entry: {
		bundle: "coffee-loader!./example.coffee"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: `./[name]-${devtool}.js`
	},
	devtool,
	optimization: {
		runtimeChunk: true
	}
}));
```

# Generated source-maps

## source-map.js and source-map.js.map
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

var math, race,
  slice = [].slice;

math = {
  root: Math.sqrt,
  square: square,
  cube: function(x) {
    return x * square(x);
  }
};

race = function() {
  var runners, winner;
  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  return print(winner, runners);
};


/***/ })
],[[0,1]]]);
//# sourceMappingURL=bundle-source-map.js.map
```

``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\r\n\r\n# Objects:\r\nmath =\r\n  root:   Math.sqrt\r\n  square: square\r\n  cube:   (x) -> x * square x\r\n\r\n# Splats:\r\nrace = (winner, runners...) ->\r\n  print winner, runners\r\n"],"sourceRoot":""}
```

## hidden-source-map.js and hidden-source-map.js.map
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

var math, race,
  slice = [].slice;

math = {
  root: Math.sqrt,
  square: square,
  cube: function(x) {
    return x * square(x);
  }
};

race = function() {
  var runners, winner;
  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  return print(winner, runners);
};


/***/ })
],[[0,1]]]);
```

``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-hidden-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\r\n\r\n# Objects:\r\nmath =\r\n  root:   Math.sqrt\r\n  square: square\r\n  cube:   (x) -> x * square x\r\n\r\n# Splats:\r\nrace = (winner, runners...) ->\r\n  print winner, runners\r\n"],"sourceRoot":""}
```

## inline-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

var math, race,
  slice = [].slice;

math = {
  root: Math.sqrt,
  square: square,
  cube: function(x) {
    return x * square(x);
  }
};

race = function() {
  var runners, winner;
  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  return print(winner, runners);
};


/***/ })
],[[0,1]]]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUdBO0VBQUE7O0FBQUEsT0FDRTtFQUFBLE1BQVEsSUFBSSxDQUFDLElBQWI7RUFDQSxRQUFRLE1BRFI7RUFFQSxNQUFRLFNBQUMsQ0FBRDtXQUFPLElBQUksT0FBTyxDQUFQO0VBQVgsQ0FGUjs7O0FBS0YsT0FBTztBQUNMO0VBRE0sdUJBQVE7U0FDZCxNQUFNLE1BQU4sRUFBYyxPQUFkO0FBREsiLCJmaWxlIjoiLi9idW5kbGUtaW5saW5lLXNvdXJjZS1tYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIjIFRha2VuIGZyb20gaHR0cDovL2NvZmZlZXNjcmlwdC5vcmcvXHJcblxyXG4jIE9iamVjdHM6XHJcbm1hdGggPVxyXG4gIHJvb3Q6ICAgTWF0aC5zcXJ0XHJcbiAgc3F1YXJlOiBzcXVhcmVcclxuICBjdWJlOiAgICh4KSAtPiB4ICogc3F1YXJlIHhcclxuXHJcbiMgU3BsYXRzOlxyXG5yYWNlID0gKHdpbm5lciwgcnVubmVycy4uLikgLT5cclxuICBwcmludCB3aW5uZXIsIHJ1bm5lcnNcclxuIl0sInNvdXJjZVJvb3QiOiIifQ==
```

## nosources-source-map.js.map
``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-nosources-source-map.js","sourceRoot":""}
```

## eval-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZT8yNDE2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBO0VBQUE7O0FBQUEsT0FDRTtFQUFBLE1BQVEsSUFBSSxDQUFDLElBQWI7RUFDQSxRQUFRLE1BRFI7RUFFQSxNQUFRLFNBQUMsQ0FBRDtXQUFPLElBQUksT0FBTyxDQUFQO0VBQVgsQ0FGUjs7O0FBS0YsT0FBTztBQUNMO0VBRE0sdUJBQVE7U0FDZCxNQUFNLE1BQU4sRUFBYyxPQUFkO0FBREsiLCJmaWxlIjoiMC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiMgVGFrZW4gZnJvbSBodHRwOi8vY29mZmVlc2NyaXB0Lm9yZy9cclxuXHJcbiMgT2JqZWN0czpcclxubWF0aCA9XHJcbiAgcm9vdDogICBNYXRoLnNxcnRcclxuICBzcXVhcmU6IHNxdWFyZVxyXG4gIGN1YmU6ICAgKHgpIC0+IHggKiBzcXVhcmUgeFxyXG5cclxuIyBTcGxhdHM6XHJcbnJhY2UgPSAod2lubmVyLCBydW5uZXJzLi4uKSAtPlxyXG4gIHByaW50IHdpbm5lciwgcnVubmVyc1xyXG4iXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[[0,1]]]);
```

## eval.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n\n\n//# sourceURL=webpack:///./example.coffee?(webpack)/node_modules/coffee-loader");

/***/ })
],[[0,1]]]);
```

## cheap-eval-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlP2MxNzAiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIG1hdGgsIHJhY2UsXG4gIHNsaWNlID0gW10uc2xpY2U7XG5cbm1hdGggPSB7XG4gIHJvb3Q6IE1hdGguc3FydCxcbiAgc3F1YXJlOiBzcXVhcmUsXG4gIGN1YmU6IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geCAqIHNxdWFyZSh4KTtcbiAgfVxufTtcblxucmFjZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcnVubmVycywgd2lubmVyO1xuICB3aW5uZXIgPSBhcmd1bWVudHNbMF0sIHJ1bm5lcnMgPSAyIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgOiBbXTtcbiAgcmV0dXJuIHByaW50KHdpbm5lciwgcnVubmVycyk7XG59O1xuIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTsiLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[[0,1]]]);
```

## cheap-module-eval-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlPzI0MTYiXSwic291cmNlc0NvbnRlbnQiOlsiIyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xyXG5cclxuIyBPYmplY3RzOlxyXG5tYXRoID1cclxuICByb290OiAgIE1hdGguc3FydFxyXG4gIHNxdWFyZTogc3F1YXJlXHJcbiAgY3ViZTogICAoeCkgLT4geCAqIHNxdWFyZSB4XHJcblxyXG4jIFNwbGF0czpcclxucmFjZSA9ICh3aW5uZXIsIHJ1bm5lcnMuLi4pIC0+XHJcbiAgcHJpbnQgd2lubmVyLCBydW5uZXJzXHJcbiJdLCJtYXBwaW5ncyI6IkFBR0E7QUFBQTtBQUNBO0FBREE7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUFBOzs7QUFHQTtBQUNBO0FBREE7QUFDQTtBQURBOyIsInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],[[0,1]]]);
```

## cheap-module-source-map.js.map
``` javascript
{"version":3,"file":"./bundle-cheap-module-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["# Taken from http://coffeescript.org/\r\n\r\n# Objects:\r\nmath =\r\n  root:   Math.sqrt\r\n  square: square\r\n  cube:   (x) -> x * square x\r\n\r\n# Splats:\r\nrace = (winner, runners...) ->\r\n  print winner, runners\r\n"],"mappings":";;;;;;;;AAGA;AAAA;AACA;AADA;AACA;AACA;AACA;AAAA;AAAA;;;AAGA;AACA;AADA;AACA;AADA;;;;A","sourceRoot":""}
```

## cheap-source-map.js.map
``` javascript
{"version":3,"file":"./bundle-cheap-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n"],"mappings":";;;;;;;;AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;;A","sourceRoot":""}
```

# webpack output

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                        Asset      Size  Chunks             Chunk Names
            ./bundle-cheap-eval-source-map.js   1.5 KiB       0  [emitted]  bundle
    ./runtime~bundle-cheap-eval-source-map.js  5.06 KiB       1  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-cheap-eval-source-map.js ./bundle-cheap-eval-source-map.js
    chunk    {0} ./bundle-cheap-eval-source-map.js (bundle) 308 bytes ={1}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
         single entry coffee-loader!./example.coffee  bundle
    chunk    {1} ./runtime~bundle-cheap-eval-source-map.js (runtime~bundle) 0 bytes ={0}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                               Asset      Size  Chunks             Chunk Names
            ./bundle-cheap-module-eval-source-map.js  1.36 KiB       0  [emitted]  bundle
    ./runtime~bundle-cheap-module-eval-source-map.js  5.06 KiB       1  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-cheap-module-eval-source-map.js ./bundle-cheap-module-eval-source-map.js
    chunk    {0} ./bundle-cheap-module-eval-source-map.js (bundle) 308 bytes ={1}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
         single entry coffee-loader!./example.coffee  bundle
    chunk    {1} ./runtime~bundle-cheap-module-eval-source-map.js (runtime~bundle) 0 bytes ={0}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                              Asset       Size  Chunks             Chunk Names
                ./bundle-cheap-module-source-map.js  733 bytes       0  [emitted]  bundle
        ./runtime~bundle-cheap-module-source-map.js   5.13 KiB       1  [emitted]  runtime~bundle
            ./bundle-cheap-module-source-map.js.map  459 bytes       0  [emitted]  bundle
    ./runtime~bundle-cheap-module-source-map.js.map   5.04 KiB       1  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-cheap-module-source-map.js ./runtime~bundle-cheap-module-source-map.js.map ./bundle-cheap-module-source-map.js ./bundle-cheap-module-source-map.js.map
    chunk    {0} ./bundle-cheap-module-source-map.js, ./bundle-cheap-module-source-map.js.map (bundle) 308 bytes ={1}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
         single entry coffee-loader!./example.coffee  bundle
    chunk    {1} ./runtime~bundle-cheap-module-source-map.js, ./runtime~bundle-cheap-module-source-map.js.map (runtime~bundle) 0 bytes ={0}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                       Asset       Size  Chunks             Chunk Names
                ./bundle-cheap-source-map.js  726 bytes       0  [emitted]  bundle
        ./runtime~bundle-cheap-source-map.js   5.12 KiB       1  [emitted]  runtime~bundle
            ./bundle-cheap-source-map.js.map  561 bytes       0  [emitted]  bundle
    ./runtime~bundle-cheap-source-map.js.map   5.03 KiB       1  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-cheap-source-map.js ./runtime~bundle-cheap-source-map.js.map ./bundle-cheap-source-map.js ./bundle-cheap-source-map.js.map
    chunk    {0} ./bundle-cheap-source-map.js, ./bundle-cheap-source-map.js.map (bundle) 308 bytes ={1}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
         single entry coffee-loader!./example.coffee  bundle
    chunk    {1} ./runtime~bundle-cheap-source-map.js, ./runtime~bundle-cheap-source-map.js.map (runtime~bundle) 0 bytes ={0}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                       Asset       Size  Chunks             Chunk Names
            ./bundle-eval.js  781 bytes       0  [emitted]  bundle
    ./runtime~bundle-eval.js   5.06 KiB       1  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-eval.js ./bundle-eval.js
    chunk    {0} ./bundle-eval.js (bundle) 308 bytes ={1}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
         single entry coffee-loader!./example.coffee  bundle
    chunk    {1} ./runtime~bundle-eval.js (runtime~bundle) 0 bytes ={0}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                  Asset      Size  Chunks             Chunk Names
            ./bundle-eval-source-map.js  1.49 KiB       0  [emitted]  bundle
    ./runtime~bundle-eval-source-map.js  5.06 KiB       1  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-eval-source-map.js ./bundle-eval-source-map.js
    chunk    {0} ./bundle-eval-source-map.js (bundle) 308 bytes ={1}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
         single entry coffee-loader!./example.coffee  bundle
    chunk    {1} ./runtime~bundle-eval-source-map.js (runtime~bundle) 0 bytes ={0}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                        Asset       Size  Chunks             Chunk Names
                ./bundle-hidden-source-map.js  674 bytes       0  [emitted]  bundle
        ./runtime~bundle-hidden-source-map.js   5.06 KiB       1  [emitted]  runtime~bundle
            ./bundle-hidden-source-map.js.map  556 bytes       0  [emitted]  bundle
    ./runtime~bundle-hidden-source-map.js.map   5.08 KiB       1  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-hidden-source-map.js ./runtime~bundle-hidden-source-map.js.map ./bundle-hidden-source-map.js ./bundle-hidden-source-map.js.map
    chunk    {0} ./bundle-hidden-source-map.js, ./bundle-hidden-source-map.js.map (bundle) 308 bytes ={1}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
         single entry coffee-loader!./example.coffee  bundle
    chunk    {1} ./runtime~bundle-hidden-source-map.js, ./runtime~bundle-hidden-source-map.js.map (runtime~bundle) 0 bytes ={0}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                    Asset      Size  Chunks             Chunk Names
            ./bundle-inline-source-map.js  1.45 KiB       0  [emitted]  bundle
    ./runtime~bundle-inline-source-map.js  11.9 KiB       1  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-inline-source-map.js ./bundle-inline-source-map.js
    chunk    {0} ./bundle-inline-source-map.js (bundle) 308 bytes ={1}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
         single entry coffee-loader!./example.coffee  bundle
    chunk    {1} ./runtime~bundle-inline-source-map.js (runtime~bundle) 0 bytes ={0}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                           Asset       Size  Chunks             Chunk Names
                ./bundle-nosources-source-map.js  730 bytes       0  [emitted]  bundle
        ./runtime~bundle-nosources-source-map.js   5.12 KiB       1  [emitted]  runtime~bundle
            ./bundle-nosources-source-map.js.map  314 bytes       0  [emitted]  bundle
    ./runtime~bundle-nosources-source-map.js.map  848 bytes       1  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-nosources-source-map.js ./runtime~bundle-nosources-source-map.js.map ./bundle-nosources-source-map.js ./bundle-nosources-source-map.js.map
    chunk    {0} ./bundle-nosources-source-map.js, ./bundle-nosources-source-map.js.map (bundle) 308 bytes ={1}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
         single entry coffee-loader!./example.coffee  bundle
    chunk    {1} ./runtime~bundle-nosources-source-map.js, ./runtime~bundle-nosources-source-map.js.map (runtime~bundle) 0 bytes ={0}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                                 Asset       Size  Chunks             Chunk Names
                ./bundle-source-map.js  720 bytes       0  [emitted]  bundle
        ./runtime~bundle-source-map.js   5.11 KiB       1  [emitted]  runtime~bundle
            ./bundle-source-map.js.map  549 bytes       0  [emitted]  bundle
    ./runtime~bundle-source-map.js.map   5.07 KiB       1  [emitted]  runtime~bundle
    Entrypoint bundle = ./runtime~bundle-source-map.js ./runtime~bundle-source-map.js.map ./bundle-source-map.js ./bundle-source-map.js.map
    chunk    {0} ./bundle-source-map.js, ./bundle-source-map.js.map (bundle) 308 bytes ={1}= [initial] [rendered]
        > coffee-loader!./example.coffee bundle
     [0] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {0} [built]
         single entry coffee-loader!./example.coffee  bundle
    chunk    {1} ./runtime~bundle-source-map.js, ./runtime~bundle-source-map.js.map (runtime~bundle) 0 bytes ={0}= [entry] [rendered]
        > coffee-loader!./example.coffee bundle
```
