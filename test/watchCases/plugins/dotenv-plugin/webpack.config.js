"use strict";

const DotenvPlugin = require("../../../../").DotenvPlugin;

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */

module.exports = (env, { srcPath, testPath }) => {
	const dotenvPlugin = new DotenvPlugin({
		prefix: "WEBPACK_",
		dir: "",
		template: [".env", ".env.myLocal", ".env.[mode]", ".env.[mode].myLocal"]
	});
	return {
		mode: "development",
		dotenv: false,
		plugins: [
			(compiler) => {
				// Update dotenvPlugin.config.dir before each compile
				// Use beforeCompile with stage -1 to run before DotenvPlugin
				compiler.hooks.beforeCompile.tap(
					{
						name: "UpdateDotenvDir",
						stage: -1
					},
					() => {
						dotenvPlugin.config.dir = srcPath;
					}
				);
			},
			dotenvPlugin
		]
	};
};
