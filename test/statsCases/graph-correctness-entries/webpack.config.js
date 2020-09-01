/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		e1: "./e1",
		e2: "./e2"
	},
	output: {
		filename: "[name].js"
	},
	stats: {
		hash: false,
		timings: false,
		builtAt: false,
		assets: false,
		chunks: true,
		chunkRelations: true,
		chunkModules: true,
		dependentModules: true,
		modules: false,
		reasons: true
	}
};
