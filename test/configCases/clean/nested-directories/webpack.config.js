"use strict";

const fs = require("fs");
const path = require("path");
const { RawSource } = require("webpack-sources");
const readDir = require("./readdir");

const PLUGIN_NAME = "CleanNestedDirectoriesPlugin";

// Assets living in sibling directory trees: every directory on the way to an
// asset — and only those — has to survive the clean.
const EMITTED = [
	"js/main.txt",
	"static/js/main.txt",
	"static/deep/nested/leaf.txt"
];
const STALE = [
	"js/stale.txt",
	"js/stale/file.txt",
	"static/stale.txt",
	"unrelated/file.txt"
];

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		clean: true
	},
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			let planted = false;
			compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
					const outputPath = compilation.getPath(compiler.outputPath, {});
					if (!planted) {
						planted = true;
						for (const file of STALE) {
							const absolute = path.join(outputPath, file);
							fs.mkdirSync(path.dirname(absolute), { recursive: true });
							fs.writeFileSync(absolute, "");
						}
					}
					for (const file of EMITTED) {
						compilation.emitAsset(file, new RawSource(""));
					}
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				expect(readDir(outputPath)).toMatchInlineSnapshot(`
			Object {
			  "directories": Array [
			    "js",
			    "static",
			    "static/deep",
			    "static/deep/nested",
			    "static/js",
			  ],
			  "files": Array [
			    "bundle0.js",
			    "js/main.txt",
			    "static/deep/nested/leaf.txt",
			    "static/js/main.txt",
			  ],
			}
		`);
			});
		}
	]
};
