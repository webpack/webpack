// "this" occurs in the source text of the exported functions, but never as an
// own `this` of them — the textual pre-filter must not make the scan miss that
exports.a = function (thisArg) {
	// mentions this in a comment
	const _this = "this is a string";
	return typeof thisArg + _this.length;
};

exports.b = function () {
	return "b";
};

exports.usedExports = __webpack_exports_info__.usedExports;
