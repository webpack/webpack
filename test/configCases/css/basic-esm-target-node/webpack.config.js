/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	experiments: {
		outputModule: true,
		css: true
	},
	output: {
		module: true,
		chunkFormat: "module"
	}
};
