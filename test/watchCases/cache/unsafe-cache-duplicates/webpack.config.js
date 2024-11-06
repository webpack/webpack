const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => ({
	mode: "development",
	cache: {
		type: "filesystem",
		maxMemoryGenerations: Infinity,
		idleTimeout: 1
	},
	module: {
		unsafeCache: module => /module\.js/.test(module.resource)
	},
	plugins: [
		compiler => {
			compiler.cache.hooks.get.tap(
				{
					name: "webpack.config.js",
					stage: -1000
				},
				(identifier, etag) => {
					if (identifier.includes(path.join(srcPath, "module.js"))) {
						return null;
					}
				}
			);
		}
	]
});
