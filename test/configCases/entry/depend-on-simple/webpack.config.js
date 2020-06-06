/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").Compilation} Compilation */

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		app: { import: "./app.js", dependOn: "react-vendors" },
		"react-vendors": ["react", "react-dom", "prop-types"]
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	plugins: [
		/**
		 * @this {Compiler} compiler
		 */
		function () {
			/**
			 * @param {Compilation} compilation compilation
			 * @returns {void}
			 */
			const handler = compilation => {
				compilation.hooks.afterSeal.tap("testcase", () => {
					const { chunkGraph } = compilation;
					const chunkModules = {};
					for (const chunk of compilation.chunks) {
						chunkModules[chunk.name] = new Set();

						for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
							chunkModules[chunk.name].add(module);
						}
					}

					expect([...chunkModules.app]).toStrictEqual(
						expect.not.arrayContaining([...chunkModules["react-vendors"]])
					);
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
