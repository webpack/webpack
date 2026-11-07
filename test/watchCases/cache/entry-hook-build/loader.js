"use strict";

/**
 * @this {import("webpack").LoaderContext<{ cacheable: boolean }>}
 * @param {string} source entry source
 * @returns {string} unchanged source
 */
module.exports = function (source) {
	this.cacheable(this.getOptions().cacheable);
	return source;
};
