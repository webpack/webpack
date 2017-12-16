module.exports = {
	mode: "production",
	entry: {
		e1: "./e1",
		e2: "./e2",
		e3: "./e3"
	},
	output: {
		filename: "[name].js"
	},
	stats: {
		hash: false,
		timings: false,
		chunks: true,
		chunkModules: true,
		modules: false
	}
};
