"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(source) {
	return source;
};

/** @type {import("../../../../").PitchLoaderDefinitionFunction} */
module.exports.pitch = function pitch() {
	throw new Error("thrown from pitch");
};
