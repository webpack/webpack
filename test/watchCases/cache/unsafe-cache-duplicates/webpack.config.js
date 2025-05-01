const path = require("path");

/** @typedef {import("../../../../").NormalModule} NormalModule */

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => ({
	mode: "development",
	cache: {
		type: "filesystem",
		maxMemoryGenerations: Infinity,
		idleTimeout: 1
	},
	module: {
		unsafeCache: module =>
			/module\.js/.test(/** @type {NormalModule} */ (module).resource)
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
