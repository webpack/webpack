"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class AggressiveMergingPlugin {
	constructor(options) {
		this.options = options || {};
		if(options !== undefined && typeof options !== "object" || Array.isArray(options)) {
			throw new Error("Argument should be an options object. To use defaults, pass in nothing.\nFor more info on options, see https://webpack.github.io/docs/list-of-plugins.html");
		}
	}

	apply(compiler) {
		const options = this.options;
		const minSizeReduce = options.minSizeReduce || 1.5;

		function getParentsWeight(chunk) {
			return chunk.parents.map(p => p.isInitial() ? options.entryChunkMultiplicator || 10 : 1)
				.reduce((a, b) => a + b, 0);
		}

		compiler.plugin("compilation", function(compilation) {
			compilation.plugin("optimize-chunks-advanced", function(chunks) {
				// todo: the form of combinations is too flexible, unable to attach a type system
				let combinations = [];
				chunks.forEach((a, idx) => {
					if(a.isInitial()) {
						return;
					}
					for(let i = 0; i < idx; i++) {
						const b = chunks[i];
						if(b.isInitial()) {
							continue;
						}
						combinations.push([b, a]);
					}
				});
				combinations.forEach((pair) => {
					const a = pair[0].size({
						chunkOverhead: 0
					});
					const b = pair[1].size({
						chunkOverhead: 0
					});
					const ab = pair[0].integratedSize(pair[1], {
						chunkOverhead: 0
					});
					pair.push({
						a,
						b,
						ab
					});
					let newSize;
					if(ab === false) {
						pair.unshift(false);
					} else if(options.moveToParents) {
						const aOnly = ab - b;
						const bOnly = ab - a;
						const common = a + b - ab;
						newSize = common + getParentsWeight(pair[0]) * aOnly + getParentsWeight(pair[1]) * bOnly;
						pair.push({
							aOnly,
							bOnly,
							common,
							newSize
						});
					} else {
						newSize = ab;
					}
					pair.unshift((a + b) / newSize);
				});
				combinations = combinations.filter(pair => pair[0] !== false);
				combinations.sort((a, b) => b[0] - a[0]);
				const pair = combinations[0];
				if(!pair) {
					return;
				}
				if(pair[0] < minSizeReduce) {
					return;
				}
				if(options.moveToParents) {
					const commonModules = pair[1].modules.filter(m => pair[2].modules.indexOf(m) >= 0);
					const aOnlyModules = pair[1].modules.filter(m => commonModules.indexOf(m) < 0);
					const bOnlyModules = pair[2].modules.filter(m => commonModules.indexOf(m) < 0);
					aOnlyModules.forEach(m => {
						pair[1].removeModule(m);
						m.removeChunk(pair[1]);
						pair[1].parents.forEach(c => {
							c.addModule(m);
							m.addChunk(c);
						});
					});
					bOnlyModules.forEach(m => {
						pair[2].removeModule(m);
						m.removeChunk(pair[2]);
						pair[2].parents.forEach(c => {
							c.addModule(m);
							m.addChunk(c);
						});
					});
				}
				if(pair[1].integrate(pair[2], "aggressive-merge")) {
					chunks.splice(chunks.indexOf(pair[2]), 1);
					return true;
				}
			});
		});
	}
}
module.exports = AggressiveMergingPlugin;
