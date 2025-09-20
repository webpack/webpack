"use strict";

const webpack = require("../../");

/** @type {webpack.Configuration} */
module.exports = {
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /foo.txt/,
				type: "asset/resource"
			},
			{
				test: /bar.txt/,
				use: require.resolve("file-loader")
			}
		]
	},
	plugins: [
		new webpack.ManifestPlugin({
			filename: "manifest.json"
		}),
		new webpack.ManifestPlugin({
			filename: "manifest.yml",
			handle(manifest) {
				let _manifest = "";
				for (const key in manifest) {
					if (key === "manifest.json") continue;
					_manifest += `- ${key}: '${manifest[key]}'\n`;
				}
				return _manifest;
			}
		})
	]
};
