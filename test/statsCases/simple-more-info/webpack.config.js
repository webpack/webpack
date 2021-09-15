/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	profile: true,
	stats: {
		reasons: true,
		chunkModules: true,
		dependentModules: true,
		chunkOrigins: true,
		modules: true,
		cached: true,
		cachedAssets: true,
		source: true,
		errorDetails: true,
		publicPath: true,
		outputPath: true
	}
};
