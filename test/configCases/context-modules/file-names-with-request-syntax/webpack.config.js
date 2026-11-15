"use strict";

const fs = require("fs");
const path = require("path");

const PLUGIN_NAME = "WriteContextFilesPlugin";
const WRITTEN_AT = new Date("2020-01-01T00:00:00Z");

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
						const file = path.join(directory, name);
						fs.writeFileSync(file, JSON.stringify({ name }));
						fs.utimesSync(file, WRITTEN_AT, WRITTEN_AT);
					}
					// A file or directory changed just before the build is too recent for
					// the persistent cache to trust, so they get a time long past.
					fs.utimesSync(directory, WRITTEN_AT, WRITTEN_AT);
				});
			}
		]
	};
};
