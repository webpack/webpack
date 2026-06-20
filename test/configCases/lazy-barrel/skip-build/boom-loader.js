"use strict";

/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = function () {
	throw new Error(
		`boom-loader ran on a deferred module: ${this.resourcePath}`
	);
};
