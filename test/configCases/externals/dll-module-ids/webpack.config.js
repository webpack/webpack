"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => {
	const manifest = path.resolve(testPath, "manifest.json");
	return [
		{
			name: "dll",
			mode: "development",
			target: "node",
			entry: ["./alias.js"],
			externals: { "./alias.js": "commonjs path" },
			optimization: { moduleIds: "named" },
			output: {
				filename: "dll.js",
				library: { type: "commonjs2" }
			},
			plugins: [new webpack.DllPlugin({ path: manifest })]
		},
		{
			name: "consumer",
			dependencies: ["dll"],
			mode: "development",
			target: "node",
			output: { filename: "consumer.js" },
			plugins: [
				new webpack.DllReferencePlugin({
					manifest,
					name: "./dll.js",
					scope: "dll",
					sourceType: "commonjs2"
				})
			]
		}
	];
};
