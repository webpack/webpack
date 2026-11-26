"use strict";

const { Compilation, optimize, sources } = require("../../../../");

/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "VacatedNamePlugin";
/** @type {Record<string, string>} */
const NEW_HASHES = {
	// The two parents come out the same, so their maps form one group.
	aaaaaaaa: "cccccccc",
	bbbbbbbb: "cccccccc",
	// One map of the group leaves m-mmmmmmmm, and an unrelated map takes it.
	mmmmmmmm: "dddddddd",
	xxxxxxxx: "mmmmmmmm",
	// The other map of the group then asks for that name too.
	nnnnnnnn: "mmmmmmmm"
};

/**
 * @param {Compilation} compilation compilation
 * @param {string} name the asset's name
 * @param {string} content its content
 * @param {string} hash its hash
 * @param {string=} map its related source map
 */
const emit = (compilation, name, content, hash, map) => {
	compilation.emitAsset(name, new sources.RawSource(content), {
		contenthash: hash,
		related: map === undefined ? undefined : { sourceMap: map }
	});
};

/** @type {Configuration} */
module.exports = {
	optimization: { realContentHash: true },
	plugins: [
		/**
		 * @param {Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				optimize.RealContentHashPlugin.getCompilationHooks(
					compilation
				).updateHash.tap(
					PLUGIN_NAME,
					(_contents, oldHash) => NEW_HASHES[oldHash]
				);
				compilation.hooks.processAssets.tap(
					{
						name: PLUGIN_NAME,
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						// Both parents merge before either map moves.
						emit(
							compilation,
							"p-aaaaaaaa.js",
							"same",
							"aaaaaaaa",
							"m-mmmmmmmm.map"
						);
						emit(
							compilation,
							"p-bbbbbbbb.js",
							"same",
							"bbbbbbbb",
							"m-nnnnnnnn.map"
						);
						emit(
							compilation,
							"q-xxxxxxxx.js",
							"other",
							"xxxxxxxx",
							"m-xxxxxxxx.map"
						);
						emit(compilation, "m-mmmmmmmm.map", "map m", "mmmmmmmm");
						emit(compilation, "m-xxxxxxxx.map", "map x", "xxxxxxxx");
						emit(compilation, "m-nnnnnnnn.map", "map n", "nnnnnnnn");
					}
				);
			});
		}
	]
};
