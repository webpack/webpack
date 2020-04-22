/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		entry1: "./entry1",
		entry2: "./entry2"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		concatenateModules: true
	}
};
