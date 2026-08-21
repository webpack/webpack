/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const SplitChunksCappedWarning = require("../errors/SplitChunksCappedWarning");
const { getCappedSplits } = require("../optimize/SplitChunksPlugin");
const { compareStrings } = require("../util/comparators");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { CappedSplitDetails } from "../errors/SplitChunksCappedWarning" */

const PLUGIN_NAME = "SplitChunksCappedPlugin";

// Enough to name the offenders without printing the chunk graph.
const MAX_REPORTED_SPLITS = 5;

class SplitChunksCappedPlugin {
	/**
	 * Creates an instance of SplitChunksCappedPlugin.
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
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const recorded = getCappedSplits(compilation);

				if (recorded === undefined || recorded.length === 0) return;

				/** @type {Map<string, CappedSplitDetails>} */
				const splits = new Map();

				for (const split of recorded) {
					// Chunk ids only exist after seal, and the queue reconsiders a
					// refused split, so the same one is recorded several times.
					const chunk = split.chunk.name || `${split.chunk.id}`;
					const key = `${split.cacheGroup} ${chunk} ${split.limit}`;
					const previous = splits.get(key);

					if (previous !== undefined && previous.modules >= split.modules) {
						continue;
					}

					splits.set(key, {
						cacheGroup: split.cacheGroup,
						chunk,
						limit: split.limit,
						maxRequests: split.maxRequests,
						modules: split.modules
					});
				}

				// Held only to be reported: nothing needs the chunks after this.
				recorded.length = 0;

				const details = [...splits.values()];

				// Ties break by name: the order splits are refused in is not stable.
				details.sort(
					(a, b) =>
						b.modules - a.modules ||
						compareStrings(a.cacheGroup, b.cacheGroup) ||
						compareStrings(a.chunk, b.chunk)
				);

				const warning = new SplitChunksCappedWarning(
					details.slice(0, MAX_REPORTED_SPLITS)
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

module.exports = SplitChunksCappedPlugin;
