import * as __WEBPACK_EXTERNAL_MODULE_react__ from "react";
/******/ var __webpack_modules__ = ({

	/***/ "react":
	/*!************************!*\
		!*** external "react" ***!
		\************************/
	/***/ ((module) => {

		var x = y => { var x = {}; __webpack_require__.d(x, y); return x; }
		var y = x => () => x
		module.exports = __WEBPACK_EXTERNAL_MODULE_react__;

		/***/ })

	/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
	/******/ 	// Check if module is in cache
	/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
	/******/ 	if (cachedModule !== undefined) {
		/******/ 		return cachedModule.exports;
		/******/ 	}
	/******/ 	// Create a new module (and put it into the cache)
	/******/ 	var module = __webpack_module_cache__[moduleId] = {
		/******/ 		// no module.id needed
		/******/ 		// no module.loaded needed
		/******/ 		exports: {}
		/******/ 	};
	/******/
	/******/ 	// Execute the module function
	/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
	/******/
	/******/ 	// Return the exports of the module
	/******/ 	return module.exports;
	/******/ }
/******/
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
	/******/ 	// define getter functions for harmony exports
	/******/ 	__webpack_require__.d = (exports, definition) => {
		/******/ 		for(var key in definition) {
			/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
				/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
				/******/ 			}
			/******/ 		}
		/******/ 	};
	/******/ })();
/******/
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
	/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
	/******/ })();
/******/
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
	/******/ 	// define __esModule on exports
	/******/ 	__webpack_require__.r = (exports) => {
		/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
			/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
			/******/ 		}
		/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
		/******/ 	};
	/******/ })();
/******/
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
	/*!***************************!*\
		!*** ./src/store/call.ts ***!
		\***************************/
	__webpack_require__.r(__webpack_exports__);
	/* harmony export */ __webpack_require__.d(__webpack_exports__, {
		/* harmony export */   useCall: () => (/* binding */ useCall),
		/* harmony export */   withCallManager: () => (/* binding */ withCallManager)
		/* harmony export */ });
	/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");

	function withCallManager() {
		return react__WEBPACK_IMPORTED_MODULE_0__.createElement(1);
	}
	function useCall() {
		return withCallManager();
	}
})();

var __webpack_exports__useCall = __webpack_exports__.useCall;
var __webpack_exports__withCallManager = __webpack_exports__.withCallManager;
export { __webpack_exports__useCall as useCall, __webpack_exports__withCallManager as withCallManager };
