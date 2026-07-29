const usedShort = "used-short";
const unusedShort = "unused-short";
module.exports = {
	used: "used-value",
	unused: "unused-value",
	usedShort,
	unusedShort,
	usedFn: function () {
		return "used-fn";
	},
	unusedFn: function () {
		return "unused-fn";
	},
	usedExports: __webpack_exports_info__.usedExports
};
