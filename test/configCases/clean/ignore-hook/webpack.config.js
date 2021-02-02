const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");
const { RawSource } = require("webpack-sources");
const readDir = require("../enabled/readdir");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		clean: true
	},
	plugins: [
		compiler => {
			compiler.hooks.thisCompilation.tap("Test", compilation => {
				webpack.CleanPlugin.getCompilationHooks(compilation).keep.tap(
					"Test",
					asset => {
						if (/[/\\]ignored[/\\]dir[/\\]/.test(asset)) return true;
						if (asset.includes(`ignored/too`)) return true;
					}
				);
				compilation.hooks.processAssets.tap("Test", assets => {
					const outputPath = compilation.getPath(compiler.outputPath, {});
					const customDir = path.join(outputPath, "this/dir/should/be/removed");
					const ignoredDir = path.join(
						outputPath,
						"this/is/ignored/dir/that/should/not/be/removed"
					);
					const ignoredTooDir = path.join(
						outputPath,
						"this/is/ignored/too/dir/that/should/not/be/removed"
					);
					fs.mkdirSync(customDir, { recursive: true });
					fs.writeFileSync(path.join(customDir, "file.ext"), "");
					fs.mkdirSync(ignoredDir, { recursive: true });
					fs.writeFileSync(path.join(ignoredDir, "file.ext"), "");
					fs.mkdirSync(ignoredTooDir, { recursive: true });
					fs.writeFileSync(path.join(ignoredTooDir, "file.ext"), "");
					assets["this/dir/should/not/be/removed/file.ext"] = new RawSource("");
				});
			});
			compiler.hooks.afterEmit.tap("Test", compilation => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				expect(readDir(outputPath)).toMatchInlineSnapshot(`
			Object {
			  "directories": Array [
			    "this",
			    "this/is",
			    "this/is/ignored",
			    "this/is/ignored/too",
			    "this/is/ignored/too/dir",
			    "this/is/ignored/too/dir/that",
			    "this/is/ignored/too/dir/that/should",
			    "this/is/ignored/too/dir/that/should/not",
			    "this/is/ignored/too/dir/that/should/not/be",
			    "this/is/ignored/too/dir/that/should/not/be/removed",
			    "this/is/ignored/dir",
			    "this/is/ignored/dir/that",
			    "this/is/ignored/dir/that/should",
			    "this/is/ignored/dir/that/should/not",
			    "this/is/ignored/dir/that/should/not/be",
			    "this/is/ignored/dir/that/should/not/be/removed",
			    "this/dir",
			    "this/dir/should",
			    "this/dir/should/not",
			    "this/dir/should/not/be",
			    "this/dir/should/not/be/removed",
			  ],
			  "files": Array [
			    "this/is/ignored/too/dir/that/should/not/be/removed/file.ext",
			    "this/is/ignored/dir/that/should/not/be/removed/file.ext",
			    "this/dir/should/not/be/removed/file.ext",
			    "bundle0.js",
			  ],
			}
		`);
			});
		}
	]
};
