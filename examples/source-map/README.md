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
var webpack = require("../../");

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
	"source-map",
].map(devtool => ({
	mode: "development",
	entry: {
		bundle: "coffee-loader!./example.coffee",
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: `./[name]-${devtool}.js`,
	},
	devtool,
	plugins: [
		new webpack.optimize.CommonsChunkPlugin(["manifest"]),
	],
}));
```

# Generated source-maps

## source-map.js and source-map.js.map
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["bundle"],{

/***/ "../../node_modules/coffee-loader/index.js!./example.coffee":
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

},[["../../node_modules/coffee-loader/index.js!./example.coffee","manifest","bundle"]]]);
//# sourceMappingURL=bundle-source-map.js.map
```

``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\r\n\r\n# Objects:\r\nmath =\r\n  root:   Math.sqrt\r\n  square: square\r\n  cube:   (x) -> x * square x\r\n\r\n# Splats:\r\nrace = (winner, runners...) ->\r\n  print winner, runners\r\n\n\n\n// WEBPACK FOOTER //\n// ./example.coffee"],"sourceRoot":""}
```

## hidden-source-map.js and hidden-source-map.js.map
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["bundle"],{

/***/ "../../node_modules/coffee-loader/index.js!./example.coffee":
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

},[["../../node_modules/coffee-loader/index.js!./example.coffee","manifest","bundle"]]]);
```

``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-hidden-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\r\n\r\n# Objects:\r\nmath =\r\n  root:   Math.sqrt\r\n  square: square\r\n  cube:   (x) -> x * square x\r\n\r\n# Splats:\r\nrace = (winner, runners...) ->\r\n  print winner, runners\r\n\n\n\n// WEBPACK FOOTER //\n// ./example.coffee"],"sourceRoot":""}
```

## inline-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["bundle"],{

/***/ "../../node_modules/coffee-loader/index.js!./example.coffee":
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

},[["../../node_modules/coffee-loader/index.js!./example.coffee","manifest","bundle"]]]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFHQTtFQUFBOztBQUFBLE9BQ0U7RUFBQSxNQUFRLElBQUksQ0FBQyxJQUFiO0VBQ0EsUUFBUSxNQURSO0VBRUEsTUFBUSxTQUFDLENBQUQ7V0FBTyxJQUFJLE9BQU8sQ0FBUDtFQUFYLENBRlI7OztBQUtGLE9BQU87QUFDTDtFQURNLHVCQUFRO1NBQ2QsTUFBTSxNQUFOLEVBQWMsT0FBZDtBQURLIiwiZmlsZSI6Ii4vYnVuZGxlLWlubGluZS1zb3VyY2UtbWFwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xyXG5cclxuIyBPYmplY3RzOlxyXG5tYXRoID1cclxuICByb290OiAgIE1hdGguc3FydFxyXG4gIHNxdWFyZTogc3F1YXJlXHJcbiAgY3ViZTogICAoeCkgLT4geCAqIHNxdWFyZSB4XHJcblxyXG4jIFNwbGF0czpcclxucmFjZSA9ICh3aW5uZXIsIHJ1bm5lcnMuLi4pIC0+XHJcbiAgcHJpbnQgd2lubmVyLCBydW5uZXJzXHJcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL2V4YW1wbGUuY29mZmVlIl0sInNvdXJjZVJvb3QiOiIifQ==
```

## nosources-source-map.js.map
``` javascript
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAGA;EAAA;;AAAA,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX,CAFR;;;AAKF,OAAO;AACL;EADM,uBAAQ;SACd,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-nosources-source-map.js","sourceRoot":""}
```

## eval-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["bundle"],{

/***/ "../../node_modules/coffee-loader/index.js!./example.coffee":
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZT85MWU1Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBO0VBQUE7O0FBQUEsT0FDRTtFQUFBLE1BQVEsSUFBSSxDQUFDLElBQWI7RUFDQSxRQUFRLE1BRFI7RUFFQSxNQUFRLFNBQUMsQ0FBRDtXQUFPLElBQUksT0FBTyxDQUFQO0VBQVgsQ0FGUjs7O0FBS0YsT0FBTztBQUNMO0VBRE0sdUJBQVE7U0FDZCxNQUFNLE1BQU4sRUFBYyxPQUFkO0FBREsiLCJmaWxlIjoiLi4vLi4vbm9kZV9tb2R1bGVzL2NvZmZlZS1sb2FkZXIvaW5kZXguanMhLi9leGFtcGxlLmNvZmZlZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIiMgVGFrZW4gZnJvbSBodHRwOi8vY29mZmVlc2NyaXB0Lm9yZy9cclxuXHJcbiMgT2JqZWN0czpcclxubWF0aCA9XHJcbiAgcm9vdDogICBNYXRoLnNxcnRcclxuICBzcXVhcmU6IHNxdWFyZVxyXG4gIGN1YmU6ICAgKHgpIC0+IHggKiBzcXVhcmUgeFxyXG5cclxuIyBTcGxhdHM6XHJcbnJhY2UgPSAod2lubmVyLCBydW5uZXJzLi4uKSAtPlxyXG4gIHByaW50IHdpbm5lciwgcnVubmVyc1xyXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9leGFtcGxlLmNvZmZlZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///../../node_modules/coffee-loader/index.js!./example.coffee\n");

/***/ })

},[["../../node_modules/coffee-loader/index.js!./example.coffee","manifest","bundle"]]]);
```

## eval.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["bundle"],{

/***/ "../../node_modules/coffee-loader/index.js!./example.coffee":
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n\n\n//////////////////\n// WEBPACK FOOTER\n// (webpack)/node_modules/coffee-loader!./example.coffee\n// module id = ../../node_modules/coffee-loader/index.js!./example.coffee\n// module chunks = bundle\n\n//# sourceURL=webpack:///./example.coffee?(webpack)/node_modules/coffee-loader");

/***/ })

},[["../../node_modules/coffee-loader/index.js!./example.coffee","manifest","bundle"]]]);
```

## cheap-eval-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["bundle"],{

/***/ "../../node_modules/coffee-loader/index.js!./example.coffee":
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi4vLi4vbm9kZV9tb2R1bGVzL2NvZmZlZS1sb2FkZXIvaW5kZXguanMhLi9leGFtcGxlLmNvZmZlZS5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlPzA5MjciXSwic291cmNlc0NvbnRlbnQiOlsidmFyIG1hdGgsIHJhY2UsXG4gIHNsaWNlID0gW10uc2xpY2U7XG5cbm1hdGggPSB7XG4gIHJvb3Q6IE1hdGguc3FydCxcbiAgc3F1YXJlOiBzcXVhcmUsXG4gIGN1YmU6IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geCAqIHNxdWFyZSh4KTtcbiAgfVxufTtcblxucmFjZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcnVubmVycywgd2lubmVyO1xuICB3aW5uZXIgPSBhcmd1bWVudHNbMF0sIHJ1bm5lcnMgPSAyIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgOiBbXTtcbiAgcmV0dXJuIHByaW50KHdpbm5lciwgcnVubmVycyk7XG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gKHdlYnBhY2spL25vZGVfbW9kdWxlcy9jb2ZmZWUtbG9hZGVyIS4vZXhhbXBsZS5jb2ZmZWVcbi8vIG1vZHVsZSBpZCA9IC4uLy4uL25vZGVfbW9kdWxlcy9jb2ZmZWUtbG9hZGVyL2luZGV4LmpzIS4vZXhhbXBsZS5jb2ZmZWVcbi8vIG1vZHVsZSBjaHVua3MgPSBidW5kbGUiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOyIsInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///../../node_modules/coffee-loader/index.js!./example.coffee\n");

/***/ })

},[["../../node_modules/coffee-loader/index.js!./example.coffee","manifest","bundle"]]]);
```

## cheap-module-eval-source-map.js
``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["bundle"],{

/***/ "../../node_modules/coffee-loader/index.js!./example.coffee":
/*!*************************************************************!*\
  !*** (webpack)/node_modules/coffee-loader!./example.coffee ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi4vLi4vbm9kZV9tb2R1bGVzL2NvZmZlZS1sb2FkZXIvaW5kZXguanMhLi9leGFtcGxlLmNvZmZlZS5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlPzkxZTUiXSwic291cmNlc0NvbnRlbnQiOlsiIyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xyXG5cclxuIyBPYmplY3RzOlxyXG5tYXRoID1cclxuICByb290OiAgIE1hdGguc3FydFxyXG4gIHNxdWFyZTogc3F1YXJlXHJcbiAgY3ViZTogICAoeCkgLT4geCAqIHNxdWFyZSB4XHJcblxyXG4jIFNwbGF0czpcclxucmFjZSA9ICh3aW5uZXIsIHJ1bm5lcnMuLi4pIC0+XHJcbiAgcHJpbnQgd2lubmVyLCBydW5uZXJzXHJcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL2V4YW1wbGUuY29mZmVlIl0sIm1hcHBpbmdzIjoiQUFHQTtBQUFBO0FBQ0E7QUFEQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQUE7OztBQUdBO0FBQ0E7QUFEQTtBQUNBO0FBREE7Iiwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///../../node_modules/coffee-loader/index.js!./example.coffee\n");

/***/ })

},[["../../node_modules/coffee-loader/index.js!./example.coffee","manifest","bundle"]]]);
```

## cheap-module-source-map.js.map
``` javascript
{"version":3,"file":"./bundle-cheap-module-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["# Taken from http://coffeescript.org/\r\n\r\n# Objects:\r\nmath =\r\n  root:   Math.sqrt\r\n  square: square\r\n  cube:   (x) -> x * square x\r\n\r\n# Splats:\r\nrace = (winner, runners...) ->\r\n  print winner, runners\r\n\n\n\n// WEBPACK FOOTER //\n// ./example.coffee"],"mappings":";;;;;;;;;AAGA;AAAA;AACA;AADA;AACA;AACA;AACA;AAAA;AAAA;;;AAGA;AACA;AADA;AACA;AADA;;;;;A","sourceRoot":""}
```

## cheap-source-map.js.map
``` javascript
{"version":3,"file":"./bundle-cheap-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["var math, race,\n  slice = [].slice;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\nrace = function() {\n  var runners, winner;\n  winner = arguments[0], runners = 2 <= arguments.length ? slice.call(arguments, 1) : [];\n  return print(winner, runners);\n};\n\n\n\n//////////////////\n// WEBPACK FOOTER\n// (webpack)/node_modules/coffee-loader!./example.coffee\n// module id = ../../node_modules/coffee-loader/index.js!./example.coffee\n// module chunks = bundle"],"mappings":";;;;;;;;;AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;;;A","sourceRoot":""}
```

# webpack output

```
Hash: 78499e602826e502f04e23aeb90775edc42bc235d254d61a567196f9035f7d2dea95838abda6ced5c59cc8c98b45058d6212ba975e472c21b47458cd4690b3b2eea809995d715c0cc451b298e6aaff64f50f394eadf371be4fd2ef0e056250654b0cb56e
Version: webpack next
Child
    Hash: 78499e602826e502f04e
                                  Asset      Size    Chunks             Chunk Names
      ./bundle-cheap-eval-source-map.js  2.04 KiB    bundle  [emitted]  bundle
    ./manifest-cheap-eval-source-map.js  7.07 KiB  manifest  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-eval-source-map.js ./bundle-cheap-eval-source-map.js
    chunk {bundle} ./bundle-cheap-eval-source-map.js (bundle) 308 bytes {manifest} [initial] [rendered]
        > bundle [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 
     [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {bundle} [built]
            [no exports used]
            single entry coffee-loader!./example.coffee  bundle
    chunk {manifest} ./manifest-cheap-eval-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 23aeb90775edc42bc235
                                         Asset      Size    Chunks             Chunk Names
      ./bundle-cheap-module-eval-source-map.js  1.69 KiB    bundle  [emitted]  bundle
    ./manifest-cheap-module-eval-source-map.js  7.08 KiB  manifest  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-module-eval-source-map.js ./bundle-cheap-module-eval-source-map.js
    chunk {bundle} ./bundle-cheap-module-eval-source-map.js (bundle) 308 bytes {manifest} [initial] [rendered]
        > bundle [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 
     [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {bundle} [built]
            [no exports used]
            single entry coffee-loader!./example.coffee  bundle
    chunk {manifest} ./manifest-cheap-module-eval-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: d254d61a567196f9035f
                                        Asset       Size    Chunks             Chunk Names
          ./bundle-cheap-module-source-map.js  879 bytes    bundle  [emitted]  bundle
        ./manifest-cheap-module-source-map.js   7.13 KiB  manifest  [emitted]  manifest
      ./bundle-cheap-module-source-map.js.map  508 bytes    bundle  [emitted]  bundle
    ./manifest-cheap-module-source-map.js.map   7.25 KiB  manifest  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-module-source-map.js ./manifest-cheap-module-source-map.js.map ./bundle-cheap-module-source-map.js ./bundle-cheap-module-source-map.js.map
    chunk {bundle} ./bundle-cheap-module-source-map.js, ./bundle-cheap-module-source-map.js.map (bundle) 308 bytes {manifest} [initial] [rendered]
        > bundle [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 
     [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {bundle} [built]
            [no exports used]
            single entry coffee-loader!./example.coffee  bundle
    chunk {manifest} ./manifest-cheap-module-source-map.js, ./manifest-cheap-module-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 7d2dea95838abda6ced5
                                 Asset       Size    Chunks             Chunk Names
          ./bundle-cheap-source-map.js  872 bytes    bundle  [emitted]  bundle
        ./manifest-cheap-source-map.js   7.12 KiB  manifest  [emitted]  manifest
      ./bundle-cheap-source-map.js.map  766 bytes    bundle  [emitted]  bundle
    ./manifest-cheap-source-map.js.map   7.23 KiB  manifest  [emitted]  manifest
    Entrypoint bundle = ./manifest-cheap-source-map.js ./manifest-cheap-source-map.js.map ./bundle-cheap-source-map.js ./bundle-cheap-source-map.js.map
    chunk {bundle} ./bundle-cheap-source-map.js, ./bundle-cheap-source-map.js.map (bundle) 308 bytes {manifest} [initial] [rendered]
        > bundle [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 
     [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {bundle} [built]
            [no exports used]
            single entry coffee-loader!./example.coffee  bundle
    chunk {manifest} ./manifest-cheap-source-map.js, ./manifest-cheap-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: c59cc8c98b45058d6212
                 Asset      Size    Chunks             Chunk Names
      ./bundle-eval.js   1.1 KiB    bundle  [emitted]  bundle
    ./manifest-eval.js  7.05 KiB  manifest  [emitted]  manifest
    Entrypoint bundle = ./manifest-eval.js ./bundle-eval.js
    chunk {bundle} ./bundle-eval.js (bundle) 308 bytes {manifest} [initial] [rendered]
        > bundle [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 
     [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {bundle} [built]
            [no exports used]
            single entry coffee-loader!./example.coffee  bundle
    chunk {manifest} ./manifest-eval.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: ba975e472c21b47458cd
                            Asset      Size    Chunks             Chunk Names
      ./bundle-eval-source-map.js  1.83 KiB    bundle  [emitted]  bundle
    ./manifest-eval-source-map.js  7.06 KiB  manifest  [emitted]  manifest
    Entrypoint bundle = ./manifest-eval-source-map.js ./bundle-eval-source-map.js
    chunk {bundle} ./bundle-eval-source-map.js (bundle) 308 bytes {manifest} [initial] [rendered]
        > bundle [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 
     [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {bundle} [built]
            [no exports used]
            single entry coffee-loader!./example.coffee  bundle
    chunk {manifest} ./manifest-eval-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 4690b3b2eea809995d71
                                  Asset       Size    Chunks             Chunk Names
          ./bundle-hidden-source-map.js  820 bytes    bundle  [emitted]  bundle
        ./manifest-hidden-source-map.js   7.06 KiB  manifest  [emitted]  manifest
      ./bundle-hidden-source-map.js.map  604 bytes    bundle  [emitted]  bundle
    ./manifest-hidden-source-map.js.map   7.32 KiB  manifest  [emitted]  manifest
    Entrypoint bundle = ./manifest-hidden-source-map.js ./manifest-hidden-source-map.js.map ./bundle-hidden-source-map.js ./bundle-hidden-source-map.js.map
    chunk {bundle} ./bundle-hidden-source-map.js, ./bundle-hidden-source-map.js.map (bundle) 308 bytes {manifest} [initial] [rendered]
        > bundle [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 
     [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {bundle} [built]
            [no exports used]
            single entry coffee-loader!./example.coffee  bundle
    chunk {manifest} ./manifest-hidden-source-map.js, ./manifest-hidden-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: 5c0cc451b298e6aaff64
                              Asset      Size    Chunks             Chunk Names
      ./bundle-inline-source-map.js  1.65 KiB    bundle  [emitted]  bundle
    ./manifest-inline-source-map.js  16.9 KiB  manifest  [emitted]  manifest
    Entrypoint bundle = ./manifest-inline-source-map.js ./bundle-inline-source-map.js
    chunk {bundle} ./bundle-inline-source-map.js (bundle) 308 bytes {manifest} [initial] [rendered]
        > bundle [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 
     [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {bundle} [built]
            [no exports used]
            single entry coffee-loader!./example.coffee  bundle
    chunk {manifest} ./manifest-inline-source-map.js (manifest) 0 bytes [entry] [rendered]
Child
    Hash: f50f394eadf371be4fd2
                                     Asset       Size    Chunks             Chunk Names
          ./bundle-nosources-source-map.js  876 bytes    bundle  [emitted]  bundle
        ./manifest-nosources-source-map.js   7.12 KiB  manifest  [emitted]  manifest
      ./bundle-nosources-source-map.js.map  315 bytes    bundle  [emitted]  bundle
    ./manifest-nosources-source-map.js.map    1.1 KiB  manifest  [emitted]  manifest
    Entrypoint bundle = ./manifest-nosources-source-map.js ./manifest-nosources-source-map.js.map ./bundle-nosources-source-map.js ./bundle-nosources-source-map.js.map
    chunk {bundle} ./bundle-nosources-source-map.js, ./bundle-nosources-source-map.js.map (bundle) 308 bytes {manifest} [initial] [rendered]
        > bundle [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 
     [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {bundle} [built]
            [no exports used]
            single entry coffee-loader!./example.coffee  bundle
    chunk {manifest} ./manifest-nosources-source-map.js, ./manifest-nosources-source-map.js.map (manifest) 0 bytes [entry] [rendered]
Child
    Hash: ef0e056250654b0cb56e
                           Asset       Size    Chunks             Chunk Names
          ./bundle-source-map.js  866 bytes    bundle  [emitted]  bundle
        ./manifest-source-map.js    7.1 KiB  manifest  [emitted]  manifest
      ./bundle-source-map.js.map  597 bytes    bundle  [emitted]  bundle
    ./manifest-source-map.js.map   7.31 KiB  manifest  [emitted]  manifest
    Entrypoint bundle = ./manifest-source-map.js ./manifest-source-map.js.map ./bundle-source-map.js ./bundle-source-map.js.map
    chunk {bundle} ./bundle-source-map.js, ./bundle-source-map.js.map (bundle) 308 bytes {manifest} [initial] [rendered]
        > bundle [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 
     [../../node_modules/coffee-loader/index.js!./example.coffee] (webpack)/node_modules/coffee-loader!./example.coffee 308 bytes {bundle} [built]
            [no exports used]
            single entry coffee-loader!./example.coffee  bundle
    chunk {manifest} ./manifest-source-map.js, ./manifest-source-map.js.map (manifest) 0 bytes [entry] [rendered]
```
