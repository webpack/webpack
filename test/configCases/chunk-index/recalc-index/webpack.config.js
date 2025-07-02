/** @typedef {import("../../../../types").Compilation} Compilation */
/** @typedef {import("../../../../types").Module} Module */
/** @type {import("../../../../types").Configuration} */
module.exports = {
	entry: {
		main: "./index.js"
	},
	experiments: {
		css: true
	},
	plugins: [
		function apply() {
			/**
			 * @param {Compilation} compilation compilation
			 * @returns {void}
			 */
			const handler = compilation => {
				compilation.hooks.afterSeal.tap("testcase", () => {
					/** @type {Record<string, string>} */
					const data = {};
					for (const [name, group] of compilation.namedChunkGroups) {
						/** @type {Map<Module, number>} */
						const modules = new Map();
						for (const chunk of group.chunks) {
							for (const module of compilation.chunkGraph.getChunkModulesIterable(
								chunk
							)) {
								const postOrder = group.getModulePostOrderIndex(module);
								if (typeof postOrder === "number") {
									modules.set(module, postOrder);
								}
							}
						}
						const sortedModules = [...modules].sort((a, b) => a[1] - b[1]);
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
						dynamicIndex: "0: css ./a.css, 1: css ./b.css",
						mainIndex: "0: ./index.js"
					});
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
