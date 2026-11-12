/** @type {import("webpack").LoaderDefinitionFunction} */
module.exports = function (source) {
	if (this.resourcePath.endsWith("transient.js")) {
		this.emitWarning(new Error("late loader warning"));
		return source;
	}
	if (!source.includes("load transient")) return source;
	const callback = this.async();
	this.loadModule("./transient.js", (/** @type {Error | null} */ error) => callback(error, source));
};
