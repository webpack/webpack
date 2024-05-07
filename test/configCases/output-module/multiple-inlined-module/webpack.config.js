/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["./index-1.js", "./index-2.js"],
	output: {
		module: true
	},
	optimization: {
		concatenateModules: true
	},
	experiments: {
		outputModule: true
	},
	target: "es2020"
};
