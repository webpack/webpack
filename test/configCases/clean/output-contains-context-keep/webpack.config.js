"use strict";

const fs = require("fs");
const path = require("path");

const PLUGIN_NAME = "CleanOutputContainsContextKeepPlugin";

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	const context = path.join(testPath, "project");
	return {
		context,
		entry: path.resolve(__dirname, "index.js"),
		output: {
			path: testPath,
			// the project is kept on purpose, so the output path is cleaned around it
			clean: { keep: /^project\// }
		},
		plugins: [
			/**
			 * @param {import("../../../../").Compiler} compiler compiler
			 */
			(compiler) => {
				compiler.hooks.environment.tap(PLUGIN_NAME, () => {
					fs.mkdirSync(context, { recursive: true });
					fs.writeFileSync(path.join(context, "file.txt"), "");
					fs.writeFileSync(path.join(testPath, "stale.txt"), "");
				});
				compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
					expect(fs.existsSync(path.join(context, "file.txt"))).toBe(true);
					expect(fs.existsSync(path.join(testPath, "stale.txt"))).toBe(false);
				});
			}
		]
	};
};
