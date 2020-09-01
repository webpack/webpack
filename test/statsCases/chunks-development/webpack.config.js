/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	profile: true,
	stats: {
		reasons: true,
		chunks: true,
		chunkModules: true,
		dependentModules: true,
		chunkRelations: true,
		chunkOrigins: true,
		modules: false,
		publicPath: true
	}
};
