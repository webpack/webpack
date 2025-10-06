"use strict";

const path = require("path");
const DotenvPlugin = require("../../../../").DotenvPlugin;

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */

module.exports = (env, { srcPath, testPath }) => {
	const dotenvPlugin = new DotenvPlugin({
		prefix: "WEBPACK_",
		dir: ""
	});
	return {
		mode: "development",
		dotenv: false,
		plugins: [
			(compiler) => {
				let i = 0;
				// Update dotenvPlugin.config.dir before each compile
				// Use beforeCompile with stage -1 to run before DotenvPlugin
				compiler.hooks.beforeCompile.tap(
					{
						name: "UpdateDotenvDir",
						stage: -1
					},
					() => {
						dotenvPlugin.config.dir = path.join(__dirname, String(i));
						i++;
					}
				);
			},
			dotenvPlugin
		]
	};
};
