require("./common");

module.exports = "vendor";

it("should have the correct main flag for multi vendor module", function() {
	var multiModule = __webpack_require__.c[module.parents[0]];
	expect(multiModule.hot._main).toBe(true);
});
