"use strict";

// A module library is read by another bundler, so its references have to be literals
// whatever the shipping config names them.

const webpack = require("../../../../");

/**
 * @param {number} index position in this array, and so the entry's emitted name
 * @param {object} options the shipping config under test
 * @param {"module" | "modern-module"} options.libraryType library type
 * @param {import("../../../../").Configuration["mode"]} options.mode mode
 * @param {string} options.chunkFilename chunk filename template
 * @param {string=} options.publicPath public path, when it is not `auto`
 * @param {import("../../../../").Configuration["devtool"]=} options.devtool the
 * devtool, left out to take whatever the mode defaults to
 * @param {boolean=} options.urlFormsBake whether the `import.meta.url` forms bake
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (
	index,
	{ libraryType, mode, chunkFilename, publicPath, devtool, urlFormsBake = true }
) => ({
	target: "node",
	mode,
	...(devtool === undefined ? {} : { devtool }),
	experiments: { outputModule: true },
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	optimization: {
		chunkIds: "named",
		splitChunks: false,
		// Kept readable: what is asserted is the specifier, not how it was renamed.
		minimize: false
	},
	output: {
		module: true,
		library: { type: libraryType },
		filename: `bundle${index}.mjs`,
		// Prefixed per config: every config here shares one output directory, and two
		// that name a chunk alike would each load the other's module ids.
		chunkFilename: `${index}-${chunkFilename}`,
		assetModuleFilename: `${index}-[name][ext]`,
		publicPath: publicPath || "auto"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__URL_FORMS_BAKE__: JSON.stringify(urlFormsBake),
			// An absolute url names no file the case can read back or import.
			__ON_DISK__: JSON.stringify(publicPath === undefined)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, {
		libraryType: "module",
		mode: "production",
		chunkFilename: "[name].[contenthash].mjs"
	}),
	base(1, {
		libraryType: "modern-module",
		mode: "production",
		chunkFilename: "[name].[contenthash].mjs"
	}),
	// The compilation hash is settled after code generation, so this name is filled in
	// by the deferred pass rather than baked where the reference is written.
	base(2, {
		libraryType: "module",
		mode: "production",
		chunkFilename: "[name].mjs",
		publicPath: "https://cdn.example.invalid/[fullhash]/"
	}),
	// A library is analyzable without being a production build.
	base(3, {
		libraryType: "module",
		mode: "none",
		chunkFilename: "[name].mjs"
	}),
	// Development bakes too, whichever devtool keeps the body out of an eval wrapper.
	base(4, {
		libraryType: "module",
		mode: "development",
		chunkFilename: "[name].mjs",
		devtool: false
	}),
	base(5, {
		libraryType: "modern-module",
		mode: "development",
		chunkFilename: "[name].mjs",
		devtool: "source-map"
	}),
	// No devtool set: the default a module library now takes emits no map at all.
	base(6, {
		libraryType: "module",
		mode: "development",
		chunkFilename: "[name].mjs"
	}),
	// Asking for `eval` still puts the body where `import.meta` cannot be spelled, so
	// the url forms keep the runtime shape — the reason the default moved off it.
	base(7, {
		libraryType: "module",
		mode: "development",
		chunkFilename: "[name].mjs",
		devtool: "eval",
		urlFormsBake: false
	})
];
