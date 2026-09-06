"use strict";

const path = require("path");
const webpack = require("../../");

const jsx = {
	test: /\.js$/,
	include: [path.resolve(__dirname, ".")],
	use: {
		loader: "babel-loader",
		options: { presets: ["@babel/react"] }
	}
};

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
	module: { rules: [jsx] },
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
	// a node target has no DOM, so `import.meta.env.SSR` is `true` here and the
	// CSS runtime collects the styles rather than linking them into a page
	target: "node",
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
			jsx,
			{
				test: /\.(png|jpe?g|svg|woff2?)$/,
				type: "asset/resource",
				// the client build already wrote these files; only the URL is needed here
				generator: { emit: false }
			}
		],
		generator: {
			css: {
				// a document-less target emits no stylesheets by default; opt in,
				// because the collected CSS below is read back from them
				exportsOnly: false
			}
		}
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		outputModule: true
	}
};

module.exports = [client, server];
