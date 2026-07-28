"use strict";

/**
 * Exposes the loader context's `target` so the case can assert what loaders see.
 * @returns {string} module source
 */
module.exports = function loaderTargetLoader() {
	return `export const loaderTarget = ${JSON.stringify(this.target)};`;
};
