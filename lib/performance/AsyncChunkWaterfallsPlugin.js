/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const AsyncChunkWaterfallWarning = require("../errors/AsyncChunkWaterfallWarning");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import ChunkGroup from "../ChunkGroup" */
/** @import Compiler from "../Compiler" */
/** @import { WaterfallDetails } from "../errors/AsyncChunkWaterfallWarning" */

const PLUGIN_NAME = "AsyncChunkWaterfallsPlugin";

// Enough to name the offenders without printing the whole chunk graph.
const MAX_REPORTED_WATERFALLS = 5;

// Two levels is the shape `import()` is for — a route that loads its own data.
// Three is where the round trips start outweighing what splitting saved.
const MIN_REPORTED_DEPTH = 3;

class AsyncChunkWaterfallsPlugin {
	/**
	 * Creates an instance of AsyncChunkWaterfallsPlugin.
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

		if (!hints) return;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// `afterSeal` is past the hash, which folds every message into it — a
			// hint reported earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const { chunkGraph } = compilation;

				/**
				 * The name to print for a group; ids exist by `afterSeal`.
				 * @param {ChunkGroup} group the group
				 * @returns {string} what to call it
				 */
				const nameOf = (group) => {
					if (group.name) return group.name;

					const [chunk] = group.chunks;

					return chunk && chunk.id !== null ? `${chunk.id}` : "(unnamed)";
				};

				// Breadth-first from the initial groups, so the depth recorded for a
				// group is the fewest requests a client makes to reach it.
				/** @type {Map<ChunkGroup, ChunkGroup[]>} */
				const pathTo = new Map();
				/** @type {ChunkGroup[]} */
				const queue = [];

				for (const group of compilation.chunkGroups) {
					if (!group.isInitial()) continue;

					pathTo.set(group, []);
					queue.push(group);
				}

				/** @type {WaterfallDetails[]} */
				const waterfalls = [];
				let deepest = 0;

				for (let i = 0; i < queue.length; i++) {
					const group = queue[i];
					const path = /** @type {ChunkGroup[]} */ (pathTo.get(group));

					for (const child of group.getChildren()) {
						if (pathTo.has(child)) continue;

						const childPath = [...path, child];

						pathTo.set(child, childPath);
						queue.push(child);

						if (childPath.length < MIN_REPORTED_DEPTH) continue;

						// Only the end of a chain is reported: every prefix of it is a
						// waterfall too, and naming them all says the same thing N times.
						if (child.getNumberOfChildren() > 0) continue;

						let size = 0;

						for (const step of childPath) {
							for (const chunk of step.chunks) {
								size += chunkGraph.getChunkSize(chunk);
							}
						}

						deepest = Math.max(deepest, childPath.length);
						waterfalls.push({ chain: childPath.map(nameOf), size });
					}
				}

				if (waterfalls.length === 0) return;

				// Deepest first, then largest: the worst round-trip cost leads.
				waterfalls.sort(
					(a, b) => b.chain.length - a.chain.length || b.size - a.size
				);

				const warning = new AsyncChunkWaterfallWarning(
					waterfalls.slice(0, MAX_REPORTED_WATERFALLS),
					deepest
				);

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

module.exports = AsyncChunkWaterfallsPlugin;
