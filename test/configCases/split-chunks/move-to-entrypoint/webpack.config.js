/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: {
			import: "./entryA",
			runtime: "runtime"
		},
		b: {
			import: "./entryB",
			dependOn: "a"
		}
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				a: {
					test: /moduleA/,
					name: "a",
					enforce: true
				},
				b: {
					test: /moduleB/,
					name: "b",
					enforce: true
				},
				c: {
					test: /moduleC/,
					name: "runtime",
					enforce: true
				}
			}
		}
	}
};
