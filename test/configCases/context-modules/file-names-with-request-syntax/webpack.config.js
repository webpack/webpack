"use strict";

const fs = require("fs");
const path = require("path");

const PLUGIN_NAME = "WriteContextFilesPlugin";

// A Windows checkout cannot hold a "\" in a name, so files are written before the build.
const FILE_NAMES = [
	"a.json",
	"b!c.json",
	"c!=!d.json",
	"f#g.json",
	"h\\i.json"
];

/** @type {(env: unknown, options: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	const directory = path.join(testPath, "files");
	return {
		resolve: {
			alias: { files: directory }
		},
		plugins: [
			/**
			 * @param {import("../../../../").Compiler} compiler compiler
			 */
			(compiler) => {
				compiler.hooks.beforeRun.tap(PLUGIN_NAME, () => {
					fs.mkdirSync(directory, { recursive: true });
					for (const name of FILE_NAMES) {
						fs.writeFileSync(
							path.join(directory, name),
							JSON.stringify({ name })
						);
					}
				});
			}
		]
	};
};
