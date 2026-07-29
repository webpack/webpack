module.exports = {
	used: "used-value",
	get usedGetter() {
		return "used-getter";
	},
	get unusedGetter() {
		return "unused-getter";
	},
	unusedMethod() {
		return "unused-method";
	},
	usedExports: __webpack_exports_info__.usedExports
};
