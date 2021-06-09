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
/******/ "use strict";
/******/ 
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
//# sourceMappingURL=bundle-source-map.js.map
```

```json
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAEU;;;AAAA;;AACV,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX;AAFR,EAFQ;;;AAOV,OAAO,SAAC,MAAD,KAAS,OAAT;SACL,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"sourceRoot":""}
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
/******/ "use strict";
/******/ 
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
```

```json
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAEU;;;AAAA;;AACV,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX;AAFR,EAFQ;;;AAOV,OAAO,SAAC,MAAD,KAAS,OAAT;SACL,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-hidden-source-map.js","sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"sourceRoot":""}
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
/******/ "use strict";
/******/ 
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9leGFtcGxlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFFVTs7O0FBQUE7O0FBQ1YsT0FDRTtFQUFBLE1BQVEsSUFBSSxDQUFDLElBQWI7RUFDQSxRQUFRLE1BRFI7RUFFQSxNQUFRLFNBQUMsQ0FBRDtXQUFPLElBQUksT0FBTyxDQUFQO0VBQVg7QUFGUixFQUZROzs7QUFPVixPQUFPLFNBQUMsTUFBRCxLQUFTLE9BQVQ7U0FDTCxNQUFNLE1BQU4sRUFBYyxPQUFkO0FBREsiLCJmaWxlIjoiLi9idW5kbGUtaW5saW5lLXNvdXJjZS1tYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIjIFRha2VuIGZyb20gaHR0cDovL2NvZmZlZXNjcmlwdC5vcmcvXG5cbiMgT2JqZWN0czpcbm1hdGggPVxuICByb290OiAgIE1hdGguc3FydFxuICBzcXVhcmU6IHNxdWFyZVxuICBjdWJlOiAgICh4KSAtPiB4ICogc3F1YXJlIHhcblxuIyBTcGxhdHM6XG5yYWNlID0gKHdpbm5lciwgcnVubmVycy4uLikgLT5cbiAgcHJpbnQgd2lubmVyLCBydW5uZXJzXG4iXSwic291cmNlUm9vdCI6IiJ9
```

## nosources-source-map.js.map

```json
{"version":3,"sources":["webpack:///./example.coffee"],"names":[],"mappings":";;;;;;;;;AAEU;;;AAAA;;AACV,OACE;EAAA,MAAQ,IAAI,CAAC,IAAb;EACA,QAAQ,MADR;EAEA,MAAQ,SAAC,CAAD;WAAO,IAAI,OAAO,CAAP;EAAX;AAFR,EAFQ;;;AAOV,OAAO,SAAC,MAAD,KAAS,OAAT;SACL,MAAM,MAAN,EAAc,OAAd;AADK","file":"./bundle-nosources-source-map.js","sourceRoot":""}
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
/******/ "use strict";
/******/ 
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
/******/ "use strict";
/******/ 
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

eval("// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL2V4YW1wbGUuY29mZmVlP2VlNTgiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gVGFrZW4gZnJvbSBodHRwOi8vY29mZmVlc2NyaXB0Lm9yZy9cblxuLy8gT2JqZWN0czpcbnZhciBtYXRoLCByYWNlO1xuXG5tYXRoID0ge1xuICByb290OiBNYXRoLnNxcnQsXG4gIHNxdWFyZTogc3F1YXJlLFxuICBjdWJlOiBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHggKiBzcXVhcmUoeCk7XG4gIH1cbn07XG5cbi8vIFNwbGF0czpcbnJhY2UgPSBmdW5jdGlvbih3aW5uZXIsIC4uLnJ1bm5lcnMpIHtcbiAgcmV0dXJuIHByaW50KHdpbm5lciwgcnVubmVycyk7XG59O1xuIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOyIsInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///0\n");

/***/ })
],
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ "use strict";
/******/ 
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
/******/ "use strict";
/******/ 
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(0));
/******/ }
]);
```

## cheap-module-source-map.js.map

```json
{"version":3,"file":"./bundle-cheap-module-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"mappings":";;;;;;;;;AAEA;AACA;;AADA;AACA;AAAA;AACA;AACA;AACA;AAAA;AAAA;AAFA;AACA;;AAIA;AACA;AADA;;;A;;;;;;;;A","sourceRoot":""}
```

## cheap-source-map.js.map

```json
{"version":3,"file":"./bundle-cheap-source-map.js","sources":["webpack:///./example.coffee"],"sourcesContent":["// Taken from http://coffeescript.org/\n\n// Objects:\nvar math, race;\n\nmath = {\n  root: Math.sqrt,\n  square: square,\n  cube: function(x) {\n    return x * square(x);\n  }\n};\n\n// Splats:\nrace = function(winner, ...runners) {\n  return print(winner, runners);\n};\n"],"mappings":";;;;;;;;;AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;A;;;;;;;;A","sourceRoot":""}
```

# webpack output

```
asset ./runtime~bundle-eval.js 5.33 KiB [emitted] (name: runtime~bundle)
asset ./bundle-eval.js 1.56 KiB [emitted] (name: bundle)
Entrypoint bundle 6.89 KiB = ./runtime~bundle-eval.js 5.33 KiB ./bundle-eval.js 1.56 KiB
chunk (runtime: runtime~bundle) ./bundle-eval.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-eval.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully

asset ./runtime~bundle-eval-cheap-source-map.js 5.32 KiB [emitted] (name: runtime~bundle)
asset ./bundle-eval-cheap-source-map.js 2.22 KiB [emitted] (name: bundle)
Entrypoint bundle 7.55 KiB = ./runtime~bundle-eval-cheap-source-map.js 5.32 KiB ./bundle-eval-cheap-source-map.js 2.22 KiB
chunk (runtime: runtime~bundle) ./bundle-eval-cheap-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-eval-cheap-source-map.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully

asset ./runtime~bundle-eval-cheap-module-source-map.js 5.32 KiB [emitted] (name: runtime~bundle)
asset ./bundle-eval-cheap-module-source-map.js 2.37 KiB [emitted] (name: bundle)
Entrypoint bundle 7.69 KiB = ./runtime~bundle-eval-cheap-module-source-map.js 5.32 KiB ./bundle-eval-cheap-module-source-map.js 2.37 KiB
chunk (runtime: runtime~bundle) ./bundle-eval-cheap-module-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-eval-cheap-module-source-map.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully

asset ./runtime~bundle-eval-source-map.js 5.32 KiB [emitted] (name: runtime~bundle)
asset ./bundle-eval-source-map.js 2.37 KiB [emitted] (name: bundle)
Entrypoint bundle 7.69 KiB = ./runtime~bundle-eval-source-map.js 5.32 KiB ./bundle-eval-source-map.js 2.37 KiB
chunk (runtime: runtime~bundle) ./bundle-eval-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-eval-source-map.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully

asset ./runtime~bundle-cheap-source-map.js 4.84 KiB [emitted] (name: runtime~bundle) 1 related asset
asset ./bundle-cheap-source-map.js 971 bytes [emitted] (name: bundle) 1 related asset
Entrypoint bundle 5.79 KiB (4.6 KiB) = ./runtime~bundle-cheap-source-map.js 4.84 KiB ./bundle-cheap-source-map.js 971 bytes 2 auxiliary assets
chunk (runtime: runtime~bundle) ./bundle-cheap-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-cheap-source-map.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully

asset ./runtime~bundle-cheap-module-source-map.js 4.85 KiB [emitted] (name: runtime~bundle) 1 related asset
asset ./bundle-cheap-module-source-map.js 978 bytes [emitted] (name: bundle) 1 related asset
Entrypoint bundle 5.8 KiB (4.54 KiB) = ./runtime~bundle-cheap-module-source-map.js 4.85 KiB ./bundle-cheap-module-source-map.js 978 bytes 2 auxiliary assets
chunk (runtime: runtime~bundle) ./bundle-cheap-module-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-cheap-module-source-map.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully

asset ./runtime~bundle-inline-cheap-source-map.js 10.3 KiB [emitted] (name: runtime~bundle)
asset ./bundle-inline-cheap-source-map.js 1.65 KiB [emitted] (name: bundle)
Entrypoint bundle 12 KiB = ./runtime~bundle-inline-cheap-source-map.js 10.3 KiB ./bundle-inline-cheap-source-map.js 1.65 KiB
chunk (runtime: runtime~bundle) ./bundle-inline-cheap-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-inline-cheap-source-map.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully

asset ./runtime~bundle-inline-cheap-module-source-map.js 10.3 KiB [emitted] (name: runtime~bundle)
asset ./bundle-inline-cheap-module-source-map.js 1.56 KiB [emitted] (name: bundle)
Entrypoint bundle 11.9 KiB = ./runtime~bundle-inline-cheap-module-source-map.js 10.3 KiB ./bundle-inline-cheap-module-source-map.js 1.56 KiB
chunk (runtime: runtime~bundle) ./bundle-inline-cheap-module-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-inline-cheap-module-source-map.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully

asset ./runtime~bundle-source-map.js 4.83 KiB [emitted] (name: runtime~bundle) 1 related asset
asset ./bundle-source-map.js 965 bytes [emitted] (name: bundle) 1 related asset
Entrypoint bundle 5.78 KiB (4.63 KiB) = ./runtime~bundle-source-map.js 4.83 KiB ./bundle-source-map.js 965 bytes 2 auxiliary assets
chunk (runtime: runtime~bundle) ./bundle-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-source-map.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully

asset ./runtime~bundle-inline-source-map.js 10.3 KiB [emitted] (name: runtime~bundle)
asset ./bundle-inline-source-map.js 1.67 KiB [emitted] (name: bundle)
Entrypoint bundle 12 KiB = ./runtime~bundle-inline-source-map.js 10.3 KiB ./bundle-inline-source-map.js 1.67 KiB
chunk (runtime: runtime~bundle) ./bundle-inline-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-inline-source-map.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully

asset ./runtime~bundle-hidden-source-map.js 4.78 KiB [emitted] (name: runtime~bundle) 1 related asset
asset ./bundle-hidden-source-map.js 919 bytes [emitted] (name: bundle) 1 related asset
Entrypoint bundle 5.68 KiB (4.64 KiB) = ./runtime~bundle-hidden-source-map.js 4.78 KiB ./bundle-hidden-source-map.js 919 bytes 2 auxiliary assets
chunk (runtime: runtime~bundle) ./bundle-hidden-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-hidden-source-map.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully

asset ./runtime~bundle-nosources-source-map.js 4.84 KiB [emitted] (name: runtime~bundle) 1 related asset
asset ./bundle-nosources-source-map.js 975 bytes [emitted] (name: bundle) 1 related asset
Entrypoint bundle 5.79 KiB (1.13 KiB) = ./runtime~bundle-nosources-source-map.js 4.84 KiB ./bundle-nosources-source-map.js 975 bytes 2 auxiliary assets
chunk (runtime: runtime~bundle) ./bundle-nosources-source-map.js (bundle) 256 bytes [initial] [rendered]
  > coffee-loader!./example.coffee bundle
  ../../node_modules/coffee-loader/dist/cjs.js!./example.coffee 256 bytes [built] [code generated]
    [used exports unknown]
    entry coffee-loader!./example.coffee bundle
chunk (runtime: runtime~bundle) ./runtime~bundle-nosources-source-map.js (runtime~bundle) 2.36 KiB [entry] [rendered]
  > coffee-loader!./example.coffee bundle
  runtime modules 2.36 KiB 3 modules
webpack 5.38.1 compiled successfully
```
