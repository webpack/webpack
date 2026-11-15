"use strict";

/** @typedef {import("webpack").LoaderContext<Record<string, never>> & { waitForShared?: () => Promise<void> }} BarrierLoaderContext */

/**
 * @this {BarrierLoaderContext}
 * @param {string} source source
 * @returns {Promise<string>} generated module
 */
module.exports = async function (source) {
	if (source.trim() === "first") return 'module.exports = "first";';
	if (this.waitForShared) await this.waitForShared();
	/** @type {string} */
	const value = await this.importModule("./execute.js");
	return `module.exports = ${JSON.stringify(value)};`;
};
