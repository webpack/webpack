"use strict";

// Exposes the loader context's `target` so the case can assert what loaders see.
/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = function loaderTargetLoader() {
	return `export const loaderTarget = ${JSON.stringify(this.target)};`;
};
