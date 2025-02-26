exports.id = "ComponentA_js";
exports.ids = ["ComponentA_js"];
exports.modules = {

/***/ "./ComponentA.js":
/*!***********************!*\
  !*** ./ComponentA.js ***!
  \***********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const react = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react/react");

module.exports = function ComponentA() {
	return "ComponentA with " + react;
};


/***/ })

};
;