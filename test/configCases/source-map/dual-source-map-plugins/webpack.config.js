"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		devtool: false,
		entry: {
			bundle0: "./entry1.js"
		},
		output: {
			filename: "[name].js"
		},
		optimization: {
			runtimeChunk: true
		},
		plugins: [
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].map",
				test: (name) => name === "bundle0.js"
			}),
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].runtime.map",
				test: /runtime~bundle0\.js/
			})
		]
	},
	{
		entry: {
			bundle1: "./entry2.js"
		},
		devtool: false,
		output: {
			filename: "[name].js"
		},
		optimization: {
			runtimeChunk: true
		},
		plugins: [
			new webpack.EvalDevToolModulePlugin({
				test: "bundle1.js"
			}),
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].runtime.map",
				test: ["runtime~bundle1.js"]
			})
		]
	},
	{
		entry: {
			bundle2: "./entry3.js"
		},
		devtool: false,
		output: {
			filename: "[name].js",
			chunkFilename: "[name].js"
		},
		plugins: [
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].test.map",
				test: "bundle2.js",
				columns: false,
				append: false,
				namespace: "test",
				sourceRoot: "test",
				ignoreList: /entry3\.js/
			}),
			new webpack.SourceMapDevToolPlugin({
				filename: "[file].foo.map",
				test: "chunk-foo.js",
				columns: true,
				publicPath: "sourcemaps/",
				noSources: true,
				append: () => "\n//# sourceMappingURL=http://localhost:8080/foo/[url]",
				namespace: "foo",
				sourceRoot: "foo",
				debugIds: true
			})
		]
	}
];
