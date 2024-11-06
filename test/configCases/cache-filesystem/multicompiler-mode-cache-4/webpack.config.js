"use strict";

// with explicit cache names

/** @type {import("../../../../").Configuration} */
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
				apply(compiler) {
					compiler.hooks.environment.tap("FixTestCachePlugin", () => {
						compiler.options.cache.cacheLocation =
							compiler.options.cache.cacheLocation.replace(
								/default$/,
								"default-extra"
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
			name: "default",
			type: "filesystem"
		}
	}
];
