module.exports = {
	used: "used",
	unusedMethod() {
		return require("./heavy");
	},
	usedExports: __webpack_exports_info__.usedExports
};
