"use strict";

// with explicit cache names

/** @typedef {import("../../../../").Configuration} Configuration */
/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").FileCacheOptions} FileCacheOptions */

/** @type {Configuration} */
module.exports = [
	{
		mode: "production",
		entry: "./index",
		cache: {
			name: "default",
			type: "filesystem"
		},
		plugins: [
			{
				/**
				 * @param {Compiler} compiler compiler
				 */
				apply(compiler) {
					compiler.hooks.environment.tap("FixTestCachePlugin", () => {
						/** @type {FileCacheOptions} */
						(compiler.options.cache).cacheLocation =
							/** @type {string} */
							(
								/** @type {FileCacheOptions} */
								(compiler.options.cache).cacheLocation
							).replace(/default$/, "default-extra");
					});
				}
			}
		]
	},
	{
		mode: "production",
		entry: "./index",
		cache: {
			name: "default",
			type: "filesystem"
		}
	}
];
