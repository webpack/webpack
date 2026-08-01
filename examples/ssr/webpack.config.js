"use strict";

const path = require("path");
const webpack = require("../../");

/** @type {import("webpack").Configuration} */
const client = {
	name: "client",
	target: "web",
	entry: "./example.js",
	output: {
		path: path.resolve(__dirname, "dist/client"),
		filename: "[name].js",
		// baked into the manifests, so the server emits URLs it never has to rewrite
		publicPath: "/dist/client/"
	},
	optimization: {
		chunkIds: "named" // keep filenames stable across modes (for this example)
	},
	plugins: [
		// source module -> the client files needed to run it, for the server to preload
		new webpack.SSRManifestPlugin(),
		// emitted asset -> its source, plus the entrypoint graph, for asset pipelines
		new webpack.ManifestPlugin()
	]
};

/** @type {import("webpack").Configuration} */
const server = {
	name: "server",
	// neutral platform: browser APIs are guarded at runtime, so the CSS runtime
	// collects the styles instead of touching a DOM that is not there
	target: ["web", "node"],
	entry: "./server.js",
	output: {
		path: path.resolve(__dirname, "dist/server"),
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		library: { type: "module" }
	},
	// keep node builtins and installed packages out of the server bundle; add
	// `allowlist` to bundle individual packages anyway (ESM-only ones, say)
	externalsPresets: { node: true, nodeModules: true },
	module: {
		rules: [
			{
				test: /\.(png|jpe?g|svg|woff2?)$/,
				type: "asset/resource",
				// the client build already wrote these files; only the URL is needed here
				generator: { emit: false }
			}
		]
	},
	optimization: {
		chunkIds: "named"
	}
};

module.exports = [client, server];
