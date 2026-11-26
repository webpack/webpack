"use strict";

const { DefinePlugin, SSRManifestPlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/**
 * @param {string | (() => string)} chunkFilename the chunk filename template
 * @param {Record<string, string>} expected the url each chunk gets
 * @param {number} index the configuration's index
 * @param {string=} publicPath the public path
 * @returns {Configuration} configuration
 */
const config = (chunkFilename, expected, index, publicPath = "") => ({
	mode: "development",
	target: "web",
	devtool: false,
	node: { __dirname: false },
	output: {
		publicPath,
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

/** @type {Configuration[]} */
module.exports = [
	config(
		"[name].js",
		{
			"x:y": "./x:y.js",
			plain: "plain.js",
			"/z:w": "./z:w.js",
			"q_r:s": "./q_r:s.js"
		},
		0
	),
	config(
		"chunk-[name].js",
		{
			"x:y": "./chunk-x:y.js",
			plain: "chunk-plain.js",
			"/z:w": "chunk-/z:w.js",
			"q_r:s": "./chunk-q_r:s.js"
		},
		1
	),
	config(
		"[name]:part.js",
		{
			"x:y": "./x:y:part.js",
			plain: "./plain:part.js",
			"/z:w": "./z:w:part.js",
			"q_r:s": "./q_r:s:part.js"
		},
		2
	),
	config(
		"[name:3].js",
		{
			"x:y": "./x:y.js",
			plain: "plain.js",
			"/z:w": "./z:w.js",
			"q_r:s": "./q_r:s.js"
		},
		3
	),
	// a public path in front: the url is not relative to the page
	config(
		"[name].js",
		{
			"x:y": "?file=x:y.js",
			plain: "?file=plain.js",
			"/z:w": "?file=z:w.js",
			"q_r:s": "?file=q_r:s.js"
		},
		4,
		"?file="
	),
	// the only chunk needing `./` is the one whose name holds a `?`
	{ ...config("[name].js", {}, 5), entry: "./only-query.js" },
	// the entry's public path is used over the output's
	{
		...config("[name].js", { "x:y": "?file=x:y.js" }, 6),
		entry: { main: { import: "./entry-public-path.js", publicPath: "?file=" } }
	},
	{
		...config("[name].js", { "x:y": "./x:y.js" }, 7, "?file="),
		entry: { main: { import: "./entry-public-path.js", publicPath: "" } }
	},
	// the only `:` is in the unique name
	(() => {
		const options = config("[uniqueName].[id].js", {}, 8);
		return {
			...options,
			entry: "./unique-name.js",
			output: { ...options.output, uniqueName: "x:y" }
		};
	})(),
	// a `#` in the name, and a function filename for the static url path
	{ ...config(() => "[name].js", {}, 9), entry: "./only-query.js" },
	{ ...config("[name].js", {}, 10), entry: "./only-hash.js" },
	{ ...config(() => "[name].js", {}, 11), entry: "./only-hash.js" },
	// a parameterized id, written whole as `[name:3]` is
	config(
		"[id:5].js",
		{
			"x:y": "./x:y.js",
			plain: "plain.js",
			"/z:w": "./z:w.js",
			"q_r:s": "./q_r:s.js"
		},
		12
	)
];
