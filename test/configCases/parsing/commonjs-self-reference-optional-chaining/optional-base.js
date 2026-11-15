exports.value = "base";
/**
 * @param {string} suffix suffix
 * @returns {string} value with suffix
 */
exports.method = function (suffix) {
	return this.value + suffix;
};
exports.read = () => [
	exports?.value,
	module.exports?.value,
	this?.value
];
exports.call = () => [
	exports?.method(require("./argument")),
	module.exports?.method(require("./argument")),
	this?.method(require("./argument")),
	exports.method?.(require("./argument")),
	module.exports.method?.(require("./argument")),
	this.method?.(require("./argument"))
];
