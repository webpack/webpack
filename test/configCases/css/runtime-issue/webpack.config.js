/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	entry: {
		main: {
			import: ["./share.js", "./entry1.js"]
		},
		secondMain: {
			import: ["./share.js", "./entry2.js"]
		}
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			cacheGroups: {
				common: {
					name: false,
					chunks: "all",
					test() {
						return true;
					}
				}
			}
		}
	},
	output: {
		filename: "[name].js",
		assetModuleFilename: "[name][ext]"
	}
};
