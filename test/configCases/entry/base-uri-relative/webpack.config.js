"use strict";

// A relative `baseUri` is no base of its own, so each target reads it against the base it
// would use without one — and the baked literal has to land where that runtime would.

const webpack = require("../../../../");

/**
 * @param {object} options the case this config covers
 * @param {number} options.index position of this config, so `index.js` finds its own stats
 * @param {string} options.name output prefix keeping the emitted files of each config apart
 * @param {boolean} options.esm whether the config emits ESM output
 * @param {string} options.baseUri the entry's base uri
 * @param {string} options.expect what the resolved asset url has to contain
 * @param {boolean=} options.chunkLoading whether chunk loading stays on
 * @param {string=} options.publicPath public path, when it must not be the default
 * @param {string=} options.entryFile module to build, when the asset url is not the subject
 * @returns {import("../../../../").Configuration} configuration
 */
const base = ({
	index,
	name,
	esm,
	baseUri,
	expect,
	chunkLoading,
	publicPath,
	entryFile
}) => ({
	name,
	target: "node",
	mode: "development",
	devtool: false,
	entry: { [name]: { import: entryFile || "./index.js", baseUri } },
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	experiments: { outputModule: esm },
	output: {
		module: esm,
		chunkFormat: esm ? "module" : "commonjs",
		chunkLoading: chunkLoading === false ? false : undefined,
		environment: esm ? { module: true } : undefined,
		filename: `${name}.${esm ? "mjs" : "js"}`,
		assetModuleFilename: "[name][ext]",
		publicPath: publicPath || "assets/"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__NAME__: JSON.stringify(name),
			__EXPECT__: JSON.stringify(expect)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base({
		index: 0,
		name: "bundle0",
		esm: true,
		baseUri: "app/",
		expect: "/app/assets/asset.txt"
	}),
	base({
		index: 1,
		name: "cjs",
		esm: false,
		baseUri: "app/",
		expect: "/app/assets/asset.txt"
	}),
	// A protocol-relative base keeps the scheme of whatever loads the chunk, which a
	// literal resolved against `import.meta.url` reproduces.
	base({
		index: 2,
		name: "proto",
		esm: true,
		baseUri: "//example.invalid/x/",
		expect: "//example.invalid/x/assets/asset.txt"
	}),
	// An empty base names no place of its own, so the literal lands beside the chunk.
	base({
		index: 3,
		name: "empty",
		esm: true,
		baseUri: "",
		expect: "/assets/asset.txt",
		chunkLoading: false
	}),
	// Chunk loading off leaves `BaseUriRuntimeModule` as the only thing naming the base.
	base({
		index: 4,
		name: "runtime",
		esm: true,
		baseUri: "app/",
		expect: "/app/",
		chunkLoading: false,
		entryFile: "./base-uri.js"
	}),
	// An opaque scheme is a base of its own, so it reaches the runtime verbatim rather
	// than being read as a path beside the chunk.
	base({
		index: 5,
		name: "opaque",
		esm: true,
		baseUri: "data:text/plain,webpack",
		expect: "data:text/plain,webpack",
		entryFile: "./base-uri.js"
	})
];
