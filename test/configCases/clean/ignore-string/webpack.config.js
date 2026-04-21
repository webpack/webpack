"use strict";

const fs = require("fs");
const path = require("path");
const readDir = require("../enabled/readdir");

const IGNORED_DIR = "ignored/dir";
const CUSTOM_DIR = "this/dir/should/be/removed";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		clean: {
			keep: IGNORED_DIR
		}
	},
	plugins: [
		(compiler) => {
			compiler.hooks.emit.tap("Test", (compilation) => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				const customDirPath = path.join(outputPath, CUSTOM_DIR);
				const ignoredDirPath = path.join(
					outputPath,
					IGNORED_DIR,
					"that/should/not/be/removed"
				);

				fs.mkdirSync(customDirPath, { recursive: true });
				fs.writeFileSync(path.join(customDirPath, "file.ext"), "");
				fs.mkdirSync(ignoredDirPath, { recursive: true });
				fs.writeFileSync(path.join(ignoredDirPath, "file.ext"), "");
			});
			compiler.hooks.afterEmit.tap("Test", (compilation) => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				const result = readDir(outputPath);
				result.directories.sort();
				result.files.sort();
				expect(result).toMatchInlineSnapshot(`
			Object {
			  "directories": Array [
			    "ignored",
			    "ignored/dir",
			    "ignored/dir/that",
			    "ignored/dir/that/should",
			    "ignored/dir/that/should/not",
			    "ignored/dir/that/should/not/be",
			    "ignored/dir/that/should/not/be/removed",
			  ],
			  "files": Array [
			    "bundle0.js",
			    "ignored/dir/that/should/not/be/removed/file.ext",
			  ],
			}
		`);
			});
		}
	]
};
