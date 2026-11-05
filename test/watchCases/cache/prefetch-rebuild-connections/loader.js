"use strict";

/**
 * @this {import("../../../..").LoaderContext<Record<string, never>>}
 * @param {string} source module source
 * @returns {string} uncached source
 */
module.exports = function loader(source) {
	this.cacheable(false);
	return source;
};
