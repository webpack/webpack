const path = require("path");
const readDir = require("./readdir");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		clean: true
	},
	plugins: [
		compiler => {
			compiler.hooks.thisCompilation.tap("Test", compilation => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				new webpack.DllPlugin({
					name: "[name]_dll",
					path: path.resolve(outputPath, "manifest.json")
				}).apply(compiler);
			});
			compiler.hooks.afterEmit.tap("Test", compilation => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				expect(readDir(outputPath)).toMatchInlineSnapshot(`
			Object {
			  "directories": Array [],
			  "files": Array [
			    "manifest.json",
			    "bundle0.js",
			  ],
			}
		`);
			});
		}
	]
};
