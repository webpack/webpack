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
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
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
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/* no static exports found */
/* all exports used */
/*!*********************************************!*\
  !*** (webpack)/~/worker-loader!./worker.js ***!
  \*********************************************/
/***/ (function(module, exports) {

throw new Error("Module build failed: Error: Cannot find module 'webpack/lib/webworker/WebWorkerTemplatePlugin'\n    at Function.Module._resolveFilename (module.js:469:15)\n    at Function.Module._load (module.js:417:25)\n    at require (internal/module.js:20:19)\n    at Object.<anonymous> (/home/thebeing/Documents/FLOSS/webpack/node_modules/worker-loader/index.js:1:93)\n    at Module._compile (module.js:570:32)\n    at Object.Module._extensions..js (module.js:579:10)\n    at Module.load (module.js:487:32)\n    at tryModuleLoad (module.js:446:12)\n    at Function.Module._load (module.js:438:3)\n    at require (internal/module.js:20:19)\n    at loadLoader (/home/thebeing/Documents/FLOSS/webpack/node_modules/loader-runner/lib/loadLoader.js:13:17)\n    at iteratePitchingLoaders (/home/thebeing/Documents/FLOSS/webpack/node_modules/loader-runner/lib/LoaderRunner.js:169:2)\n    at runLoaders (/home/thebeing/Documents/FLOSS/webpack/node_modules/loader-runner/lib/LoaderRunner.js:362:2)\n    at NormalModule.doBuild (/home/thebeing/Documents/FLOSS/webpack/lib/NormalModule.js:179:3)\n    at Compilation.buildModule (/home/thebeing/Documents/FLOSS/webpack/lib/Compilation.js:146:10)\n    at factoryCallback (/home/thebeing/Documents/FLOSS/webpack/lib/Compilation.js:329:11)\n    at factory (/home/thebeing/Documents/FLOSS/webpack/lib/NormalModuleFactory.js:253:5)\n    at /home/thebeing/Documents/FLOSS/webpack/node_modules/tapable/lib/Tapable.js:204:11\n    at NormalModuleFactory.params.normalModuleFactory.plugin (/home/thebeing/Documents/FLOSS/webpack/lib/CompatibilityPlugin.js:52:5)\n    at NormalModuleFactory.applyPluginsAsyncWaterfall (/home/thebeing/Documents/FLOSS/webpack/node_modules/tapable/lib/Tapable.js:208:13)\n    at resolver (/home/thebeing/Documents/FLOSS/webpack/lib/NormalModuleFactory.js:74:11)\n    at process.nextTick (/home/thebeing/Documents/FLOSS/webpack/lib/NormalModuleFactory.js:205:8)\n    at _combinedTickCallback (internal/process/next_tick.js:67:7)\n    at process._tickCallback (internal/process/next_tick.js:98:9)\n");

/***/ }),
/* 1 */
/* no static exports found */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ (function(module, exports, __webpack_require__) {

var Worker = __webpack_require__(/*! worker-loader!./worker */ 0);
var worker = new Worker;
worker.postMessage("b");
worker.onmessage = function(event) {
	var templateB = event.data; // "This text was generated by template B"
}


/***/ })
/******/ ]);