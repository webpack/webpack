(() => {
var exports = {};
exports.id = "main";
exports.ids = ["main"];
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


/***/ }),

/***/ "./index.js":
/*!******************!*\
  !*** ./index.js ***!
  \******************/
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

it("should load shared module eagerly", async () => {
	const reactValue = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react/react");
	expect(reactValue).toBe("react-value");
});

it("should load exposed module that uses shared module", async () => {
	const ComponentA = __webpack_require__(/*! ./ComponentA */ "./ComponentA.js");
	expect(ComponentA.default()).toBe("ComponentA with react-value");
});


/***/ })

};
;

// load runtime
var __webpack_require__ = require("./somethingElse.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))



var promises = [];
var __webpack_exports__ = (__webpack_exec__("./index.js"));
module.exports = __webpack_exports__;

})();