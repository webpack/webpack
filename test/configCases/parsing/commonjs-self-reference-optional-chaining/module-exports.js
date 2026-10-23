module.exports.missing = undefined;
module.exports.present = {
	value: "module.exports",
	/**
	 * @param {string} suffix suffix
	 * @returns {string} value with suffix
	 */
	method(suffix) {
		return this.value + suffix;
	}
};
module.exports.read = () => [
	module.exports.missing?.main?.filename,
	module.exports.present?.value,
	module.exports.present?.["value"],
	module.exports.present?.missing?.value,
	module.exports.present.value
];
module.exports.call = () => [
	module.exports.missing?.method(require("./argument")),
	module.exports.present?.method(require("./argument")),
	module.exports.present.method?.("?"),
	module.exports.present.method(".")
];
