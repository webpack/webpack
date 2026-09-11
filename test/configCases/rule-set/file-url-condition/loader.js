/** @type {import("../../../../").LoaderDefinition<{ marker: string }>} */
module.exports = function (source) {
	return source.replace("MARKER", `MARKER-${this.getOptions().marker}`);
};
