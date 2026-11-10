this.missing = undefined;
this.present = {
	value: "this",
	/**
	 * @param {string} suffix suffix
	 * @returns {string} value with suffix
	 */
	method(suffix) {
		return this.value + suffix;
	}
};
this.read = () => [
	this.missing?.main?.filename,
	this.present?.value,
	this.present?.["value"],
	this.present?.missing?.value,
	this.present.value
];
this.call = () => [
	this.missing?.method(require("./argument")),
	this.present?.method(require("./argument")),
	this.present.method?.("?"),
	this.present.method(".")
];
