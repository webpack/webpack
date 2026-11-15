"use strict";

/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = function (source) {
	if (!source.includes("\uFFFD")) throw new Error("Expected undecodable input");
	return 'export default "invalid-preserved";';
};
