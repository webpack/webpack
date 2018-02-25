// should generate vendor chunk with the same chunkhash for both entries
module.exports = [
	{
		mode: "production",
		output: {
			chunkFilename: "[name].[chunkhash].js"
		},
		entry: {
			app: "./entry-1.js"
		},
		optimization: {
			splitChunks: {
				cacheGroups: {
					vendor: {
						name: "vendor",
						chunks: "initial",
						enforce: true,
						test: /constants/
					}
				}
			},
			namedModules: true
		}
	},
	{
		mode: "production",
		output: {
			chunkFilename: "[name].[chunkhash].js"
		},
		entry: {
			app: "./entry-2.js"
		},
		optimization: {
			splitChunks: {
				cacheGroups: {
					vendor: {
						name: "vendor",
						chunks: "initial",
						enforce: true,
						test: /constants/
					}
				}
			},
			namedModules: true
		}
	}
];
