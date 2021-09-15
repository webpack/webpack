/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a",
		b: "./b",
		c: "./c",
		ab: ["./a", "./b"],
		ac: ["./a", "./c"],
		bc: ["./b", "./c"],
		abc: ["./a", "./b", "./c"]
	},
	target: "web",
	output: {
		filename: "[name].js",
		library: { type: "commonjs-module" }
	},
	optimization: {
		chunkIds: "named",
		usedExports: true,
		concatenateModules: true,
		splitChunks: {
			cacheGroups: {
				forceMerge: {
					test: /shared/,
					enforce: true,
					name: "shared",
					chunks: "all"
				}
			}
		}
	},
	module: {
		rules: [
			{
				test: /shared/
				// sideEffects: false
			}
		]
	}
};
