"use strict";

/** @type {import("../../../../").LoaderDefinition<{ value: string }>} */
module.exports = function (source) {
	if (!this.data.pitched) throw new Error("The loader pitch function did not run");
	if (!this.loaders[this.loaderIndex].request.includes("transform-loader.js")) {
		throw new Error("The source test changed the loader request");
	}
	const options = this.getOptions();
	if (Object.keys(options).join(",") !== "value") {
		throw new Error("The source test leaked into loader options");
	}
	return `export default ${JSON.stringify(options.value)};`;
};

/** @type {import("../../../../").PitchLoaderDefinitionFunction} */
module.exports.pitch = function (_remaining, _previous, data) {
	data.pitched = true;
};
