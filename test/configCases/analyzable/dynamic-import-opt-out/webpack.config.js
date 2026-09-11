/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	experiments: {
		outputModule: true
	},
	output: {
		analyzableChunkImport: false,
		filename: "bundle0.mjs",
		chunkFilename: "[name].mjs"
	}
};
