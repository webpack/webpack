"use strict";

// @ts-expect-error no types for yamljs
const YAML = require("yamljs");
const webpack = require("../../");

/** @type {import("webpack").Configuration} */
const config = {
	devtool: "source-map",
	output: {
		chunkFilename: "[name].[contenthash].js"
	},
	optimization: {
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	},
	module: {
		rules: [
			{
				test: /foo.txt/,
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
			prefix: "/nested/[publicpath]",
			filter(item) {
				if (/.map$/.test(item.file)) {
					return false;
				}

				return true;
			},
			generate(manifest) {
				delete manifest.assets["manifest.json"];
				manifest.custom = "value";
				return manifest;
			},
			serialize(manifest) {
				return YAML.stringify(manifest, 4);
			}
		})
	]
};

module.exports = config;
