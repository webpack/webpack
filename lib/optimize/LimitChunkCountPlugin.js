/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/optimize/LimitChunkCountPlugin.json");

class LimitChunkCountPlugin {
	constructor(options) {
		validateOptions(schema, options || {}, "Limit Chunk Count Plugin");
		this.options = options || {};
	}
	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap("LimitChunkCountPlugin", compilation => {
			compilation.hooks.optimizeChunksAdvanced.tap(
				"LimitChunkCountPlugin",
				chunks => {
					const maxChunks = options.maxChunks;
					if (!maxChunks) return;
					if (maxChunks < 1) return;
					if (chunks.length <= maxChunks) return;

					const sortedExtendedPairCombinations = chunks
						.reduce((combinations, a, idx) => {
							// create combination pairs
							for (let i = 0; i < idx; i++) {
								const b = chunks[i];
								combinations.push([b, a]);
							}
							return combinations;
						}, [])
						.map(pair => {
							// extend combination pairs with size and integrated size
							const a = pair[0].size(options);
							const b = pair[1].size(options);
							const ab = pair[0].integratedSize(pair[1], options);
							return [a + b - ab, ab, pair[0], pair[1], a, b];
						})
						.filter(extendedPair => {
							// filter pairs that do not have an integratedSize
							// meaning they can NOT be integrated!
							return extendedPair[1] !== false;
						})
						.sort((a, b) => {
							// sadly javascript does an inplace sort here
							// sort them by size
							const diff = b[0] - a[0];
							if (diff !== 0) return diff;
							return a[1] - b[1];
						});

					const pair = sortedExtendedPairCombinations[0];

					if (pair && pair[2].integrate(pair[3], "limit")) {
						chunks.splice(chunks.indexOf(pair[3]), 1);
						return true;
					}
				}
			);
		});
	}
}
module.exports = LimitChunkCountPlugin;
