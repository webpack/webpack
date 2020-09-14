/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: "./index",
		a: "./a",
		b: "./b"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		usedExports: true,
		concatenateModules: false
	},
	plugins: [
		compiler => {
			compiler.hooks.compilation.tap("Test", compilation => {
				compilation.hooks.afterModuleHash.tap("Test", () => {
					const hashes = [];
					expect(() => {
						for (const module of compilation.chunkGraph.getChunkModulesIterable(
							compilation.namedChunks.get("a")
						)) {
							hashes.push(module.hash);
						}
					}).toThrowError(
						/No unique hash info entry for unspecified runtime .+ \(existing runtimes: a, b\)\.\n.+opt-out via optimization\.usedExports: "global"/
					);
				});
			});
		}
	]
};
