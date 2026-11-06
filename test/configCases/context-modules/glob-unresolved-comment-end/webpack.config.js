"use strict";

const fs = require("fs");
const path = require("path");

const PLUGIN_NAME = "WriteGlobFilesPlugin";
const WRITTEN_AT = new Date("2020-01-01T00:00:00Z");

// Windows names cannot hold "*" or "?", so the files are written before the build.
const FILE_NAMES = ["a.js", "b?c.js"];

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	const root = path.join(testPath, "files");
	const directory = path.join(root, "x*");
	return {
		// A glob starting with "/" is relative to the context, where the files are.
		context: testPath,
		entry: path.join(__dirname, "index.js"),
		plugins: [
			/**
			 * @param {import("../../../../").Compiler} compiler compiler
			 */
			(compiler) => {
				compiler.hooks.beforeRun.tap(PLUGIN_NAME, () => {
					fs.mkdirSync(directory, { recursive: true });
					for (const name of FILE_NAMES) {
						const file = path.join(directory, name);
						fs.writeFileSync(file, "export default 1;\n");
						fs.utimesSync(file, WRITTEN_AT, WRITTEN_AT);
					}
					// A file or directory changed just before the build is too recent for
					// the persistent cache to trust, so they get a time long past.
					fs.utimesSync(directory, WRITTEN_AT, WRITTEN_AT);
					fs.utimesSync(root, WRITTEN_AT, WRITTEN_AT);
				});
			}
		]
	};
};
