"use strict";

const fs = require("fs");
const path = require("path");
const { RawSource } = require("webpack-sources");
const readDir = require("../enabled/readdir");

const PLUGIN_NAME = "CleanDotFilesPlugin";

// no dot-file is removed, wherever it is
const PLANTED = [
	".gitkeep",
	".cache/file.txt",
	"js/.hidden",
	"js/stale.txt",
	"stale/.keep",
	"stale/file.txt"
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
						for (const file of PLANTED) {
							const absolute = path.join(outputPath, file);
							fs.mkdirSync(path.dirname(absolute), { recursive: true });
							fs.writeFileSync(absolute, "");
						}
					}
					compilation.emitAsset("js/main.txt", new RawSource(""));
				});
			});
			compiler.hooks.afterEmit.tap(PLUGIN_NAME, (compilation) => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				expect(readDir(outputPath)).toMatchInlineSnapshot(`
			Object {
			  "directories": Array [
			    ".cache",
			    "js",
			    "stale",
			  ],
			  "files": Array [
			    ".cache/file.txt",
			    ".gitkeep",
			    "bundle0.js",
			    "js/.hidden",
			    "js/main.txt",
			    "stale/.keep",
			  ],
			}
		`);
			});
		}
	]
};
