/** @typedef {import("../../../../types").Compilation} Compilation */
/** @typedef {import("../../../../types").Module} Module */
/** @type {import("../../../../types").Configuration} */
module.exports = {
	entry: {
		main: "./main.js"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: false,
		chunkIds: "named"
	},
	plugins: [
		function () {
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
						for (const chunk of group.chunks) {
							for (const module of compilation.chunkGraph.getChunkModulesIterable(
								chunk
							)) {
								const preOrder = group.getModulePreOrderIndex(module);
								if (typeof preOrder === "number") {
									modules.set(module, preOrder);
								}
							}
						}
						const sortedModules = Array.from(modules).sort(
							(a, b) => a[1] - b[1]
						);
						const text = sortedModules
							.map(
								([m, index]) =>
									`${index}: ${m.readableIdentifier(
										compilation.requestShortener
									)}`
							)
							.join(", ");
						data[`${name}Index`] = text;
					}
					expect(data).toEqual({
						AIndex: "0: ./A.js, 1: css ./m.css",
						"B-2Index": "0: ./B-2.js",
						BIndex: "0: ./B.js",
						mainIndex: "0: ./main.js",
						sharedIndex: "0: ./shared.js, 1: css ./m.css, 2: css ./n.css"
					});
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	],
	experiments: {
		css: true
	}
};
