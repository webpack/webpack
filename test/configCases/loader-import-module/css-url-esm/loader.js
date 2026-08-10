"use strict";

/** @type {import("../../../../").PitchLoaderDefinitionFunction} */
exports.pitch = async function (remaining) {
	const result = await this.importModule(
		`${this.resourcePath}.webpack[javascript/auto]!=!${remaining}`,
		{ baseUri: "webpack://app", ...this.getOptions() }
	);
	return result.default || result;
};
