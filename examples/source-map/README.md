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
module.exports = env => {
	return {
		mode: env,
		entry: "./example.coffee",
		devtool: env === "development" ? "cheap-eval-source-map" : "source-map",
		module: {
			rules: [{ test: /\.coffee$/, use: "coffee-loader" }]
		}
	};
};
```

# Generated source-maps

## development mode

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

```javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./example.coffee");
/******/ })
/************************************************************************/
```

</details>

```javascript
/******/ ({

/***/ "./example.coffee":
/*!************************!*\
  !*** ./example.coffee ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

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

/******/ });
```

## production mode

```javascript
!function(e){var t={};function r(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)r.d(n,o,function(t){return e[t]}.bind(null,o));return n},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="dist/",r(r.s=0)}([function(e,t){Math.sqrt,square}]);
//# sourceMappingURL=main.js.map
```

```javascript
{"version":3,"sources":["webpack:///webpack/bootstrap","webpack:///./example.coffee"],"names":["installedModules","__webpack_require__","moduleId","exports","module","i","l","modules","call","m","c","d","name","getter","o","Object","defineProperty","enumerable","get","r","Symbol","toStringTag","value","t","mode","__esModule","ns","create","key","bind","n","object","property","prototype","hasOwnProperty","p","s","Math","sqrt","square"],"mappings":"aACA,IAAAA,KAGA,SAAAC,EAAAC,GAGA,GAAAF,EAAAE,GACA,OAAAF,EAAAE,GAAAC,QAGA,IAAAC,EAAAJ,EAAAE,IACAG,EAAAH,EACAI,GAAA,EACAH,YAUA,OANAI,EAAAL,GAAAM,KAAAJ,EAAAD,QAAAC,IAAAD,QAAAF,GAGAG,EAAAE,GAAA,EAGAF,EAAAD,QAKAF,EAAAQ,EAAAF,EAGAN,EAAAS,EAAAV,EAGAC,EAAAU,EAAA,SAAAR,EAAAS,EAAAC,GACAZ,EAAAa,EAAAX,EAAAS,IACAG,OAAAC,eAAAb,EAAAS,GAA0CK,YAAA,EAAAC,IAAAL,KAK1CZ,EAAAkB,EAAA,SAAAhB,GACA,oBAAAiB,eAAAC,aACAN,OAAAC,eAAAb,EAAAiB,OAAAC,aAAwDC,MAAA,WAExDP,OAAAC,eAAAb,EAAA,cAAiDmB,OAAA,KAQjDrB,EAAAsB,EAAA,SAAAD,EAAAE,GAEA,GADA,EAAAA,IAAAF,EAAArB,EAAAqB,IACA,EAAAE,EAAA,OAAAF,EACA,KAAAE,GAAA,iBAAAF,QAAAG,WAAA,OAAAH,EACA,IAAAI,EAAAX,OAAAY,OAAA,MAGA,GAFA1B,EAAAkB,EAAAO,GACAX,OAAAC,eAAAU,EAAA,WAAyCT,YAAA,EAAAK,UACzC,EAAAE,GAAA,iBAAAF,EAAA,QAAAM,KAAAN,EAAArB,EAAAU,EAAAe,EAAAE,EAAA,SAAAA,GAAgH,OAAAN,EAAAM,IAAqBC,KAAA,KAAAD,IACrI,OAAAF,GAIAzB,EAAA6B,EAAA,SAAA1B,GACA,IAAAS,EAAAT,KAAAqB,WACA,WAA2B,OAAArB,EAAA,SAC3B,WAAiC,OAAAA,GAEjC,OADAH,EAAAU,EAAAE,EAAA,IAAAA,GACAA,GAIAZ,EAAAa,EAAA,SAAAiB,EAAAC,GAAsD,OAAAjB,OAAAkB,UAAAC,eAAA1B,KAAAuB,EAAAC,IAGtD/B,EAAAkC,EAAA,QAIAlC,IAAAmC,EAAA,mBC9EUC,KAAKC,KACLC","file":"main.js","sourcesContent":[" \t// The module cache\n \tvar installedModules = {};\n\n \t// The require function\n \tfunction __webpack_require__(moduleId) {\n\n \t\t// Check if module is in cache\n \t\tif(installedModules[moduleId]) {\n \t\t\treturn installedModules[moduleId].exports;\n \t\t}\n \t\t// Create a new module (and put it into the cache)\n \t\tvar module = installedModules[moduleId] = {\n \t\t\ti: moduleId,\n \t\t\tl: false,\n \t\t\texports: {}\n \t\t};\n\n \t\t// Execute the module function\n \t\tmodules[moduleId].call(module.exports, module, module.exports, __webpack_require__);\n\n \t\t// Flag the module as loaded\n \t\tmodule.l = true;\n\n \t\t// Return the exports of the module\n \t\treturn module.exports;\n \t}\n\n\n \t// expose the modules object (__webpack_modules__)\n \t__webpack_require__.m = modules;\n\n \t// expose the module cache\n \t__webpack_require__.c = installedModules;\n\n \t// define getter function for harmony exports\n \t__webpack_require__.d = function(exports, name, getter) {\n \t\tif(!__webpack_require__.o(exports, name)) {\n \t\t\tObject.defineProperty(exports, name, { enumerable: true, get: getter });\n \t\t}\n \t};\n\n \t// define __esModule on exports\n \t__webpack_require__.r = function(exports) {\n \t\tif(typeof Symbol !== 'undefined' && Symbol.toStringTag) {\n \t\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });\n \t\t}\n \t\tObject.defineProperty(exports, '__esModule', { value: true });\n \t};\n\n \t// create a fake namespace object\n \t// mode & 1: value is a module id, require it\n \t// mode & 2: merge all properties of value into the ns\n \t// mode & 4: return value when already ns object\n \t// mode & 8|1: behave like require\n \t__webpack_require__.t = function(value, mode) {\n \t\tif(mode & 1) value = __webpack_require__(value);\n \t\tif(mode & 8) return value;\n \t\tif((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;\n \t\tvar ns = Object.create(null);\n \t\t__webpack_require__.r(ns);\n \t\tObject.defineProperty(ns, 'default', { enumerable: true, value: value });\n \t\tif(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));\n \t\treturn ns;\n \t};\n\n \t// getDefaultExport function for compatibility with non-harmony modules\n \t__webpack_require__.n = function(module) {\n \t\tvar getter = module && module.__esModule ?\n \t\t\tfunction getDefault() { return module['default']; } :\n \t\t\tfunction getModuleExports() { return module; };\n \t\t__webpack_require__.d(getter, 'a', getter);\n \t\treturn getter;\n \t};\n\n \t// Object.prototype.hasOwnProperty.call\n \t__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };\n\n \t// __webpack_public_path__\n \t__webpack_require__.p = \"dist/\";\n\n\n \t// Load entry module and return exports\n \treturn __webpack_require__(__webpack_require__.s = 0);\n","# Taken from http://coffeescript.org/\n\n# Objects:\nmath =\n  root:   Math.sqrt\n  square: square\n  cube:   (x) -> x * square x\n\n# Splats:\nrace = (winner, runners...) ->\n  print winner, runners\n"],"sourceRoot":""}
```

# webpack output

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.23.1
      Asset      Size  Chunks             Chunk Names
    main.js  3.98 KiB       0  [emitted]  main
main.js.map  3.92 KiB       0  [emitted]  main
Entrypoint main = main.js main.js.map
chunk    {0} main.js, main.js.map (main) 256 bytes [entry] [rendered]
    > ./example.coffee main
 [0] ./example.coffee 256 bytes {0} [built]
     single entry ./example.coffee  main
```
