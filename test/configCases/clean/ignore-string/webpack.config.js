"use strict";

const fs = require("fs");
const path = require("path");
const readDir = require("../enabled/readdir");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		clean: {
			keep: "ignored/dir"
		}
	},
	plugins: [
		(compiler) => {
			let once = true;
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				compilation.hooks.processAssets.tap("Test", () => {
					if (once) {
						const outputPath = compilation.getPath(compiler.outputPath, {});
						const customDir = path.join(
							outputPath,
							"this/dir/should/be/removed"
						);
						const ignoredDir = path.join(
							outputPath,
							"ignored/dir/that/should/not/be/removed"
						);
						fs.mkdirSync(customDir, { recursive: true });
						fs.writeFileSync(path.join(customDir, "file.ext"), "");
						fs.mkdirSync(ignoredDir, { recursive: true });
						fs.writeFileSync(path.join(ignoredDir, "file.ext"), "");
						once = false;
					}
				});
			});
			compiler.hooks.afterEmit.tap("Test", (compilation) => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				expect(readDir(outputPath)).toMatchInlineSnapshot(`
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
			    "ignored/dir/that/should/not/be/removed/file.ext",
			    "bundle0.js",
			  ],
			}
		`);
			});
		}
	]
};
