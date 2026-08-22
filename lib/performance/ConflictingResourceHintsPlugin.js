/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const ConflictingResourceHintsWarning = require("../errors/ConflictingResourceHintsWarning");
const { compareStrings } = require("../util/comparators");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import ChunkGroup from "../ChunkGroup" */
/** @import Compiler from "../Compiler" */
/**
 * @import {
 * 	ConflictingResourceHintDetails
 * } from "../errors/ConflictingResourceHintsWarning"
 */

const PLUGIN_NAME = "ConflictingResourceHintsPlugin";

/**
 * Names a chunk group for a message, falling back to its chunks: an `import()`
 * without `webpackChunkName` produces a group with no name of its own.
 * @param {ChunkGroup} chunkGroup a chunk group
 * @returns {string} a name for it
 */
const getChunkGroupName = (chunkGroup) =>
	chunkGroup.name ||
	chunkGroup.chunks.map((chunk) => chunk.name || `${chunk.id}`).join(", ");

class ConflictingResourceHintsPlugin {
	/**
	 * Creates an instance of ConflictingResourceHintsPlugin.
	 * @param {PerformanceOptions} options the plugin options
	 */
	constructor(options) {
		/** @type {PerformanceOptions["hints"]} */
		this.hints = options.hints;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hints = this.hints;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const { chunkGraph, moduleGraph } = compilation;
				/** @type {ConflictingResourceHintDetails[]} */
				const links = [];

				for (const chunkGroup of compilation.chunkGroups) {
					const children = chunkGroup.getChildrenByOrders(
						moduleGraph,
						chunkGraph
					);

					if (!children.prefetch || !children.preload) continue;

					const preloaded = new Set(children.preload);

					for (const child of children.prefetch) {
						if (!preloaded.has(child)) continue;

						links.push({
							parent: getChunkGroupName(chunkGroup),
							child: getChunkGroupName(child)
						});
					}
				}

				if (links.length === 0) return;

				// Chunk group iteration order is not stable across runs.
				links.sort(
					(a, b) =>
						compareStrings(a.parent, b.parent) ||
						compareStrings(a.child, b.child)
				);

				const warning = new ConflictingResourceHintsWarning(links);

				if (hints === "error") {
					compilation.errors.push(warning);
				} else if (hints === "stats") {
					compilation.hints.push(warning);
				} else {
					compilation.warnings.push(warning);
				}
			});
		});
	}
}

module.exports = ConflictingResourceHintsPlugin;
