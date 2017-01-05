/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class LimitChunkCountPlugin {
	constructor(options) {
		if(options !== undefined && typeof options !== "object" || Array.isArray(options)) {
			throw new Error("Argument should be an options object.\nFor more info on options, see https://webpack.github.io/docs/list-of-plugins.html");
		}
		this.options = options || {};
	}
	apply(compiler) {
		const options = this.options;
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("optimize-chunks-advanced", (chunks) => {
				const maxChunks = options.maxChunks;
				if(!maxChunks) return;
				if(maxChunks < 1) return;
				if(chunks.length <= maxChunks) return;

				if(chunks.length > maxChunks) {
					let combinations = [];
					chunks.forEach((a, idx) => {
						for(let i = 0; i < idx; i++) {
							const b = chunks[i];
							combinations.push([b, a]);
						}
					});

					combinations.forEach((pair) => {
						const a = pair[0].size(options);
						const b = pair[1].size(options);
						const ab = pair[0].integratedSize(pair[1], options);
						pair.unshift(a + b - ab, ab);
						pair.push(a, b);
					});
					combinations = combinations.filter((pair) => {
						return pair[1] !== false;
					});
					combinations.sort((a, b) => {
						const diff = b[0] - a[0];
						if(diff !== 0) return diff;
						return a[1] - b[1];
					});

					const pair = combinations[0];

					if(pair && pair[2].integrate(pair[3], "limit")) {
						chunks.splice(chunks.indexOf(pair[3]), 1);
						return true;
					}
				}
			});
		});
	}
}
module.exports = LimitChunkCountPlugin;
