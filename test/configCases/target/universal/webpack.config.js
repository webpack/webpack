/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].mjs",
		library: {
			type: "module"
		}
	},
	target: ["web", "node"],
	experiments: {
		outputModule: true
	},
	optimization: {
		minimize: true,
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				separate: {
					test: /separate/,
					chunks: "all",
					filename: "separate.mjs",
					enforce: true
				}
			}
		}
	},
	externals: {
		"external-self": "./main.mjs"
	}
};
