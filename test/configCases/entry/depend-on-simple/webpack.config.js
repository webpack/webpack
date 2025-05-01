/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").Compilation} Compilation */
/** @typedef {import("../../../../").Chunk} Chunk */
/** @typedef {import("../../../../").Module} Module */

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
					/** @type {Record<string, Set<Module>>} */
					const chunkModules = {};
					for (const chunk of compilation.chunks) {
						chunkModules[
							/** @type {NonNullable<Chunk["name"]>} */
							(chunk.name)
						] = new Set();

						for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
							chunkModules[
								/** @type {NonNullable<Chunk["name"]>} */
								(chunk.name)
							].add(module);
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
