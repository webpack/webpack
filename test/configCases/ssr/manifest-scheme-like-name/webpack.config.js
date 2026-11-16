"use strict";

const { DefinePlugin, SSRManifestPlugin } = require("../../../../");

/**
 * @param {string} chunkFilename the chunk filename template
 * @param {Record<string, string>} expected the url each chunk gets
 * @param {number} index the configuration's index
 * @returns {import("../../../../").Configuration} configuration
 */
const config = (chunkFilename, expected, index) => ({
	mode: "development",
	target: "web",
	devtool: false,
	node: { __dirname: false },
	output: {
		publicPath: "",
		chunkFilename
	},
	optimization: { chunkIds: "named" },
	plugins: [
		new SSRManifestPlugin({ filename: `ssr-manifest-${index}.json` }),
		new DefinePlugin({
			EXPECTED_URLS: JSON.stringify(expected),
			MANIFEST: JSON.stringify(`ssr-manifest-${index}.json`)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config(
		"[name].js",
		{
			"x:y": "./x:y.js",
			plain: "plain.js",
			"/z:w": "./z:w.js"
		},
		0
	),
	config(
		"chunk-[name].js",
		{
			"x:y": "./chunk-x:y.js",
			plain: "chunk-plain.js",
			"/z:w": "chunk-/z:w.js"
		},
		1
	),
	config(
		"[name]:part.js",
		{
			"x:y": "./x:y:part.js",
			plain: "./plain:part.js",
			"/z:w": "./z:w:part.js"
		},
		2
	)
];
