"use strict";

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").FileCacheOptions} FileCacheOptions */

// with explicit cache names

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		mode: "production",
		entry: "./index",
		cache: {
			name: "filesystem",
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
							).replace(/filesystem$/, "filesystem-extra-1");
					});
				}
			}
		]
	},
	{
		mode: "production",
		entry: "./index",
		cache: {
			name: "filesystem",
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
							).replace(/filesystem$/, "filesystem-extra-2");
					});
				}
			}
		]
	},
	{
		name: "3rd compiler",
		mode: "production",
		entry: "./index",
		cache: {
			name: "filesystem",
			type: "filesystem"
		}
	}
];
