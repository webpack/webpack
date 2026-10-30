"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	throw new Error("Normal function should not run after pitch returns");
};

/** @type {import("../../../../").PitchLoaderDefinitionFunction} */
module.exports.pitch = function () {
	return 'export default "pitch-result";';
};
