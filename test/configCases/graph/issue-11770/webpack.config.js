/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a",
		b: "./b",
		c: "./c"
	},
	target: "web",
	output: {
		filename: "[name].js",
		library: { type: "commonjs-module" }
	},
	optimization: {
		usedExports: true,
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
				test: /dep/,
				sideEffects: false
			}
		]
	},
	experiments: {
		topLevelAwait: true
	}
};
