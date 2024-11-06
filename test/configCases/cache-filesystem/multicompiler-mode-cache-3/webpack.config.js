"use strict";

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
				apply(compiler) {
					compiler.hooks.environment.tap("FixTestCachePlugin", () => {
						compiler.options.cache.cacheLocation =
							compiler.options.cache.cacheLocation.replace(
								/filesystem$/,
								"filesystem-extra-1"
							);
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
				apply(compiler) {
					compiler.hooks.environment.tap("FixTestCachePlugin", () => {
						compiler.options.cache.cacheLocation =
							compiler.options.cache.cacheLocation.replace(
								/filesystem$/,
								"filesystem-extra-2"
							);
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
