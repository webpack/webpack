This example demonstrates various types of source-maps.

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
var path = require("path");

module.exports = [
	"eval",
	"eval-cheap-source-map",
	"eval-cheap-module-source-map",
	"eval-source-map",
	"cheap-source-map",
	"cheap-module-source-map",
	"inline-cheap-source-map",
	"inline-cheap-module-source-map",
	"source-map",
	"inline-source-map",
	"hidden-source-map",
	"nosources-source-map"
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

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([[0],[
/* 0 */
/*!*********************************************************************!*\
  !*** ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee ***!
  \*********************************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
/***/ (() => {

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


/***/ })
],
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
//# sourceMappingURL=bundle-source-map.js.map
```

```json
{"version":3,"file":"./bundle-source-map.js","mappings":";;;;;;;;;AAEU;;;AAAA;;AACV,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX;AAFR,EAFQ;;;AAOV,OAAO,SAAC,MAAD,KAAS,OAAT;SACL,MAAM,MAAN,EAAc,OAAd;AADK","sources":["webpack:///./example.coffee"],"sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"names":[],"sourceRoot":""}
```

## hidden-source-map.js and hidden-source-map.js.map

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([[0],[
/* 0 */
/*!*********************************************************************!*\
  !*** ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee ***!
  \*********************************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
/***/ (() => {

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


/***/ })
],
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
```

```json
{"version":3,"file":"./bundle-hidden-source-map.js","mappings":";;;;;;;;;AAEU;;;AAAA;;AACV,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX;AAFR,EAFQ;;;AAOV,OAAO,SAAC,MAAD,KAAS,OAAT;SACL,MAAM,MAAN,EAAc,OAAd;AADK","sources":["webpack:///./example.coffee"],"sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"names":[],"sourceRoot":""}
```

## inline-source-map.js

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([[0],[
/* 0 */
/*!*********************************************************************!*\
  !*** ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee ***!
  \*********************************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
/***/ (() => {

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


/***/ })
],
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9idW5kbGUtaW5saW5lLXNvdXJjZS1tYXAuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBRVU7OztBQUFBOztBQUNWLE9BQ0U7RUFBQSxNQUFRLElBQUksQ0FBQyxJQUFiO0VBQ0EsUUFBUSxNQURSO0VBRUEsTUFBUSxTQUFDLENBQUQ7V0FBTyxJQUFJLE9BQU8sQ0FBUDtFQUFYO0FBRlIsRUFGUTs7O0FBT1YsT0FBTyxTQUFDLE1BQUQsS0FBUyxPQUFUO1NBQ0wsTUFBTSxNQUFOLEVBQWMsT0FBZDtBQURLIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vLy4vZXhhbXBsZS5jb2ZmZWUiXSwic291cmNlc0NvbnRlbnQiOlsiIyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xuXG4jIE9iamVjdHM6XG5tYXRoID1cbiAgcm9vdDogICBNYXRoLnNxcnRcbiAgc3F1YXJlOiBzcXVhcmVcbiAgY3ViZTogICAoeCkgLT4geCAqIHNxdWFyZSB4XG5cbiMgU3BsYXRzOlxucmFjZSA9ICh3aW5uZXIsIHJ1bm5lcnMuLi4pIC0+XG4gIHByaW50IHdpbm5lciwgcnVubmVyc1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9
```

## nosources-source-map.js.map

```json
{"version":3,"file":"./bundle-nosources-source-map.js","mappings":";;;;;;;;;AAEU;;;AAAA;;AACV,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX;AAFR,EAFQ;;;AAOV,OAAO,SAAC,MAAD,KAAS,OAAT;SACL,MAAM,MAAN,EAAc,OAAd;AADK","sources":["webpack:///./example.coffee"],"names":[],"sourceRoot":""}
```

## eval-source-map.js

```javascript
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk"] = self["webpackChunk"] || []).push([[0],[
/* 0 */
/*!*********************************************************************!*\
  !*** ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee ***!
  \*********************************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
/***/ (() => {

eval("// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vLy4vZXhhbXBsZS5jb2ZmZWU/MjQxNiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFVTs7O0FBQUEsSUFBQSxJQUFBLEVBQUE7O0FBQ1YsSUFBQSxHQUNFO0VBQUEsSUFBQSxFQUFRLElBQUksQ0FBQyxJQUFiO0VBQ0EsTUFBQSxFQUFRLE1BRFI7RUFFQSxJQUFBLEVBQVEsUUFBQSxDQUFDLENBQUQsQ0FBQTtXQUFPLENBQUEsR0FBSSxNQUFBLENBQU8sQ0FBUDtFQUFYO0FBRlIsRUFGUTs7O0FBT1YsSUFBQSxHQUFPLFFBQUEsQ0FBQyxNQUFELEVBQUEsR0FBUyxPQUFULENBQUE7U0FDTCxLQUFBLENBQU0sTUFBTixFQUFjLE9BQWQ7QUFESyIsInNvdXJjZXNDb250ZW50IjpbIiMgVGFrZW4gZnJvbSBodHRwOi8vY29mZmVlc2NyaXB0Lm9yZy9cblxuIyBPYmplY3RzOlxubWF0aCA9XG4gIHJvb3Q6ICAgTWF0aC5zcXJ0XG4gIHNxdWFyZTogc3F1YXJlXG4gIGN1YmU6ICAgKHgpIC0+IHggKiBzcXVhcmUgeFxuXG4jIFNwbGF0czpcbnJhY2UgPSAod2lubmVyLCBydW5uZXJzLi4uKSAtPlxuICBwcmludCB3aW5uZXIsIHJ1bm5lcnNcbiJdLCJmaWxlIjoiMC5qcyJ9\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
```

## eval.js

```javascript
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk"] = self["webpackChunk"] || []).push([[0],[
/* 0 */
/*!*********************************************************************!*\
  !*** ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee ***!
  \*********************************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
/***/ (() => {

eval("// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n\n\n//# sourceURL=webpack:///./example.coffee?../../node_modules/coffee-loader/dist/cjs.js");

/***/ })
],
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
```

## eval-cheap-source-map.js

```javascript
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk"] = self["webpackChunk"] || []).push([[0],[
/* 0 */
/*!*********************************************************************!*\
  !*** ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee ***!
  \*********************************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
/***/ (() => {

eval("// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vLy4vZXhhbXBsZS5jb2ZmZWU/ZWU1OCJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUYWtlbiBmcm9tIGh0dHA6Ly9jb2ZmZWVzY3JpcHQub3JnL1xuXG4vLyBPYmplY3RzOlxudmFyIG1hdGgsIHJhY2U7XG5cbm1hdGggPSB7XG4gIHJvb3Q6IE1hdGguc3FydCxcbiAgc3F1YXJlOiBzcXVhcmUsXG4gIGN1YmU6IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geCAqIHNxdWFyZSh4KTtcbiAgfVxufTtcblxuLy8gU3BsYXRzOlxucmFjZSA9IGZ1bmN0aW9uKHdpbm5lciwgLi4ucnVubmVycykge1xuICByZXR1cm4gcHJpbnQod2lubmVyLCBydW5uZXJzKTtcbn07XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
```

## eval-cheap-module-source-map.js

```javascript
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk"] = self["webpackChunk"] || []).push([[0],[
/* 0 */
/*!*********************************************************************!*\
  !*** ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee ***!
  \*********************************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
/***/ (() => {

eval("// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vLy4vZXhhbXBsZS5jb2ZmZWU/MjQxNiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFVTs7O0FBQUEsSUFBQSxJQUFBLEVBQUE7O0FBQ1YsSUFBQSxHQUNFO0VBQUEsSUFBQSxFQUFRLElBQUksQ0FBQyxJQUFiO0VBQ0EsTUFBQSxFQUFRLE1BRFI7RUFFQSxJQUFBLEVBQVEsUUFBQSxDQUFDLENBQUQsQ0FBQTtXQUFPLENBQUEsR0FBSSxNQUFBLENBQU8sQ0FBUDtFQUFYO0FBRlIsRUFGUTs7O0FBT1YsSUFBQSxHQUFPLFFBQUEsQ0FBQyxNQUFELEVBQUEsR0FBUyxPQUFULENBQUE7U0FDTCxLQUFBLENBQU0sTUFBTixFQUFjLE9BQWQ7QUFESyIsInNvdXJjZXNDb250ZW50IjpbIiMgVGFrZW4gZnJvbSBodHRwOi8vY29mZmVlc2NyaXB0Lm9yZy9cblxuIyBPYmplY3RzOlxubWF0aCA9XG4gIHJvb3Q6ICAgTWF0aC5zcXJ0XG4gIHNxdWFyZTogc3F1YXJlXG4gIGN1YmU6ICAgKHgpIC0+IHggKiBzcXVhcmUgeFxuXG4jIFNwbGF0czpcbnJhY2UgPSAod2lubmVyLCBydW5uZXJzLi4uKSAtPlxuICBwcmludCB3aW5uZXIsIHJ1bm5lcnNcbiJdLCJmaWxlIjoiMC5qcyJ9\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
```

## cheap-module-source-map.js.map

```json
{"version":3,"file":"./bundle-cheap-module-source-map.js","mappings":";;;;;;;;;AAEA;;;AAAA;;AACA;AACA;AACA;AACA;AAAA;AAAA;AAFA;;;AAKA;AACA;AADA","sources":["webpack:///./example.coffee"],"sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"names":[],"sourceRoot":""}
```

## cheap-source-map.js.map

```json
{"version":3,"file":"./bundle-cheap-source-map.js","mappings":";;;;;;;;;AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA","sources":["webpack:///./example.coffee"],"sourcesContent":["// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n"],"names":[],"sourceRoot":""}
```

# webpack output

```
asset ./runtime~bundle-eval.js 5.46 KiB [emitted] (name: runtime~bundle)
asset ./bundle-eval.js 1.53 KiB [emitted] (name: bundle)
Entrypoint bundle 6.99 KiB = ./runtime~bundle-eval.js 5.46 KiB ./bundle-eval.js 1.53 KiB
chunk (runtime: runtime~bundle) ./bundle-eval.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-eval.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully

asset ./runtime~bundle-eval-cheap-source-map.js 5.46 KiB [emitted] (name: runtime~bundle)
asset ./bundle-eval-cheap-source-map.js 2.2 KiB [emitted] (name: bundle)
Entrypoint bundle 7.66 KiB = ./runtime~bundle-eval-cheap-source-map.js 5.46 KiB ./bundle-eval-cheap-source-map.js 2.2 KiB
chunk (runtime: runtime~bundle) ./bundle-eval-cheap-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-eval-cheap-source-map.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully

asset ./runtime~bundle-eval-cheap-module-source-map.js 5.46 KiB [emitted] (name: runtime~bundle)
asset ./bundle-eval-cheap-module-source-map.js 2.33 KiB [emitted] (name: bundle)
Entrypoint bundle 7.79 KiB = ./runtime~bundle-eval-cheap-module-source-map.js 5.46 KiB ./bundle-eval-cheap-module-source-map.js 2.33 KiB
chunk (runtime: runtime~bundle) ./bundle-eval-cheap-module-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-eval-cheap-module-source-map.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully

asset ./runtime~bundle-eval-source-map.js 5.46 KiB [emitted] (name: runtime~bundle)
asset ./bundle-eval-source-map.js 2.33 KiB [emitted] (name: bundle)
Entrypoint bundle 7.79 KiB = ./runtime~bundle-eval-source-map.js 5.46 KiB ./bundle-eval-source-map.js 2.33 KiB
chunk (runtime: runtime~bundle) ./bundle-eval-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-eval-source-map.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully

asset ./runtime~bundle-cheap-source-map.js 4.97 KiB [emitted] (name: runtime~bundle) 1 related asset
asset ./bundle-cheap-source-map.js 938 bytes [emitted] (name: bundle) 1 related asset
Entrypoint bundle 5.89 KiB (4.84 KiB) = ./runtime~bundle-cheap-source-map.js 4.97 KiB ./bundle-cheap-source-map.js 938 bytes 2 auxiliary assets
chunk (runtime: runtime~bundle) ./bundle-cheap-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-cheap-source-map.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully

asset ./runtime~bundle-cheap-module-source-map.js 4.98 KiB [emitted] (name: runtime~bundle) 1 related asset
asset ./bundle-cheap-module-source-map.js 945 bytes [emitted] (name: bundle) 1 related asset
Entrypoint bundle 5.9 KiB (4.76 KiB) = ./runtime~bundle-cheap-module-source-map.js 4.98 KiB ./bundle-cheap-module-source-map.js 945 bytes 2 auxiliary assets
chunk (runtime: runtime~bundle) ./bundle-cheap-module-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-cheap-module-source-map.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully

asset ./runtime~bundle-inline-cheap-source-map.js 10.8 KiB [emitted] (name: runtime~bundle)
asset ./bundle-inline-cheap-source-map.js 1.62 KiB [emitted] (name: bundle)
Entrypoint bundle 12.4 KiB = ./runtime~bundle-inline-cheap-source-map.js 10.8 KiB ./bundle-inline-cheap-source-map.js 1.62 KiB
chunk (runtime: runtime~bundle) ./bundle-inline-cheap-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-inline-cheap-source-map.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully

asset ./runtime~bundle-inline-cheap-module-source-map.js 10.8 KiB [emitted] (name: runtime~bundle)
asset ./bundle-inline-cheap-module-source-map.js 1.51 KiB [emitted] (name: bundle)
Entrypoint bundle 12.3 KiB = ./runtime~bundle-inline-cheap-module-source-map.js 10.8 KiB ./bundle-inline-cheap-module-source-map.js 1.51 KiB
chunk (runtime: runtime~bundle) ./bundle-inline-cheap-module-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-inline-cheap-module-source-map.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully

asset ./runtime~bundle-source-map.js 4.96 KiB [emitted] (name: runtime~bundle) 1 related asset
asset ./bundle-source-map.js 932 bytes [emitted] (name: bundle) 1 related asset
Entrypoint bundle 5.88 KiB (4.86 KiB) = ./runtime~bundle-source-map.js 4.96 KiB ./bundle-source-map.js 932 bytes 2 auxiliary assets
chunk (runtime: runtime~bundle) ./bundle-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-source-map.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully

asset ./runtime~bundle-inline-source-map.js 10.8 KiB [emitted] (name: runtime~bundle)
asset ./bundle-inline-source-map.js 1.64 KiB [emitted] (name: bundle)
Entrypoint bundle 12.4 KiB = ./runtime~bundle-inline-source-map.js 10.8 KiB ./bundle-inline-source-map.js 1.64 KiB
chunk (runtime: runtime~bundle) ./bundle-inline-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-inline-source-map.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully

asset ./runtime~bundle-hidden-source-map.js 4.91 KiB [emitted] (name: runtime~bundle) 1 related asset
asset ./bundle-hidden-source-map.js 886 bytes [emitted] (name: bundle) 1 related asset
Entrypoint bundle 5.78 KiB (4.87 KiB) = ./runtime~bundle-hidden-source-map.js 4.91 KiB ./bundle-hidden-source-map.js 886 bytes 2 auxiliary assets
chunk (runtime: runtime~bundle) ./bundle-hidden-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-hidden-source-map.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully

asset ./runtime~bundle-nosources-source-map.js 4.97 KiB [emitted] (name: runtime~bundle) 1 related asset
asset ./bundle-nosources-source-map.js 942 bytes [emitted] (name: bundle) 1 related asset
Entrypoint bundle 5.89 KiB (1.24 KiB) = ./runtime~bundle-nosources-source-map.js 4.97 KiB ./bundle-nosources-source-map.js 942 bytes 2 auxiliary assets
chunk (runtime: runtime~bundle) ./bundle-nosources-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-nosources-source-map.js (runtime~bundle) 2.46 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.46 KiB 3 modules
webpack 5.51.1 compiled successfully
```
