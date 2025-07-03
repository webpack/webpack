/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		module: true
	},
	experiments: {
		outputModule: true
	},
	target: ["web", "es2020"],
	optimization: {
		splitChunks: {
			minSize: 1,
			maxSize: 1
		}
	}
};
