// "this" occurs in the source text of the module, but never as an own `this`
// of an exported function — neither before nor after this one
exports.b = function () {
	return "b";
};

exports.a = function (thisArg) {
	// mentions this in a comment
	const _this = "this is a string";
	return typeof thisArg + _this.length;
};

exports.usedExports = __webpack_exports_info__.usedExports;
