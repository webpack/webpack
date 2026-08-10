"use strict";

// A stand-in is a different length than the name that replaces it, so everything
// after it moves. Whatever reads an asset — the source-map writer, a minifier — has
// to see the final text, not the stand-in.

const Compilation = require("../../../../lib/Compilation");

const MARKERS = ["@@webpackAnalyzableChunk", "@@webpackFullHash"];

/** Fails the build if a stand-in is still there when source maps are written. */
class AssertSubstitutedBeforeDevTooling {
	/**
	 * @param {import("../../../../").Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("AssertSubstituted", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "AssertSubstituted",
					stage: Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING
				},
				(assets) => {
					for (const name of Object.keys(assets)) {
						const source = assets[name].source();
						if (typeof source !== "string") continue;
						for (const marker of MARKERS) {
							if (source.includes(marker)) {
								compilation.errors.push(
									new Error(
										`${name} still carries a ${marker} stand-in when source maps are written`
									)
								);
							}
						}
					}
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: "source-map",
	experiments: { outputModule: true },
	optimization: { chunkIds: "named", realContentHash: true },
	output: {
		module: true,
		chunkFormat: "module",
		publicPath: "auto",
		chunkFilename: "[name].[contenthash].mjs"
	},
	plugins: [new AssertSubstitutedBeforeDevTooling()]
};
