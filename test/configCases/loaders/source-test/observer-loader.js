"use strict";

/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = function (source) {
	if (!this.loaders[this.loaderIndex + 1].data.pitched) {
		throw new Error("The filtered loader pitch function did not run");
	}
	return source;
};
