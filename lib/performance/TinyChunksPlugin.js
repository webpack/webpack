/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const TinyChunksWarning = require("../errors/TinyChunksWarning");
const { compareStrings } = require("../util/comparators");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { TinyChunkDetails } from "../errors/TinyChunksWarning" */

const PLUGIN_NAME = "TinyChunksPlugin";

// Enough to name the offenders without printing the chunk graph.
const MAX_REPORTED_CHUNKS = 5;

// One small chunk is a lazy route; a crowd of them is a request pattern, and
// only then does grouping them save more than it costs.
const MIN_REPORTED_CHUNKS = 10;

// What `splitChunks.minSize` falls back to when it is absent or given per
// source type rather than as one number.
const DEFAULT_MIN_SIZE = 20000;

class TinyChunksPlugin {
	/**
	 * Creates an instance of TinyChunksPlugin.
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

		const { splitChunks } = compiler.options.optimization;
		const configured = splitChunks && splitChunks.minSize;

		/**
		 * Read from `splitChunks.minSize`, so raising the size worth splitting
		 * raises what counts as too small. Either one number or one per type.
		 * @param {string} sourceType the type in question
		 * @returns {number} the floor below which a chunk of it is too small
		 */
		const minSizeFor = (sourceType) => {
			if (typeof configured === "number") return configured;

			if (configured) {
				const forType = configured[sourceType];

				if (typeof forType === "number") return forType;
			}

			return DEFAULT_MIN_SIZE;
		};

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// `afterSeal` is past the hash, which folds every message into it — a
			// hint reported earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const { chunkGraph } = compilation;
				/** @type {TinyChunkDetails[]} */
				const tiny = [];
				let totalSize = 0;

				for (const chunk of compilation.chunks) {
					// An initial chunk is downloaded whatever its size; only one fetched
					// on demand costs a request of its own.
					if (chunk.canBeInitial()) continue;

					const sizes = chunkGraph.getChunkModulesSizes(chunk);
					const types = Object.keys(sizes);

					if (types.length === 0) continue;

					// Under its own floor for every type it carries: a chunk holding
					// enough of any one of them is worth the request it costs.
					let size = 0;
					let small = true;

					for (const type of types) {
						size += sizes[type];

						if (sizes[type] >= minSizeFor(type)) small = false;
					}

					if (!small) continue;

					totalSize += size;
					tiny.push({ name: chunk.name || `${chunk.id}`, size });
				}

				if (tiny.length < MIN_REPORTED_CHUNKS) return;

				// Smallest first, and ties break by name: chunk order is not stable.
				tiny.sort((a, b) => a.size - b.size || compareStrings(a.name, b.name));

				const warning = new TinyChunksWarning(
					tiny.slice(0, MAX_REPORTED_CHUNKS),
					tiny.length,
					totalSize
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

module.exports = TinyChunksPlugin;
