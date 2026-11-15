exports.missing = undefined;
exports.present = {
	value: "exports",
	/**
	 * @param {string} suffix suffix
	 * @returns {string} value with suffix
	 */
	method(suffix) {
		return this.value + suffix;
	}
};
exports.read = () => [
	exports.missing?.main?.filename,
	exports.present?.value,
	exports.present?.["value"],
	exports.present?.missing?.value,
	exports.present.value
];
exports.call = () => [
	exports.missing?.method(require("./argument")),
	exports.present?.method(require("./argument")),
	exports.present.method?.("?"),
	exports.present.method(".")
];
exports.grouped = () => (exports.present?.method)("!");
exports.groupedMissing = () => (exports.missing?.method)();
