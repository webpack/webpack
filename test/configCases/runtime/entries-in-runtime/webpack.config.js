/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		main: "./main",
		"first-entry": {
			dependOn: "main",
			import: "./index"
		},
		"other-entry": {
			dependOn: "main",
			import: "./other-entry"
		}
	},
	target: "web",
	node: {
		__dirname: false,
		__filename: false
	},
	externalsPresets: {
		node: true
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				split: {
					chunks: "all",
					name: "split",
					test: /split\.js$/,
					enforce: true
				}
			}
		}
	}
};
