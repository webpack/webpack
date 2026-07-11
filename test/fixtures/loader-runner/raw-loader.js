exports.__es6Module = true;
exports.default = function (source) {
	return Buffer.from(
		source.toString("hex") + source.toString("utf-8"),
		"utf-8"
	);
};
exports.raw = true;
