/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

import { compareChunksNatural } from "../util/comparators.js";
import {
	assignDeterministicIds,
	getFullChunkName,
	getUsedChunkIds
} from "./IdHelpers.js";
/** @typedef {import("../Compiler.js").default} Compiler */

/**
 * Defines the deterministic chunk ids plugin options type used by this module.
 * @typedef {object} DeterministicChunkIdsPluginOptions
 * @property {string=} context context for ids
 * @property {number=} maxLength maximum length of ids
 */

const PLUGIN_NAME = "DeterministicChunkIdsPlugin";

class DeterministicChunkIdsPlugin {
	/**
	 * Creates an instance of DeterministicChunkIdsPlugin.
	 * @param {DeterministicChunkIdsPluginOptions=} options options
	 */
	constructor(options = {}) {
		/** @type {DeterministicChunkIdsPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.chunkIds.tap(PLUGIN_NAME, (chunks) => {
				const chunkGraph = compilation.chunkGraph;
				const context = this.options.context || compiler.context;
				const maxLength = this.options.maxLength || 3;

				const compareNatural = compareChunksNatural(chunkGraph);

				const usedIds = getUsedChunkIds(compilation);
				assignDeterministicIds(
					[...chunks].filter((chunk) => chunk.id === null),
					(chunk) =>
						getFullChunkName(chunk, chunkGraph, context, compiler.root),
					compareNatural,
					(chunk, id) => {
						const size = usedIds.size;
						usedIds.add(`${id}`);
						if (size === usedIds.size) return false;
						chunk.id = id;
						chunk.ids = [id];
						return true;
					},
					[10 ** maxLength],
					10,
					usedIds.size
				);
			});
		});
	}
}

export default DeterministicChunkIdsPlugin;

export { DeterministicChunkIdsPlugin as "module.exports" };
