// should generate vendor chunk with the same chunkhash for both entries
/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		mode: "production",
		output: {
			filename: "[name].[chunkhash]-1.js"
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
			}
		}
	},
	{
		mode: "production",
		output: {
			filename: "[name].[chunkhash]-2.js"
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
			}
		}
	}
];
