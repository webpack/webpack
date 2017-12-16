/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class AggressiveMergingPlugin {
	constructor(options) {
		if(options !== undefined && typeof options !== "object" || Array.isArray(options)) {
			throw new Error("Argument should be an options object. To use defaults, pass in nothing.\nFor more info on options, see https://webpack.js.org/plugins/");
		}
		this.options = options || {};
	}

	apply(compiler) {
		const options = this.options;
		const minSizeReduce = options.minSizeReduce || 1.5;

		const getParentsWeight = chunk => {
			return chunk.mapParents((p) => {
				return p.isInitial() ? options.entryChunkMultiplicator || 10 : 1;
			}).reduce((a, b) => {
				return a + b;
			}, 0);
		};

		compiler.hooks.thisCompilation.tap("AggressiveMergingPlugin", (compilation) => {
			compilation.hooks.optimizeChunksAdvanced.tap("AggressiveMergingPlugin", (chunks) => {
				let combinations = [];
				chunks.forEach((a, idx) => {
					if(a.isInitial()) return;
					for(let i = 0; i < idx; i++) {
						const b = chunks[i];
						if(b.isInitial()) continue;
						combinations.push({
							a,
							b,
							improvement: undefined
						});
					}
				});

				combinations.forEach((pair) => {
					const a = pair.b.size({
						chunkOverhead: 0
					});
					const b = pair.a.size({
						chunkOverhead: 0
					});
					const ab = pair.b.integratedSize(pair.a, {
						chunkOverhead: 0
					});
					let newSize;
					if(ab === false) {
						pair.improvement = false;
						return;
					} else if(options.moveToParents) {
						const aOnly = ab - b;
						const bOnly = ab - a;
						const common = a + b - ab;
						newSize = common + getParentsWeight(pair.b) * aOnly + getParentsWeight(pair.a) * bOnly;
					} else {
						newSize = ab;
					}

					pair.improvement = (a + b) / newSize;
				});
				combinations = combinations.filter((pair) => {
					return pair.improvement !== false;
				});
				combinations.sort((a, b) => {
					return b.improvement - a.improvement;
				});

				const pair = combinations[0];

				if(!pair) return;
				if(pair.improvement < minSizeReduce) return;

				if(options.moveToParents) {
					const commonModules = new Set(pair.b.getModules().filter((m) => {
						return pair.a.containsModule(m);
					}));
					const aOnlyModules = pair.b.getModules().filter((m) => {
						return !commonModules.has(m);
					});
					const bOnlyModules = pair.a.getModules().filter((m) => {
						return !commonModules.has(m);
					});
					aOnlyModules.forEach((m) => {
						pair.b.removeModule(m);
						m.removeChunk(pair.b);
						for(const c of pair.b.parentsIterable) {
							c.addModule(m);
							m.addChunk(c);
						}
					});
					bOnlyModules.forEach((m) => {
						pair.a.removeModule(m);
						m.removeChunk(pair.a);
						for(const c of pair.a.parentsIterable) {
							c.addModule(m);
							m.addChunk(c);
						}
					});
				}
				if(pair.b.integrate(pair.a, "aggressive-merge")) {
					chunks.splice(chunks.indexOf(pair.a), 1);
					return true;
				}
			});
		});
	}
}

module.exports = AggressiveMergingPlugin;
