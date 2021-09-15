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
			page2: { import: "./page2.js", dependOn: ["app", "react-vendors"] },
			page3: { import: "./page3.js", dependOn: ["app"] },
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
							chunkModules[chunk.name].add(module.identifier());
						}
					}

					for (const module of chunkModules["other-vendors"]) {
						expect([...chunkModules.app]).not.toContain(module);
					}

					for (const module of [
						...chunkModules["other-vendors"],
						...chunkModules["react-vendors"],
						...chunkModules["app"]
					]) {
						expect(chunkModules.page1).not.toContain(module);
						expect(chunkModules.page2).not.toContain(module);
					}

					for (const module of [
						...chunkModules["other-vendors"],
						...chunkModules["app"]
					]) {
						expect([...chunkModules.page3]).not.toContain(module);
					}
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
