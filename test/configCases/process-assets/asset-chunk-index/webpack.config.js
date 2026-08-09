"use strict";

const { Compilation, sources } = require("../../../../");

const PLUGIN_NAME = "AssetToChunkIndexPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js",
		other: "./other.js"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		/**
		 * Drives `deleteAsset` / `renameAsset` over the lazily-built asset -> chunks
		 * reverse index, including its stale and unknown-file paths.
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: PLUGIN_NAME,
						stage: Compilation.PROCESS_ASSETS_STAGE_REPORT
					},
					() => {
						const main =
							/** @type {import("../../../../").Chunk} */
							(compilation.namedChunks.get("main"));
						const other =
							/** @type {import("../../../../").Chunk} */
							(compilation.namedChunks.get("other"));
						/**
						 * @param {string} name asset name
						 * @param {Set<string>} set chunk.files or chunk.auxiliaryFiles
						 * @returns {void}
						 */
						const emitInto = (name, set) => {
							compilation.emitAsset(name, new sources.RawSource(name));
							set.add(name);
						};
						// emit + delete leaves the reverse index built and cached
						const buildIndex = () => {
							compilation.emitAsset("marker.txt", new sources.RawSource("m"));
							compilation.deleteAsset("marker.txt");
						};

						emitInto("gone.txt", main.files);
						emitInto("gone-aux.txt", main.auxiliaryFiles);
						compilation.deleteAsset("gone.txt");
						compilation.deleteAsset("gone-aux.txt");

						emitInto("from.txt", main.files);
						emitInto("from-aux.txt", main.auxiliaryFiles);
						compilation.renameAsset("from.txt", "to.txt");
						compilation.renameAsset("from-aux.txt", "to-aux.txt");

						// emitAsset has to invalidate the index, or a file attached after
						// it was built would keep a stale chunk entry
						buildIndex();
						emitInto("late.txt", main.files);
						compilation.deleteAsset("late.txt");
						buildIndex();
						emitInto("late-from.txt", main.files);
						compilation.renameAsset("late-from.txt", "late-to.txt");

						// the same, for a second chunk re-emitting an equal source, which
						// early-returns out of emitAsset
						const shared = new sources.RawSource("shared");
						compilation.emitAsset("shared.txt", shared);
						main.files.add("shared.txt");
						buildIndex();
						compilation.emitAsset("shared.txt", shared);
						other.files.add("shared.txt");
						compilation.deleteAsset("shared.txt");

						// a chunk set mutated directly leaves the index stale: the rename
						// must not put the new name back into a chunk that dropped it
						emitInto("stale.txt", main.files);
						buildIndex();
						main.files.delete("stale.txt");
						compilation.renameAsset("stale.txt", "stale-renamed.txt");

						// a file the index does not know falls back to scanning the chunks
						compilation.emitAsset(
							"scan-delete.txt",
							new sources.RawSource("scan-delete")
						);
						compilation.emitAsset(
							"scan-rename.txt",
							new sources.RawSource("scan-rename")
						);
						buildIndex();
						main.files.add("scan-delete.txt");
						other.files.add("scan-rename.txt");
						compilation.deleteAsset("scan-delete.txt");
						compilation.renameAsset("scan-rename.txt", "scanned.txt");
					}
				);
			});
		}
	]
};
