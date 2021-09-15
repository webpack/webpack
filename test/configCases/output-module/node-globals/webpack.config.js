/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js"
	},
	output: {
		filename: "[name].mjs",
		module: true
	},
	experiments: {
		outputModule: true
	},
	target: "node14"
};
