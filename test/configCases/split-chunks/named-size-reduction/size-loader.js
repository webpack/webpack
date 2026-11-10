"use strict";

/** @typedef {import("../../../../types").LoaderDefinition<{ size: number }>} LoaderDefinition */

/** @type {LoaderDefinition} */
module.exports = function sizeLoader(source) {
	return source.padEnd(this.getOptions().size, " ");
};
