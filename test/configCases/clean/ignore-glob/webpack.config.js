"use strict";

const fs = require("fs");
const path = require("path");
const readDir = require("../enabled/readdir");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		clean: {
			keep: { glob: ["**/*.ext", "!removed/**"] }
		}
	},
	plugins: [
		(compiler) => {
			let once = true;
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				compilation.hooks.processAssets.tap("Test", () => {
					if (once) {
						const outputPath = compilation.getPath(compiler.outputPath, {});
						const keptDir = path.join(outputPath, "kept/dir");
						const removedDir = path.join(outputPath, "removed/dir");
						fs.mkdirSync(keptDir, { recursive: true });
						fs.writeFileSync(path.join(keptDir, "file.ext"), "");
						fs.writeFileSync(path.join(keptDir, "file.removed"), "");
						fs.mkdirSync(removedDir, { recursive: true });
						fs.writeFileSync(path.join(removedDir, "file.ext"), "");
						once = false;
					}
				});
			});
			compiler.hooks.afterEmit.tap("Test", (compilation) => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				expect(readDir(outputPath)).toMatchInlineSnapshot(`
			Object {
			  "directories": Array [
			    "kept",
			    "kept/dir",
			  ],
			  "files": Array [
			    "bundle0.js",
			    "kept/dir/file.ext",
			  ],
			}
		`);
			});
		}
	]
};
