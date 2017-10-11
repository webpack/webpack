module.exports = {
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
		assets: false,
		chunks: true,
		chunkModules: true,
		modules: false,
		reasons: true
	}
};
