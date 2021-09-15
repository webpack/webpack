/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a",
		b: "./b",
		c1: "./c",
		c2: "./c",
		ax: "./ax",
		bx: "./bx",
		cx1: "./cx",
		cx2: "./cx",
		d1: "./d1",
		d2: "./d2"
	},
	target: "web",
	output: {
		filename: "[name].js",
		library: { type: "commonjs-module" }
	},
	optimization: {
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
				test: /dep/,
				sideEffects: false
			}
		]
	},
	experiments: {
		topLevelAwait: true
	}
};
