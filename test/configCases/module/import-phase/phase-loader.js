"use strict";

/** @typedef {import("../../../../types").LoaderDefinition<{ phase: string }>} LoaderDefinition */

/** @type {LoaderDefinition} */
module.exports = function (source) {
	const options = this.getOptions();
	return `${source}\nexport default ${JSON.stringify(
		options.phase
	)};\n`;
};

