/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").Compilation} Compilation */
/** @typedef {import("../../../../").Configuration} Configuration */

/** @type {Configuration} */
/** @type {import("../../../../").Configuration} */
module.exports = {
	entry() {
		return Promise.resolve({
			app: { import: "./app.js", dependOn: ["other-vendors"] },
			page1: { import: "./page1.js", dependOn: ["app", "react-vendors"] },
			"react-vendors": ["react", "react-dom", "prop-types"],
			"other-vendors": "./other-vendors"
		});
	},
	target: "web",
	optimization: {
		runtimeChunk: "single"
	},
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
						expect.not.arrayContaining([...chunkModules["other-vendors"]])
					);

					expect([...chunkModules.page1]).toStrictEqual(
						expect.not.arrayContaining([
							...chunkModules["other-vendors"],
							...chunkModules["react-vendors"],
							...chunkModules["app"]
						])
					);
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
