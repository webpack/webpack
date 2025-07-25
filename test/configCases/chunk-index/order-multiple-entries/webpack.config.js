"use strict";

/** @typedef {import("../../../../").Compilation} Compilation */
/** @typedef {import("../../../../").Module} Module */

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		entry1: "./entry1",
		entry2: "./entry2"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		concatenateModules: false
	},
	plugins: [
		function apply() {
			/**
			 * @param {Compilation} compilation compilation
			 * @returns {void}
			 */
			const handler = (compilation) => {
				const moduleGraph = compilation.moduleGraph;
				compilation.hooks.afterSeal.tap("testcase", () => {
					/** @type {Record<string, string>} */
					const data = {};
					for (const [name, group] of compilation.namedChunkGroups) {
						/** @type {Map<Module, number>} */
						const modules = new Map();
						/** @type {Map<Module, number>} */
						const modules2 = new Map();
						for (const chunk of group.chunks) {
							for (const module of compilation.chunkGraph.getChunkModulesIterable(
								chunk
							)) {
								const preOrder = group.getModulePreOrderIndex(module);
								if (typeof preOrder === "number") {
									modules.set(module, preOrder);
								}
								const postOrder = group.getModulePostOrderIndex(module);
								if (typeof postOrder === "number") {
									modules2.set(module, postOrder);
								}
							}
						}
						const sortedModules = [...modules].sort((a, b) => a[1] - b[1]);
						const sortedModules2 = [...modules2].sort((a, b) => a[1] - b[1]);
						const text = sortedModules
							.map(
								([m, index]) =>
									`${index}: ${m.readableIdentifier(
										compilation.requestShortener
									)}`
							)
							.join(", ");
						const text2 = sortedModules2
							.map(
								([m, index]) =>
									`${index}: ${m.readableIdentifier(
										compilation.requestShortener
									)}`
							)
							.join(", ");
						data[`${name}Index`] = text;
						data[`${name}Index2`] = text2;
					}
					expect(data).toEqual({
						entry1Index:
							"0: ./entry1.js, 1: ./a.js, 2: ./shared.js, 3: ./b.js, 4: ./c.js",
						entry1Index2:
							"0: ./shared.js, 1: ./a.js, 2: ./b.js, 3: ./c.js, 4: ./entry1.js",
						entry2Index:
							"0: ./entry2.js, 1: ./c.js, 2: ./b.js, 3: ./shared.js, 4: ./a.js",
						entry2Index2:
							"0: ./c.js, 1: ./shared.js, 2: ./b.js, 3: ./a.js, 4: ./entry2.js",
						asyncIndex: "0: ./async.js",
						asyncIndex2: "0: ./async.js"
					});
					const indices = [...compilation.modules]
						.map(
							(m) =>
								/** @type {[number, Module]} */ ([
									moduleGraph.getPreOrderIndex(m),
									m
								])
						)
						.filter((p) => typeof p[0] === "number")
						.sort((a, b) => a[0] - b[0])
						.map(
							([i, m]) =>
								`${i}: ${m.readableIdentifier(compilation.requestShortener)}`
						)
						.join(", ");
					const indices2 = [...compilation.modules]
						.map(
							(m) =>
								/** @type {[number, Module]} */ ([
									moduleGraph.getPostOrderIndex(m),
									m
								])
						)
						.filter((p) => typeof p[0] === "number")
						.sort((a, b) => a[0] - b[0])
						.map(
							([i, m]) =>
								`${i}: ${m.readableIdentifier(compilation.requestShortener)}`
						)
						.join(", ");
					expect(indices).toBe(
						"0: ./entry1.js, 1: ./a.js, 2: ./shared.js, 3: ./b.js, 4: ./c.js, 5: ./entry2.js, 6: ./async.js"
					);
					expect(indices2).toBe(
						"0: ./shared.js, 1: ./a.js, 2: ./b.js, 3: ./c.js, 4: ./entry1.js, 5: ./entry2.js, 6: ./async.js"
					);
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
