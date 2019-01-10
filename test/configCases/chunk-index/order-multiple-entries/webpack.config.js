/** @typedef {import("../../../../lib/Compilation")} Compilation */
/** @typedef {import("../../../../lib/Module")} Module */

module.exports = {
	entry: {
		entry1: "./entry1",
		entry2: "./entry2"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		function() {
			/**
			 * @param {Compilation} compilation compilation
			 * @returns {void}
			 */
			const handler = compilation => {
				compilation.hooks.afterSeal.tap("testcase", () => {
					const data = {};
					for (const [name, group] of compilation.namedChunkGroups) {
						/** @type {Map<Module, number>} */
						const modules = new Map();
						const modules2 = new Map();
						for (const chunk of group.chunks) {
							for (const module of chunk.modulesIterable) {
								modules.set(module, group.getModuleIndex(module));
								modules2.set(module, group.getModuleIndex2(module));
							}
						}
						const sortedModules = Array.from(modules).sort((a, b) => {
							return a[1] - b[1];
						});
						const sortedModules2 = Array.from(modules2).sort((a, b) => {
							return a[1] - b[1];
						});
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
						data[name + "Index"] = text;
						data[name + "Index2"] = text2;
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
					const indicies = compilation.modules
						.slice()
						.sort((a, b) => a.index - b.index)
						.map(
							m =>
								`${m.index}: ${m.readableIdentifier(
									compilation.requestShortener
								)}`
						)
						.join(", ");
					const indicies2 = compilation.modules
						.slice()
						.sort((a, b) => a.index2 - b.index2)
						.map(
							m =>
								`${m.index2}: ${m.readableIdentifier(
									compilation.requestShortener
								)}`
						)
						.join(", ");
					expect(indicies).toEqual(
						"0: ./entry1.js, 1: ./a.js, 2: ./shared.js, 3: ./b.js, 4: ./c.js, 5: ./entry2.js, 6: ./async.js"
					);
					expect(indicies2).toEqual(
						"0: ./shared.js, 1: ./a.js, 2: ./b.js, 3: ./c.js, 4: ./entry1.js, 5: ./entry2.js, 6: ./async.js"
					);
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
