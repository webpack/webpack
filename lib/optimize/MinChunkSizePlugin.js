/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class MinChunkSizePlugin {
	constructor(options) {
		if(typeof options !== "object" || Array.isArray(options)) {
			throw new Error("Argument should be an options object.\nFor more info on options, see https://webpack.js.org/plugins/");
		}
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		const minChunkSize = options.minChunkSize;
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("optimize-chunks-advanced", (chunks) => {
				const equalOptions = {
					chunkOverhead: 1,
					entryChunkMultiplicator: 1
				};

				const sortedSizeFilteredExtendedPairCombinations = chunks.reduce((combinations, a, idx) => {
					// create combination pairs
					for(let i = 0; i < idx; i++) {
						const b = chunks[i];
						combinations.push([b, a]);
					}
					return combinations;
				}, []).filter((pair) => {
					// check if one of the chunks sizes is smaller than the minChunkSize
					const p0SmallerThanMinChunkSize = pair[0].size(equalOptions) < minChunkSize;
					const p1SmallerThanMinChunkSize = pair[1].size(equalOptions) < minChunkSize;
					return p0SmallerThanMinChunkSize || p1SmallerThanMinChunkSize;
				}).map((pair) => {
					// extend combination pairs with size and integrated size
					const a = pair[0].size(options);
					const b = pair[1].size(options);
					const ab = pair[0].integratedSize(pair[1], options);
					pair.unshift(a + b - ab, ab);
					return [a + b - ab, ab, pair[0], pair[1]];
				}).filter((pair) => {
					// filter pairs that do not have an integratedSize
					// meaning they can NOT be integrated!
					return pair[1] !== false;
				}).sort((a, b) => { // sadly javascript does an inplace sort here
					// sort by size
					const diff = b[0] - a[0];
					if(diff !== 0) return diff;
					return a[1] - b[1];
				});

				if(sortedSizeFilteredExtendedPairCombinations.length === 0) return;

				const pair = sortedSizeFilteredExtendedPairCombinations[0];

				pair[2].integrate(pair[3], "min-size");
				chunks.splice(chunks.indexOf(pair[3]), 1);
				return true;
			});
		});
	}
}
module.exports = MinChunkSizePlugin;
