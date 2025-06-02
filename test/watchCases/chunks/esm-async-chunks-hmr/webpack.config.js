/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		outputModule: true
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 1,
			cacheGroups: {
				react: {
					test: /react/,
					name: "react",
					chunks: "all",
					priority: 100
				}
			}
		},
		runtimeChunk: {
			/**
			 * @param {import("../../../../").Entrypoint} entrypoint The entrypoint to generate runtime chunk name for
			 * @returns {string} The generated runtime chunk name
			 */
			name: entrypoint => `runtime-${entrypoint.name}`
		}
	},
	output: {
		filename: "[name].[contenthash].js",
		chunkFilename: "[name].[contenthash].js"
	}
};
